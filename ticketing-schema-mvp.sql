--------------------------------------------------------------------------
-- TICKETING SYSTEM - MVP SCHEMA (Oracle)
-- No FK constraints (matches existing PM system style) — integrity
-- enforced in app code. PK + indexes + CHECK constraints only.
-- All "who" columns (created_by, requested_for, agent_id) reference
-- PM.USERS.ID logically, not via FK.
--------------------------------------------------------------------------

--------------------------------------------------------------------------
-- 1. LOOKUP TABLES
--------------------------------------------------------------------------

CREATE TABLE ticket_statuses (
    status_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    status_name   VARCHAR2(30)  NOT NULL UNIQUE,
    is_closed     CHAR(1)       DEFAULT 'N' NOT NULL CHECK (is_closed IN ('Y','N')),
    sort_order    NUMBER(3)     DEFAULT 0
);

CREATE TABLE ticket_priorities (
    priority_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    priority_name VARCHAR2(20)  NOT NULL UNIQUE,
    sla_hours     NUMBER(5)     NOT NULL,   -- business hours to resolve under SLA
    sort_order    NUMBER(3)     DEFAULT 0
);

CREATE TABLE ticket_categories (
    category_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    category_name VARCHAR2(60)  NOT NULL UNIQUE,
    description   VARCHAR2(255),
    active        CHAR(1)       DEFAULT 'Y' NOT NULL CHECK (active IN ('Y','N'))
);

