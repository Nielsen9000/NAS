# NAS — BRAND & PRODUKTIONSREGLER
Sidst opdateret: 30. august 2026

## Farver
- Marine (baggrund): **#0A2530** — rgb(10, 37, 48)
- Cyan (accent):     **#3BB6E8** — rgb(59, 182, 232)
- Hvid: ren #FFFFFF (aldrig off-white — #F3F7F8 gav grå film på tryk)
- Grå (beskrivelseslinjer): ca. #777 på lys, dæmpet blågrå på mørk

## Skrifter
| Skrift | Bruges til | Kyrillisk |
|---|---|---|
| Inter | Overskrifter, fede værdier, navne | ✓ fuld |
| Space Grotesk | Brødtekst (let vægt) | ✗ INGEN — kun latin + vietnamesisk |
| JetBrains Mono | Mono-labels, eyebrows, specs, captions | ✓ fuld |

**Ukrainsk/kyrillisk materiale:** al Space Grotesk-brødtekst erstattes
af Inter. Kun i den kyrilliske variant — engelsk/dansk beholder
Space Grotesk.

## Grafiske elementer
- Cyan hjørnemarkeringer (corner ticks) om billeder — IKKE hvide
  afrundede paneler (undtagen QR-panel på visitkort)
- Venstre-margen med store cyan sektionsnumre (/ 01) — fra Company
  Profile, nu standard for datablade
- Mono-eyebrows med letter-spacing, cyan, med streg
- Fint teknisk gitter i baggrunden + rundt NAS·DENMARK-segl nederst
  til højre på sidste side af kontrollerede dokumenter
- Logo-vandmærke (kun mærket) 3–4 % opacitet på store flader,
  maskeres væk bag spec-tabeller
- Diagrammer på hvid plade med cyan hjørnemarkeringer

## Sprog- og oversættelsesregler
Oversættes ALDRIG (latinsk skrift i alle sprog):
STM32F405, STM32F051, ICM-42688-P, DSHOT, ELRS, I2C, SBUS, IBUS,
CRSF, UART, GPIO, SPI, VTX, RC, GPS, NDAA, NAS, ESC, FC, Blackbox,
XT60, produktnavne, enheder (V, A, Mbit), 4S/6S.

- Dokumentreference (DOC · DS-xxxx · REV) forbliver latinsk i alle sprog
- "Konfidentiel"-markering oversættes (fx Конфіденційно)
- Diagrammer med indbagt engelsk tekst: tilføj lille mono-nøgle
  under captionen (engelsk term i cyan · oversættelse efter)
- Homoglyf-tjek: ingen kyrilliske tegn i latinske tokens (100А vs 100A)
- Ukrainsk fylder 10–15 % mere end engelsk — forvent layoutjustering
- Alt kyrillisk materiale læses af indfødt inden udsendelse

## Sprogbrug og påstande
- "NDAA-compliant" — ALDRIG "certified" (ingen certificerende myndighed
  findes; compliance er egenerklæret). "Certified components" om
  komponentvalg er derimod OK.
- Ingen stjerne-ratings i datablade
- Ingen uunderbyggede superlativer ("second to none") i teknisk materiale
- Manglende specs udelades helt — aldrig "TBD" eller tomme felter;
  brug evt. "Mechanical drawings issued at REV 02"-note

## Tryk
- Trykkeriet lavede farveomsætningen på de første jobs (RGB sendt);
  nye RGB-jobs skal bede om "samme farveindstillinger som forrige ordre"
- CMYK-eksport: FOGRA39L Coated (brand/icc/FOGRA39L_coated.icc, i Git)
- Roll-ups: 85 × 200 cm, 20 mm bundbeskæring, nederste 12 cm er
  kassette-dødzone, intet blæk under 185 cm, 100–120 dpi er nok
- Datablade: A4, pt. uden bleed — afklar med trykkeri hvis de skal trimmes
- Visitkort: 85 × 54 mm + 3 mm beskæring
