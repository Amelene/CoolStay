# Database Migrations

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the contents of `add_category_to_activities.sql`
5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

### Option 3: Manual Execution

Run these SQL commands in your Supabase SQL Editor:

```sql
-- Add category column with default value 'water'
ALTER TABLE activities 
ADD COLUMN category TEXT NOT NULL DEFAULT 'water';

-- Add check constraint to ensure only valid categories
ALTER TABLE activities 
ADD CONSTRAINT activities_category_check 
CHECK (category IN ('water', 'spa', 'restaurant'));

-- Create index for better query performance
CREATE INDEX idx_activities_category ON activities(category);

-- Add comment to document the column
COMMENT ON COLUMN activities.category IS 'Activity category: water (water activities), spa (spa services), or restaurant (dining experiences)';
```

## Migration Details

**File:** `add_category_to_activities.sql`

**Purpose:** Adds a `category` column to the `activities` table to categorize activities into three types:
- `water` - Water activities (swimming, diving, etc.)
- `spa` - Spa services (massage, sauna, etc.)
- `restaurant` - Restaurant dining experiences

**Changes:**
1. Adds `category` column (TEXT, NOT NULL, DEFAULT 'water')
2. Adds check constraint to validate category values
3. Creates an index on the category column for better query performance
4. Adds documentation comment

## Verification

After running the migration, verify it worked by running:

```sql
-- Check if column exists
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'activities' AND column_name = 'category';

-- Check existing data
SELECT id, name, category FROM activities;
```

## Rollback (if needed)

If you need to rollback this migration:

```sql
-- Remove the index
DROP INDEX IF EXISTS idx_activities_category;

-- Remove the constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_category_check;

-- Remove the column
ALTER TABLE activities DROP COLUMN IF EXISTS category;
