CREATE TABLE ticket_worker_assignments (
    assignment_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ticket_id      NUMBER NOT NULL,
    worker_id      NUMBER NOT NULL,
    assigned_by    NUMBER NOT NULL,
    assigned_at    TIMESTAMP DEFAULT SYSTIMESTAMP NOT NULL,
    UNIQUE (ticket_id, worker_id)
);

CREATE INDEX idx_twa_ticket ON ticket_worker_assignments(ticket_id);
CREATE INDEX idx_twa_worker ON ticket_worker_assignments(worker_id);