-- 1. Engine-hours reading on refuellings. Hours-metered assets (forklifts,
--    generators) have no meaningful odometer; the reading taken at the pump is
--    what makes consumption-per-hour computable. The freshest reading also
--    rolls forward into cars.engine_hours (done app-side).
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS engine_hours numeric;
COMMENT ON COLUMN fuel_records.engine_hours IS 'Engine-hours reading at time of refuel (hours-metered assets)';

-- 2. Configurable alert recipients. daily-alerts previously emailed only the
--    first admin of each company. When this list is set, it wins; when empty,
--    behaviour is unchanged (first admin), so prod is unaffected until a
--    company opts in.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS alert_recipients text[];
COMMENT ON COLUMN companies.alert_recipients IS 'Email addresses for daily alert digest; empty = first admin (legacy behaviour)';
