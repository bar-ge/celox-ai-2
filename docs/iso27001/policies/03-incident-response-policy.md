# Incident Response Policy
**Document ID:** ISMS-POL-003  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure a consistent and effective approach to managing information security incidents, minimizing business impact, protecting customer data, and fulfilling legal notification obligations.

## 2. Incident Classification

| Severity | Definition | Examples |
|----------|-----------|---------|
| **P1 – Critical** | Active data breach, system compromise, data destruction | Database breach, ransomware, unauthorized admin access |
| **P2 – High** | Potential breach, significant service disruption | Suspicious login activity, Supabase outage >2hr, API token exposure |
| **P3 – Medium** | Limited impact, no confirmed data exposure | Single failed login spike, minor service degradation |
| **P4 – Low** | Minimal impact, informational | Spam attempts, minor configuration drift |

## 3. Incident Response Team

| Role | Name | Contact |
|------|------|---------|
| Incident Commander | Bar Gershenson | bar.gershenzohn@gmail.com |
| Technical Lead | Bar Gershenson | bar.gershenzohn@gmail.com |
| Data Protection Officer | Bar Gershenson | privacy@celoxai.com |

*External escalation contacts:*
- CERT-IL (Israel National Cyber Directorate): cert@gov.il / 119
- Supabase Support: support@supabase.io
- Vercel Support: support@vercel.com

## 4. Incident Response Process

### Phase 1: Detection & Reporting (0–1 hour)

**Detection sources:**
- Supabase Auth anomaly alerts
- Vercel deployment alerts
- Customer reports via privacy@celoxai.com
- Cloudflare security events
- GitHub secret scanning alerts

**Upon detection:**
1. Log the incident in the Incident Register (see template below)
2. Assign initial severity classification
3. Notify CEO/Security Officer immediately for P1/P2

### Phase 2: Containment (1–4 hours for P1/P2)

**Immediate containment actions by severity:**

**P1 – Critical:**
- [ ] Revoke all active sessions (Supabase Auth: `auth.users` sign-out all)
- [ ] Rotate compromised API keys and secrets
- [ ] Enable Supabase database read-only mode if needed
- [ ] Take Vercel deployment offline if needed
- [ ] Preserve all logs before any changes
- [ ] Do not delete or modify evidence

**P2 – High:**
- [ ] Disable affected user account(s)
- [ ] Rotate specific compromised credential
- [ ] Block suspicious IP via Cloudflare
- [ ] Increase monitoring

**P3/P4:**
- [ ] Document and monitor
- [ ] Patch or configure as appropriate

### Phase 3: Investigation (within 24 hours for P1)

1. Determine root cause
2. Identify all affected systems and data
3. Determine if personal data was exposed (triggers breach notification)
4. Document timeline of events
5. Preserve evidence for potential legal proceedings

### Phase 4: Notification

#### Customer Notification
- If customer data is confirmed exposed: notify affected customers within **72 hours** (per Israeli Privacy Protection Regulations 2017)
- Notification must include: what happened, what data was affected, what we are doing, what customers can do

#### Regulatory Notification
| Regulator | Threshold | Deadline |
|-----------|-----------|----------|
| Israeli Privacy Protection Authority | Any personal data breach | 72 hours |
| CERT-IL | System compromise affecting national infrastructure | As soon as possible |

### Phase 5: Eradication & Recovery

1. Remove the root cause (patch, revoke, reconfigure)
2. Restore from clean backup if needed
3. Verify system integrity before bringing back online
4. Re-enable access to affected users
5. Increase monitoring post-recovery for 30 days

### Phase 6: Post-Incident Review

Within 5 business days of incident closure:
- Document what happened, root cause, response effectiveness
- Identify improvements to prevent recurrence
- Update risk register if new risks identified
- Update this policy if process gaps found

## 5. Incident Register Template

```
Incident ID: INC-YYYY-NNN
Date/Time Detected: 
Detected By: 
Severity: P1 / P2 / P3 / P4
Description: 
Systems Affected: 
Data Affected (Y/N): 
Personal Data Exposed (Y/N): 
Containment Actions Taken: 
Root Cause: 
Resolution: 
Notification Sent (Y/N): 
Lessons Learned: 
Closed By / Date: 
```

## 6. Evidence Preservation

All logs and data related to an incident must be preserved for a minimum of 3 years. Do not delete or modify logs during or after an incident.

## 7. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
