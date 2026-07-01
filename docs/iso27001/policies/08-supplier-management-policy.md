# Supplier Management Policy
**Document ID:** ISMS-POL-008  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure that suppliers and third-party service providers who access, process, or store Celox AI information maintain appropriate security standards.

## 2. Supplier Classification

| Tier | Definition | Examples |
|------|-----------|---------|
| **Tier 1 — Critical** | Processes or stores customer personal data | Supabase (database), Vercel (compute) |
| **Tier 2 — Important** | Provides security or infrastructure services | Cloudflare (WAF/CDN/Turnstile), GitHub |
| **Tier 3 — Standard** | SaaS tools with limited data access | Analytics, email tools |

## 3. Supplier Onboarding Requirements

### 3.1 Tier 1 Suppliers
Before onboarding a Tier 1 supplier:
- [ ] Confirm ISO 27001 or SOC 2 Type II certification
- [ ] Review Data Processing Agreement (DPA) or confirm GDPR compliance
- [ ] Confirm data residency (must be acceptable region — EU or equivalent)
- [ ] Review their incident notification procedures (must notify within 72 hours)
- [ ] Confirm encryption at rest and in transit
- [ ] Confirm they can delete data on request

### 3.2 Tier 2 Suppliers
- [ ] Confirm SOC 2 Type II or equivalent
- [ ] Review acceptable use and data retention policies
- [ ] Confirm HTTPS-only data transmission

### 3.3 Tier 3 Suppliers
- [ ] Review privacy policy
- [ ] Confirm no unnecessary personal data is shared

## 4. Current Approved Suppliers

Full details in: `docs/iso27001/supplier-agreements/supplier-compliance-report.md`

| Supplier | Tier | Service | Compliance Status |
|----------|------|---------|------------------|
| Supabase | 1 | Database, Auth, Edge Functions, Storage | SOC 2 Type II ✓ |
| Vercel | 1 | Frontend hosting, Edge runtime | SOC 2 Type II ✓ |
| Cloudflare | 2 | CDN, WAF, Turnstile CAPTCHA | ISO 27001 ✓, SOC 2 ✓ |
| GitHub (Microsoft) | 2 | Source code repository, CI | ISO 27001 ✓, SOC 2 ✓ |
| Google (OAuth) | 2 | Authentication provider | ISO 27001 ✓ |
| Microsoft Azure (OAuth) | 2 | Authentication provider | ISO 27001 ✓ |

## 5. Ongoing Supplier Monitoring

- Annual review of each Tier 1 and Tier 2 supplier's compliance certificates
- Monitor supplier security bulletins and subscribe to their status pages
- Review supplier's incident notifications and assess impact on Celox AI
- Re-assess suppliers after any reported breach or significant change

### Status Page Monitoring
| Supplier | Status Page |
|----------|------------|
| Supabase | status.supabase.com |
| Vercel | vercel-status.com |
| Cloudflare | cloudflarestatus.com |
| GitHub | githubstatus.com |

## 6. Supplier Termination

When terminating a supplier relationship:
1. Request deletion of all Celox AI data within 30 days
2. Obtain written confirmation of deletion
3. Revoke all access credentials
4. Update asset inventory and risk register
5. Migrate services to approved alternative before termination

## 7. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
