# REVIEW-NOTES-DE — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

Al tysk website-tekst ligger i `locales/de.json` (305 oversatte strenge + 27
roller + 178 lande, oversat af Claude; **ikke** indfødt korrekturlæst endnu).
Ret direkte i de.json og kør `node brand/build_i18n.mjs --build de --strict`.
`<html lang="de">`, ruten er /de/, noindex, ikke i produktion.

## HOLDES TILBAGE FRA KORREKTUREN (sentinels i de.json)

- **`@hold`: FRIGIVET 9. september 2026.** Den engelske drone-stack-side er
  skrevet om til 65A/100A-opdelingen, og NDAA-formuleringen er låst
  (»NDAA-konformer europäischer Chipsatz« — aldrig en oversættelse af "certified").
  Alle tidligere @hold-nøgler samt de nye strenge fra omskrivningen
  (hele `drone-stack.*`-navnerummet + de fem NDAA-nøgler) er nu oversat
  af Claude og INDGÅR I KORREKTUREN — de er IKKE indfødt korrekturlæst.
  Terminologi: NAS_TERMINOLOGI_6SPROG.md.

- **`@en` (40 nøgler): hele Code of Conduct-siden** — engelsk ved beslutning
  (ti juridiske afsnit). Siden viser noten "This section is available in
  English only." Skal IKKE oversættes.

## Kvalitetskontrol udført

- `--build de --strict`: 0 manglende strenge; skeletvalidering (markup +
  {spec:}-pladsholdere identiske med EN) og talvalidering (alle EN-tal
  byte-identiske) grønne.
- `--check-layout de --real`: nav, knapper og sider holder med den rigtige
  tyske tekst, desktop og mobil. Space Grotesk dækker ä ö ü ß (fontprobe).
- **Blind tilbageoversættelse** (separat kørsel uden adgang til EN-kilden)
  sammenlignet med kilden: **0 høj-alvorlige skred**, 1 medium, 5 lave.
  Fuld tabel: se drift-afsnittet nederst.

## Valg til bekræftelse i korrekturen

1. **`contact.job`: "Job" → „Bewerbung"** — ENESTE medium-fund fra
   tilbageoversættelsen: indsnævrer enquiry-typen fra alt jobrelateret til
   "jobansøgning". Alternativ: „Stelle/Bewerbung" eller blot „Job".
2. **"NAS 2 Series" → „NAS 2-Serie"** i brødtekst/CTA'er; kun engelsk i
   meta.title. Bekræft bindestregspraksis („NAS 2-Serie" vs „NAS-2-Serie").
3. **"Speak with engineering" → „Mit dem Engineering-Team sprechen"**
   (`nas.speak-with-engineering` m.fl.). Alternativ: „Kontakt zum Engineering".
4. **Endurance-split:** hero „Entwickelt für Ausdauer" (marketing) vs
   „hohe Einsatzdauer" (teknisk, jf. terminologiliste §5). Bekræft splittet.
5. **„Boxer-Twin"** beholdt halvengelsk (`home.boxer-twin-2stroke`,
   `engineering.config-boxer-twin`) — „Boxer-Zweizylinder" føltes redundant.
6. **„Gebläseluft" / „gebläsegekühlt"** for forced air; „mapped" →
   „thermisch vermessen" (`engineering.forcedair-cooled-mapped` — tilføjer
   „thermisch", flaget som lavt skred).
7. **„Doppelfunken-CDI" / „DOPPELFUNKENZÜNDUNG"** — luftfartsfolk siger
   måske „Doppelzündung".
8. **„Standard-Brandschott-Lochbild"** for "standard firewall pattern" —
   læst som monteringshulmønster i brandskottet. Bekræft intentionen.
9. **ECU hunkøn** („die ECU", „barometrisch kompensierte ECU").
10. **CDI udvidet på tysk:** „Kondensatorentladungszündung (CDI)".
11. **„Integriertes Motormanagementsystem"** for IEMS-overskriften — akronymet
    mapper så ikke længere bogstav-for-bogstav; NAS bør bekræfte.
12. **„JURISDIKTION"** (ikke „Gerichtsstand") for JURISDICTION.
13. **DSGVO:** "GDPR Policy" → „DSGVO-Richtlinie"; Code of Conduct omtales som
    „Verhaltenskodex (Code of Conduct)" i samtykketeksten, fordi den linkede
    side forbliver engelsk.
14. **Institutionsnavne beholdt på engelsk:** "Hans Christian Andersen
    Airport", "University of Southern Denmark" — evt. „Universität
    Süddänemark".
15. **Roller:** „Sonstiges" for Other; „Student/in" er listens eneste
    kønsmarkerede form (ledertitlerne står i generisk maskulinum:
    „Leiter/Direktor") — harmonisér hvis ønsket. Beschaffung (Procurement)
    vs Einkauf (Purchase) vs Sourcing holdt adskilt.
16. **Lande:** „Cabo Verde" (Auswärtiges Amt-form, ikke „Kap Verde"),
    „Moldau" (ikke „Moldawien"). Listen står i ENGELSK alfabetisk rækkefølge
    (bevidst — indsendte værdier er engelske; se nedenfor).

## Faste rammer (skal IKKE "rettes")

- Tal kommer fra `brand/specs.mjs` via {spec:}-pladsholdere og står
  byte-identisk i alle sprog — ingen komma-konvertering.
- Formularens indsendte værdier er ALTID engelske; tysk er kun visningslabels.
- Forbliver EN/latinsk: produktnavne (Drone Stack, NAS IEMS), tagline
  "Built on integrity", firmanavn/adresse, HUD/telemetri-mono (SYS·ACTIVE,
  LAT/LNG/ELEV, BOXER · 340CC osv.), dokumentreferencer.
- Footer-linjen »Maßgeblich ist die englische Fassung.« er låst (liste §7).
- Nav/CTA er låst efter liste §8 (Plattformen, Intelligente Lösungen,
  Engineering, Verhaltenskodex, Karriere, Kontakt, „Unterlagen anfordern").

## Drift-fund fra blind tilbageoversættelse (rettes IKKE stille)

| Nøgle | EN | Tilbageoversat | Vurdering |
|---|---|---|---|
| contact.job | "Job" | "Job application" (Bewerbung) | **medium** — indsnævring |
| shared.primary | "Primary" (aria-label) | "Hauptnavigation" | lav — bevidst lokalisering |
| shared.conduct | "Conduct" | "Verhaltenskodex" | lav — låst §8-term |
| nas.predictable-mechanical-and-thermal | "well understood" | "genau verstanden" | lav — **RETTET** til „gut verstanden" (garanti-mønsteret) |
| engineering.hotrun-testing | "HOT-RUN" | "WARMLAUF" | lav — låst §6-term |
| engineering.forcedair-cooled-mapped | "mapped" | "thermisch vermessen" | lav — tilføjer "thermisch" |

Ingen fund i øvrigt: NDAA-sætningen, strøm-/komponenttermer, negationer og
omfangsudsagn overlevede rundturen uændret (0 høj-alvorlige).

**⚑ GARANTI-MØNSTER — fast tjekpunkt ved kommende sprog:** oversættelserne
har en tendens til at forstærke forsigtige EN-udsagn ("supporting" → garanti
i fr/es/it, "well" → „genau" her; alle rettet 9/9). Support/ensure/
guarantee-graden må aldrig stige ift. EN — det er en juridisk forskel for en
forsvarsleverandør. Tjek specifikt ved enhver ny oversættelse.
