--------------------------------------------------------------------------
-- SEED DATA — required before any ticket can be created
--------------------------------------------------------------------------

-- Statuses
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('NEW', 'N', 1);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('OPEN', 'N', 2);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('IN_PROGRESS', 'N', 3);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('PENDING_USER', 'N', 4);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('RESOLVED', 'Y', 5);
INSERT INTO ticket_statuses (status_name, is_closed, sort_order) VALUES ('CLOSED', 'Y', 6);

-- Priorities (sla_hours = business hours to resolve)
INSERT INTO ticket_priorities (priority_name, sla_hours, sort_order) VALUES ('LOW', 72, 1);
INSERT INTO ticket_priorities (priority_name, sla_hours, sort_order) VALUES ('MEDIUM', 24, 2);
INSERT INTO ticket_priorities (priority_name, sla_hours, sort_order) VALUES ('HIGH', 8, 3);
INSERT INTO ticket_priorities (priority_name, sla_hours, sort_order) VALUES ('URGENT', 2, 4);

-- Categories (adjust to match your actual PM system issue types)
INSERT INTO ticket_categories (category_name, description) VALUES ('Bug', 'Something is broken or not working as expected');
INSERT INTO ticket_categories (category_name, description) VALUES ('Feature Request', 'New functionality suggestion');
INSERT INTO ticket_categories (category_name, description) VALUES ('Access Issue', 'Login, permissions, account access');
INSERT INTO ticket_categories (category_name, description) VALUES ('Data Issue', 'Incorrect or missing data');
INSERT INTO ticket_categories (category_name, description) VALUES ('General Inquiry', 'Other questions');

-- Business hours: Mon–Sat 10:00–18:00, Sun closed
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (1, '10:00', '18:00', 'Y'); -- Mon
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (2, '10:00', '18:00', 'Y'); -- Tue
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (3, '10:00', '18:00', 'Y'); -- Wed
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (4, '10:00', '18:00', 'Y'); -- Thu
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (5, '10:00', '18:00', 'Y'); -- Fri
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (6, '10:00', '18:00', 'Y'); -- Sat
INSERT INTO business_hours (day_of_week, start_time, end_time, is_working_day) VALUES (7, '00:00', '00:00', 'N'); -- Sun

COMMIT;