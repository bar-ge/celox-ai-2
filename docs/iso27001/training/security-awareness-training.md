# Information Security Awareness Training
**Document ID:** ISMS-TRN-001  
**Version:** 1.0  
**Date:** 2026-06-24  
**Prepared by:** Bar Gershenson, CEO / Security Officer  
**Target Audience:** All Celox AI personnel (currently: Bar Gershenson)  
**Estimated Duration:** 2 hours  

---

## Module 1: Why Information Security Matters at Celox AI

### What We Protect

As a fleet management SaaS company, Celox AI handles:
- **Driver personal data** — names, ID numbers, license details, phone numbers
- **Vehicle GPS location** — real-time and historical positions of customer fleets
- **Company business data** — operational data our customers depend on daily
- **Authentication credentials** — login data for hundreds of users

**The impact of a security breach:**
- Legal liability under the Israeli Privacy Protection Law (fines, criminal charges)
- Loss of customer trust — customers choose us to protect their data
- Business closure — a serious breach could end Celox AI
- Personal reputational damage
- Regulatory investigation

**Our responsibility:** Every person at Celox AI — right now, just Bar Gershenson — is responsible for protecting this data. Security is not an IT problem; it is everyone's problem.

---

## Module 2: Password and Account Security

### 2.1 Strong Password Principles

❌ **Never use:**
- Passwords shorter than 12 characters
- Personal information (birth date, name, company name)
- Common words or patterns (password123, qwerty, abc123)
- The same password on multiple sites

✅ **Always use:**
- Minimum 12 characters with uppercase, lowercase, numbers, symbols
- A different password for every account
- A password manager (e.g., 1Password, Bitwarden, KeePass)

### 2.2 Multi-Factor Authentication (MFA)

MFA adds a second layer: even if your password is stolen, the attacker cannot log in without your second factor.

**MFA is mandatory on:**
- Supabase dashboard
- GitHub account
- Vercel dashboard
- Cloudflare account
- Gmail/Google account (used for admin notifications)

**Preferred MFA methods (strongest to weakest):**
1. ✅ Hardware security key (YubiKey) — phishing-resistant
2. ✅ Authenticator app (Google Authenticator, Authy, 1Password)
3. ⚠️ SMS — acceptable but can be SIM-swapped; avoid for critical accounts

**Action Required:** Verify MFA is enabled on all admin accounts listed above.

### 2.3 Session Management

- Do not remain logged into admin dashboards when not actively using them
- Log out from shared or public computers
- The Celox AI application automatically logs users out after 8 hours of inactivity

---

## Module 3: Phishing and Social Engineering

Phishing is the #1 way attackers compromise accounts. As the sole administrator of Celox AI systems, you are a high-value target.

### 3.1 How to Recognize Phishing

**Red flags in emails:**
- Unexpected urgency: "Your account will be suspended in 24 hours!"
- Sender email doesn't match the company (e.g., support@supabase-help.com instead of @supabase.io)
- Links that look similar but aren't (supabase.co vs supabase-co.com)
- Requests for passwords, MFA codes, or API keys via email
- Unexpected password reset emails you didn't request

### 3.2 What to Do if You Suspect Phishing

1. Do NOT click any link in the email
2. Do NOT download any attachment
3. If it claims to be from Supabase/Vercel/GitHub, go directly to their website by typing the URL manually
4. Report to privacy@celoxai.com for logging

### 3.3 What to Do if You Were Phished

If you clicked a link or entered credentials on a suspicious site:
1. Immediately change the compromised password
2. Revoke all active sessions on the affected service
3. Check for unauthorized activity
4. Log as a security incident (ISMS-POL-003)
5. Rotate any API keys or secrets that may have been exposed

---

## Module 4: Protecting Customer Data

### 4.1 Data Classification Rules (Quick Reference)

| What | Classification | How to Handle |
|------|--------------|--------------|
| Driver names, IDs, phone numbers | RESTRICTED | Never share outside the app; encrypted at all times |
| GPS/location history | CONFIDENTIAL | Only accessible to authorized company users |
| Vehicle fleet data | CONFIDENTIAL | Per-company isolation enforced |
| API keys and secrets | RESTRICTED | Only in Vercel env vars; never in email or chat |
| ISMS policies | INTERNAL | Available to staff; not published publicly |
| Privacy policy, terms | PUBLIC | Published on website |

### 4.2 What You Must Never Do with Customer Data

- ❌ Export customer data to a personal email or Google Drive
- ❌ Share screenshots containing personal data in chat messages
- ❌ Discuss specific customers or their data in public or semi-public forums
- ❌ Use real customer data for development/testing
- ❌ Store customer data on personal devices without encryption

