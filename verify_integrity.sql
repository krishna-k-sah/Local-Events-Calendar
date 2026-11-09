-- ==============================================================================
-- EventHub Phase 5.5 Database Integrity & Invariant Audit
-- ==============================================================================

SELECT '1. Duplicate Registrations Violation' AS check_name, count(*) AS violations 
FROM (
  SELECT "userId", "eventId" 
  FROM registrations 
  GROUP BY "userId", "eventId" 
  HAVING count(*) > 1
) sub;

SELECT '2. Duplicate Attendances Violation' AS check_name, count(*) AS violations 
FROM (
  SELECT "registrationId" 
  FROM attendances 
  GROUP BY "registrationId" 
  HAVING count(*) > 1
) sub;

SELECT '3. Overbooked Capacity Violation' AS check_name, count(*) AS violations 
FROM events 
WHERE "currentRegistered" > "maxCapacity";

SELECT '4. Negative Capacity Violation' AS check_name, count(*) AS violations 
FROM events 
WHERE "currentRegistered" < 0;

SELECT '5. Duplicate Ticket Codes Violation' AS check_name, count(*) AS violations 
FROM (
  SELECT "ticketCode" 
  FROM registrations 
  GROUP BY "ticketCode" 
  HAVING count(*) > 1
) sub;

SELECT '6. Orphaned Attendances (Missing Registration)' AS check_name, count(*) AS violations 
FROM attendances a 
LEFT JOIN registrations r ON a."registrationId" = r.id 
WHERE a."registrationId" IS NOT NULL AND r.id IS NULL;

SELECT '7. Orphaned Waitlists (Missing Event)' AS check_name, count(*) AS violations 
FROM waitlists w 
LEFT JOIN events e ON w."eventId" = e.id 
WHERE e.id IS NULL;

SELECT '8. Orphaned Reminders (Missing Event)' AS check_name, count(*) AS violations 
FROM event_reminders er 
LEFT JOIN events e ON er."eventId" = e.id 
WHERE e.id IS NULL;

SELECT '9. Duplicate Waitlist Positions Violation' AS check_name, count(*) AS violations 
FROM (
  SELECT "eventId", position 
  FROM waitlists 
  WHERE status = 'PENDING' 
  GROUP BY "eventId", position 
  HAVING count(*) > 1
) sub;

-- Live Operational Metrics
SELECT 'Total Roles' AS metric, count(*) AS total_records FROM roles;
SELECT 'Total Users' AS metric, count(*) AS total_records FROM users;
SELECT 'Total Categories' AS metric, count(*) AS total_records FROM categories;
SELECT 'Total Locations' AS metric, count(*) AS total_records FROM locations;
SELECT 'Total Events' AS metric, count(*) AS total_records FROM events;
SELECT 'Total Registrations' AS metric, count(*) AS total_records FROM registrations;
SELECT 'Total Waitlist Records' AS metric, count(*) AS total_records FROM waitlists;
SELECT 'Total Attendances' AS metric, count(*) AS total_records FROM attendances;
SELECT 'Total Event Reminders' AS metric, count(*) AS total_records FROM event_reminders;
SELECT 'Total Activity Logs' AS metric, count(*) AS total_records FROM activity_logs;
