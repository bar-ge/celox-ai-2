# Access Control Policy
**Document ID:** ISMS-POL-002  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

This policy defines requirements for controlling access to Celox AI information systems, data, and infrastructure to ensure that only authorized individuals can access resources appropriate to their role.

## 2. Scope

Covers all access to:
- Celox AI web application (celoxai.com)
- Supabase database and storage
- Vercel deployment infrastructure
- GitHub source code repository
- Cloudflare account
- Administrative dashboards and APIs

## 3. Access Control Principles

### 3.1 Least Privilege
Every user, process, and system is granted the minimum access required to perform its function. No exceptions.

### 3.2 Need-to-Know
Access to sensitive data is granted only to those with a documented business need.

### 3.3 Segregation of Duties
Where possible, critical functions are separated so no single person can complete a sensitive action alone. Where not possible (sole-employee context), compensating controls (audit logs) are used.

### 3.4 Zero Standing Privilege
Privileged access (admin, database root) is not held permanently. It is acquired only when needed and released immediately after.

## 4. User Account Management

### 4.1 Account Provisioning
- All user accounts are created by the System Administrator
- Accounts require a documented business justification
- Each user receives a unique account — shared accounts are prohibited
- New accounts are subject to email verification

### 4.2 Authentication Requirements
| System | Minimum Requirement |
|--------|-------------------|
| Celox AI application | Email + password (min. 8 chars) + Cloudflare Turnstile CAPTCHA |
| Supabase dashboard | Strong password + MFA (TOTP) |
| GitHub | Strong password + MFA (hardware key preferred) |
| Vercel dashboard | Strong password + MFA |
| Cloudflare dashboard | Strong password + MFA |

### 4.3 Password Requirements
- Minimum 8 characters (12+ recommended)
- Mix of uppercase, lowercase, numbers, symbols
- Not reused from other services
- Stored only as Supabase-managed bcrypt hash — never in plaintext
- Changed immediately upon suspected compromise

### 4.4 Multi-Factor Authentication (MFA)
MFA is mandatory for all administrative accounts (Supabase, GitHub, Vercel, Cloudflare). The Celox AI application offers MFA as an option for users and will make it mandatory for master-level accounts in a future release.

### 4.5 Account Deprovisioning
- Customer accounts are deactivated upon contract termination
- Access is removed within 24 hours of termination notice
- Deprovisioned accounts are logged

### 4.6 Periodic Access Review
Access rights are reviewed quarterly. Unused accounts (no login in 90 days) are deactivated pending review.

## 5. Application-Level Access Control

### 5.1 Role-Based Access Control (RBAC)
The Celox AI application implements RBAC with the following roles:

| Role | Access Level |
|------|-------------|
| `master` | Full company admin — can manage all users, vehicles, drivers, integrations |
| `manager` | Can manage drivers and vehicles; cannot manage users or billing |
| `viewer` | Read-only access to assigned data |

### 5.2 Company Isolation
All data is isolated per company using Row Level Security (RLS) policies in PostgreSQL. Users from Company A cannot access data from Company B under any circumstances. RLS is enforced at the database level using `my_company_id()` custom function.

### 5.3 API Access
- All API calls require a valid Supabase JWT session token
- JWT tokens expire after 8 hours (matching the session idle timeout)
- Webhook endpoints (GPS ingest) use unique per-company webhook tokens
- Integration credentials are stored encrypted using pgcrypto (AES-256)

## 6. Physical Access

Celox AI Ltd. operates as a cloud-native company with no on-premises servers. Physical access is controlled by:
- AWS data centers (via Supabase) — ISO 27001 and SOC 2 certified
- No personal servers or on-premises hardware in scope

The primary workstation (developer laptop) must be:
- Protected with full-disk encryption (BitLocker or FileVault)
- Locked with a PIN/password after 5 minutes of inactivity
- Not left unattended in public places

## 7. Remote Access

- All access to production systems is via HTTPS (TLS 1.2+)
- No VPN required — all access is authenticated at the application layer
- SSH access to any server is prohibited (cloud-managed infrastructure only)

## 8. Monitoring and Logging

- All login attempts (success and failure) are logged by Supabase Auth
- Failed login attempts trigger alerts after 5 consecutive failures
- Audit logs are retained for a minimum of 12 months

## 9. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
