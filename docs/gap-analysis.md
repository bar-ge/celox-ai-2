# Feature gaps and integration roadmap

Pass: **2026-08-05**. Sources: competitor marketing sites; Celox's own schema and
code. Competitor claims are unverified — confirm before betting a quarter on one.

---

## Part 1 — What competitors have that Celox does not

Ordered by how often a prospect will actually ask about it.

### 1. Supplier order automation — CarPro's real weapon

CarPro's **מערכת הזמנות** does something Celox has no concept of. When a vehicle
is ordered from a leasing supplier, the system sends the order in the supplier's
agreed price-list format; then, once plates are issued, it **automatically
notifies every downstream supplier** — fuel, car wash, toll roads — with the
details each one needs. On vehicle return it closes the loop the same way.

That is the daily grind of a fleet officer: one vehicle change, five suppliers to
update by hand. Celox has `suppliers` and `purchase_orders` tables but no
outbound notification at all.

**This is the highest-value gap on the list.** It is also the least visible one,
which is why it is worth building before the flashier items.

### 2. Fine transfer — הסבת דוחות

Netzer (with BetterWay) and רכבים both do it; רכבים adds remote driver signature.
Reassigns a parking/police/bus-lane fine from the company to the driver who
earned it. Celox stores `traffic_violations` but has no transfer workflow,
no driver signature, no paperwork output.

Sold on legal exposure and preventing double fines. Ask any Israeli fleet officer
what wastes their week and this is on the list.

### 3. Toll roads — כבישי אגרה

CarPro shows it as a first-class monthly cost line beside fuel and charging.
רכבים imports a כביש 6 file. Celox has no concept — Kvish 6 and fast-lane
charges vanish into generic costs and cannot be reported on.

Three of five vendors carry it. **Table stakes, not a differentiator.**

### 4. Driver self-service portal

CarPro's **אזור אישי לנהגים** lets the driver see their own fuel balance,
kilometrage and toll usage (including marking which trips were personal), take
part in the vehicle ordering process, and run a **salary simulator** showing how
choosing a given vehicle changes their take-home pay through שווי שימוש.

Celox is entirely fleet-manager-facing. Its public forms are one-way — fill and
submit — with no persistent driver identity or self-service view.

The salary simulator is the clever bit: it moves an argument the fleet officer
usually has to have by phone into the product.

### 5. Driver e-learning with scored tests

Netzer partners (U-drive, Hugo) for Ministry-of-Transport-approved refresher
courses. רכבים builds it in and sells it explicitly as *avoiding* the cost of
external providers. Link to driver, they take it in their own time, test, score,
result recorded, reminders chased.

Celox has a `yearly_training` form — a checkbox, not a course.

### 6. נוהל 6 complaint ingestion

CarPro integrates **מוקד בטיחות 365** so public "how's my driving" complaints
land in the system automatically instead of being retyped from email. רכבים
mentions the נוהל 6 sticker too.

### 7. Smaller items

- **Executive dashboards refreshed hourly** (CarPro) — Celox dashboards are live
  but there is no exec-level rollup across cost centres
- **Per-recipient report targeting** (Netzer's אינפונצר) — Celox sends the same
  report to a list; Netzer sends each manager only their slice
- **Automatic invoice ingestion** from suppliers (Netzer Connect) — Celox has
  `supplier_invoices` but entry is manual
- **תקנה 168 form** (רכבים) — not in the four Spuntech templates either

### Where Celox is already ahead

gov.il registry enrichment on plate lookup, and the open-recall check. Neither
appears anywhere on any competitor site. The free plate lookup is a materially
better onboarding story than manual entry, and worth saying out loud in sales.

Also already built, and sold by Netzer as named products: `report_schedules`
is אינפונצר; `gps-ingest` is ספידונצר.

---

## Part 2 — Can Celox connect to more companies? Yes, and the plumbing exists

### What is already there

`integration_catalog` is a **data-driven table**: each row carries a key, label,
logo, description, a `fields` JSON describing the credential form, and a
`regions` array. The Integrations tab renders whatever is in that table. Adding
a new provider to the *catalog* is an INSERT, not a deploy.

Twelve providers are catalogued today:

| Region | Providers |
|---|---|
| Israel + US/CA | Priority ERP, SAP Business One, Monday.com, Slack, OpenAI, Anthropic, Google Gemini, **Generic REST API** |
| Israel only | **Ituran** (GPS) |
| US/CA only | Geotab, Samsara, WEX fuel cards |

Notably, Celox already matches Netzer on **Priority, SAP and Ituran** — the
three integrations Netzer advertises hardest.

### The honest caveat

**These are credential-collection stubs.** Grep finds no connector code for
Ituran, Priority, SAP or Geotab anywhere in `src/` or `supabase/functions/`. The
catalog stores the keys; nothing calls the vendors.

The one working data path is `gps-ingest` — a token-authenticated inbound
webhook. That is a *push to us* model: the vendor must be configured to post.
There is no *pull from vendor* connector.

So the answer to "can I connect to more companies" is: **the shelf is built and
labelled, but the boxes are empty.** First real connector is the expensive one;
each one after is cheap.

### Israeli providers worth adding, in rough priority

1. **Israeli fuel cards** — דלקן / דור אלון, פז, טן. Celox has WEX, which is
   US-only. Fuel is the single biggest recurring fleet cost and the most
   error-prone manual import. Highest value per unit of work.
2. **כביש 6 / דרך ארץ** — closes the toll-road gap in Part 1 at the same time.
3. **פוינטר (Pointer)** — Netzer names it alongside Ituran; the two cover most
   Israeli telematics between them.
4. **חשבשבת (Hashavshevet)** — Netzer names it. Dominant in Israeli SMB
   accounting, and Celox has only the enterprise pair (SAP, Priority).
5. **מוקד בטיחות 365** — נוהל 6 complaints, matching CarPro.
6. **BetterWay** — the fine-transfer rail Netzer uses. Partnership, not just API.
7. **EV charging networks** — Gnrgy, Ez-Fleet. Pairs with the kWh ledger already
   shipped, and Ez-Fleet is moving toward fleet software itself.
8. **U-drive / Hugo** — e-learning, if item 5 in Part 1 gets built.

### A cheaper route worth considering first

Netzer's answer to all of this is **Netzer Connect** — one supplier-facing API
rather than N bespoke connectors. Celox already ships a *Generic REST API* entry
and an inbound webhook. Formalising that into a documented public API plus
outbound webhooks would let suppliers and customers integrate *themselves*,
which is how a small team competes with a 40-year-old incumbent's integration
catalogue.

---

## Known customers of competitors

CarPro's site names **Manpower, All Trade, Fritz** and **אפיקים** (bus operator).
Useful as a target list and as proof of the fleet sizes these systems serve.
