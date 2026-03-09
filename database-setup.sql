-- Allow all reads and writes for now (tighten later with auth)
ALTER TABLE cars     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all" ON cars     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON drivers  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all" ON branches FOR ALL USING (true) WITH CHECK (true);