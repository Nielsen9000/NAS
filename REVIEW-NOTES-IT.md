# REVIEW-NOTES-IT — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

Al italiensk website-tekst ligger i `locales/it.json` (305 oversatte strenge +
27 roller + 178 lande, oversat af Claude; **ikke** indfødt korrekturlæst
endnu). Ret direkte i it.json og kør
`node brand/build_i18n.mjs --build it --strict`.
`<html lang="it">`, ruten er /it/, noindex, ikke i produktion.

## HOLDES TILBAGE FRA KORREKTUREN (sentinels i it.json)

- **`@hold`: FRIGIVET 9. september 2026.** Den engelske drone-stack-side er
  skrevet om til 65A/100A-opdelingen, og NDAA-formuleringen er låst
  (»Chipset europeo conforme alla NDAA« — aldrig en oversættelse af "certified").
  Alle tidligere @hold-nøgler samt de nye strenge fra omskrivningen
  (hele `drone-stack.*`-navnerummet + de fem NDAA-nøgler) er nu oversat
  af Claude og INDGÅR I KORREKTUREN — de er IKKE indfødt korrekturlæst.
  Terminologi: NAS_TERMINOLOGI_6SPROG.md.

- **`@en` (40 nøgler): hele Code of Conduct-siden** — engelsk ved beslutning.
  Siden viser noten "This section is available in English only."

## Kvalitetskontrol udført

- `--build it --strict`: 0 manglende; skelet- og talvalidering grønne.
- `--check-layout it --real`: nav, knapper og sider holder, desktop og mobil;
  Space Grotesk dækker à è é ì ò ù (fontprobe).
- **Blind tilbageoversættelse** sammenlignet med kilden: **0 høje**,
  1 medium, 5 lave — tabel nederst.

## Valg til bekræftelse i korrekturen

1. **Register-trelinje (største valg):** §8-CTA'erne er låst i
   tu-imperativ («Richiedi la documentazione»), så alle knapper/CTA'er er tu
   («Esplora la Serie NAS 2», «Parla con il team di ingegneria»); prosa der
   tiltaler læseren er Lei («La Sua richiesta», «Ci dica di cosa si tratta»,
   «Per poterLa ricontattare»); formular-placeholders er neutral infinitiv
   («Selezionare il ruolo»). Bekræft konventionen.
2. **`engineering.production-is-structured-for`: «a garanzia di» →
   «a sostegno di»** — QC-fund (medium), **RETTET 9/9 før commit** (Jespers
   beslutning: support→garanti er en juridisk forskel for en
   forsvarsleverandør, ikke stil). Efterse rettelsen. Samme mønster ramte
   es og fr uafhængigt — se garanti-mønsteret nederst.
3. **Hero:** «Progettati per l'autonomia» — tre ord til de tre animerede
   spans; linje 2 "Built on integrity" er bevidst engelsk (låst tagline).
4. **Cifre mod låste prosa-termer:** i spec-celler vandt
   tal-byte-identitet: «Boxer bicilindrico · 2 tempi» og «Boxer 2
   cilindri·2 tempi» (ikke «due tempi» dér). Bekræft acceptabelt.
5. **«Schema parafiamma standard»** for standard firewall pattern.
6. **«autonomia»** bruges for både range og endurance (begge låst/naturligt)
   — QC bemærkede flertydigheden, men {spec}-tallet (1000 km) forankrer
   betydningen. Bekræft.
7. **Genus:** «il NAS 2» (= il motore) men «la Serie NAS 2»; **«la ECU»**
   (= la centralina; «l'ECU» også gængs).
8. **«accensione a scarica capacitiva»** for CDI og **«fasatura di
   accensione»** for ignition timing — ikke i den låste liste; bør låses i
   terminologilisten efter bekræftelse.
9. **«corpo farfallato»** for throttle body.
10. **«Nella stessa sede dello UAS Denmark Test Center»** for co-located —
    undgik anglicismen «co-locato».
11. **«pronti alla missione»** for mission-ready; «comprovati» for proven.
12. **Careers:** overskrift i tu («Costruisci i motori che volano più
    lontano»), brødtekst upersonlig («Chi desidera essere il primo a
    saperlo…») for at undgå tu/Lei-sammenstød. Bekræft.
13. **Roller:** Direttore/Responsabile della supply chain-opdelingen;
    «Responsabile acquisti» (Purchase) vs «Responsabile approvvigionamenti»
    (Procurement); «Responsabile sourcing»; «CPO/Chief Procurement Officer»
    beholdt engelsk; «Studente» er hankøn — «Studente/Studentessa» hvis
    inkluderende form ønskes.
14. **Lande:** standarditalienske eksonymer i engelsk alfabetisk rækkefølge
    (bevidst); «Côte d'Ivoire» beholdt fransk form (es valgte eksonym —
    konsistensvalg på tværs af sprog), «Capo Verde», «Timor Est».

## Faste rammer (skal IKKE "rettes")

- Tal fra `brand/specs.mjs` via {spec:} — byte-identiske.
- Formularens indsendte værdier er ALTID engelske; italiensk er kun labels.
- Forbliver EN/latinsk: produktnavne, tagline "Built on integrity",
  firmanavn/adresse, HUD/telemetri-mono, dokumentreferencer.
- Footer-linjen «Fa fede la versione inglese.» er låst (liste §7); nav/CTA
  låst efter §8 (Piattaforme, Soluzioni intelligenti, Ingegneria, Codice di
  condotta, Carriere, Contatti, «Richiedi la documentazione»).

## Drift-fund fra blind tilbageoversættelse (rettes IKKE stille)

| Nøgle | EN | Tilbageoversat | Vurdering |
|---|---|---|---|
| engineering.production-is-structured-for | "supporting consistent output" | "as a guarantee of" | medium — **RETTET** til «a sostegno di» |
| shared.request-brief + contact.request-a-brief-lets | "brief" | "documentation" | lav — låst §8-CTA |
| nas.deliveries-are-carried-out (+ sibling) | "communicated early" | "promptly" | lav |
| engineering.built-for-extended-missions | "short bursts" | "brevi impieghi" | lav |
| home.longendurance-… | "range" | "endurance" (autonomia) | lav — korrekt italiensk for rækkevidde, næppe reelt skred |

Ingen høj-alvorlige fund; roller og lande verificeret 1:1 mod EN.

**⚑ GARANTI-MØNSTER — fast tjekpunkt ved kommende sprog:** "supporting
consistent output" gled uafhængigt til en garanti i it, es og fr (rettet i
alle tre). Support/ensure/guarantee-graden må aldrig stige ift. EN — det er
en juridisk forskel for en forsvarsleverandør. Tjek specifikt ved enhver ny
oversættelse.
NB: `engineering.meta.title` er "Company — Nordic Advanced Systems" — samme
som nas-sidens titel. Det er en KILDE-quirk i en.json (også på engelsk), ikke
en oversættelsesfejl; overvej at rette EN-kilden.
