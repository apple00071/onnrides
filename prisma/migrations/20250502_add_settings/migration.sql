-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- Insert default settings
INSERT INTO "settings" ("key", "value", "created_at", "updated_at")
VALUES 
    ('maintenance_mode', 'false', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('gst_enabled', 'true', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('gst_percentage', '18', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING; 