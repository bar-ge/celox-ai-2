-- ── Form Links ────────────────────────────────────────────────────────────────
create table if not exists form_links (
  id          uuid primary key default gen_random_uuid(),
  token       uuid unique not null default gen_random_uuid(),
  company_id  uuid references companies(id) on delete cascade,
  type        text not null check (type in ('car_checklist','driver_car_check','yearly_training')),
  car_id      text,
  driver_id   text,
  title       text,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  expires_at  timestamptz,
  is_active   boolean default true
);

-- ── Form Submissions ───────────────────────────────────────────────────────────
create table if not exists form_submissions (
  id             uuid primary key default gen_random_uuid(),
  form_link_id   uuid references form_links(id) on delete cascade,
  company_id     uuid,
  type           text,
  submitter_name text,
  data           jsonb,
  submitted_at   timestamptz default now()
);

-- ── RLS ────────────────────────────────────────────────────────────────────────
alter table form_links       enable row level security;
alter table form_submissions enable row level security;

-- form_links: company members can manage their own links
create policy "company members manage form_links"
  on form_links for all
  using (
    company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );

-- form_links: anyone can read an active link by token (for public form page)
create policy "public read active form_links"
  on form_links for select
  using (is_active = true);

-- form_submissions: anyone can insert (public form submit)
create policy "public insert form_submissions"
  on form_submissions for insert
  with check (true);

-- form_submissions: company members can read their submissions
create policy "company members read form_submissions"
  on form_submissions for select
  using (
    company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );
