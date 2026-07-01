# Supplier Compliance Assessment Report
**Document ID:** ISMS-SUP-001  
**Version:** 1.0  
**Date:** 2026-06-24  
**Assessed by:** Bar Gershenson, CEO / Security Officer  
**Next Review:** 2027-06-24  

---

## 1. Purpose

This report documents the security compliance status of all critical and important suppliers used by Celox AI Ltd., as required by ISO 27001 Annex A 5.19–5.22 (Supplier Relationships).

---

## 2. Supplier Assessment Summary

| Supplier | Tier | ISO 27001 | SOC 2 Type II | GDPR | Encryption at Rest | Encryption in Transit | DPA Available | Assessment Date |
|----------|------|-----------|--------------|------|-------------------|----------------------|---------------|----------------|
| **Supabase** | 1 | ✅ Certified | ✅ Compliant | ✅ Yes | ✅ AES-256 | ✅ TLS | ✅ Yes | 2026-06-24 |
| **Vercel** | 1 | ✅ Certified (ISO 27001:2013) | ✅ Compliant | ✅ Yes (DPA) | ✅ AES-256 | ✅ TLS | ✅ Yes | 2026-06-24 |
| **Cloudflare** | 2 | ✅ Certified | ✅ SOC 2 Type II | ✅ Yes | ✅ Yes | ✅ TLS | ✅ Yes | 2026-06-24 |
| **GitHub (Microsoft)** | 2 | ✅ ISO Certified | ✅ SOC 2 | ✅ Yes | ✅ Yes | ✅ TLS | ✅ Yes | 2026-06-24 |
| **Google (OAuth)** | 2 | ✅ ISO 27001 | ✅ SOC 2 | ✅ Yes | ✅ Yes | ✅ TLS | ✅ Yes | 2026-06-24 |
| **Microsoft Azure (OAuth)** | 2 | ✅ ISO 27001 | ✅ SOC 2 | ✅ Yes | ✅ Yes | ✅ TLS | ✅ Yes | 2026-06-24 |

**Overall Assessment: All critical suppliers meet Celox AI minimum security requirements.**

---

## 3. Detailed Supplier Assessments

### 3.1 Supabase Inc.

**Service:** PostgreSQL database, Authentication, Edge Functions, Storage  
**Classification:** Tier 1 — Critical (hosts all customer personal data)  
**Website:** supabase.com/security

**Certifications Verified:**
- ✅ **SOC 2 Type II** — Compliant. Report available to Enterprise/Team customers via dashboard.
- ✅ **ISO 27001** — Certified. Certificate available to Enterprise/Team customers via dashboard.
- ✅ **HIPAA** — Compliant (with BAA, available on request).

**Security Controls:**
- ✅ Data encrypted at rest: AES-256
- ✅ Data encrypted in transit: TLS
- ✅ Multi-Factor Authentication: Available and enabled on our account
- ✅ Role-Based Access Control: Fine-grained permissions, enforced via RLS
- ✅ DDoS protection: Via Cloudflare CDN
- ✅ Daily backups: Enabled on paid plan with Point-in-Time Recovery
- ✅ Regular penetration testing: Conducted by Supabase with industry experts
- ✅ Vulnerability scanning: GitHub, Vanta, Snyk

**Data Processing:**
- Personal data hosted: YES — all driver data, GPS data, company data
- Data residency: AWS infrastructure (region: eu-central-1 / AWS Frankfurt or equivalent EU region to be confirmed)
- DPA/GDPR: Available and accepted

**Risk Assessment:** LOW — Supabase is a well-established platform with strong compliance posture. The use of Row Level Security at the application level provides an additional layer beyond Supabase's own controls.

**Incident Notification:** Supabase notifies affected customers of security incidents. Status: status.supabase.com

---

### 3.2 Vercel Inc.

**Service:** Frontend hosting, Serverless functions, CI/CD, Environment variable management  
**Classification:** Tier 1 — Critical (hosts application code; manages production secrets)  
**Website:** vercel.com/security

**Certifications Verified:**
- ✅ **ISO 27001:2013** — Certified.
- ✅ **SOC 2 Type II** — Compliant.
- ✅ **PCI DSS v4.0** — Compliant (SAQ-D and SAQ-A).
- ✅ **GDPR** — Compliant. DPA available and accepted.
- ✅ **TISAX Assessment Level 2** — Completed (automotive sector).

**Security Controls:**
- ✅ Data encrypted at rest: AES-256
- ✅ Data encrypted in transit: HTTPS/TLS
- ✅ Automatic backups: Every 2 hours, 30-day retention, globally replicated
- ✅ Environment variables: Encrypted at rest; never exposed in logs or builds
- ✅ HTTPS enforcement: Automatic redirect; custom domain TLS managed

**Data Processing:**
- Personal data hosted: Environment variables (API keys) and build artifacts
- Customer personal data: NOT directly hosted (served via Supabase API calls)
- DPA: Available and accepted under GDPR

