-- Add fields column to form_links for custom form builder
ALTER TABLE form_links ADD COLUMN IF NOT EXISTS fields jsonb;

-- Allow 'custom' as a form type (drop old check, add new one)
ALTER TABLE form_links DROP CONSTRAINT IF EXISTS form_links_type_check;
ALTER TABLE form_links ADD CONSTRAINT form_links_type_check
  CHECK (type IN ('car_checklist','driver_car_check','yearly_training','custom'));
