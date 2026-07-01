# Information Security Risk Register
**Document ID:** ISMS-RA-001  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Next Review:** 2027-06-24  

---

## Scoring Reference

**Risk Score = Likelihood (1–5) × Impact (1–5)**

| Score | Rating |
|-------|--------|
| 1–4 | 🟢 Low |
| 5–9 | 🟡 Medium |
| 10–14 | 🟠 High |
| 15–25 | 🔴 Critical |

---

## Risk Register

### RISK-001 — Driver Personal Data Breach

| Field | Value |
|-------|-------|
| **Asset** | Driver personal data (name, license, phone, consent records) |
| **Threat** | Unauthorized access by external attacker or compromised customer account |
| **Vulnerability** | RLS misconfiguration or authentication bypass |
| **Likelihood** | 2 — Low (RLS + Auth enforced at DB level) |
| **Impact** | 5 — Critical (personal data of hundreds of drivers; regulatory fines; loss of customer trust) |
| **Inherent Risk** | 10 — 🟠 High |
| **Current Controls** | Row Level Security on all tables; Supabase Auth with session tokens; RLS tested and verified; CAPTCHA on login |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Regular RLS penetration testing; automated RLS policy test suite |
| **Residual Risk** | 6 — 🟡 Medium |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-12-31 |

---

### RISK-002 — Unauthorized Administrative Access

| Field | Value |
|-------|-------|
| **Asset** | Supabase dashboard, Vercel, GitHub, Cloudflare |
| **Threat** | Account takeover via credential stuffing or phishing |
| **Vulnerability** | Weak password or MFA not enabled |
| **Likelihood** | 3 — Medium (admin accounts are high-value targets) |
| **Impact** | 5 — Critical (full system access; ability to destroy all data) |
| **Inherent Risk** | 15 — 🔴 Critical |
| **Current Controls** | MFA enabled on all admin accounts; strong unique passwords via password manager |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Hardware security key (YubiKey) for critical accounts; IP allowlisting where supported |
| **Residual Risk** | 6 — 🟡 Medium |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

### RISK-003 — Cross-Company Data Leakage (RLS Bypass)

| Field | Value |
|-------|-------|
| **Asset** | All customer company data |
| **Threat** | RLS policy bug allows Company A to access Company B data |
| **Vulnerability** | Incorrect SQL policy; missing WHERE clause; SECURITY DEFINER function misuse |
| **Likelihood** | 2 — Low (policies are simple and well-tested) |
| **Impact** | 5 — Critical (breach of all customer data; catastrophic trust damage) |
| **Inherent Risk** | 10 — 🟠 High |
| **Current Controls** | `my_company_id()` enforced on all RLS policies; `is_master()` for admin bypass only; code reviewed on every schema change |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Automated test: attempt to query Company B data from Company A session and assert 0 rows |
| **Residual Risk** | 4 — 🟢 Low |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

### RISK-004 — GPS Data Manipulation / Injection

| Field | Value |
|-------|-------|
| **Asset** | GPS position data; vehicle location history |
| **Threat** | Attacker submits fake GPS data via ingest endpoint |
| **Vulnerability** | Weak or exposed webhook token |
| **Likelihood** | 3 — Medium (endpoint is internet-facing) |
| **Impact** | 3 — Moderate (fake location data misleads fleet managers; not direct data loss) |
| **Inherent Risk** | 9 — 🟡 Medium |
| **Current Controls** | Per-company webhook token required; token validated against database; 401 on mismatch |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Rate limiting on GPS ingest endpoint; GPS data anomaly detection (speed/location plausibility checks) |
| **Residual Risk** | 4 — 🟢 Low |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-12-31 |

---

### RISK-005 — Supabase Service Outage

| Field | Value |
|-------|-------|
| **Asset** | All Celox AI services (depends on Supabase) |
| **Threat** | Supabase infrastructure failure or outage |
| **Vulnerability** | Single cloud provider dependency for database and auth |
| **Likelihood** | 3 — Medium (cloud outages do occur; Supabase has had incidents) |
| **Impact** | 3 — Moderate (service unavailable but no data loss for short outages) |
| **Inherent Risk** | 9 — 🟡 Medium |
| **Current Controls** | Supabase Pro plan with 99.9% SLA; daily backups; status monitoring |
| **Treatment** | Accept (for now) / Transfer (via Supabase SLA) |
| **Additional Controls Planned** | Implement read-replica or caching layer for critical queries; disaster recovery runbook |
| **Residual Risk** | 6 — 🟡 Medium |
| **Owner** | Bar Gershenson |
| **Target Date** | 2027-06-24 |

---

### RISK-006 — Supply Chain Attack (npm Packages)

