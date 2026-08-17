// src/modules/todo/service.js
import oracledb from "oracledb";
import { getConnection } from "../../config/db.js";

// ─────────────────────────────────────────────
// TODO INSERT
// ─────────────────────────────────────────────
export async function insertTodo(data) {
  const connection = await getConnection();
  try {
    const status = data.STATUS ?? "TODO";

    const sortResult = await connection.execute(
      `SELECT NVL(MAX(SORT_ORDER), 0) + 1 AS NEXT_SORT_ORDER
       FROM PM.PM_TODO
       WHERE STATUS = :status_bv`,
      { status_bv: status }
    );
    const SORT_ORDER = sortResult.rows[0][0];

    const result = await connection.execute(
      `INSERT INTO PM.PM_TODO
       (TITLE, DESCRIPTION, STATUS, PRIORITY, DUE_DATE, REMARKS, SORT_ORDER, CREATED_BY, UPDATED_BY)
       VALUES
       (:TITLE, :DESCRIPTION, :STATUS, :PRIORITY, :DUE_DATE, :REMARKS, :SORT_ORDER, :CREATED_BY, :UPDATED_BY)
       RETURNING TODO_ID INTO :NEW_TODO_ID`,
      {
        TITLE:        data.TITLE,
        DESCRIPTION:  data.DESCRIPTION ?? null,
        STATUS:       status,
        PRIORITY:     Number(data.PRIORITY ?? 2),
        DUE_DATE:     data.DUE_DATE ? new Date(data.DUE_DATE) : null,
        REMARKS:      data.REMARKS ?? null,
        SORT_ORDER:   Number(SORT_ORDER),
        CREATED_BY:   data.CREATED_BY ?? null,
        UPDATED_BY:   data.UPDATED_BY ?? data.CREATED_BY ?? null,
        NEW_TODO_ID:  { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const TODO_ID = result.outBinds.NEW_TODO_ID[0];
    await connection.commit();
    return TODO_ID;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// TODO SEARCH
// ─────────────────────────────────────────────
export async function searchTodo(todo_id, status) {
  const connection = await getConnection();
  try {
    let sql = `
      SELECT
        TODO_ID, TITLE, DESCRIPTION, STATUS, PRIORITY,
        TO_CHAR(DUE_DATE, 'YYYY-MM-DD HH24:MI:SS') AS DUE_DATE,
        REMARKS, SORT_ORDER, CREATED_BY,
        TO_CHAR(CREATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_DATE,
        UPDATED_BY,
        TO_CHAR(UPDATED_DATE, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_DATE
      FROM PM.PM_TODO`;

    const binds = {};
    const conditions = [];
    if (todo_id > 0) {
      conditions.push("TODO_ID = :todo_id_bv");
      binds.todo_id_bv = todo_id;
    }
    if (status) {
      conditions.push("STATUS = :status_bv");
      binds.status_bv = status;
    }
    if (conditions.length) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    sql += " ORDER BY STATUS, SORT_ORDER ASC";

    const result = await connection.execute(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    });

    return result.rows || [];
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// TODO UPDATE
// ─────────────────────────────────────────────
export async function updateTodo(data) {
  const connection = await getConnection();
  try {
    const todo_id = Number(data.TODO_ID || 0);
    const set = [];
    const binds = {
      todo_id_bv:   todo_id,
      updated_by_bv: data.UPDATED_BY ?? null,
    };

    const stringFields = ["TITLE", "DESCRIPTION", "STATUS", "REMARKS"];
    const numberFields = ["PRIORITY"];
    const dateFields   = ["DUE_DATE"];

    for (const field of stringFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = data[field];
      }
    }
    for (const field of numberFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = Number(data[field]);
      }
    }
    for (const field of dateFields) {
      if (Object.prototype.hasOwnProperty.call(data, field)) {
        const key = field.toLowerCase();
        set.push(`${field} = :${key}`);
        binds[key] = data[field] ? new Date(data[field]) : null;
      }
    }

    set.push("UPDATED_DATE = SYSDATE");
    set.push("UPDATED_BY   = :updated_by_bv");

    if (set.length <= 2) return 0;

    const sql = `UPDATE PM.PM_TODO SET ${set.join(", ")} WHERE TODO_ID = :todo_id_bv`;
    const upResult = await connection.execute(sql, binds, { autoCommit: false });

    await connection.commit();
    return upResult.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// TODO STATUS UPDATE
// ─────────────────────────────────────────────
export async function updateTodoStatus(todo_id, status, updated_by) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `UPDATE PM.PM_TODO
       SET STATUS = :status_bv,
           UPDATED_DATE = SYSDATE,
           UPDATED_BY   = :updated_by_bv
       WHERE TODO_ID = :todo_id_bv`,
      {
        status_bv:     status,
        updated_by_bv: updated_by ?? null,
        todo_id_bv:    Number(todo_id),
      },
      { autoCommit: false }
    );
    await connection.commit();
    return result.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// TODO REORDER
// ─────────────────────────────────────────────
export async function reorderTodos(items) {
  const connection = await getConnection();
  try {
    for (const item of items) {
      await connection.execute(
        `UPDATE PM.PM_TODO
         SET STATUS = :status_bv,
             SORT_ORDER = :sort_order_bv,
             UPDATED_DATE = SYSDATE,
             UPDATED_BY   = :updated_by_bv
         WHERE TODO_ID = :todo_id_bv`,
        {
          status_bv:     item.STATUS,
          sort_order_bv: Number(item.SORT_ORDER),
          updated_by_bv: item.UPDATED_BY ?? null,
          todo_id_bv:    Number(item.TODO_ID),
        },
        { autoCommit: false }
      );
    }

    await connection.commit();
    return items.length;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}

// ─────────────────────────────────────────────
// TODO DELETE
// ─────────────────────────────────────────────
export async function deleteTodo(todo_id) {
  const connection = await getConnection();
  try {
    const result = await connection.execute(
      `DELETE FROM PM.PM_TODO WHERE TODO_ID = :todo_id`,
      { todo_id: Number(todo_id) },
      { autoCommit: false }
    );
    await connection.commit();
    return result.rowsAffected;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    await connection.close();
  }
}