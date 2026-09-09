# REVIEW-NOTES-FR — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

Al fransk website-tekst ligger i `locales/fr.json` (306 oversatte strenge + 27
roller + 178 lande, oversat af Claude; **ikke** indfødt korrekturlæst endnu).
Ret direkte i fr.json og kør `node brand/build_i18n.mjs --build fr --strict`.
`<html lang="fr">`, ruten er /fr/, noindex, ikke i produktion.

## ⚠ FAKTUELT SKRED fundet af tilbageoversættelsen — RETTET FØR COMMIT

**`home.longendurance-dualcylinder-boxer-engines` (hero): "range" var oversat
"rayon d'action"** (aktionsradius, dvs. ud-og-hjem) — med nas2.range =
1000 km en påstand om ~2000 km samlet rækkevidde, det dobbelte af kilden, og
internt inkonsistent med nabonøglen `home.two-dualcylinder-2stroke-boxer`
("au-delà de {spec:nas2.range}", korrekt).
**RETTET 9/9 (Jespers beslutning: fejl, ikke skøn): nu «exigeant une
autonomie supérieure à {spec:nas2.range}».** Korrekturlæseren bedes
efterse rettelsen frem for at genoverveje «rayon d'action».

**Også rettet: `engineering.production-is-structured-for`** —
«garantissant» → «favorisant» (EN siger "supporting", ikke en garanti; se
garanti-mønsteret under Kvalitetskontrol).

## HOLDES TILBAGE FRA KORREKTUREN (sentinels i fr.json)

- **`@hold`: FRIGIVET 9. september 2026.** Den engelske drone-stack-side er
  skrevet om til 65A/100A-opdelingen, og NDAA-formuleringen er låst
  (»Chipset européen conforme à la NDAA« — aldrig en oversættelse af "certified").
  Alle tidligere @hold-nøgler samt de nye strenge fra omskrivningen
  (hele `drone-stack.*`-navnerummet + de fem NDAA-nøgler) er nu oversat
  af Claude og INDGÅR I KORREKTUREN — de er IKKE indfødt korrekturlæst.
  Terminologi: NAS_TERMINOLOGI_6SPROG.md.

- **`@en` (40 nøgler): hele Code of Conduct-siden** — engelsk ved beslutning.
  Siden viser noten "This section is available in English only."

## Kvalitetskontrol udført

- `--build fr --strict`: 0 manglende; skelet- og talvalidering grønne.
- `--check-layout fr --real`: nav, knapper og sider holder, desktop og mobil;
  Space Grotesk dækker à è é ì ò ù ç (fontprobe).
- **Blind tilbageoversættelse** sammenlignet med kilden: **1 høj** og
  1 medium (begge RETTET, se ovenfor), 6 lave — fuld tabel nederst.

**⚑ GARANTI-MØNSTER — fast tjekpunkt ved kommende sprog:** "supporting
consistent output" gled uafhængigt til en garanti i fr («garantissant»),
es («garantiza») og it («a garanzia»), og de forstærkede "well understood"
til „genau verstanden". Forskellen på at understøtte og at garantere er
juridisk for en forsvarsleverandør. Tjek specifikt ved enhver ny
oversættelse: support/ensure/guarantee-graden må aldrig stige ift. EN.

## Valg til bekræftelse i korrekturen

1. **"Speak with engineering" → «Échanger avec nos ingénieurs»** (CTA'er);
   «Contacter l'ingénierie» brugt for `efi.contact-engineering`.
2. **«CDI à double étincelle»** for Dual-spark CDI — alternativ «double
   allumage».
3. **«CIRCUIT CARBURANT»** for fuel system (luftfartsregister) — vs «système
   d'alimentation».
4. **«Corps de papillon»** for throttle body (standard bil-FR) — bekræft til
   UAV-kontekst.
5. **"calibration" beholdt som «calibration»** (efi) frem for «étalonnage» —
   matcher ECU-branchen.
6. **«DÉFILER»** for SCROLL (`engineering.scroll`) — de/es beholdt engelsk
   "SCROLL"; afgør konsistenslinjen på tværs af sprog.
7. **`shared.registration` → «Immatriculation»** — korrekt for
   virksomhedsregistrering, men kan på et luftfartssite læses som
   FLY-registrering (flaget af QC som lavt fund). Alternativ:
   «Enregistrement».
8. **«IMPLANTATION»** for LOCATION-sektionen; «Implanté aux côtés du» for
   co-located.
9. **Egennavne på engelsk:** Hans Christian Andersen Airport, UAS Denmark
   Test Center, University of Southern Denmark; kun «la municipalité
   d'Odense» oversat.
10. **Careers-register:** vouvoiement; «celles et ceux qui veulent les
    construire» er mildt inkluderende — bekræft husets stemme.
11. **Roller (seks tætte titler):** CPO/Directeur des achats ·
    Directeur/Responsable des achats · Responsable approvisionnements
    (Procurement Mgr) · Responsable des achats (Purchase Mgr) · Responsable
    sourcing · Chef de produit. Tre kollapser omkring «achats» — harmonisér
    hvis ønsket.
12. **Lande:** «Cap-Vert» (gængs eksonym; FN-protokolform er «Cabo Verde»),
    «Saint-Kitts-et-Nevis» (officiel FR-form er
    «Saint-Christophe-et-Niévès»), «Cité du Vatican», «Vietnam». Listen står
    i engelsk alfabetisk rækkefølge (bevidst — indsendte værdier er
    engelske).

## Faste rammer (skal IKKE "rettes")

- Tal fra `brand/specs.mjs` via {spec:} — byte-identiske, ingen
  komma-konvertering, ingen mellemrum i tal.
- Formularens indsendte værdier er ALTID engelske; fransk er kun labels.
- Forbliver EN/latinsk: produktnavne, tagline "Built on integrity" (hero
  linje 2 er bevidst uoversat — beslutning, ikke mangel), firmanavn/adresse,
  HUD/telemetri-mono, dokumentreferencer.
- Footer-linjen «La version anglaise fait foi.» er låst (liste §7); nav/CTA
  låst efter §8 («Demander le dossier» osv.).

## Drift-fund fra blind tilbageoversættelse (rettes IKKE stille)

| Nøgle | EN | Tilbageoversat | Vurdering |
|---|---|---|---|
| home.longendurance-dualcylinder-boxer-engines | "over {spec} range" | "operational radius above {spec}" | **HØJ — RETTET** til «autonomie supérieure à» |
| engineering.production-is-structured-for | "supporting consistent output" | "guaranteeing …" | medium — **RETTET** til «favorisant» |
| nas.* (2 nøgler) | "ensure/well" | "guarantee/perfectly" | lav — intensivering |
| engineering (unit to unit) | "consistently" | "identically" | lav |
| engineering.precisionbalanced/counterweighted | "counterweighted for" | "counterweights ensuring" | lav |
| careers.nas-is-growing-we | "NAS is growing" | "en pleine croissance" | lav — let forstærket |
| shared.registration | "Registration" | "Immatriculation" | lav — mulig fly-læsning |

Ingen negations-/omfangsfejl, ingen komponent-flips, samtykketeksten intakt.
