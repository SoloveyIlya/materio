-- Manual migration script to add missing columns
-- Execute this SQL directly on your SQLite database

-- Add deleted_at column to users table (for SoftDeletes)
ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL;

-- Add hidden_from_dashboard column to users table
ALTER TABLE users ADD COLUMN hidden_from_dashboard BOOLEAN NOT NULL DEFAULT 0;

-- Add is_main_task column to tasks table
ALTER TABLE tasks ADD COLUMN is_main_task BOOLEAN NOT NULL DEFAULT 0;
