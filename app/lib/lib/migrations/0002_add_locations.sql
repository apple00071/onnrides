-- First, delete existing locations
DELETE FROM locations;

-- Add new locations
INSERT INTO locations (name) VALUES
  ('Eragadda'),
  ('Madhapur')
ON CONFLICT (name) DO NOTHING; 