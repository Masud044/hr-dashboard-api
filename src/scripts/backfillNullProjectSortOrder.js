// src/scripts/backfillNullProjectSortOrder.js
import "dotenv/config";
import oracledb from "oracledb";
import { initDb, getConnection, closeDb } from "../config/db.js";

async function backfillNullProjectSortOrder() {
  await initDb();

  const connection = await getConnection();
  try {
    console.log("Checking for PM_PROJECT rows with NULL SORT_ORDER...");

    const nullRows = await connection.execute(
      `SELECT P_ID FROM PM.PM_PROJECT WHERE SORT_ORDER IS NULL`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    if (!nullRows.rows.length) {
      console.log("No NULL SORT_ORDER rows found. Nothing to do.");
      return;
    }

    console.log(`Found ${nullRows.rows.length} row(s) with NULL SORT_ORDER.`);

    const maxResult = await connection.execute(
      `SELECT NVL(MAX(SORT_ORDER), 0) AS MAX_SORT FROM PM.PM_PROJECT`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    let nextPosition = maxResult.rows[0].MAX_SORT + 1;

    for (const row of nullRows.rows) {
      await connection.execute(
        `UPDATE PM.PM_PROJECT SET SORT_ORDER = :pos WHERE P_ID = :id`,
        { pos: nextPosition, id: row.P_ID },
        { autoCommit: false }
      );
      console.log(`Assigned P_ID ${row.P_ID} → SORT_ORDER ${nextPosition}`);
      nextPosition++;
    }

    await connection.commit();
    console.log("Backfill complete.");

    const check = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_ROWS, COUNT(DISTINCT SORT_ORDER) AS DISTINCT_SORT_ORDERS
       FROM PM.PM_PROJECT`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("Sanity check:", check.rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error("Backfill failed, rolled back:", err);
  } finally {
    await connection.close();
    await closeDb();
  }
}

backfillNullProjectSortOrder();