# Oracle Database Migration Procedure

## Stack

- Express.js
- `oracledb`
- Oracle Database
- Raw SQL, no ORM
- Git for version control

## Goal

Keep database schema changes version-controlled and make deployment safe and repeatable.

## Project Structure

```text
project/
├── db/
│   └── migrations/
│       ├── 001_initial_schema.sql
│       ├── 002_add_phone.sql
│       └── 003_add_employee_status.sql
├── scripts/
│   └── migrate.js
├── src/
│   └── db.js
└── package.json
```

## Migration Rules

Each database change gets a new SQL migration file.

Example:

```text
002_add_phone.sql
```

```sql
ALTER TABLE HR_EMPLOYEE
ADD PHONE VARCHAR2(20);
```

Never modify a migration that has already been applied. Create a new migration instead.

For example, if `002_add_phone.sql` is already deployed and another change is needed:

```text
003_change_phone_size.sql
```

## Migration Tracking

The migration runner maintains a table:

```sql
DB_MIGRATIONS
```

It stores the names of migrations that have already been successfully executed.

Example:

```text
001_initial_schema.sql
002_add_phone.sql
```

Therefore, migrations are executed only once.

## Running Migrations

Add this script to `package.json`:

```json
{
  "scripts": {
    "migrate": "node scripts/migrate.js"
  }
}
```

Then run:

```bash
npm run migrate
```

Use the same command locally and in production.

## Local Development

When a schema change is needed:

```text
Create new migration SQL
        ↓
npm run migrate
        ↓
Test application
```

Example:

```text
003_add_employee_status.sql
```

```sql
ALTER TABLE HR_EMPLOYEE
ADD STATUS VARCHAR2(20);
```

## Production Deployment

After pulling the new code:

```bash
git pull
npm install
npm run migrate
pm2 restart <app>
```

The migration runner checks `DB_MIGRATIONS`.

If production already has:

```text
001 ✓
002 ✓
```

and the new deployment contains:

```text
003
```

then only `003` will be executed.

## Important

The migration system does not replace the production database or recreate existing tables.

It only applies new database changes in order.

Initial production/local setup still requires the existing Oracle schema/data to be obtained from the old server, preferably through an Oracle export (`.dmp`) or complete DDL/schema SQL.
