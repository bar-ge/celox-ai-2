# Data Classification Policy
**Document ID:** ISMS-POL-004  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure that Celox AI information assets receive an appropriate level of protection based on their sensitivity, value, and legal requirements.

## 2. Classification Levels

### Level 1 — RESTRICTED (Highest)
Highly sensitive information. Exposure would cause severe harm to individuals, customers, or the company.

**Examples in Celox AI:**
- Driver personal data (name, ID number, license, phone)
- Driver consent records
- Encryption keys and database credentials
- Customer company financial information
- Integration API credentials (stored encrypted)
- Supabase service role key
- Any data subject to Israeli Privacy Protection Law

**Controls required:**
- Encrypted at rest (AES-256) and in transit (TLS 1.3)
- Access logged and audited
- Access limited to minimum necessary personnel
- Not stored in logs, emails, or chat messages
- Deletion requires secure wipe

### Level 2 — CONFIDENTIAL
Sensitive business information. Exposure would cause significant harm.

**Examples in Celox AI:**
- Vehicle fleet data (plate numbers, types, assignments)
- GPS location history
- Driver shift records and schedules
- Customer company names and contact details
- Internal company branch structures
- Business configuration and operational data

**Controls required:**
- Encrypted at rest and in transit
- Access restricted to authorized users within the company
- Not shared externally without customer authorization

### Level 3 — INTERNAL
Internal operational information. Limited harm if disclosed.

**Examples in Celox AI:**
- Aggregated fleet statistics
- Non-personal system configuration
- Internal process documentation
- Support tickets (non-sensitive)

**Controls required:**
- Stored on company-approved systems
- Not published publicly
- Access limited to Celox AI staff and authorized customers

### Level 4 — PUBLIC
Information intended for public access. No harm if disclosed.

**Examples in Celox AI:**
- Privacy Policy (public/privacy.html)
- Terms of Service (public/terms.html)
- Marketing materials
- Product documentation

**Controls required:**
- Standard web security practices
- Integrity checks to ensure content is not altered

## 3. Labeling

Documents should be labeled with their classification level in the header or footer. Digital files should be named or tagged to indicate classification where practical.

## 4. Handling Rules by Classification

| Activity | RESTRICTED | CONFIDENTIAL | INTERNAL | PUBLIC |
|----------|-----------|-------------|----------|--------|
| Email transmission | Prohibited (use encrypted channel) | Acceptable (encrypted if external) | Acceptable | Acceptable |
| Storage in cloud | Encrypted only | Encrypted | Standard | Standard |
| Sharing with customers | Never raw; via app UI only | Within their own data | With permission | Yes |
| Sharing with third parties | Prohibited without DPA | NDA required | Case by case | Yes |
| Disposal | Secure wipe / deletion | Standard deletion | Standard deletion | N/A |
| Backup | Encrypted | Encrypted | Standard | Standard |

## 5. Data Retention

| Data Type | Retention Period | Legal Basis |
|-----------|-----------------|-------------|
| Driver personal data | Duration of contract + 7 years | Israeli tax/labor law |
| GPS location data | 2 years | Contractual / operational |
| Audit logs | 12 months minimum | ISO 27001 requirement |
| Incident records | 3 years | ISO 27001 requirement |
| Security training records | Duration of employment + 3 years | Compliance evidence |
| Customer data (post-contract) | 90 days then deleted | Privacy law |

## 6. Data Subject Rights

Under Israeli Privacy Protection Law and GDPR (for EU customers):
- **Right of Access:** Respond within 30 days
- **Right of Correction:** Correct inaccurate data promptly
- **Right of Deletion:** Delete where no legal hold applies
- All requests to: privacy@celoxai.com

## 7. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
