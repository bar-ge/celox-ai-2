# Competition — Israeli fleet-management market

Last pass: **2026-08-05**. Sources: the two vendors' own marketing sites. Read
as claims, not verified behaviour — nobody here has used either product.

When Bar says "check the competition", check both sites **and** search the open
Israeli web for the segment; new entrants will not show up on incumbent sites.

| | נצר (Netzer) | CarPro |
|---|---|---|
| Site | cello-app.com/netzer-by-cello | carpro.co.il |
| Vendor | איתם מערכות (ATM) / Cello | — |
| Claimed scale | 100,000+ vehicles, "hundreds of leading businesses" | not stated |
| Positioning | the incumbent — decades of field experience | consolidation: "כל הצי במקום אחד" |

---

## נצר (Netzer)

The heavyweight, and the one to watch. Sells on breadth and integrations.

**Core.** Cloud, smart dashboards, automatic data sync. Vehicle lifecycle,
service, accidents, ongoing maintenance, smart alerts, integration with GPS /
tracking systems, data-driven insights.

**Financial.** Collects and classifies every fleet expense, allocates to cost
centres, connects to corporate financial systems — explicitly sells "full
transparency between operations and money".

**Named products** — this is where the real differentiation sits:

- **Netzer Connect** — supplier API integrations; invoices ingested
  automatically, vehicle updates and driver permissions pushed out to suppliers.
- **הסבת דוחות** (with BetterWay) — digitally transfers parking / police / bus-lane
  fines to the driver who actually committed the offence instead of the
  organisation. Sold on reducing legal exposure and preventing double fines.
- **נצר2גו** — field app for the safety officer: handle alerts, collect driver
  signatures on vehicle handover/return forms, approve fine transfers, create a
  vehicle or driver in the field, run periodic inspections and report faults,
  send documents and photos back.
- **לומדות** (with U-drive and Hugo) — Ministry-of-Transport-approved driver
  refresher courses. Link sent from the software, driver takes it in their own
  time, sits the test, results recorded back in Netzer.
- **אינפונצר** — scheduled report distribution; each manager or driver gets only
  their own reports, no operator involvement.
- **ספידונצר** — automatic odometer readings from the vehicle, avoiding a
  universal fuel-sensor install.
- **Dashboards** — advertises AI-assisted querying.

## CarPro

Smaller, cleaner, and the site is essentially a product demo of one screen —
the vehicle file (תיק רכב). What that screen shows:

- Vehicle identity, use type (רכב צמוד), delivery date, holder + company, total km
- Sections: insurance & registration, leasing agreement details, technical details
- Tabs: general, maintenance, accidents, charges, vehicle dashboard
- **Driver history** — per-driver from/to dates and status
- **Monthly usage breakdown** — km, fuel, **charging (טעינות)**, **toll roads (כבישי אגרה)**
- Documents (vehicle licence, insurance certificate)

---

## Where Celox stands

**Already matched.** Vehicle lifecycle and maintenance, accidents, expiry
alerts, GPS ingest (`gps-ingest`), scheduled report distribution
(`report_schedules` — Netzer sells this as אינפונצר), supplier invoices,
cost-centre-ish branch allocation, driver certifications, custom forms with
public links, and EV charging in the fuel ledger.

**Genuine gaps, roughly by value:**

1. **Fine transfer to driver (הסבת דוחות).** Celox stores
   `traffic_violations` but has no workflow to reassign a fine to the driver
   and produce the paperwork. Netzer sells this hard, and it is a real legal and
   admin pain for Israeli fleets. Biggest single gap.
2. **Toll roads (כבישי אגרה).** CarPro tracks it as a first-class monthly cost
   line. Celox has no concept of it — Kvish 6 / fast-lane charges land in
   generic costs, so they cannot be reported on.
3. **Driver e-learning integration.** Celox has a `yearly_training` form, but
   not linked courses with a test, score and reminders. Netzer partners for
   MoT-approved content — that partnership, not the software, is the moat.
4. **Supplier API ingestion.** Celox has `supplier_invoices` but entry is
   manual; Netzer Connect pulls invoices automatically.
5. **Per-recipient report targeting.** Celox sends a report to a recipient
   list; Netzer sends each manager only their own slice.

**Where Celox is ahead:** the gov.il registry enrichment and open-recall check
appear on neither site, and the free plate lookup is a genuinely better
onboarding story than manual entry.

---

## Pricing — searched 2026-08-05, **neither publishes a price**

Both sell enterprise-style: "leave your details and we'll get back to you". No
price list, no per-vehicle rate, no tiers on either site. Checked their sites,
the Israeli open web, and government procurement records.

Government records exist but are unhelpful on amounts:

- **Netivei Israel (iroads)** — committee 16-22, 03.04.2022, sole-supplier
  exemption under תקנה 3(29) to *איתם מערכות מידע מתקדמות*. Justification:
  "החברה הינה החברה היחידה למתן השירותים". No sum published.
- **Israel Prison Service** — publication 637678, Aug 2019, "שדרוג מערכת נצר",
  again sole-supplier 3(29). **היקף כספי listed as 0**, so no figure.

The sole-supplier exemptions are themselves the finding: at least two
government bodies concluded no one else could provide the service. That is a
procurement moat, and it is the thing to attack — not the price.

**To get real numbers**, the only reliable routes are a quote request through a
friendly prospect, or asking an existing Netzer/CarPro customer what they pay.
Fleet-manager Facebook groups discuss it.

### Market sizing — from the Cello acquisition coverage (autocom, 24/12/2025)

| Figure | Value |
|---|---|
| Vehicles Netzer manages | 100,000+ |
| Total Israeli organisational fleet market | 400,000+ vehicles |
| Average org budget **per vehicle per year** | ~₪60,000 |

That gives Netzer roughly a **quarter of the market**. Treat these as vendor-PR
numbers.

⚠️ **The ₪60,000 is the fleet operating budget** — fuel, maintenance,
payments — **not** the software fee. Do not quote it as a software price. It is
useful the other way round: against ₪60k/vehicle/year of spend, a SaaS fee of
even ₪50–100/vehicle/month is well under 2% of what the customer already
spends, which is the argument for pricing on value rather than undercutting.

### Netzer was acquired by Cello in December 2025 — this changes the fight

Cello (formerly SlowPark) bought איתם מערכות. Cello already runs parking, car
wash, **EV charging, toll roads** and roadside services payments for fleets.
Consequences worth planning around:

- Netzer gains a **payments and services rail** Celox has no answer to. The
  toll-road gap noted above is not just a CarPro thing — it is now core to the
  merged entity.
- Netzer Connect was the first joint feature; the stated goal is one end-to-end
  platform for fleet management, finance, services and payments.
- Named integrations: **איתורן, פוינטר** (GPS) and **SAP, פריוריטי, חשבשבת**
  (ERP/accounting). Israeli accounting integration is table stakes for larger
  customers; Celox has none of these.
- Netzer is ~40 years old. The incumbency is deep, but so is the legacy — the
  article itself calls the market "מערכות מיושנות, תפעול מסורבל". That is the
  opening.

---

*Caveat: everything above is marketing copy or vendor PR. Before betting a
roadmap on a gap, confirm it — a feature can be absent from a website and
present in the product.*
