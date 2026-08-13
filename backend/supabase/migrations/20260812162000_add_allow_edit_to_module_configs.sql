-- Add allow_edit column to module_configs table
ALTER TABLE module_configs 
ADD COLUMN IF NOT EXISTS allow_edit BOOLEAN NOT NULL DEFAULT true;

-- Update existing modules to allow transaction editing by default
UPDATE module_configs SET allow_edit = true WHERE allow_edit IS NULL;