**Risk Assessment:** LOW — Vercel's compliance posture exceeds Celox AI's requirements. ISO 27001 + SOC 2 + PCI DSS provides strong assurance.

---

### 3.3 Cloudflare Inc.

**Service:** DNS management, CDN, Web Application Firewall (WAF), Turnstile CAPTCHA  
**Classification:** Tier 2 — Important  
**Website:** cloudflare.com/trust-hub

**Certifications Verified:**
- ✅ **ISO 27001** — Certified
- ✅ **ISO 27701** — Certified (privacy information management)
- ✅ **SOC 2 Type II** — Compliant
- ✅ **PCI DSS** — Compliant

**Security Controls:**
- ✅ DDoS protection: Industry-leading
- ✅ WAF: Active on celoxai.com
- ✅ TLS: Enforced at edge
- ✅ Turnstile CAPTCHA: Privacy-preserving bot detection (no cookies required)

**Data Processing:**
- Personal data: Cloudflare processes HTTP request metadata (IP addresses) for WAF/DDoS
- Celox AI customer personal data: NOT stored by Cloudflare (traffic passed through only)
- DPA: Available and accepted

**Risk Assessment:** LOW — Cloudflare's ISO 27001 and SOC 2 certifications, combined with its role as a pure traffic intermediary (no data storage), result in very low risk.

---

### 3.4 GitHub (Microsoft Corporation)

**Service:** Source code repository, CI/CD via GitHub Actions, ISMS documentation hosting  
**Classification:** Tier 2 — Important  
**Website:** github.com/security

**Certifications Verified:**
- ✅ **ISO 27001** — Certified (GitHub Trust Center)
- ✅ **SOC 2** — Compliant
- ✅ **GDPR** — Compliant

**Security Controls:**
- ✅ Source code encrypted at rest and in transit
- ✅ GitHub Secret Scanning: Enabled — alerts on accidental credential commits
- ✅ Dependabot: Enabled — alerts on vulnerable dependencies
- ✅ Two-factor authentication: Enforced on Celox AI account
- ✅ Branch protection: `main` branch protected

**Data Processing:**
- Personal data stored: NO (source code only; no customer data in repository)
- ISMS documents stored: YES — publicly visible documents only (no secrets)

**Risk Assessment:** LOW — GitHub's Microsoft backing and ISO 27001 / SOC 2 compliance provides strong assurance. No customer personal data is stored.

---

### 3.5 Google LLC (OAuth Provider)

**Service:** Google OAuth 2.0 sign-in provider  
**Classification:** Tier 2 — Important  
**Website:** cloud.google.com/security

**Certifications Verified:**
- ✅ **ISO 27001** — Certified (Google Cloud)
- ✅ **SOC 2** — Compliant

**Data Processing:**
- Data shared with Google: User's Google account email, name, profile picture (on consent)
- Celox AI customer personal data: NOT sent to Google
- Privacy Policy disclosure: Documented in celoxai.com/privacy.html

**Risk Assessment:** LOW — OAuth flow does not expose Celox AI customer data to Google.

---

### 3.6 Microsoft Corporation (Azure AD OAuth)

**Service:** Microsoft OAuth 2.0 / Azure AD sign-in provider  
**Classification:** Tier 2 — Important

**Certifications Verified:**
- ✅ **ISO 27001** — Certified
- ✅ **SOC 2** — Compliant
- ✅ **GDPR** — Compliant

**Data Processing:**
- Data shared with Microsoft: User's Microsoft account email, name (on consent)
- Celox AI customer personal data: NOT sent to Microsoft

**Risk Assessment:** LOW — Same profile as Google OAuth.

---

## 4. Supplier Review Schedule

| Supplier | Last Review | Next Review | Reviewer |
|----------|------------|------------|---------|
| Supabase | 2026-06-24 | 2027-06-24 | Bar Gershenson |
| Vercel | 2026-06-24 | 2027-06-24 | Bar Gershenson |
| Cloudflare | 2026-06-24 | 2027-06-24 | Bar Gershenson |
| GitHub | 2026-06-24 | 2027-06-24 | Bar Gershenson |
| Google OAuth | 2026-06-24 | 2027-06-24 | Bar Gershenson |
| Microsoft Azure OAuth | 2026-06-24 | 2027-06-24 | Bar Gershenson |

---

## 5. Conclusion

All Tier 1 and Tier 2 suppliers meet or exceed Celox AI's minimum security requirements as defined in the Supplier Management Policy (ISMS-POL-008). All critical suppliers hold valid ISO 27001 and/or SOC 2 Type II certifications, provide encryption at rest and in transit, and have GDPR-compliant data processing agreements in place.

No supplier relationships require escalation or remediation at this time.

**Approved by:** Bar Gershenson, CEO / Security Officer  
**Date:** 2026-06-24
