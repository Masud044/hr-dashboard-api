// src/modules/ticketing/slaCalculator.js
// Computes a ticket's due_date by adding SLA hours while only counting
// configured business hours (skips nights/weekends/holidays).

import { getConnection, oracledb } from "../../config/db.js";

// JS Date.getDay(): 0=Sun..6=Sat  →  our day_of_week: 1=Mon..7=Sun
function toDayOfWeek(jsDay) {
  return jsDay === 0 ? 7 : jsDay;
}

function parseHHMM(dateBase, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(dateBase);
  d.setHours(h, m, 0, 0);
  return d;
}

function ymd(date) {
  return date.toISOString().slice(0, 10);
}

export async function getBusinessHoursMap() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT DAY_OF_WEEK, START_TIME, END_TIME, IS_WORKING_DAY FROM business_hours`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const map = {};
    for (const row of result.rows) {
      map[row.DAY_OF_WEEK] = {
        start: row.START_TIME,
        end: row.END_TIME,
        working: row.IS_WORKING_DAY === "Y",
      };
    }
    return map;
  } finally {
    await conn.close();
  }
}

export async function getHolidaySet() {
  const conn = await getConnection();
  try {
    const result = await conn.execute(
      `SELECT TO_CHAR(HOLIDAY_DATE, 'YYYY-MM-DD') AS HD FROM holidays`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return new Set(result.rows.map((r) => r.HD));
  } finally {
    await conn.close();
  }
}

/**
 * Adds `slaHours` of business time to `startDate`, skipping non-working
 * days, outside-hours time, and holidays.
 */
export function calcDueDate(startDate, slaHours, businessHoursMap, holidaySet) {
  let remainingMinutes = slaHours * 60;
  let current = new Date(startDate);

  // safety cap so a bad config can't infinite-loop
  let guard = 0;
  while (remainingMinutes > 0 && guard < 3650) {
    guard++;

    const dow = toDayOfWeek(current.getDay());
    const day = businessHoursMap[dow];
    const isHoliday = holidaySet.has(ymd(current));

    if (!day || !day.working || isHoliday) {
      // jump to start of next day
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    const windowStart = parseHHMM(current, day.start);
    const windowEnd = parseHHMM(current, day.end);

    if (current < windowStart) {
      current = windowStart;
    }
    if (current >= windowEnd) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    const availableMinutes = (windowEnd - current) / 60000;

    if (remainingMinutes <= availableMinutes) {
      current = new Date(current.getTime() + remainingMinutes * 60000);
      remainingMinutes = 0;
    } else {
      remainingMinutes -= availableMinutes;
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
    }
  }

  return current;
}

/** Convenience: fetch config + compute in one call */
export async function calcDueDateNow(slaHours, fromDate = new Date()) {
  const [businessHoursMap, holidaySet] = await Promise.all([
    getBusinessHoursMap(),
    getHolidaySet(),
  ]);
  return calcDueDate(fromDate, slaHours, businessHoursMap, holidaySet);
}