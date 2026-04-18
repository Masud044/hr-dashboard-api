import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

export async function saveMasterDetail(data) {
  if (!data || !data.P_ID || !data.CREATION_BY || !Array.isArray(data.LINES)) {
    const error = new Error("P_ID, CREATION_BY, and LINES array are required.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await getConnection();
  try {
    let hId = Number(data.H_ID || 0);
    const isUpdate = hId > 0;
    const pId = Number(data.P_ID || 0);
    const description = data.DESCRIPTION ?? null;
    const creator = Number(data.CREATION_BY || 0);
    const updater = Number(data.UPDATED_BY ?? creator);

    if (isUpdate) {
      const updateHeaderSql = `UPDATE PM_SCHEDUL_H
        SET P_ID = :p_id_bv, DESCRIPTION = :desc_bv, UPDATED_BY = :updater_bv, UPDATED_DATE = SYSDATE
        WHERE H_ID = :h_id_bv`;

      await connection.execute(
        updateHeaderSql,
        { p_id_bv: pId, desc_bv: description, updater_bv: updater, h_id_bv: hId },
        { autoCommit: false }
      );
    } else {
      const insertHeaderSql = `INSERT INTO PM_SCHEDUL_H (P_ID, DESCRIPTION, CREATION_BY, UPDATED_BY)
        VALUES (:p_id_bv, :desc_bv, :creator_bv, :updater_bv)
        RETURNING H_ID INTO :new_h_id`;

      const insertHeaderResult = await connection.execute(
        insertHeaderSql,
        {
          p_id_bv: pId,
          desc_bv: description,
          creator_bv: creator,
          updater_bv: updater,
          new_h_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
        },
        { autoCommit: false }
      );

      hId = insertHeaderResult.outBinds.new_h_id[0];
    }

    const newLineIds = [];
    for (const line of data.LINES) {
      const lId = Number(line.L_ID || 0);
      const cPId = Number(line.C_P_ID || 0);
      const lineDesc = line.DESCRIPTION ?? null;
      const startDate = line.SCHEDULE_START_DATE ?? null;
      const endDate = line.SCHEDULE_END_DATE ?? null;
      const lineCreator = Number(line.CREATION_BY ?? creator);
      const lineUpdater = Number(line.UPDATED_BY ?? updater);

      if (lId > 0) {
        const updateLineSql = `UPDATE PM_SCHEDUL_L
          SET C_P_ID = :c_p_id_bv,
              DESCRIPTION = :desc_bv,
              SCHEDULE_START_DATE = TO_DATE(:start_date_bv, 'YYYY-MM-DD'),
              SCHEDULE_END_DATE = TO_DATE(:end_date_bv, 'YYYY-MM-DD'),
              UPDATED_BY = :updater_bv,
              UPDATED_DATE = SYSDATE
          WHERE L_ID = :l_id_bv AND H_ID = :h_id_bv`;

        const updateLineResult = await connection.execute(
          updateLineSql,
          {
            h_id_bv: hId,
            c_p_id_bv: cPId,
            desc_bv: lineDesc,
            start_date_bv: startDate,
            end_date_bv: endDate,
            updater_bv: lineUpdater,
            l_id_bv: lId
          },
          { autoCommit: false }
        );

        if (updateLineResult.rowsAffected === 0) {
          await connection.rollback();
          throw new Error(`Line ID ${lId} not found for update under Header ${hId}.`);
        }
      } else {
        const insertLineSql = `INSERT INTO PM_SCHEDUL_L
          (H_ID, C_P_ID, DESCRIPTION, SCHEDULE_START_DATE, SCHEDULE_END_DATE, CREATION_BY, UPDATED_BY)
          VALUES (:h_id_bv, :c_p_id_bv, :desc_bv, TO_DATE(:start_date_bv, 'YYYY-MM-DD'), TO_DATE(:end_date_bv, 'YYYY-MM-DD'), :creator_bv, :updater_bv)
          RETURNING L_ID INTO :new_l_id`;

        const insertLineResult = await connection.execute(
          insertLineSql,
          {
            h_id_bv: hId,
            c_p_id_bv: cPId,
            desc_bv: lineDesc,
            start_date_bv: startDate,
            end_date_bv: endDate,
            creator_bv: lineCreator,
            updater_bv: lineUpdater,
            new_l_id: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER }
          },
          { autoCommit: false }
        );
        newLineIds.push(insertLineResult.outBinds.new_l_id[0]);
      }
    }

    await connection.commit();
    return {
      success: true,
      message: isUpdate ? `Schedule H_ID ${hId} updated.` : "New Schedule created.",
      H_ID: hId,
      New_Line_IDs: newLineIds,
      statusCode: isUpdate ? 200 : 201
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}

export async function searchMasterDetail(data) {
  const connection = await getConnection();
  try {
    const hId = Number(data?.h_id || 0);
    let sql = `SELECT H_ID, P_ID, DESCRIPTION, CREATION_BY, UPDATED_BY,
      TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE,
      TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
      FROM PM_SCHEDUL_H`;
    const binds = {};
    if (hId > 0) {
      sql += " WHERE H_ID = :h_id_bv";
      binds.h_id_bv = hId;
    }
    const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
    return result.rows || [];
  } finally {
    await connection.close();
  }
}

export async function searchMasterDetailOnly(data) {
  const hId = Number(data?.h_id || 0);
  if (hId <= 0) {
    const error = new Error("h_id parameter is required for search.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await getConnection();
  try {
    const headerSql = `SELECT H_ID, P_ID, DESCRIPTION, CREATION_BY, UPDATED_BY,
      TO_CHAR(CREATION_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATION_DATE,
      TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
      FROM PM_SCHEDUL_H WHERE H_ID = :h_id_bv`;

    const headerResult = await connection.execute(
      headerSql,
      { h_id_bv: hId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const header = headerResult.rows?.[0] || null;
    if (!header) {
      return { notFound: true, hId };
    }

    const lineSql = `SELECT L_ID, C_P_ID, DESCRIPTION,
      TO_CHAR(SCHEDULE_START_DATE, 'YYYY-MM-DD') AS SCHEDULE_START_DATE,
      TO_CHAR(SCHEDULE_END_DATE, 'YYYY-MM-DD') AS SCHEDULE_END_DATE,
      CREATION_BY, UPDATED_BY
      FROM PM_SCHEDUL_L WHERE H_ID = :h_id_bv ORDER BY L_ID`;

    const lineResult = await connection.execute(
      lineSql,
      { h_id_bv: hId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    header.LINES = lineResult.rows || [];
    return { notFound: false, data: header };
  } finally {
    await connection.close();
  }
}

export async function deleteMasterDetail(data) {
  const hId = Number(data?.H_ID || 0);
  if (hId <= 0) {
    const error = new Error("H_ID is required for deletion.");
    error.statusCode = 400;
    throw error;
  }

  const connection = await getConnection();
  try {
    const deleteLines = await connection.execute(
      "DELETE FROM PM_SCHEDUL_L WHERE H_ID = :h_id_bv",
      { h_id_bv: hId },
      { autoCommit: false }
    );
    const linesDeleted = deleteLines.rowsAffected;

    const deleteHeader = await connection.execute(
      "DELETE FROM PM_SCHEDUL_H WHERE H_ID = :h_id_bv",
      { h_id_bv: hId },
      { autoCommit: false }
    );

    if (deleteHeader.rowsAffected === 0) {
      await connection.rollback();
      return { notFound: true, hId };
    }

    await connection.commit();
    return {
      notFound: false,
      hId,
      linesDeleted
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.close();
  }
}
