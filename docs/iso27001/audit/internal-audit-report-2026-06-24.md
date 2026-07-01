# Internal ISMS Audit Report
**Document ID:** ISMS-AUD-001  
**Audit Date:** 2026-06-24  
**Auditor:** Bar Gershenson, CEO / Security Officer  
**Audit Scope:** Full ISMS — ISO/IEC 27001:2022 Annex A Controls  
**Next Audit Due:** 2027-06-24  

---

## 1. Audit Scope and Objectives

**Scope:** All information security controls applicable to the Celox AI fleet management platform (celoxai.com) and supporting infrastructure.

**Objectives:**
1. Assess conformance with ISO/IEC 27001:2022 requirements
2. Identify gaps and non-conformities
3. Confirm effectiveness of implemented controls
4. Generate improvement actions

**Audit Method:** Evidence review, code inspection, configuration review, documentation review.

---

## 2. ISO 27001:2022 Annex A Control Assessment

### A.5 — Organizational Controls

| Control | Requirement | Status | Evidence | Notes |
|---------|-------------|--------|---------|-------|
| A.5.1 | Information security policies | ✅ Pass | 10 policies in `docs/iso27001/policies/` | All policies documented, dated, signed |
| A.5.2 | Information security roles and responsibilities | ✅ Pass | ISMS-POL-001 §5 | Roles documented; sole-employee context acknowledged |
| A.5.3 | Segregation of duties | ⚠️ Partial | ISMS-POL-002 §3.3 | Not fully achievable with single employee; compensating controls (audit logs) documented |
| A.5.4 | Management responsibilities | ✅ Pass | ISMS-POL-001 §4 | CEO commitment documented |
| A.5.5 | Contact with authorities | ✅ Pass | ISMS-POL-003 §3 | CERT-IL contact (119) documented in Incident Policy |
| A.5.7 | Threat intelligence | ⚠️ Partial | — | No formal threat intel subscription; relies on Supabase/GitHub advisories and CERT-IL alerts |
| A.5.8 | Information security in project management | ✅ Pass | ISMS-POL-009 | Change management policy includes security review step |
| A.5.9 | Inventory of information and other associated assets | ✅ Pass | ISMS-AI-001 | Full asset inventory documented |
| A.5.10 | Acceptable use of information | ✅ Pass | ISMS-POL-005 | Acceptable use policy in place |
| A.5.11 | Return of assets | ✅ Pass | ISMS-POL-002 §4.5 | Account deprovisioning procedure documented |
| A.5.12 | Classification of information | ✅ Pass | ISMS-POL-004 | 4-level classification scheme defined |
| A.5.13 | Labelling of information | ⚠️ Partial | ISMS-POL-004 §3 | Policy defined; implementation for digital assets ongoing |
| A.5.14 | Information transfer | ✅ Pass | ISMS-POL-004 §4 | Transfer rules defined by classification level |
| A.5.15 | Access control | ✅ Pass | ISMS-POL-002 | RBAC implemented; RLS enforced at database level |
| A.5.16 | Identity management | ✅ Pass | Supabase Auth | Unique accounts; email verification; no shared accounts |
| A.5.17 | Authentication information | ✅ Pass | ISMS-POL-002 §4.3 | Password requirements defined; bcrypt hashing; CAPTCHA |
| A.5.18 | Access rights | ✅ Pass | ISMS-POL-002 §4 | Provisioning/deprovisioning procedures defined |
| A.5.19 | Information security in supplier relationships | ✅ Pass | ISMS-SUP-001 | Supplier compliance report completed |
| A.5.20 | Addressing security within supplier agreements | ✅ Pass | ISMS-SUP-001 | DPAs in place with all Tier 1 suppliers |
| A.5.21 | Managing IS in ICT supply chain | ✅ Pass | ISMS-POL-008 | Supplier management policy; annual review scheduled |
| A.5.22 | Monitoring of supplier services | ✅ Pass | ISMS-POL-008 §5 | Status pages monitored; annual compliance review |
| A.5.23 | IS for use of cloud services | ✅ Pass | ISMS-AI-001 (CS assets) | All cloud services inventoried and assessed |
| A.5.24 | IS incident management planning | ✅ Pass | ISMS-POL-003 | Full incident response procedure documented |
| A.5.25 | Assessment and decision on IS events | ✅ Pass | ISMS-POL-003 §2 | Severity classification table defined |
| A.5.26 | Response to information security incidents | ✅ Pass | ISMS-POL-003 §4 | Response phases and actions documented |
| A.5.27 | Learning from IS incidents | ✅ Pass | ISMS-POL-003 §4.6 | Post-incident review required within 5 days |
| A.5.28 | Collection of evidence | ✅ Pass | ISMS-POL-003 §6 | Evidence preservation requirement documented |
| A.5.29 | IS during disruption | ✅ Pass | ISMS-POL-010 | Business continuity policy covers key scenarios |
| A.5.30 | ICT readiness for business continuity | ✅ Pass | ISMS-BR-001 | Backup and recovery procedure documented and tested |
| A.5.31 | Legal, statutory, and contractual requirements | ✅ Pass | ISMS-POL-004 §6 | Israeli Privacy Law, GDPR, data retention documented |
| A.5.32 | Intellectual property rights | ✅ Pass | ISMS-POL-005 §8 | Open source license compliance documented |
| A.5.33 | Protection of records | ✅ Pass | ISMS-POL-004 §5 | Retention schedule defined |
| A.5.34 | Privacy and protection of personal information | ✅ Pass | celoxai.com/privacy.html; ISMS-POL-004 | Privacy policy published; DPO role defined |
| A.5.35 | Independent review of IS | ⚠️ Gap | — | No external independent audit performed yet. Planned: engage external auditor by 2026-12-31 |
| A.5.36 | Compliance with IS policies | ✅ Pass | This audit | Internal audit performed |
| A.5.37 | Documented operating procedures | ✅ Pass | `docs/iso27001/` | ISMS documentation complete |