CREATE TABLE canned_responses (
    response_id   NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title         VARCHAR2(100) NOT NULL,
    body          CLOB          NOT NULL,
    category_id   NUMBER,                  -- optional grouping, no FK
    active        CHAR(1)       DEFAULT 'Y' NOT NULL CHECK (active IN ('Y','N')),
    created_by    NUMBER        NOT NULL,   -- PM.USERS.ID
    created_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

--------------------------------------------------------------------------
-- 2. BUSINESS HOURS (for SLA due_date calculation)
--------------------------------------------------------------------------

CREATE TABLE business_hours (
    day_of_week     NUMBER(1)   NOT NULL PRIMARY KEY,  -- 1=Mon ... 7=Sun
    start_time      VARCHAR2(5) NOT NULL,               -- '09:00'
    end_time        VARCHAR2(5) NOT NULL,                -- '18:00'
    is_working_day  CHAR(1)     DEFAULT 'Y' NOT NULL CHECK (is_working_day IN ('Y','N'))
);

CREATE TABLE holidays (
    holiday_date   DATE          NOT NULL PRIMARY KEY,
    description    VARCHAR2(120)
);

--------------------------------------------------------------------------
-- 3. TICKETS (core entity)
--------------------------------------------------------------------------

CREATE TABLE tickets (
    ticket_id        NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_number    VARCHAR2(20)  NOT NULL UNIQUE,   -- TCK-2026-000123, trigger-generated

    created_by       NUMBER        NOT NULL,           -- PM.USERS.ID — who raised it
    requested_for    NUMBER        NOT NULL,           -- PM.USERS.ID — who it's for (= created_by unless admin raises for someone else)
    agent_id         NUMBER,                           -- PM.USERS.ID — null until assigned

    category_id      NUMBER        NOT NULL,
    priority_id      NUMBER        NOT NULL,
    status_id        NUMBER        NOT NULL,

    subject          VARCHAR2(200) NOT NULL,
    description      CLOB,
    channel          VARCHAR2(20)  DEFAULT 'WEB' NOT NULL
                         CHECK (channel IN ('WEB','EMAIL','PHONE','CHAT','API')),

    created_at       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at       TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    due_date         TIMESTAMP,                        -- business-hours SLA deadline
    first_response_at TIMESTAMP,                       -- stamped on first agent comment
    resolved_at      TIMESTAMP,
    closed_at        TIMESTAMP,

    satisfaction_rating NUMBER(1) CHECK (satisfaction_rating BETWEEN 1 AND 5),
    satisfaction_comment VARCHAR2(500)
);

CREATE INDEX idx_tickets_created_by  ON tickets(created_by);
CREATE INDEX idx_tickets_reqfor      ON tickets(requested_for);
CREATE INDEX idx_tickets_agent       ON tickets(agent_id);
CREATE INDEX idx_tickets_status      ON tickets(status_id);
CREATE INDEX idx_tickets_priority    ON tickets(priority_id);
CREATE INDEX idx_tickets_created_at  ON tickets(created_at);
CREATE INDEX idx_tickets_due         ON tickets(due_date);

--------------------------------------------------------------------------
-- 4. TICKET ACTIVITY
--------------------------------------------------------------------------

CREATE TABLE ticket_comments (
    comment_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER        NOT NULL,
    author_type    VARCHAR2(10)  NOT NULL CHECK (author_type IN ('USER','AGENT','SYSTEM')),
    author_id      NUMBER,                          -- PM.USERS.ID
    comment_text   CLOB          NOT NULL,
    is_internal    CHAR(1)       DEFAULT 'N' NOT NULL CHECK (is_internal IN ('Y','N')),
    canned_response_id NUMBER,                       -- optional, if built from a template
    created_at     TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_comments_ticket ON ticket_comments(ticket_id);

CREATE TABLE ticket_attachments (
    attachment_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER        NOT NULL,
    comment_id     NUMBER,
    file_name      VARCHAR2(255) NOT NULL,
    file_type      VARCHAR2(100),
    file_data      BLOB,
    file_size_kb   NUMBER(10),
    uploaded_by    NUMBER        NOT NULL,           -- PM.USERS.ID
    uploaded_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

CREATE TABLE ticket_history (
    history_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER        NOT NULL,
    field_changed  VARCHAR2(40)  NOT NULL,           -- STATUS, PRIORITY, AGENT
    old_value      VARCHAR2(200),
    new_value      VARCHAR2(200),
    changed_by     VARCHAR2(10)  NOT NULL CHECK (changed_by IN ('USER','AGENT','SYSTEM')),
    changed_by_id  NUMBER,
    changed_at     TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_history_ticket ON ticket_history(ticket_id);

--------------------------------------------------------------------------
-- 5. TRIGGERS
--------------------------------------------------------------------------

-- 5a. Ticket number generator
CREATE SEQUENCE tickets_seq START WITH 1 INCREMENT BY 1 NOCACHE;

CREATE OR REPLACE TRIGGER trg_tickets_number
BEFORE INSERT ON tickets
FOR EACH ROW
DECLARE
    v_seq NUMBER;
BEGIN
    IF :NEW.ticket_number IS NULL THEN
        SELECT tickets_seq.NEXTVAL INTO v_seq FROM dual;
        :NEW.ticket_number := 'TCK-' || TO_CHAR(SYSDATE, 'YYYY') || '-' || LPAD(v_seq, 6, '0');
    END IF;
END;
/

-- 5b. Keep updated_at current
CREATE OR REPLACE TRIGGER trg_tickets_updated
BEFORE UPDATE ON tickets
FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

-- 5c. Audit trail on status / priority / agent change
CREATE OR REPLACE TRIGGER trg_tickets_audit
AFTER UPDATE OF status_id, priority_id, agent_id ON tickets
FOR EACH ROW
BEGIN
    IF :OLD.status_id != :NEW.status_id THEN
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (:NEW.ticket_id, 'STATUS', :OLD.status_id, :NEW.status_id, 'SYSTEM');
    END IF;

    IF :OLD.priority_id != :NEW.priority_id THEN
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (:NEW.ticket_id, 'PRIORITY', :OLD.priority_id, :NEW.priority_id, 'SYSTEM');
    END IF;

    IF NVL(:OLD.agent_id, -1) != NVL(:NEW.agent_id, -1) THEN
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (:NEW.ticket_id, 'AGENT', :OLD.agent_id, :NEW.agent_id, 'SYSTEM');
    END IF;
END;
/

-- 5d. Stamp first_response_at on first non-internal agent comment
CREATE OR REPLACE TRIGGER trg_ticket_first_response
BEFORE INSERT ON ticket_comments
FOR EACH ROW
DECLARE
    v_existing NUMBER;
BEGIN
    IF :NEW.author_type = 'AGENT' AND :NEW.is_internal = 'N' THEN
        SELECT COUNT(*) INTO v_existing
        FROM tickets
        WHERE ticket_id = :NEW.ticket_id AND first_response_at IS NOT NULL;

        IF v_existing = 0 THEN
            UPDATE tickets
            SET first_response_at = SYSTIMESTAMP
            WHERE ticket_id = :NEW.ticket_id;
        END IF;
    END IF;
END;
/

--------------------------------------------------------------------------
-- 6. REPORTING VIEWS
--------------------------------------------------------------------------

CREATE OR REPLACE VIEW vw_open_tickets AS
SELECT
    t.ticket_id,
    t.ticket_number,
    t.created_by,
    t.requested_for,
    t.agent_id,
    cat.category_name,
    pr.priority_name,
    st.status_name,
    t.subject,
    t.created_at,
    t.due_date,
    CASE
        WHEN t.due_date IS NOT NULL AND t.due_date < SYSTIMESTAMP AND st.is_closed = 'N'
        THEN ROUND((CAST(SYSTIMESTAMP AS DATE) - CAST(t.due_date AS DATE)) * 24, 1)
        ELSE 0
    END AS hours_overdue
FROM tickets t
JOIN ticket_categories  cat ON cat.category_id = t.category_id
JOIN ticket_priorities  pr  ON pr.priority_id  = t.priority_id
JOIN ticket_statuses    st  ON st.status_id    = t.status_id
WHERE st.is_closed = 'N';

CREATE OR REPLACE VIEW vw_agent_workload AS
SELECT
    t.agent_id,
    COUNT(t.ticket_id) AS open_tickets,
    SUM(CASE WHEN t.due_date < SYSTIMESTAMP THEN 1 ELSE 0 END) AS overdue_tickets
FROM tickets t
JOIN ticket_statuses s ON s.status_id = t.status_id AND s.is_closed = 'N'
WHERE t.agent_id IS NOT NULL
GROUP BY t.agent_id;