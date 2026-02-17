-- Migration: Add category column to activities table
-- Description: Adds a category column to categorize activities as water, spa, or restaurant
-- Date: 2024
-- Database: PostgreSQL (Supabase)

-- Add category column with default value 'water'
ALTER TABLE activities 
ADD COLUMN category TEXT NOT NULL DEFAULT 'water';

-- Add check constraint to ensure only valid categories
ALTER TABLE activities 
ADD CONSTRAINT activities_category_check 
CHECK (category IN ('water', 'spa', 'restaurant'));

-- Create index for better query performance when filtering by category
CREATE INDEX idx_activities_category ON activities(category);

-- Add comment to document the column
COMMENT ON COLUMN activities.category IS 'Activity category: water (water activities), spa (spa services), or restaurant (dining experiences)';