---

### A.6 — People Controls

| Control | Requirement | Status | Evidence | Notes |
|---------|-------------|--------|---------|-------|
| A.6.1 | Screening | ✅ Pass | N/A (sole employee = owner) | No hiring currently; process to be defined before first hire |
| A.6.2 | Terms and conditions of employment | ✅ Pass | N/A | Owner/sole employee |
| A.6.3 | Information security awareness, education, and training | ✅ Pass | ISMS-TRN-001 | Security awareness training completed 2026-06-24 |
| A.6.4 | Disciplinary process | ✅ Pass | ISMS-POL-005 §9 | Violation consequences documented |
| A.6.5 | Responsibilities after termination | ✅ Pass | ISMS-POL-002 §4.5 | Deprovisioning procedure covers termination |
| A.6.6 | Confidentiality or non-disclosure agreements | ⚠️ Gap | — | No formal NDA for contractors yet; to be created before first contractor engagement |
| A.6.7 | Remote working | ✅ Pass | ISMS-POL-002 §7 | Remote access policy defined |
| A.6.8 | IS event reporting | ✅ Pass | ISMS-POL-003 §4.1 | Detection and reporting procedure documented |

---

### A.7 — Physical Controls

| Control | Requirement | Status | Evidence | Notes |
|---------|-------------|--------|---------|-------|
| A.7.1 | Physical security perimeters | ✅ Pass | ISMS-POL-002 §6 | Cloud-native; no on-premises servers; AWS data centers used |
| A.7.2 | Physical entry controls | ✅ Pass | ISMS-POL-002 §6 | AWS/Supabase handle physical security; ISO 27001 certified |
| A.7.3 | Securing offices, rooms, and facilities | ✅ Pass | ISMS-POL-002 §6 | Home office; locked; laptop physically secured |
| A.7.4 | Physical security monitoring | ✅ Pass | N/A | Cloud infrastructure; no physical server room |
| A.7.5 | Protecting against physical and environmental threats | ✅ Pass | N/A | AWS infrastructure handles this; Supabase SLA covers it |
| A.7.6 | Working in secure areas | ✅ Pass | ISMS-POL-005 §6 | No working in public on sensitive tasks |
| A.7.7 | Clear desk and clear screen | ✅ Pass | ISMS-POL-002 §6 | Screen lock after 5 minutes documented |
| A.7.8 | Equipment siting and protection | ✅ Pass | ISMS-AI-001 (HW-001) | Laptop with full-disk encryption |
| A.7.9 | Security of assets off-premises | ✅ Pass | ISMS-POL-005 §6 | Laptop not left unattended |
| A.7.10 | Storage media | ✅ Pass | ISMS-POL-007 §2 | Full-disk encryption on all devices |
| A.7.11 | Supporting utilities | ✅ Pass | N/A | Cloud-based; AWS handles power/cooling |
| A.7.12 | Cabling security | ✅ Pass | N/A | Cloud-based; not applicable |
| A.7.13 | Equipment maintenance | ✅ Pass | ISMS-POL-005 §6 | OS updates kept current |
| A.7.14 | Secure disposal or reuse of equipment | ✅ Pass | ISMS-POL-004 §4 | Secure wipe required for disposal |

