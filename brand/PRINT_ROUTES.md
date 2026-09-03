# Which file goes to the trykkeri

Three NAS print jobs, **two different colour routes**. Sending the wrong one does
not fail loudly — it produces a job that looks fine on screen and comes back a
different colour from the piece it was meant to sit beside. Check this file
before attaching anything.

The rule behind all of it: **match how the existing piece was separated.**
Pre-separated CMYK and printer-separated RGB are two different paths to ink, and
mixing them across one set is how a pair stops matching.

---

## Business cards

| Job | Send | Why |
|---|---|---|
| **One or two new people**, alongside cards already printed | `brand/business-card-<slug>.pdf` | Untagged RGB, 2 pages. Claus's and Christoffer's printed cards went out this way — the trykkeri separated them. New cards must take the same route or the set will not match. |
| **Full reprint of everyone at once** | `brand/business-card-<surname>-cmyk.pdf` | PDF/X-3, DeviceCMYK, FOGRA39 embedded. Better job — colour is decided here, not by the printer's default profile — but only when nothing has to match an earlier run. |

The card build had **no CMYK path at all** until August 2026; its header called the
RGB file "the 2-page print master". That is what the existing cards came from.

Tell the printer, RGB route: *untagged RGB, you separate, same settings and stock
as the previous NAS card run.*

Watch out: `business-card-<slug>-front.pdf` is front-only. **Check for 2 pages
before attaching.**

## Roll-up banners

Send `brand/rollup-dronestack-print-rgb.pdf` — untagged DeviceRGB, 150 dpi,
850 × 2020 mm including 20 mm bottom bleed.

The first (engine) roll-up was sent as RGB and the trykkeri did the separation, so
the drone-stack banner goes the same way and the two match standing side by side.
Verified: brand cyan is bit-identical in both files — the engine banner's vector
fill `.2314 .7137 .9098 rg` and the drone-stack raster both resolve to
rgb(59,182,232) = `#3BB6E8`.

**Do not send** `rollup-dronestack-print-pdfx-cmyk.pdf` if one exists. It is
FOGRA39 pre-separated and would not match banner one.

Build: `node brand/build_rollup.mjs --variant=dronestack --print-rgb`

## Datasheets

Send `NAS_DATASHEET_DRONESTACK_2026_CMYK.pdf` — PDF/X-3:2003, DeviceCMYK,
FOGRA39 embedded as OutputIntent, text preserved as live vector.

CMYK is right here because it is a **new document with no printed predecessor to
match**. Tell the printer: *PDF/X-3, DeviceCMYK, FOGRA39 embedded, do not
re-convert.*

### Ukrainian variant

Send `NAS_DATASHEET_DRONESTACK_2026_UA_CMYK.pdf` — the same document in
Ukrainian, same revision, document number `DS-2026-FC-UA`. Identical print
route: PDF/X-3:2003, DeviceCMYK, FOGRA39 embedded, live vector text. Both
Both variants use the same diagram artwork. They do NOT necessarily print it at
the same size: each language solves its own page-2 width, because the Ukrainian
sheet carries translation keys under the figures that the English one does not.
English is the primary document — it goes to the website, to partners and to the
trade fair — and is not shrunk to match a single-market translation. Within each
sheet the two panels are still one component used twice: same width, same
centre, enforced.

It sets its **body copy in Inter, not Space Grotesk**. Space Grotesk has no
Cyrillic glyphs at all — it ships latin, latin-ext and vietnamese subsets only —
so it cannot set Ukrainian, and asking it to would silently fall back to a
system face. Inter and JetBrains Mono both carry cyrillic and cyrillic-ext,
which covers і ї є ґ. Headings and mono labels were already those two families
and did not move. The English sheet is untouched and still sets in Space
Grotesk; the build fails if Space Grotesk ever appears in the Ukrainian PDF.

Part numbers, protocols, interfaces and units stay in Latin script in both
languages. That is checked two ways rather than trusted: every protected token
must extract from the finished PDF, and no token may mix Cyrillic with Latin or
digits — Cyrillic А В Е О Р С Т Х are indistinguishable from their Latin twins,
so one inside a part number would be invisible on the page and wrong in every
search index.

Build: `node brand/build_datasheet_dronestack.mjs`             (English)
Build: `node brand/build_datasheet_dronestack.mjs --lang=uk`   (Ukrainian)
Build: `node brand/build_datasheet_dronestack.mjs --both`      (both, then compared side by side)

`--both` prints a variant comparison. It reports any difference in diagram size
between the languages — expected, but never silent — and fails on the things
that must hold: matching revisions, the `-UA` suffix, no Space Grotesk in the
Ukrainian file, and the two panels on a page sharing a centre.

`--solve-width` prints the convergence trace for the active language, for when
the artwork or the copy changes and you want to see what the page settled on.

---

## Colour profile

FOGRA39 / ISO Coated v2 — the European offset standard, vendored at
`brand/icc/FOGRA39L_coated.icc`. The CMYK builds **hard-stop** without it and
refuse US Web Coated SWOP as a substitute: shipping a US profile to a Danish
trykkeri silently shifts `#3BB6E8`.

## White

Every dark-background piece uses pure `#FFFFFF` for white text and logos. It must
print as **unprinted paper, 0/0/0/0** — not a four-colour build, which comes back
muddy grey against the navy. Verified in the card masters: paper and white text
both land on exactly 0/0/0/0, navy field is 273% TAC (offset limit ~330%).
