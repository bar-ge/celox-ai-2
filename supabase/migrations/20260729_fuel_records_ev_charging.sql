-- EV charging in the fuel ledger.
--
-- Electric vehicles log charging sessions, not refuellings. Rather than a new
-- table, fuel_records gains kWh columns: a row now carries litres (ICE), kWh
-- (EV), or both (plug-in hybrid). Accumulators, exports and RLS keep working
-- unchanged. Additive only.

ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS kwh numeric;
ALTER TABLE fuel_records ADD COLUMN IF NOT EXISTS price_per_kwh numeric;

COMMENT ON COLUMN fuel_records.kwh IS 'Energy charged in kWh (electric / plug-in hybrid vehicles)';
COMMENT ON COLUMN fuel_records.price_per_kwh IS 'Price per kWh at time of charge';