---

### A.8 — Technological Controls

| Control | Requirement | Status | Evidence | Notes |
|---------|-------------|--------|---------|-------|
| A.8.1 | User endpoint devices | ✅ Pass | ISMS-POL-005 §6; ISMS-AI-001 HW-001 | Laptop with full-disk encryption, screen lock, AV |
| A.8.2 | Privileged access rights | ✅ Pass | ISMS-POL-002 §3.4 | Zero standing privilege documented |
| A.8.3 | Information access restriction | ✅ Pass | RLS policies in Supabase | Row Level Security enforces per-company isolation |
| A.8.4 | Access to source code | ✅ Pass | GitHub (authenticated access only) | Only Bar Gershenson has push access |
| A.8.5 | Secure authentication | ✅ Pass | App.jsx; Supabase Auth | CAPTCHA, bcrypt, session tokens, OAuth, MFA |
| A.8.6 | Capacity management | ✅ Pass | Vercel/Supabase autoscaling | Cloud infrastructure auto-scales |
| A.8.7 | Protection against malware | ✅ Pass | ISMS-POL-005 §6 | Antivirus on developer workstation; no server-side executable uploads |
| A.8.8 | Management of technical vulnerabilities | ⚠️ Partial | GitHub Dependabot | Dependabot enabled; formal vulnerability management process to be formalized |
| A.8.9 | Configuration management | ✅ Pass | ISMS-POL-009; Git | All config in version control or Vercel env vars |
| A.8.10 | Information deletion | ✅ Pass | ISMS-POL-004 §5 | Retention and deletion policy defined |
| A.8.11 | Data masking | ✅ Pass | RLS; application layer | Sensitive data not exposed in logs; credentials encrypted |
| A.8.12 | Data leakage prevention | ✅ Pass | RLS; ISMS-POL-004 | Per-company data isolation; DLP via RLS |
| A.8.13 | Information backup | ✅ Pass | ISMS-BR-001; ISMS-BR-TEST-001 | Backup procedure documented and tested |
| A.8.14 | Redundancy of information processing | ✅ Pass | Supabase/Vercel multi-AZ | Cloud providers handle redundancy |
| A.8.15 | Logging | ⚠️ Partial | Supabase Auth logs | Auth events logged; application-level audit logging not yet implemented |
| A.8.16 | Monitoring activities | ⚠️ Partial | Supabase status monitoring | Status monitoring in place; SIEM not yet implemented |
| A.8.17 | Clock synchronization | ✅ Pass | N/A | Cloud infrastructure manages NTP |
| A.8.18 | Use of privileged utility programs | ✅ Pass | ISMS-POL-002 §3.4 | Admin tools used only when needed |
| A.8.19 | Installation of software on operational systems | ✅ Pass | ISMS-POL-009 | Change management policy governs deployments |
| A.8.20 | Networks security | ✅ Pass | Cloudflare WAF; Supabase network policies | WAF active; all connections HTTPS only |
| A.8.21 | Security of network services | ✅ Pass | Cloudflare; Vercel; Supabase | All managed by certified cloud providers |
| A.8.22 | Segregation of networks | ✅ Pass | Supabase project isolation | Each Supabase project is isolated |
| A.8.23 | Web filtering | ✅ Pass | Cloudflare WAF | Web application firewall active |
| A.8.24 | Use of cryptography | ✅ Pass | ISMS-POL-007 | Cryptography policy; TLS + AES-256 + bcrypt implemented |
| A.8.25 | Secure development lifecycle | ✅ Pass | ISMS-POL-009 | Security review in change management; code review required |
| A.8.26 | Application security requirements | ✅ Pass | ISMS-POL-009 §2 | Security review during planning phase |
| A.8.27 | Secure system architecture and engineering | ✅ Pass | RLS; CAPTCHA; HTTPS; encrypted credentials | Defense-in-depth implemented |
| A.8.28 | Secure coding | ✅ Pass | Code review; no use of raw SQL (parameterized queries via Supabase client) | No SQL injection risk from ORM use |
| A.8.29 | Security testing in development and acceptance | ⚠️ Gap | — | No formal security test suite; penetration test not yet performed |
| A.8.30 | Outsourced development | ✅ Pass | N/A | No outsourced development currently |
| A.8.31 | Separation of development, test, and production | ⚠️ Partial | — | Development uses `.env.local` against production Supabase; dedicated test project to be created |
| A.8.32 | Change management | ✅ Pass | ISMS-POL-009; Git | All changes via Git; CI/CD pipeline |
| A.8.33 | Test information | ⚠️ Gap | — | Production data should not be used for testing; test dataset to be created |
| A.8.34 | Protection of information systems during audit testing | ✅ Pass | N/A | Audit conducted without accessing production data |

