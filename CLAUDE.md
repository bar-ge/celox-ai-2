# Working rules — set by Bar (2026-07-29)

These apply to every Claude session on this repo. Read HANDOFF.md for project
context; these rules override anything that conflicts with them.

## Never delete without asking
1. **Never delete fields, functions, or screens.** All changes are additive.
2. If a deletion of a field, screen, or function ever seems necessary, **stop
   and ask Bar first** — propose it, don't do it.

## Deployment
3. **Always deploy to `dev`** (push to the `dev` branch → Vercel preview at
   dev.celoxai.com). **Never merge or deploy to prod without asking Bar** —
   after dev is verified, ask whether to promote `dev` → `main`.

## Design
4. Keep the design clean and consistent in every form and screen: fonts,
   colors, texture, sizes. The source of truth is `docs/design-system/`
   (tokens.json + index.html) and the `C` constant in `src/fleet-manager.jsx`.
   No hardcoded off-palette colors, no stray font sizes.
5. **Everything must be responsive** — mobile, tablet, desktop. Any new screen
   or form gets checked at narrow widths. RTL-first: use logical properties.

## Product instincts
6. Bar likes automations. If while working you see an opportunity to automate
   something in the platform (alerts, syncs, auto-fill, scheduled jobs),
   suggest it proactively.

## Competition
7. Celox's two main competitors in Israel are **נצר (Netzer)**, by איתם מערכות
   / Cello, and **CarPro**. When Bar says "check the competition" it means:
   check both of their websites **and** search the open Israeli web for the
   segment — not just the two sites.
   - נצר — <https://www.cello-app.com/netzer-by-cello/>
   - CarPro — <https://carpro.co.il/>

   Feature notes and the current gap analysis live in
   `docs/competitors.md`. Update that file whenever you do a competition pass,
   with the date, so the comparison does not silently go stale.
