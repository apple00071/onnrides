-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert initial maintenance mode setting
INSERT INTO settings (id, key, value)
VALUES ('maintenance_mode', 'maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING; 