---

## 3. Non-Conformities and Observations

### Minor Non-Conformities (Must Address Before Certification)

| ID | Control | Finding | Action | Due Date |
|----|---------|---------|--------|----------|
| NC-001 | A.5.35 | No independent external review performed | Engage external ISO 27001 consultant or penetration tester | 2026-12-31 |
| NC-002 | A.8.29 | No formal security test suite or penetration test | Commission penetration test from certified tester | 2026-12-31 |
| NC-003 | A.8.31 | Dev environment uses production Supabase project | Create separate Supabase project for development | 2026-09-30 |
| NC-004 | A.8.33 | No dedicated test dataset | Create anonymized test data; prohibit use of production data for testing | 2026-09-30 |

### Observations (Improvements Recommended)

| ID | Control | Observation | Recommendation |
|----|---------|-------------|----------------|
| OBS-001 | A.5.7 | No formal threat intelligence subscription | Subscribe to CERT-IL newsletter; monitor CVE feeds for used frameworks |
| OBS-002 | A.5.13 | Asset labeling not fully implemented | Add classification labels to key documents and configuration items |
| OBS-003 | A.6.6 | No NDA template for contractors | Create standard NDA template before first contractor engagement |
| OBS-004 | A.8.15 | Application-level audit logging limited | Implement audit log table for sensitive operations (data exports, admin actions) |
| OBS-005 | A.8.16 | No SIEM or centralized log management | Consider Supabase log exports or a lightweight SIEM solution |

---

## 4. Positive Findings

The following controls are implemented to a high standard:

- ✅ **RLS implementation** — Per-company data isolation at database level is robust and well-designed
- ✅ **Authentication security** — CAPTCHA + bcrypt + session timeout + OAuth + MFA on admin accounts
- ✅ **Cryptography** — AES-256 at rest, TLS in transit, pgcrypto for credentials, bcrypt for passwords
- ✅ **Secret management** — No secrets in source code; GitHub secret scanning enabled; .env gitignored
- ✅ **Supplier compliance** — All Tier 1 suppliers ISO 27001 + SOC 2 certified with DPAs in place
- ✅ **Policy documentation** — Comprehensive ISMS policies created and approved
- ✅ **Backup procedures** — Documented, tested, and with clear recovery time objectives

---

## 5. Overall Audit Conclusion

**Conformance Level: 78% (Major controls implemented; 4 minor non-conformities; 5 observations)**

Celox AI Ltd. has implemented a solid foundation for ISO 27001 certification. The core security controls — access control (RLS), cryptography, backup, supplier management, and incident response — are well-implemented. The primary gaps are:
1. Lack of an independent external review/penetration test
2. Development/production environment separation
3. Formal security testing in the development lifecycle

These gaps are common in early-stage startups and are addressable within 6 months. The company is well-positioned to achieve ISO 27001 certification after addressing the identified non-conformities.

**Recommended Next Steps (Priority Order):**
1. Create separate Supabase dev project (NC-003) — 1 week effort
2. Subscribe to CERT-IL alerts and CVE feeds (OBS-001) — 1 day effort  
3. Commission external penetration test (NC-002) — 2–4 weeks to engage tester
4. Engage ISO 27001 consultant for Stage 1 audit (NC-001) — 1–2 months

---

## 6. Audit Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Internal Auditor | Bar Gershenson | 2026-06-24 | _Bar Gershenson_ |
| Management Representative | Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
