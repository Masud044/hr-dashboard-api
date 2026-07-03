// src/scripts/backfillSortOrder.js
import "dotenv/config"; // loads .env — adjust if your project uses a different setup
import oracledb from "oracledb";
import { initDb, getConnection, closeDb } from "../config/db.js";

async function backfillSortOrder() {
  await initDb(); // <-- must initialize pool first

  const connection = await getConnection();
  try {
    console.log("Starting SORT_ORDER backfill...");

    const result = await connection.execute(
      `SELECT CONTRATOR_ID FROM PM.PM_CONTRACTOR_INFO ORDER BY CONTRATOR_ID`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const rows = result.rows || [];
    console.log(`Found ${rows.length} rows to update.`);

    let sortOrder = 1;
    for (const row of rows) {
      await connection.execute(
        `UPDATE PM.PM_CONTRACTOR_INFO SET SORT_ORDER = :sortOrder WHERE CONTRATOR_ID = :id`,
        { sortOrder, id: row.CONTRATOR_ID },
        { autoCommit: false }
      );
      sortOrder++;
    }

    await connection.commit();
    console.log(`Backfill complete. ${sortOrder - 1} rows updated.`);

    const check = await connection.execute(
      `SELECT COUNT(*) AS TOTAL_ROWS, COUNT(DISTINCT SORT_ORDER) AS DISTINCT_SORT_ORDERS
       FROM PM.PM_CONTRACTOR_INFO`,
      {},
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    console.log("Sanity check:", check.rows[0]);
  } catch (err) {
    await connection.rollback();
    console.error("Backfill failed, rolled back:", err);
  } finally {
    await connection.close();
    await closeDb(); // clean up pool so the script actually exits
  }
}

backfillSortOrder();