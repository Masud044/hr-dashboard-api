--------------------------------------------------------------------------
-- TICKETING SYSTEM v2 — Project-scoped Change Request / Variation / Special Note
-- Links: tickets.project_id -> PM.PM_PROJECT.P_ID (logical, no FK)
--        tickets.contractor_id -> PM.PM_CONTRACTOR_INFO.CONTRATOR_ID (logical, no FK)
--        owner/customer is DERIVED via PM_OWNER_INFO.PROJECT_ID = tickets.project_id
--        (no owner_id column on tickets — avoid data drift)
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
    sort_order    NUMBER(3)     DEFAULT 0
    -- sla_hours dropped — no SLA workflow in v2
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
    category_id   NUMBER,
    active        CHAR(1)       DEFAULT 'Y' NOT NULL CHECK (active IN ('Y','N')),
    created_by    NUMBER        NOT NULL,
    created_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

--------------------------------------------------------------------------
-- 2. TICKETS (core entity — project-scoped)
--------------------------------------------------------------------------

CREATE TABLE tickets (
    ticket_id         NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_number     VARCHAR2(20)  NOT NULL UNIQUE,   -- TCK-2026-000123, trigger-generated

    project_id        NUMBER,                          -- PM.PM_PROJECT.P_ID, nullable (general tickets)
    contractor_id     NUMBER,                           -- PM.PM_CONTRACTOR_INFO.CONTRATOR_ID (the trade), nullable
    owner_id          NUMBER,                           -- PM.PM_OWNER_INFO.ID, nullable — used only when project_id is null (owner can't be derived without a project)

    created_by        NUMBER        NOT NULL,           -- PM.USERS.ID — who raised it (owner/supervisor/admin)
    assigned_worker_id NUMBER,                          -- PM.PM_WORKER.WORKER_ID — supervisor/trade contact, nullable

    ticket_type       VARCHAR2(30)  NOT NULL
                          CHECK (ticket_type IN ('CHANGE_REQUEST','VARIATION','SPECIAL_NOTE')),

    change_amount     NUMBER(18,2),                     -- only used when ticket_type = 'VARIATION'

    category_id       NUMBER,                           -- optional
    priority_id       NUMBER        NOT NULL,
    status_id         NUMBER        NOT NULL,

    subject           VARCHAR2(200) NOT NULL,
    description       CLOB,

    created_at        TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    updated_at        TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL,
    due_date          TIMESTAMP,
    resolved_at       TIMESTAMP,
    closed_at         TIMESTAMP

);

CREATE INDEX idx_tickets_project     ON tickets(project_id);
CREATE INDEX idx_tickets_contractor  ON tickets(contractor_id);
CREATE INDEX idx_tickets_created_by  ON tickets(created_by);
CREATE INDEX idx_tickets_trade_ctc   ON tickets(assigned_trade_contact_id);
CREATE INDEX idx_tickets_status      ON tickets(status_id);
CREATE INDEX idx_tickets_type        ON tickets(ticket_type);
CREATE INDEX idx_tickets_created_at  ON tickets(created_at);
CREATE INDEX idx_tickets_due         ON tickets(due_date);

--------------------------------------------------------------------------
-- 3. TICKET ACTIVITY (unchanged from v1)
--------------------------------------------------------------------------

CREATE TABLE ticket_comments (
    comment_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER        NOT NULL,
    author_type    VARCHAR2(10)  NOT NULL CHECK (author_type IN ('USER','AGENT','SYSTEM')),
    author_id      NUMBER,
    comment_text   CLOB          NOT NULL,
    is_internal    CHAR(1)       DEFAULT 'N' NOT NULL CHECK (is_internal IN ('Y','N')),
    canned_response_id NUMBER,
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
    uploaded_by    NUMBER        NOT NULL,
    uploaded_at    TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_attachments_ticket ON ticket_attachments(ticket_id);

CREATE TABLE ticket_history (
    history_id     NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER        NOT NULL,
    field_changed  VARCHAR2(40)  NOT NULL,           -- STATUS, PRIORITY, TRADE_CONTACT
    old_value      VARCHAR2(200),
    new_value      VARCHAR2(200),
    changed_by     VARCHAR2(10)  NOT NULL CHECK (changed_by IN ('USER','AGENT','SYSTEM')),
    changed_by_id  NUMBER,
    changed_at     TIMESTAMP     DEFAULT SYSTIMESTAMP NOT NULL
);

CREATE INDEX idx_history_ticket ON ticket_history(ticket_id);

--------------------------------------------------------------------------
-- 4. TRIGGERS
--------------------------------------------------------------------------

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

CREATE OR REPLACE TRIGGER trg_tickets_updated
BEFORE UPDATE ON tickets
FOR EACH ROW
BEGIN
    :NEW.updated_at := SYSTIMESTAMP;
END;
/

CREATE OR REPLACE TRIGGER trg_tickets_audit
AFTER UPDATE OF status_id, priority_id, assigned_trade_contact_id ON tickets
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

    IF NVL(:OLD.assigned_trade_contact_id, -1) != NVL(:NEW.assigned_trade_contact_id, -1) THEN
        INSERT INTO ticket_history (ticket_id, field_changed, old_value, new_value, changed_by)
        VALUES (:NEW.ticket_id, 'TRADE_CONTACT', :OLD.assigned_trade_contact_id, :NEW.assigned_trade_contact_id, 'SYSTEM');
    END IF;
END;
/

--------------------------------------------------------------------------
-- 5. SEED DATA
--------------------------------------------------------------------------

-- Simplified statuses (SPECIAL_NOTE can just use OPEN/CLOSED as read/unread)
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('OPEN', 'N', 1);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('IN_REVIEW', 'N', 2);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('ACKNOWLEDGED', 'N', 3);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('CLOSED', 'Y', 4);

-- Priorities — plain field now, no SLA hours
INSERT INTO ticket_priorities (priority_name, sort_order) VALUES ('LOW', 1);
INSERT INTO ticket_priorities (priority_name, sort_order) VALUES ('MEDIUM', 2);
INSERT INTO ticket_priorities (priority_name, sort_order) VALUES ('HIGH', 3);
INSERT INTO ticket_priorities (priority_name, sort_order) VALUES ('URGENT', 4);

-- Categories — optional grouping, adjust as needed
INSERT INTO ticket_categories (category_name, description) VALUES ('Design Change', 'Change to approved design/spec');
INSERT INTO ticket_categories (category_name, description) VALUES ('Site Condition', 'Unforeseen site condition requiring variation');
INSERT INTO ticket_categories (category_name, description) VALUES ('Client Request', 'Owner-requested change');
INSERT INTO ticket_categories (category_name, description) VALUES ('General', 'Other / uncategorized');

COMMIT;