| Field | Value |
|-------|-------|
| **Asset** | Application source code; deployed application |
| **Threat** | Malicious package injected via npm dependency |
| **Vulnerability** | Unreviewed third-party dependencies |
| **Likelihood** | 2 — Low (targeted attacks are uncommon for small SaaS) |
| **Impact** | 4 — Major (could exfiltrate session tokens or customer data) |
| **Inherent Risk** | 8 — 🟡 Medium |
| **Current Controls** | `package-lock.json` pins exact versions; GitHub Dependabot alerts enabled; limited dependency count |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | `npm audit` in CI pipeline; review major dependency updates manually |
| **Residual Risk** | 4 — 🟢 Low |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

### RISK-007 — API Key / Secret Exposure in Source Code

| Field | Value |
|-------|-------|
| **Asset** | Supabase service key; Cloudflare secret; OAuth credentials |
| **Threat** | Secret accidentally committed to GitHub repository |
| **Vulnerability** | Developer error; missing `.gitignore` |
| **Likelihood** | 2 — Low (environment variables used; .env in .gitignore) |
| **Impact** | 5 — Critical (full database access if service key exposed) |
| **Inherent Risk** | 10 — 🟠 High |
| **Current Controls** | All secrets in Vercel environment variables; `.env` in `.gitignore`; GitHub secret scanning enabled |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Pre-commit hook to scan for secrets; regular audit of committed code |
| **Residual Risk** | 4 — 🟢 Low |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

### RISK-008 — Key Person Risk (Sole Employee)

| Field | Value |
|-------|-------|
| **Asset** | All Celox AI operations |
| **Threat** | Bar Gershenson becomes unavailable (illness, accident) |
| **Vulnerability** | No backup personnel; all knowledge and access centralized |
| **Likelihood** | 2 — Low (short-term; higher over longer timeframe) |
| **Impact** | 4 — Major (prolonged outage; customer churn; inability to respond to incidents) |
| **Inherent Risk** | 8 — 🟡 Medium |
| **Current Controls** | Full documentation in ISMS; all code in GitHub; infrastructure as code |
| **Treatment** | Mitigate / Accept |
| **Additional Controls Planned** | Document emergency access runbook; designate trusted emergency technical contact; consider hiring or contractor arrangement |
| **Residual Risk** | 6 — 🟡 Medium |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-12-31 |

---

### RISK-009 — Ransomware / Data Destruction

| Field | Value |
|-------|-------|
| **Asset** | Database; source code; all customer data |
| **Threat** | Ransomware on developer workstation or compromised admin account used to delete data |
| **Vulnerability** | Admin access allows bulk deletion; workstation without EDR |
| **Likelihood** | 2 — Low |
| **Impact** | 5 — Critical |
| **Inherent Risk** | 10 — 🟠 High |
| **Current Controls** | Supabase daily backups with point-in-time recovery; database deletion protection enabled; MFA on admin accounts |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Enable Supabase "Pause protection"; offline backup copy monthly; EDR on workstation |
| **Residual Risk** | 6 — 🟡 Medium |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

### RISK-010 — Phishing Attack on Administrator

| Field | Value |
|-------|-------|
| **Asset** | Admin credentials; customer data |
| **Threat** | Phishing email targeting Bar Gershenson leads to credential compromise |
| **Vulnerability** | Single administrator; social engineering via email |
| **Likelihood** | 3 — Medium (phishing is extremely common) |
| **Impact** | 4 — Major |
| **Inherent Risk** | 12 — 🟠 High |
| **Current Controls** | MFA on all admin accounts (MFA defeats most phishing); security awareness training completed |
| **Treatment** | Mitigate |
| **Additional Controls Planned** | Hardware security key (phishing-resistant MFA); email filtering |
| **Residual Risk** | 4 — 🟢 Low |
| **Owner** | Bar Gershenson |
| **Target Date** | 2026-09-30 |

---

## Risk Summary

| Risk ID | Description | Inherent | Residual | Status |
|---------|-------------|---------|---------|--------|
| RISK-001 | Driver Personal Data Breach | 🟠 High (10) | 🟡 Medium (6) | Active |
| RISK-002 | Unauthorized Admin Access | 🔴 Critical (15) | 🟡 Medium (6) | Active |
| RISK-003 | Cross-Company Data Leakage | 🟠 High (10) | 🟢 Low (4) | Active |
| RISK-004 | GPS Data Manipulation | 🟡 Medium (9) | 🟢 Low (4) | Active |
| RISK-005 | Supabase Outage | 🟡 Medium (9) | 🟡 Medium (6) | Accepted |
| RISK-006 | Supply Chain Attack | 🟡 Medium (8) | 🟢 Low (4) | Active |
| RISK-007 | Secret Exposure in Code | 🟠 High (10) | 🟢 Low (4) | Active |
| RISK-008 | Key Person Risk | 🟡 Medium (8) | 🟡 Medium (6) | Active |
| RISK-009 | Ransomware / Data Destruction | 🟠 High (10) | 🟡 Medium (6) | Active |
| RISK-010 | Phishing Attack | 🟠 High (12) | 🟢 Low (4) | Active |

**Reviewed by:** Bar Gershenson  
**Date:** 2026-06-24  
**Next Review:** 2027-06-24
