-- TCEL-060 / TCEL-057 — table backing the avatar assistant's escalation
-- flow (api/avatar/escalate.js). NOT APPLIED YET — written for review.
-- Bar: run this against dev first, verify, then promote alongside the rest
-- of the avatar feature per the usual dev -> main flow (never apply directly
-- to prod).

create table if not exists avatar_escalations (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  company_id uuid references companies(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  type text not null default 'other',
  description text not null,
  urgency text not null default 'low' check (urgency in ('low', 'medium', 'high')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  created_at timestamptz not null default now()
);

create index if not exists avatar_escalations_company_idx on avatar_escalations(company_id);
create index if not exists avatar_escalations_status_idx on avatar_escalations(status);

alter table avatar_escalations enable row level security;

-- Placeholder policy — company_id/user_id are not yet populated by
-- api/avatar/escalate.js (it doesn't have the authenticated session wired
-- through yet). Tighten this before relying on RLS for real access control;
-- as written this only allows the service role (server-side) to write, which
-- matches how escalate.js currently calls it via serviceClient().
create policy "service role full access" on avatar_escalations
  for all using (auth.role() = 'service_role');
