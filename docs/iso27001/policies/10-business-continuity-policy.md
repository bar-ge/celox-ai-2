# Business Continuity & Disaster Recovery Policy
**Document ID:** ISMS-POL-010  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure Celox AI can continue operating, or recover rapidly, following a disruptive event affecting the fleet management platform.

## 2. Business Impact Analysis

| Service | Maximum Tolerable Downtime | Recovery Time Objective | Recovery Point Objective |
|---------|--------------------------|------------------------|-------------------------|
| Celox AI web app | 24 hours | 4 hours | 1 hour |
| Database (Supabase) | 4 hours | 1 hour | 15 minutes |
| GPS ingest function | 48 hours | 8 hours | 1 hour |
| Authentication service | 8 hours | 2 hours | N/A (stateless) |

## 3. Disaster Scenarios and Response

### 3.1 Vercel Outage
**Detection:** Vercel status page alert / customer reports  
**Response:**
1. Monitor Vercel status (vercel-status.com)
2. Communicate estimated downtime to customers via email
3. If >4 hours: Consider emergency deployment to Netlify or GitHub Pages (static build)
4. **Recovery:** Vercel restoration (typically auto-recovers)

### 3.2 Supabase Outage
**Detection:** Supabase status alert / app errors  
**Response:**
1. Monitor status.supabase.com
2. Implement application-level read cache if partial outage
3. Communicate to customers if >1 hour
4. **Recovery:** Supabase auto-recovery; if data loss: restore from backup (see Backup Policy)

### 3.3 Database Corruption or Accidental Deletion
**Detection:** Application errors, customer reports  
**Response:**
1. Immediately take a snapshot of current state
2. Identify scope of corruption
3. Restore from most recent clean backup (see `docs/iso27001/backup-recovery/backup-recovery-procedure.md`)
4. Verify data integrity after restore
5. Conduct root cause analysis

### 3.4 GitHub Repository Loss
**Detection:** GitHub access failure  
**Response:**
1. All developers maintain local clones — source code is not lost
2. Create new repository and push from local clone
3. Re-configure Vercel deployment integration
4. **Prevention:** Monthly backup of full repository including all branches and tags

### 3.5 Developer Unavailability (Key Person Risk)
*Note: Bar Gershenson is the sole employee. This is the highest business continuity risk.*

**Mitigation:**
- All code is in GitHub (accessible)
- All secrets are in Vercel/Supabase (documented in secure location)
- Infrastructure is fully documented in this ISMS
- Documented runbook for emergency operations
- Consider: designating a trusted technical contact who can access systems in emergency

**Emergency contact / access documentation location:**  
Stored in encrypted password manager, shared with designated emergency contact.

### 3.6 Cloudflare Account Compromise
**Response:**
1. Immediately revoke compromised credentials
2. Rotate all Cloudflare API tokens
3. Review DNS changes and revert unauthorized ones
4. Verify TLS certificates are unchanged
5. Enable additional MFA

## 4. Communication Plan

| Audience | Channel | Trigger | Owner |
|---------|---------|---------|-------|
| Customers | Email to company admins | Outage >1 hour | Bar Gershenson |
| Customers | Status banner in app | Any significant incident | System |
| Regulatory (if data breach) | Email / official channel | Confirmed data breach | Bar Gershenson |

## 5. Testing

Business continuity procedures are tested:
- **Backup restore test:** Annually (see backup test report)
- **Recovery procedure review:** Annually as part of ISMS review
- **Contact list verification:** Quarterly

## 6. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
