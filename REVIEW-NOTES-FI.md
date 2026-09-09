# REVIEW-NOTES-FI — native review before release (for Kolibri Defence)

*(In English so the Finnish reviewer at Kolibri Defence can read it directly;
the other language review notes in this repo are in Danish.)*

All Finnish website copy lives in `locales/fi.json` (305 translated strings +
27 roles + 178 countries, translated by Claude; **not** natively proofread
yet). Edit fi.json directly and run
`node brand/build_i18n.mjs --build fi --strict` to rebuild.
`<html lang="fi">`, route /fi/, noindex, not in production.

The Finnish glossary extract prepared for you is the appendix (BILAG) of
`NAS_TERMINOLOGI_6SPROG.md` — that terminology is LOCKED across the site and
the datasheets, so please review terms there first: a change there propagates
everywhere; a change only in fi.json creates inconsistency.

## HELD BACK from this review (sentinels in fi.json)

- **`@hold`: FRIGIVET 9. september 2026.** Den engelske drone-stack-side er
  skrevet om til 65A/100A-opdelingen, og NDAA-formuleringen er låst
  (»NDAA-yhteensopiva eurooppalainen piirisarja« — aldrig en oversættelse af "certified").
  Alle tidligere @hold-nøgler samt de nye strenge fra omskrivningen
  (hele `drone-stack.*`-navnerummet + de fem NDAA-nøgler) er nu oversat
  af Claude og INDGÅR I KORREKTUREN — de er IKKE indfødt korrekturlæst.
  Terminologi: NAS_TERMINOLOGI_6SPROG.md.

- **`@en` (40 keys): the entire Code of Conduct page** — kept in English by
  decision (ten legal/compliance sections). The page carries the note
  "This section is available in English only." Please do NOT translate it.

## The five open questions from the glossary appendix

These surface in live strings — please answer them explicitly:

1. **`lennonohjain`** for flight controller — is this what the industry uses,
   or is the English term standard in practice? (Mostly appears in the held
   drone-stack strings, so the answer is needed BEFORE those unhold.)
2. **`jatkuva virta`** for continuous current — correct in a datasheet?
   (Same: locked for the drone-stack rewrite.)
3. **`voimalaite`** vs `propulsiojärjestelmä` for propulsion system — used
   heavily as `voimalaite/voimalaitteita` in `nas.meta.description`,
   `nas.nordic-advanced-systems-is`, `efi.nas-iems-is-available`,
   `efi.whether-you-require-a`.
4. **`Toimintaperiaatteet`** as the nav item for Conduct (`shared.conduct`);
   in the consent text it reads "toimintaperiaatteidemme (Code of Conduct)
   kautta" since the linked page stays English.
5. **`Pyydä aineisto`** as the header CTA (`shared.request-brief`) — does it
   work as button copy?

## Other choices to confirm

6. `home.fc-esc-flight-stack`: **"FC + ESC -lentostack"** — "flight stack"
   has no established Finnish term; "lentostack" is a coinage keeping the
   locked "stack". Alternatives: "FC + ESC -stack" or keep English.
7. CDI expanded as **kondensaattoripurkaussytytys** — industry often says
   just "kondensaattorisytytys". Which?
8. `home.standard-firewall-pattern`: **"Vakioitu palomuurikiinnitys"** —
   aviation firewall read. Confirm against NAS's intent (mounting pattern).
9. "Forced air": **"Pakotettu ilmajäähdytys"** vs "puhallinjäähdytys"
   (`home.forced-air`, `engineering.forcedair-cooled-mapped`).
10. "Proprietary" rendered **"oma / itse kehitetty"** — deliberately avoided
    the anglicism "proprietaarinen". OK?
11. `efi.comp-ndaa`: tight-space label "COMP." abbreviated **"YHT."**
    (yhteensopivuus). OK in a spec label?
12. Hero line 1 is exactly three words for the word-by-word animation:
    **"Suunniteltu kestävyyttä varten"**. Line 2 "Built on integrity" stays
    English by decision (brand tagline) — not an omission.
13. `contact.business-hours`: **"Toimistoajat"** — context is the caller's
    preferred call time, not NAS's opening hours. Confirm the reading.
14. `shared.registration`: **"Rekisteröinti"** — if this footer label refers
    to the Danish CVR number, "CVR-numero" may be better.
15. `home.opposed-cylinders-cancel-primary`: "primary vibration" →
    **"ensimmäisen kertaluvun tärinä"** (first-order vibration, engineering
    sense) rather than literal "ensisijainen".
16. ROLES: "CPO/Chief Procurement Officer" → "CPO/hankintajohtaja" and
    "Director/Head of Procurement" → "Hankintajohtaja" — near-duplicates in
    Finnish (the EN list has three procurement near-synonyms). "Sourcing
    Manager" kept as "Sourcing-päällikkö" to stay distinct from
    "Hankintapäällikkö" and "Ostopäällikkö". Harmonize if you prefer.

## Quality control already performed

- `--build fi --strict`: 0 missing strings; markup/{spec:} skeleton and all
  figures byte-identical with the EN source (validated mechanically).
- Layout test with the real Finnish copy (long compounds): navigation,
  buttons and pages hold on desktop and mobile; Space Grotesk covers ä ö.
- **Blind back-translation** (a separate run with no access to the EN
  source) compared against the source: **0 high, 0 medium, 7 low** findings.
  The lows: "hobby or industrial platform"→"engine" (narrowing,
  `engineering.nas-2c-and-nas`); "co-located"→"in the same premises"
  (`nas.our-registered-office-is`); careers "we build in-house"→"we build
  everything ourselves" (slight strengthening, `careers.every-seat-on-the`);
  NDA clause "where appropriate"→"where necessary"
  (`efi.whether-you-require-a`); aria-label "Primary"→"Primary navigation";
  plus items 12 and 16 above. Nothing was silently "fixed" — please rule on
  each.

## ⚑ Guarantee pattern — standing check for every language

Back-translation QC caught the same drift independently in French, Spanish
and Italian: EN "supporting consistent output" hardened into "guaranteeing"
(all three corrected 2026-09-09). The support/ensure/guarantee gradient must
never rise relative to the English source — for a defence supplier that is
a legal difference, not a stylistic one. Finnish "mikä tukee" (which
supports) in `engineering.production-is-structured-for` is CORRECT — please
keep that calibration in mind across the whole review.

## Fixed framework (not up for review)

- Figures come from `brand/specs.mjs` via {spec:} placeholders and are
  byte-identical across all languages — no decimal-comma conversion.
- Submitted form values are ALWAYS English; Finnish is display-only labels.
- Stays English/Latin: product names (Drone Stack, NAS IEMS), the tagline
  "Built on integrity", company name/address, HUD/telemetry mono strings
  (SYS·ACTIVE, LAT/LNG/ELEV, BOXER · 340CC …), document references.
- Footer line "Englanninkielinen versio on virallinen." is locked (§7 of the
  terminology list), as are the §8 nav/CTA strings (Alustat, Älykkäät
  ratkaisut, Suunnittelu, Toimintaperiaatteet, Ura, Yhteystiedot,
  "Pyydä aineisto", "Pyydä tekniset tiedot") — flag disagreements against
  the terminology list itself, not just fi.json.
