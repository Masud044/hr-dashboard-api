// src/scripts/backfillProjectSortOrder.js
import "dotenv/config";
import oracledb from "oracledb";
import { initDb, getConnection, closeDb } from "../config/db.js";

async function backfillProjectSortOrder() {
  await initDb();

  const connection = await getConnection();
  try {
    console.log("Starting PM_PROJECT SORT_ORDER backfill...");

    const result = await connection.execute(
      `SELECT P_ID FROM PM.PM_PROJECT ORDER BY P_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];
    console.log(`Found ${rows.length} rows to update.`);

    let sortOrder = 1;
    for (const row of rows) {
      await connection.execute(
        `UPDATE PM.PM_PROJECT SET SORT_ORDER = :sortOrder WHERE P_ID = :id`,
        { sortOrder, id: row.P_ID },
        { autoCommit: false }
      );
      sortOrder++;
    }

    await connection.commit();
    console.log(`Backfill complete. ${sortOrder - 1} rows updated.`);

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

backfillProjectSortOrder();