### 4.3 Data Subject Rights

If a customer or driver contacts you about their data:
- **Access request:** Provide within 30 days
- **Deletion request:** Delete within 30 days (unless legal hold applies)
- **All requests to:** privacy@celoxai.com
- **Log all requests** with date, what was requested, and action taken

---

## Module 5: Secure Development Practices

### 5.1 Secrets and API Keys

- ✅ Store all secrets in Vercel environment variables
- ✅ Use `.env.local` locally (never committed to Git — `.gitignore` enforced)
- ✅ GitHub secret scanning will alert if a key is accidentally committed
- ❌ Never hardcode API keys in source code
- ❌ Never paste API keys into Slack, email, or GitHub issues
- ❌ Never log secrets to the console

**If you accidentally commit a secret:**
1. Treat as a security incident immediately
2. Rotate the exposed key BEFORE doing anything else
3. Force-push to remove from Git history (or use `git filter-repo`)
4. Audit all access using the exposed key since the time of exposure

### 5.2 Input Validation and Security

- All user input is validated before processing
- Database queries use the Supabase client (parameterized) — no raw SQL string concatenation
- Row Level Security enforces data isolation at the database level — verify RLS on all new tables

### 5.3 Dependency Security

- Keep npm dependencies updated; check for security advisories
- Review GitHub Dependabot alerts weekly
- Do not add new dependencies without evaluating their security track record
- Run `npm audit` before major deployments

### 5.4 Deployment Security

- All deployments go through the GitHub → Vercel CI/CD pipeline
- Never deploy directly from local machine to production without going through Git
- Review the diff before pushing to `main`
- Verify the deployment in production after each push

---

## Module 6: Incident Reporting

### When to Report a Security Incident

Report immediately if you:
- Receive an unusual login alert from any admin account
- Notice data you didn't create or change has been modified
- Get a GitHub secret scanning alert
- Believe you clicked a phishing link
- Find that an API key may have been exposed
- Receive a customer complaint about unauthorized access to their data

### How to Report

1. Log the incident in the Incident Register (ISMS-POL-003 template)
2. Classify severity (P1–P4)
3. Take immediate containment action if P1/P2
4. Contact CERT-IL if critical infrastructure affected: cert@gov.il / 119

**Remember:** Reporting late is always worse than reporting early. Even if you're not sure it's an incident — report it.

---

## Module 7: Physical and Workstation Security

- Lock your screen when stepping away from your laptop (Win+L or Ctrl+Cmd+Q)
- Use full-disk encryption (BitLocker on Windows / FileVault on Mac)
- Do not work on customer-sensitive information in public cafes or transport without a privacy screen
- Keep your laptop OS and security software up to date
- Do not connect to unsecured public Wi-Fi when accessing admin dashboards
- If your laptop is lost or stolen: immediately revoke all sessions from a secondary device and report as a P1/P2 incident

---

## Module 8: Legal and Compliance

### Israeli Privacy Protection Law (5741-1981)

Key requirements that apply to Celox AI:
- **Consent required** before collecting driver personal data (✅ implemented in app)
- **Data minimization** — collect only what is necessary
- **Security obligation** — appropriate security measures must be implemented
- **Breach notification** — notify affected individuals and Privacy Protection Authority within 72 hours of discovering a breach
- **Data subject rights** — drivers can request access to and deletion of their data

### What Happens if We Violate Privacy Law

- Criminal liability (up to 5 years imprisonment for severe violations)
- Civil liability (compensation to affected individuals)
- Regulatory fines
- Reputational damage — loss of customer trust

**This is why every control in our ISMS exists.**

---

## Knowledge Check

Answer these questions to confirm understanding:

1. A customer's employee calls saying they've forgotten their password and asks you to reset it for them. What do you do?
   - **Correct:** Direct them to use the "Forgot Password" feature in the app. Never reset passwords manually or share credentials.

2. You receive an email from "Supabase Support" asking you to confirm your API key. What do you do?
   - **Correct:** Do not reply. Go directly to app.supabase.com by typing the URL. Report the email as phishing.

3. A developer you're considering hiring asks to see sample data from the system. What do you do?
   - **Correct:** Create an anonymized test dataset. Never share real customer data with anyone outside the company without a signed NDA and DPA.

4. You accidentally push a commit that includes your Supabase service role key. What is the FIRST thing you do?
   - **Correct:** Rotate the key immediately in the Supabase dashboard before doing anything else.

5. How long do you have to report a data breach to the Israeli Privacy Protection Authority?
   - **Correct:** 72 hours.

---

*Training completed when the completion record (ISMS-TRN-RECORD-001) is signed.*
