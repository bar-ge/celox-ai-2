# Change Management Policy
**Document ID:** ISMS-POL-009  
**Version:** 1.0  
**Date:** 2026-06-24  
**Owner:** Bar Gershenson, CEO / Security Officer  
**Review Date:** 2027-06-24  

---

## 1. Purpose

To ensure that changes to Celox AI systems, infrastructure, and software are managed in a controlled manner to minimize security risk and service disruption.

## 2. Change Classification

| Type | Definition | Examples |
|------|-----------|---------|
| **Standard** | Pre-approved, low-risk routine changes | Dependency updates, content changes, UI tweaks |
| **Normal** | Planned change requiring review | New feature, database schema change, new integration |
| **Emergency** | Urgent fix for critical issue | Security patch, P1 incident fix, data corruption fix |

## 3. Change Process

### 3.1 Standard Changes
- Can be applied without additional approval
- Must be committed to Git with descriptive commit message
- Deployed via standard CI/CD pipeline (GitHub → Vercel auto-deploy)
- Verified in production within 30 minutes of deployment

### 3.2 Normal Changes
1. **Plan:** Document the change, reason, affected systems, rollback plan
2. **Review:** Self-review for security implications (SQL injection, auth bypass, data exposure)
3. **Test:** Test in development environment
4. **Approve:** CEO/Security Officer sign-off (can be self-approval for sole operator)
5. **Deploy:** Deploy via CI/CD during low-traffic window
6. **Verify:** Confirm successful deployment and test key functionality
7. **Document:** Update relevant documentation

### 3.3 Emergency Changes
1. Apply the fix immediately to resolve the critical issue
2. Document what was changed and why (within 24 hours)
3. Conduct post-change review within 5 business days
4. Update risk register if a new vulnerability was exploited

## 4. Database Change Management

Database schema changes require special care:
- All schema changes are managed via Supabase migrations
- Migrations must be tested against a copy of production data structure before applying
- Breaking changes (column removal, type changes) require a multi-step migration plan
- RLS policies must be reviewed after schema changes to ensure data isolation is maintained
- Rollback plan must be documented before executing

## 5. Dependency Management

- All npm dependencies are locked via `package-lock.json`
- Dependency updates are reviewed for security advisories before updating
- GitHub Dependabot or manual review used to monitor vulnerable dependencies
- Critical security patches are treated as Emergency changes

## 6. Configuration Management

- All application configuration is stored in Vercel environment variables
- Environment variables are never committed to source code
- Changes to environment variables are logged with the date and reason
- Production environment variables are reviewed quarterly

## 7. Version Control

- All code changes are committed to GitHub
- The `main` branch is protected — changes deployed from `main`
- Commit messages follow the format: `type(scope): description`
- Git tags are used for production releases

## 8. Review and Approval

| Approved by | Date | Signature |
|-------------|------|-----------|
| Bar Gershenson, CEO | 2026-06-24 | _Bar Gershenson_ |
