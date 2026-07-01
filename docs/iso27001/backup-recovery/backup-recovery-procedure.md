# Backup and Recovery Procedure
**Document ID:** ISMS-BR-001  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To define the procedures for backing up Celox AI data and recovering from data loss, corruption, or system failure in a timely and verified manner.

## 2. Backup Coverage

| Asset | Backup Method | Frequency | Retention | Encrypted |
|-------|-------------|-----------|-----------|-----------|
| PostgreSQL database (all tables) | Supabase automatic backup | Daily (midnight UTC) | 7 days (Pro plan) | ✅ AES-256 |
| PostgreSQL database (Point-in-Time) | Supabase PITR | Continuous (WAL streaming) | 7 days | ✅ AES-256 |
| Database schema / migrations | Git repository (supabase/migrations/) | Every commit | Indefinite | ✅ (GitHub) |
| Edge Functions source | Git repository (supabase/functions/) | Every commit | Indefinite | ✅ (GitHub) |
| Application source code | Git repository (main branch) | Every commit | Indefinite | ✅ (GitHub) |
| GitHub repository | GitHub redundant storage | Continuous | Indefinite | ✅ |
| Vercel deployments | Vercel automatic snapshots | Every deploy | 30 days | ✅ |
| Environment variables (secrets) | Documented in secure password manager | On change | Indefinite | ✅ |

## 3. Backup Procedures

### 3.1 Supabase Automatic Daily Backup (Automated)
- **Who does it:** Supabase infrastructure (automatic, no action required)
- **When:** Daily at midnight UTC
- **Verification:** Log into Supabase Dashboard → Project Settings → Backups to confirm backups are listed
- **Format:** Full PostgreSQL snapshot

### 3.2 Supabase Point-in-Time Recovery (Automated)
- **Who does it:** Supabase infrastructure (continuous WAL streaming)
- **Granularity:** Restore to any second within the retention window (7 days)
- **Use case:** Accidental data deletion, corruption, or ransomware

### 3.3 Manual Database Export (Manual — Monthly)
A manual export supplements automated backups and provides an off-platform copy.

**Procedure:**
1. Install Supabase CLI: `npm install -g supabase`
2. Login: `supabase login`
3. Link project: `supabase link --project-ref <PROJECT_REF>`
4. Export schema + data:
   ```bash
   supabase db dump --file backup-$(date +%Y%m%d).sql
   supabase db dump --data-only --file backup-data-$(date +%Y%m%d).sql
   ```
5. Verify file is non-empty: `wc -l backup-*.sql`
6. Store securely: Encrypted external drive or encrypted cloud storage (not GitHub)
7. Log the backup in the Backup Log below

### 3.4 GitHub Repository Backup (Automated via GitHub)
GitHub maintains redundant copies of all repositories. No additional action required.

For additional safety, monthly local clone verification:
```bash
git clone https://github.com/bar-ge/celox-ai-2.git repo-backup-$(date +%Y%m%d)
```

## 4. Recovery Procedures

### 4.1 Recover from Supabase Daily Backup

**Scenario:** Full database restore needed (e.g., data corruption)

**Steps:**
1. Log into Supabase Dashboard: app.supabase.com
2. Navigate to: Project → Settings → Backups
3. Select the desired backup date (most recent clean backup)
4. Click "Restore" — this will replace the current database
5. ⚠️ **WARNING:** Restore is destructive — all data after the backup point will be lost
6. Notify customers of the data restore and approximate data loss period
7. Verify application functionality after restore
8. Document the incident and recovery in the Incident Register

**Estimated recovery time:** 30–60 minutes

### 4.2 Point-in-Time Recovery (PITR)

**Scenario:** Recover to a specific moment (e.g., data deleted 2 hours ago)

**Steps:**
1. Log into Supabase Dashboard
2. Navigate to: Project → Settings → Backups → Point in Time Recovery
3. Select exact date and time to restore to
4. Confirm restore
5. Verify data integrity after restore
6. Document in Incident Register

**Estimated recovery time:** 15–30 minutes

### 4.3 Recover from Manual SQL Backup

**Scenario:** Supabase automated backups are unavailable or insufficient

**Steps:**
1. Locate the latest `.sql` backup file (encrypted storage)
2. Create a new Supabase project (if original project is destroyed)
3. Restore schema: `psql postgresql://... < backup-schema-YYYYMMDD.sql`
4. Restore data: `psql postgresql://... < backup-data-YYYYMMDD.sql`
5. Update Vercel environment variables with new Supabase project credentials
6. Test full application functionality
7. Notify customers of recovery completion

**Estimated recovery time:** 2–4 hours

### 4.4 Recover Application Code

**Scenario:** Vercel deployment corrupted or accidental code change

**Steps:**
1. Open GitHub repository: github.com/bar-ge/celox-ai-2
2. Find last known good commit: `git log --oneline`
3. Revert: `git revert <commit-hash>` or `git checkout <commit-hash> -- <file>`
4. Push to main: `git push origin main`
5. Vercel auto-deploys from main branch within 2 minutes
6. Verify deployment in Vercel dashboard

**Estimated recovery time:** 10–30 minutes

## 5. Backup Verification Schedule

| Activity | Frequency | Responsible |
|----------|-----------|-------------|
| Verify Supabase backup list in dashboard | Monthly | Bar Gershenson |
| Manual database export + integrity check | Monthly | Bar Gershenson |
| Full restore test (non-production environment) | Annually | Bar Gershenson |
| GitHub repository clone verification | Monthly | Bar Gershenson |

## 6. Backup Log

| Date | Type | Result | Verified By | Notes |
|------|------|--------|-------------|-------|
| 2026-06-24 | Supabase automatic + PITR verification | ✅ Pass | Bar Gershenson | See backup-test-report-2026-06-24.md |

## 7. Recovery Time and Point Objectives

| Scenario | RTO | RPO | Method |
|----------|-----|-----|--------|
| Supabase outage (self-recovering) | 1 hour | 0 (no data loss) | Auto-recovery |
| Accidental row/table deletion | 30 min | 1 second (PITR) | PITR restore |
| Full database corruption | 1 hour | 24 hours (daily backup) | Daily backup restore |
| Full platform loss | 4 hours | 24 hours | Manual SQL restore + new Vercel project |

## 8. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
