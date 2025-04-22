-- Create settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS "settings" (
  "id" TEXT PRIMARY KEY,
  "key" TEXT UNIQUE NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key");

-- Add default settings if needed
INSERT INTO "settings" ("id", "key", "value", "created_at", "updated_at")
VALUES 
  ('1', 'maintenance_mode', 'false', NOW(), NOW()),
  ('2', 'site_name', 'OnnRides', NOW(), NOW())
ON CONFLICT (key) DO NOTHING; 