# Cryptography Policy
**Document ID:** ISMS-POL-007  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure the proper and effective use of cryptography to protect the confidentiality, authenticity, and integrity of Celox AI information.

## 2. Encryption Standards

### 2.1 Data in Transit
| Connection | Protocol | Minimum Standard |
|-----------|---------|-----------------|
| User browser ↔ Celox AI app | HTTPS | TLS 1.2 (TLS 1.3 preferred) |
| App ↔ Supabase API | HTTPS | TLS 1.2+ |
| GPS device ↔ GPS ingest function | HTTPS | TLS 1.2+ |
| All other API connections | HTTPS | TLS 1.2+ |

HTTP connections are automatically redirected to HTTPS. Vercel and Cloudflare enforce HTTPS termination.

### 2.2 Data at Rest
| Data Type | Encryption Standard | Where |
|-----------|-------------------|-------|
| Database (all tables) | AES-256 | Supabase (AWS RDS encryption) |
| Integration API credentials | AES-256 via pgcrypto | PostgreSQL `store_integration_credential()` RPC |
| Backups | AES-256 | Supabase backup encryption |
| Developer laptop / disk | AES-128 or AES-256 (BitLocker/FileVault) | Local workstation |

### 2.3 Password Hashing
- User passwords are hashed using **bcrypt** (cost factor ≥ 10) managed by Supabase Auth
- Passwords are never stored in plaintext
- Password hashes are never logged or transmitted

### 2.4 JWT Tokens
- Session tokens use **RS256** (RSA + SHA-256) as managed by Supabase Auth
- Token expiry: 8 hours (matching idle session timeout)
- Refresh tokens are single-use and rotated on each use

## 3. Key Management

### 3.1 Key Types and Storage

| Key Type | Storage Location | Access |
|----------|-----------------|--------|
| Supabase anon key | Vercel environment variables | Frontend (safe — RLS enforced) |
| Supabase service role key | Vercel environment variables (server-side only) | Backend only |
| Database encryption keys | Managed by Supabase/AWS KMS | Infrastructure level |
| pgcrypto integration encryption key | Supabase Vault / environment variable | RPC functions only |
| Cloudflare Turnstile secret | Vercel environment variables (server-side) | Backend only |

### 3.2 Key Rotation
| Key | Rotation Frequency | Trigger for Immediate Rotation |
|-----|-------------------|-------------------------------|
| Supabase JWT secret | Annually | Suspected compromise |
| Integration encryption key | Annually | Suspected compromise |
| Webhook tokens (per company) | Customer-controlled | On request or incident |
| OAuth client secrets | Annually | Suspected compromise |

### 3.3 Key Compromise Response
If a key is suspected compromised:
1. Rotate immediately — do not wait for confirmation
2. Log as a P1/P2 security incident
3. Audit all recent access using the compromised key
4. Notify affected parties if data exposure occurred

### 3.4 Prohibited Practices
- Do not commit secrets to source code (GitHub secret scanning is enabled)
- Do not store keys in client-side code or browser storage
- Do not transmit keys via email or messaging
- Do not use deprecated algorithms (MD5, SHA-1, DES, RC4)
- Do not use self-signed certificates for production

## 4. Certificate Management

| Certificate | Provider | Renewal |
|------------|---------|---------|
| celoxai.com TLS cert | Cloudflare / Let's Encrypt (auto) | Automatic |
| Supabase project TLS | Supabase (managed) | Automatic |
| Vercel deployment TLS | Vercel (managed) | Automatic |

All certificates use RSA-2048 or ECDSA P-256 minimum.

## 5. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
