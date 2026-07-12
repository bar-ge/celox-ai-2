# Celox AI — תיעוד מערכת ניהול אבטחת מידע (ISMS) לפי ISO 27001

**חברה:** Celox AI Ltd.
**מוצר:** מערכת ניהול צי רכב כשירות (celoxai.com)
**היקף ה-ISMS:** כל המערכות והמידע התומכים בפלטפורמת Celox AI
**תקן:** ISO/IEC 27001:2022
**עודכן לאחרונה:** 2026-07-08
**ממונה אבטחת מידע:** בר גרשונזון

> **הערה על דו-לשוניות:** האנגלית היא שפת המקור הקנונית; העברית היא הגרסה הרשמית למבקרים וללקוחות בישראל. בכל אי-התאמה, גובר המקור האנגלי עד להשלמת סנכרון. קבצים בעברית מסומנים בסיומת `.he.md` לצד המקור.

---

## אינדקס המסמכים

### מדיניות
| מסמך | מזהה | תיאור |
|------|------|-------|
| [מדיניות אבטחת מידע](policies/01-information-security-policy.he.md) | ISMS-POL-001 | מדיניות-על; מחויבות הנהלה |
| [מדיניות בקרת גישה](policies/02-access-control-policy.he.md) | ISMS-POL-002 | חשבונות, אימות, RBAC, RLS |
| [מדיניות תגובה לאירועים](policies/03-incident-response-policy.he.md) | ISMS-POL-003 | סיווג P1–P4, שלבי תגובה, דיווח |
| [מדיניות סיווג מידע](policies/04-data-classification-policy.he.md) | ISMS-POL-004 | מוגבל / חסוי / פנימי / ציבורי |
| [מדיניות שימוש מקובל](policies/05-acceptable-use-policy.he.md) | ISMS-POL-005 | שימושים מותרים ואסורים |
| [מדיניות ניהול סיכונים](policies/06-risk-management-policy.he.md) | ISMS-POL-006 | מתודולוגיית ניקוד וטיפול בסיכונים |
| [מדיניות הצפנה](policies/07-cryptography-policy.he.md) | ISMS-POL-007 | תקני הצפנה; ניהול מפתחות |
| [מדיניות ניהול ספקים](policies/08-supplier-management-policy.he.md) | ISMS-POL-008 | דירוג ספקים; קליטה; ניטור |
| [מדיניות ניהול שינויים](policies/09-change-management-policy.he.md) | ISMS-POL-009 | שינוי סטנדרטי / רגיל / חירום |
| [מדיניות המשכיות עסקית](policies/10-business-continuity-policy.he.md) | ISMS-POL-010 | BCP; תרחישי אסון; תקשורת |

### הערכת סיכונים, נכסים, ספקים, גיבוי, ביקורת והדרכה
| מסמך | מזהה | תיאור |
|------|------|-------|
| [מרשם סיכונים](risk-assessment/risk-register.he.md) | ISMS-RA-001 | 10 סיכונים; ניקוד סבירות×השפעה; טיפול |
| [מצאי נכסים](asset-inventory/asset-inventory.he.md) | ISMS-AI-001 | נכסי מידע, תוכנה, ענן, חומרה, אנשים |
| [דוח עמידת ספקים](supplier-agreements/supplier-compliance-report.he.md) | ISMS-SUP-001 | Supabase, Vercel, Cloudflare, GitHub, Google, Microsoft |
| [נוהל גיבוי ושחזור](backup-recovery/backup-recovery-procedure.he.md) | ISMS-BR-001 | סוגי גיבוי, לוחות, שחזור, RTO/RPO |
| [דוח בדיקת גיבוי](backup-recovery/backup-test-report-2026-06-24.he.md) | ISMS-BR-TEST-001 | אימות גיבוי שנתי |
| [דוח ביקורת פנימית](audit/internal-audit-report-2026-06-24.he.md) | ISMS-AUD-001 | הערכת בקרות נספח A; 78% עמידה |
| [הדרכת מודעות אבטחה](training/security-awareness-training.he.md) | ISMS-TRN-001 | 8 מודולים |
| [רשומת השלמת הדרכה](training/training-completion-record.he.md) | ISMS-TRN-RECORD-001 | רשומות השלמה חתומות |

---

## מפת דרכים להסמכה

| אבן דרך | תאריך יעד | מעמד |
|---------|-----------|------|
| תיעוד ISMS הושלם | 2026-06-24 | ✅ הושלם |
| עמידת ספקים אומתה | 2026-06-24 | ✅ הושלם |
| ביקורת פנימית | 2026-06-24 | ✅ הושלם |
| מבחן חדירה (פנימי) | 2026-07-08 | ✅ הושלם (ראו `docs/security/`) |
| הפרדת סביבות dev/prod | 2026-09-30 | 🔄 בתהליך |
| מבחן חדירה (חיצוני) | 2026-12-31 | 🔄 מתוכנן |
| התקשרות עם גוף הסמכה | 2026-12-31 | 🔄 מתוכנן |
| ביקורת שלב 1 (תיעוד) | 2027-03-01 | 🔄 מתוכנן |
| ביקורת שלב 2 (יישום) | 2027-06-01 | 🔄 מתוכנן |
| **הסמכת ISO 27001** | **2027-06-24** | 🎯 יעד |

---

## מסמכים משלימים בעברית

- [היערכות לתיקון 13 והגנת הפרטיות](../compliance/amendment-13/README.he.md)
- [דוח מבחן חדירה 2026-07](../security/penetration-test-report-2026-07.he.md)
