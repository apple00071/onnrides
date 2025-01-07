-- Remove test data
DELETE FROM bookings WHERE user_id IN (SELECT id FROM users WHERE email = 'test@example.com');
DELETE FROM document_submissions WHERE user_id IN (SELECT id FROM users WHERE email = 'test@example.com');
DELETE FROM profiles WHERE user_id IN (SELECT id FROM users WHERE email = 'test@example.com');
DELETE FROM users WHERE email = 'test@example.com';
DELETE FROM vehicles WHERE name LIKE 'Test Vehicle%';
DELETE FROM vehicles WHERE name LIKE 'Test%';
DELETE FROM vehicles WHERE name LIKE '%Test%';
DELETE FROM vehicles WHERE description LIKE '%test%';
DELETE FROM vehicles WHERE type NOT IN ('car', 'bike'); 