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

*Caveat: everything above is marketing copy. Before betting a roadmap on a gap,
confirm it — a feature can be absent from a website and present in the product.*
