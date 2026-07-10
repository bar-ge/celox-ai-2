# Penetration Test Report — Celox AI Fleet Platform

**Document ID:** SEC-PT-2026-07
**Assessment date:** 2026-07-06 – 2026-07-08
**Report date:** 2026-07-08
**Target:** celoxai.com (web app), Supabase backend (project `dvjjxwcvxjgqpdcnnmvv`), edge functions, public forms, mobile app (auth/session)
**Type:** Grey-box, authenticated + unauthenticated, application-layer
**Authorization:** Self-assessment; systems owned and operated by Celox AI Ltd.

> **Scope & authorization note:** Testing was limited to systems owned by Celox AI. Third-party platform infrastructure (Supabase, Vercel, Cloudflare, Google) was **not** tested — only Celox's own configuration on those platforms. This respects those providers' terms of service.

---

## 1. Executive summary

A focused application-layer penetration test was performed against the Celox AI fleet platform, concentrating on the multi-tenant SaaS attack surface: authentication, tenant isolation (RLS), edge functions, storage, and public intake forms.

**Result:** the assessment identified **3 critical, 2 high, and several medium/low issues** — all of which were **remediated and verified during the engagement**. The most serious was a cross-tenant privilege-escalation path allowing any signed-up user to become admin of another company. All critical and high findings are now closed.

| Severity | Found | Fixed | Open |
|----------|-------|-------|------|
| Critical | 3 | 3 | 0 |
| High | 2 | 2 | 0 |
| Medium | 3 | 3 | 0 |
| Low | 2 | 1 | 1 (accepted) |

## 2. Methodology

- **Standard:** OWASP Top 10 (2021) + OWASP ASVS, extended with Supabase-specific RLS/tenant-isolation testing.
- **Approach:** reviewed live RLS policies and `SECURITY DEFINER` function definitions against source; probed auth flows, edge functions, storage access, and public forms; traced data flow from untrusted input to sensitive operations.
- **Focus areas:** multi-tenant isolation, authentication/session, IDOR/BOLA, injection, secrets exposure, business logic.

## 3. Findings

### PT-01 — Cross-tenant account takeover via `profiles` self-insert — **CRITICAL** — Fixed
The `profiles_insert` RLS policy only checked `id = auth.uid()`, not `company_id`/`role`, and no signup trigger existed. Any signed-up user could `INSERT` their own profile with an arbitrary `company_id` and `role='admin'`, gaining full admin access to another company's entire fleet.
- **Impact:** complete cross-tenant data breach and control.
- **Fix:** company join moved to `SECURITY DEFINER` RPCs (`join_company_by_code`, `accept_company_invite`); `profiles_insert` tightened to require `company_id IS NULL` and a non-privileged role for self-insert. Verified blocked.

### PT-02 — Unauthenticated open email relay (`send-report`) — **CRITICAL** — Fixed
The `send-report` edge function had no authentication and accepted arbitrary recipients, subject, and HTML, sending from the verified `celoxai.com` domain.
- **Impact:** weaponizable phishing/spam from the verified brand domain; reputation damage.
- **Fix:** function now requires an authenticated user with a company (JWT verified); recipient count capped. Verified.

### PT-03 — World-readable `form_links` table — **CRITICAL** — Fixed
A permissive RLS policy (`is_active = true`) let the public `anon` role read every tenant's active form links — tokens, company IDs, and commercial pricing in license-agreement links.
- **Impact:** cross-tenant leak of capability tokens and business data.
- **Fix:** public-read policy dropped; the app reads single links via the `get_active_form_link(token)` DEFINER RPC. Verified gone.

### PT-04 — HTML injection + arbitrary-recipient phishing (`send-notification`) — **HIGH** — Fixed
Payload fields were interpolated into notification emails unescaped, and the `invite_sent` path let an unauthenticated caller choose the recipient.
- **Fix:** all payload fields HTML-escaped; `invite_sent` now requires admin-of-company auth and derives the inviter from the JWT. Verified.

### PT-05 — Contact-form CAPTCHA not verified server-side — **HIGH** — Fixed
The Turnstile widget was rendered client-side but never verified on the server; `crm_leads` accepted unlimited unverified anonymous inserts.
- **Fix:** `contact-form` edge function now verifies Turnstile via Cloudflare siteverify and inserts via service role; the `anon_insert_leads` policy was dropped. Enforcement verified (invalid token → 403).

### PT-06 — Silent file-upload loss in public forms — **MEDIUM** — Fixed
Failed storage uploads were silently dropped while the form reported success — risking loss of accident-report evidence.
- **Fix:** uploads now throw on failure and each form surfaces the error.

### PT-07 — Mutable `search_path` on credential DEFINER functions — **MEDIUM** — Fixed
`save/delete/get` integration-credential `SECURITY DEFINER` functions did not pin `search_path` — a privilege-escalation vector.
- **Fix:** `SET search_path = public` pinned on all three; anon EXECUTE revoked on the join RPCs.

### PT-08 — Dead auth audit logging — **MEDIUM** — Fixed
`log_auth_event` was called with `.catch()` on a builder that only runs when awaited, so sign-in/out events were never logged (an ISMS logging gap).
- **Fix:** corrected to `.then(null, noop)`; events now log.

### PT-09 — Mobile session tokens in AsyncStorage — **LOW** — Accepted (hardening backlog)
The mobile app stores session tokens in unencrypted AsyncStorage. Exploitable only with physical/rooted-device access. Recommend `expo-secure-store`. Tracked for a future mobile build.

### PT-10 — Localized error leakage / cosmetic — **LOW** — Fixed
Raw English Supabase errors shown in Hebrew UI; corrected with localized mappings.

## 4. Strengths observed

- `vercel.json` security headers are strong: strict CSP (no `unsafe-inline`/`unsafe-eval`), HSTS preload, `X-Frame-Options: DENY`, `nosniff`, scoped `Permissions-Policy`.
- Storage bucket is private with short-lived signed URLs; filenames sanitized.
- `trigger-alerts` and `gps-ingest` edge functions authenticate correctly.
- Login/signup CAPTCHA properly verified by Supabase Auth.
- Integration credentials encrypted at rest via pgcrypto.

## 5. Recommendations & cadence

1. Close PT-09 (mobile secure storage) in the next mobile build.
2. Enable Supabase Auth "leaked password protection" (HaveIBeenPwned).
3. Re-run this assessment every **12–18 months** and after major changes (aligns with the Data Security Regulations' periodic-pentest expectation for higher-tier databases — see `docs/compliance/amendment-13/`).
4. Consider an **external licensed pentester** for an auditor-credible report ahead of ISO 27001 Stage 2.

## 6. Sign-off

| Role | Name | Date |
|------|------|------|
| Assessor | Automated security review (Claude) + Bar Gershenson | 2026-07-08 |
| Owner | Bar Gershenson, CEO / Security Officer | 2026-07-08 |
