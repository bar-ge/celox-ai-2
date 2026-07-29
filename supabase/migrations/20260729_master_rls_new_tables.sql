-- Master accounts could not write to the tables added in the Netzer pass.
--
-- is_master() is the established master bypass (used by cars, companies,
-- drivers, ...). The new-tab tables shipped with membership-only policies
-- (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())),
-- so a master account whose profile has no company_id — or whose profile
-- row is the 'member' duplicate of the master email — got 42501 on every
-- insert/update in Leasing, Insurance, Tests, Equipment, Fuel, Transfers,
-- Events, Complaints, Family and Custom fields. One pattern, 18 tabs.
--
-- This adds OR is_master() to those policies, matching the old tables.
-- Three older tables used a weaker profiles.role = 'master' check that
-- fails for the same duplicate-profile reason; they are aligned too.
-- alert_history stays service-role-only on purpose.

-- Plain "company members manage X" policies → add master bypass
ALTER POLICY "company members manage certifications" ON driver_certifications
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage driver_complaints" ON driver_complaints
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage driver_family" ON driver_family
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage fleet_events" ON fleet_events
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage fuel_records" ON fuel_records
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage report_schedules" ON report_schedules
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage vehicle_equipment" ON vehicle_equipment
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage vehicle_insurance" ON vehicle_insurance
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage vehicle_leasing" ON vehicle_leasing
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage vehicle_tests" ON vehicle_tests
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage vehicle_transfers" ON vehicle_transfers
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

-- custom_field_defs keeps its admin-only write gate for customers;
-- master bypass added to both the write and read policies.
ALTER POLICY "admins manage custom_field_defs" ON custom_field_defs
  USING (company_id IN (SELECT p.company_id FROM profiles p
           WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['admin','master']))
         OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p
           WHERE p.id = (SELECT auth.uid()) AND p.role = ANY (ARRAY['admin','master']))
         OR is_master());

ALTER POLICY "company members read custom_field_defs" ON custom_field_defs
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

-- Older tables with the weaker profiles.role = 'master' bypass → align
ALTER POLICY "members can manage their company accident_reports" ON accident_reports
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.company_id IS NOT NULL) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid()) AND p.company_id IS NOT NULL) OR is_master());

ALTER POLICY "company members can manage plans" ON maintenance_plans
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());

ALTER POLICY "company members manage violations" ON traffic_violations
  USING (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master())
  WITH CHECK (company_id IN (SELECT p.company_id FROM profiles p WHERE p.id = (SELECT auth.uid())) OR is_master());
