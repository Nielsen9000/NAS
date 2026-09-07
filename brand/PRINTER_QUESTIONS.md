# Spørgsmål til trykkeriet — NAS roll-up banner

Send denne mail (eller plukket fra listen) til trykkeriet **inden** vi
eksporterer den endelige fil. Deres svar trumfer alt jeg sætter op fra
min side — vi tilretter bleed, farveprofil og format efter dem.

---

## Mail-udkast

> Hej,
>
> Vi skal have trykt et roll-up banner til en messe og vil gerne sikre at vores produktionsfil matcher jeres rig præcist.
>
> **Projekt-specs:**
> - Format: roll-up banner, synligt område 850 × 2000 mm (lodret)
> - Hardware: standard 85 cm bredde, jeg går ud fra at jeres egne kassetter sætter standarden — sig endelig til hvis I foretrækker en anden bund-fold
> - Antal: 1 stk (samlet PDF)
> - Substrat: vi har ikke valgt endnu — anbefal gerne en variant (matte / anti-refleks foretrækkes, vi har et mørkt design med høj kontrast)
>
> **Til specifikation, vil jeg gerne bede om jeres svar på følgende:**
>
> 1. **Bleed.** Hvor meget bleed vil I have? Jeg har 20 mm i bunden til at rulle ned i kassetten — er det rigtigt for jeres rig? Skal jeg også tilføje bleed i toppen og på siderne (typisk 3-5 mm)?
>
> 2. **Safe zone.** Hvad er jeres anbefalede minimum-margin fra trimkant til kritisk indhold (logo, hovedtekst)? Jeg arbejder med 100 mm top + 100 mm bund.
>
> 3. **Farveprofil.** Hvilken CMYK-profil bruger I — FOGRA39 (ISO Coated v2), FOGRA51 (PSO Coated v3) eller en intern? Skal billedet være CMYK-konverteret før levering, eller foretrækker I at modtage RGB / med embedded profile?
>
> 4. **Hvid håndtering — kritisk.** Designet har ren hvid tekst og hvidt logo. Skal det specificeres som C0 M0 Y0 K0 (papir/medie der lyser igennem), eller bruger I hvid toner / spot white channel oven på en mørk baggrund? Jeg vil for alt i verden undgå at hvid bliver en CMYK-blanding der trykker som grå.
>
> 5. **Filformat.** Foretrækker I PDF/X-1a, PDF/X-4, eller noget tredje (TIFF, native AI/PSD)? Jeg kan levere en pakket samlet PDF med embedded fonts og vektor-elementer, eller flatten alt hvis det giver renere resultat.
>
> 6. **Fonts.** Skal jeg embedde fontene, eller vil I have al tekst konverteret til outlines/kurver?
>
> 7. **Raster-opløsning.** Hvilken DPI vil I have på raster-elementer ved endelig størrelse? Vi har en motor-render der måler omkring 600 × 540 mm på banneret — jeg sikrer mig at den er højopløselig nok efter jeres krav.
>
> 8. **Overprint / trapping.** Skal jeg sætte specifikke overprint-indstillinger, eller håndterer I det selv i RIP'en?
>
> 9. **Beskæringsmærker.** Skal PDF'en have crop marks / registration marks med, eller bare ren trim + bleed-kant?
>
> 10. **Levering.** Hvordan vil I have filen — upload-portal, WeTransfer, email? Og er der en max-filstørrelse?
>
> 11. **Proof.** Får vi en soft-proof PDF til godkendelse før tryk, eller en fysisk prøvetrykning? Hvor lang er tilbageleveringstiden?
>
> Når jeg har jeres svar, sender jeg den endelige fil — samlet PDF — eksporteret 1:1 efter jeres specs.
>
> Tak på forhånd.

---

## Hvad jeg konfigurerer i build-scriptet, når trykkeriet har svaret

Når svarene kommer ind, opdaterer jeg `brand/build_rollup.mjs` med deres
faktiske specs, og kører `node brand/build_rollup.mjs --print` for at
producere den endelige fil. Specifikt skal disse felter bekræftes:

| Felt | Min nuværende antagelse | Trykkeriets svar |
|---|---|---|
| Bleed bund | 20 mm | ? |
| Bleed top / sider | 0 mm | ? |
| Safe zone | 100 mm top + bund | ? |
| Farveprofil | FOGRA39 (placeholder) | ? |
| Hvid-håndtering | C0 M0 Y0 K0 (paper white) | ? |
| Filformat | PDF/X-4 (placeholder) | ? |
| Fonts | Embedded | ? |
| Crop marks | Nej | ? |
| Min raster-DPI | 150 ved 1:1 | ? |

## Det jeg allerede har gjort klar

- **Bleed-indikator fjernet i print-mode** — det røde stribede område du så på mockup'en er kun et visuelt hjælpemiddel. Kør `node brand/build_rollup.mjs --print` så er det væk.
- **Ren #FFFFFF** brugt overalt for hvid tekst / hvidt logo. Når PDF'en konverteres til CMYK, mapper trykkeriet (eller jeg, hvis de foretrækker pre-konverteret fil) det til 0/0/0/0.
- **QR-kode er nu lokal vektor-SVG** ([`brand/rollup-qr.svg`](rollup-qr.svg)) — genereret med error correction level H, fuld matrix, ingen tredjeparts-API. Knivskarp ved enhver størrelse.
- **Logo bruger den hvide vektor-mark** ([`assets/nas-mark-white.svg`](../assets/nas-mark-white.svg)) — ægte vektor, ingen invert-filter-tricks.

## Et åbent spørgsmål om motor-billedet

`assets/nas_engine_transparent.png` er kun **847 × 770 px**. På banneret vises den ved ~600 mm bredde, hvilket svarer til ~2400 px ved 100 dpi tryk. Vi opskalerer altså ca. 3× — det vil være synligt pixeleret hvis nogen kigger tæt på banneret.

**To valg, du tager før print-eksport:**
- **A) Få en højopløst version** af motor-renderen (ideelt 3000+ px bred, gerne vektor/CAD-render hvis det findes). Det er den reneste vej til storformat.
- **B) Skaler motoren ned på banneret** så 3× opskalering ikke bliver synlig — fx fra 600 mm til 400 mm bredde. Mindre dominant, men ingen pixelering. Hvis du vælger denne, justerer jeg layoutet så den nye plads udnyttes meningsfuldt (måske større headline eller tilføjelse af et undertekst-felt).

Hvis du har en kontakt der har CAD-filen eller original-rendren, er det den eneste virkelig rene løsning.
