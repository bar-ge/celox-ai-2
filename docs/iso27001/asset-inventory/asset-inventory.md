# Information Asset Inventory
**Document ID:** ISMS-AI-001  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Next Review:** 2027-06-24  

---

## 1. Information Assets

| Asset ID | Asset Name | Description | Classification | Owner | Location | Custodian |
|----------|-----------|-------------|----------------|-------|----------|-----------|
| IA-001 | Driver personal data | Name, ID number, license details, phone, consent records | RESTRICTED | Bar Gershenson | Supabase PostgreSQL (`drivers` table) | Supabase |
| IA-002 | GPS location data | Real-time and historical vehicle positions | CONFIDENTIAL | Bar Gershenson | Supabase PostgreSQL (`gps_positions` table) | Supabase |
| IA-003 | Vehicle fleet data | Plate numbers, vehicle types, status, branch assignments | CONFIDENTIAL | Bar Gershenson | Supabase PostgreSQL (`vehicles` table) | Supabase |
| IA-004 | Company / customer account data | Company name, billing details, branch structure, user accounts | RESTRICTED | Bar Gershenson | Supabase PostgreSQL (`companies`, `profiles` tables) | Supabase |
| IA-005 | Integration credentials | Third-party API keys stored encrypted | RESTRICTED | Bar Gershenson | Supabase PostgreSQL (encrypted via pgcrypto) | Supabase |
| IA-006 | Driver consent records | Timestamped consent for data processing per driver | RESTRICTED | Bar Gershenson | Supabase PostgreSQL (`consent_given_at` field) | Supabase |
| IA-007 | Audit / access logs | Supabase Auth logs, login history | CONFIDENTIAL | Bar Gershenson | Supabase Auth logs | Supabase |
| IA-008 | Webhook tokens | Per-company GPS ingest authentication tokens | RESTRICTED | Bar Gershenson | Supabase PostgreSQL (`companies.webhook_token`) | Supabase |
| IA-009 | ISMS documentation | Policies, risk register, audit reports | INTERNAL | Bar Gershenson | GitHub repository (`docs/iso27001/`) | GitHub |

---

## 2. Software Assets

| Asset ID | Asset Name | Version | Purpose | Supplier | License | Criticality |
|----------|-----------|---------|---------|---------|---------|-------------|
| SA-001 | Celox AI Web App | Latest (main branch) | Customer-facing fleet management UI | Internal | Proprietary | Critical |
| SA-002 | Supabase Client (JS) | @supabase/supabase-js | Auth, database, realtime | Supabase | Apache 2.0 | Critical |
| SA-003 | React | 18.x | UI framework | Meta / Open Source | MIT | Critical |
| SA-004 | Vite | 7.x | Build tool | Open Source | MIT | High |
| SA-005 | Supabase Edge Functions (Deno) | Latest | GPS ingest webhook | Supabase / Deno | MIT | High |
| SA-006 | Cloudflare Turnstile SDK | Latest | CAPTCHA / bot protection | Cloudflare | Proprietary | High |
| SA-007 | react-pdf / html-to-image | Latest | Report generation | Open Source | MIT | Medium |
| SA-008 | GitHub Actions (CI) | N/A | Automated deployment | GitHub | Proprietary | High |

---

## 3. Cloud Service Assets

| Asset ID | Service | Provider | Purpose | Tier | Data Hosted | SLA |
|----------|---------|---------|---------|------|-------------|-----|
| CS-001 | Supabase Project (celoxai) | Supabase Inc. | PostgreSQL database, Auth, Storage, Edge Functions | Tier 1 | All customer data | 99.9% |
| CS-002 | Vercel Project (celoxai) | Vercel Inc. | Frontend hosting, serverless | Tier 1 | Environment variables, build artifacts | 99.99% |
| CS-003 | Cloudflare (celoxai.com) | Cloudflare Inc. | DNS, CDN, WAF, Turnstile | Tier 2 | No customer data | 99.99% |
| CS-004 | GitHub Repository (bar-ge/celox-ai-2) | GitHub (Microsoft) | Source code, CI/CD | Tier 2 | Source code, ISMS docs | 99.9% |
| CS-005 | Google OAuth | Google LLC | Social login provider | Tier 2 | OAuth tokens only | 99.9% |
| CS-006 | Microsoft Azure AD OAuth | Microsoft Corp. | Social login provider (Azure) | Tier 2 | OAuth tokens only | 99.9% |

---

## 4. Hardware Assets

| Asset ID | Asset | Description | Owner | Location | Security Controls |
|----------|-------|-------------|-------|----------|------------------|
| HW-001 | Developer Laptop | Primary development workstation | Bar Gershenson | Home office, Israel | Full-disk encryption; screen lock; antivirus; strong login PIN |
| HW-002 | Mobile Phone | Used for MFA authentication (TOTP) | Bar Gershenson | Personal | PIN/biometric lock; MFA app installed |

---

## 5. People Assets

| Asset ID | Name | Role | Access Level | Contact |
|----------|------|------|-------------|---------|
| PA-001 | Bar Gershenson | CEO / CTO / Security Officer / DPO | Full admin — all systems | bar.gershenzohn@gmail.com |

---

## 6. Asset Criticality Summary

| Criticality | Count | Assets |
|------------|-------|--------|
| Critical | 4 | IA-001, IA-004, IA-005, SA-001 |
| High | 8 | IA-002, IA-003, IA-006, IA-007, IA-008, CS-001, CS-002, CS-004 |
| Medium | 6 | IA-009, SA-003–SA-008, CS-003, CS-005, CS-006 |

---

**Reviewed by:** Bar Gershenson  
**Date:** 2026-06-24  
**Next Review:** 2027-06-24
