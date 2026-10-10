-- Scheduled reports: the old table had no executor and the Settings form wrote a column that did not exist.
alter table public.report_schedules
  add column if not exists name            text,
  add column if not exists period          text     not null default 'last30',
  add column if not exists filters         jsonb    not null default '{}'::jsonb,
  add column if not exists language        text     not null default 'he',
  add column if not exists day_of_week     smallint,
  add column if not exists day_of_month    smallint,
  add column if not exists skip_if_empty   boolean  not null default false,
  add column if not exists last_sent_at    timestamptz,
  add column if not exists last_status     text;

-- the old checks only allowed weekly/monthly and three report types that no longer exist
alter table public.report_schedules drop constraint if exists report_schedules_frequency_check;
alter table public.report_schedules drop constraint if exists report_schedules_report_type_check;

alter table public.report_schedules
  add constraint report_schedules_frequency_chk check (frequency in ('daily','weekly','monthly')),
  add constraint report_schedules_language_chk  check (language in ('he','en')),
  add constraint report_schedules_dow_chk       check (day_of_week is null or day_of_week between 0 and 6),
  add constraint report_schedules_dom_chk       check (day_of_month is null or day_of_month between 1 and 31),
  add constraint report_schedules_recipients_chk check (cardinality(recipients) between 1 and 10);

create index if not exists report_schedules_active_idx on public.report_schedules (is_active) where is_active;
