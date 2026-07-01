# Risk Management Policy
**Document ID:** ISMS-POL-006  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To establish a systematic approach for identifying, assessing, treating, and monitoring information security risks at Celox AI Ltd.

## 2. Risk Assessment Methodology

### 2.1 Risk Identification
Risks are identified through:
- Regular review of the asset inventory
- Threat intelligence (CERT-IL advisories, CVE feeds)
- Supplier security updates (Supabase, Vercel, GitHub)
- Post-incident analysis
- Annual risk assessment review

### 2.2 Risk Scoring

Risks are scored using the formula:  
**Risk Score = Likelihood × Impact**

| Score | Likelihood | Meaning |
|-------|-----------|---------|
| 1 | Very Low | May occur in exceptional circumstances (once in 10+ years) |
| 2 | Low | Could occur but unlikely (once in 5 years) |
| 3 | Medium | Might occur at some time (once per year) |
| 4 | High | Will probably occur (multiple times per year) |
| 5 | Very High | Is expected to occur regularly |

| Score | Impact | Meaning |
|-------|--------|---------|
| 1 | Negligible | No measurable effect on operations or reputation |
| 2 | Minor | Minor disruption; resolved quickly; no data loss |
| 3 | Moderate | Significant disruption; limited data exposure; manageable recovery |
| 4 | Major | Major disruption; significant data breach; regulatory investigation |
| 5 | Critical | Catastrophic data breach; business-threatening; criminal liability |

### 2.3 Risk Rating

| Score | Rating | Treatment Required |
|-------|--------|-------------------|
| 1–4 | Low | Accept or monitor |
| 5–9 | Medium | Treat within 6 months |
| 10–14 | High | Treat within 3 months |
| 15–25 | Critical | Treat immediately |

### 2.4 Risk Treatment Options

| Option | Definition |
|--------|-----------|
| **Mitigate** | Implement controls to reduce likelihood or impact |
| **Accept** | Consciously accept the risk (with documented justification) |
| **Transfer** | Transfer risk to a third party (insurance, supplier contract) |
| **Avoid** | Cease the activity that creates the risk |

## 3. Risk Register

The full risk register is maintained in: `docs/iso27001/risk-assessment/risk-register.md`

The risk register is reviewed:
- Annually as part of the ISMS management review
- After any security incident
- After significant changes to the system or business
- After major new supplier relationships

## 4. Risk Acceptance

Risks rated Low may be formally accepted by the CEO/Security Officer with documented justification.  
Risks rated Medium or higher must have an active treatment plan.  
Risks rated Critical must be escalated for immediate treatment.

## 5. Risk Treatment Plan

For each risk requiring treatment, document:
1. Risk ID and description
2. Selected treatment option
3. Specific controls to implement
4. Owner responsible for treatment
5. Target completion date
6. Residual risk after treatment

## 6. Monitoring and Review

- Risk register reviewed at minimum annually
- New risks added as identified
- Treatment progress tracked quarterly
- Residual risks re-evaluated after controls are implemented

## 7. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
