# REVIEW-NOTES-ES — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

Al spansk website-tekst ligger i `locales/es.json` (305 oversatte strenge + 27
roller + 178 lande, europæisk spansk (es-ES), oversat af Claude; **ikke**
indfødt korrekturlæst endnu). Ret direkte i es.json og kør
`node brand/build_i18n.mjs --build es --strict`.
`<html lang="es-ES">`, ruten er /es/, noindex, ikke i produktion.

## HOLDES TILBAGE FRA KORREKTUREN (sentinels i es.json)

- **`@hold` (43 nøgler): hele drone-stack-siden + fem NDAA-nøgler**
  (`home.meta.description`, `home.nas-2-series-ndaacompliant`,
  `contact.danish-european-ndaacompliant`, `efi.nas-iems-is-developed`,
  `efi.ndaacompliant-architecture`). EN-kilden skrives om (65A/100A;
  NDAA-formulering ikke låst). Vises på engelsk på /es/, rapporteres højt.
  Den låste NDAA-sætning er «Chipset europeo conforme con la NDAA» — aldrig
  «certificado». FÆLDEN fra terminologiliste §1: continuous current =
  «corriente permanente», ALDRIG «corriente continua» (= jævnstrøm).
- **`@en` (40 nøgler): hele Code of Conduct-siden** — engelsk ved beslutning.
  Siden viser noten "This section is available in English only."

## Kvalitetskontrol udført

- `--build es --strict`: 0 manglende; skelet- og talvalidering grønne.
- `--check-layout es --real`: nav, knapper og sider holder, desktop og mobil;
  Space Grotesk dækker ñ og ¿¡ (fontprobe).
- **Blind tilbageoversættelse** sammenlignet med kilden: **0 høje**,
  2 medium, 9 lave — tabel nederst. NB: det ene medium-fund (hero-linje 2
  "Built on integrity" på engelsk) er en LÅST brandbeslutning, ikke en
  mangel — gælder alle sprog.

## Valg til bekræftelse i korrekturen

1. **Hero-slogan:** "Engineered for endurance" → **«Diseñado para resistir»**
   — §5-termen «autonomía» ville fejllæses som autonomi i en overskrift.
   Teknisk brug har «de gran autonomía» / «Gran autonomía»
   (`home.longendurance-…`, `engineering.long-endurance`). Bekræft splittet
   og at «resistir» (robusthed) bærer betydningen flyvetid godt nok
   (flaget som lavt skred af QC).
2. **CTA'er i infinitiv** («Explorar la serie NAS 2», «Hablar con
   ingeniería», «Enviar consulta») — es-ES webkonvention; alternativ
   usted-form «Hable con nuestro equipo de ingeniería».
3. **`engineering.production-is-structured-for`: «garantiza» → «favorece»**
   — QC-fund (medium), **RETTET 9/9 før commit** (Jespers beslutning:
   support→garanti er en juridisk forskel for en forsvarsleverandør, ikke
   stil). Efterse rettelsen. Samme mønster ramte fr og it uafhængigt —
   se garanti-mønsteret nederst.
4. **`contact.evening-1620`: «Tarde-noche (16–20)»** (og «Tarde (12–16)») —
   spanske døgndele mapper ikke 1:1. Bekræft.
5. **«mamparo cortafuegos»** for firewall (`home.standard-firewall-pattern`).
6. **«célula»** for airframe (`nas.opposed-cylinders-cancel-primary` m.fl.) —
   standard es-luftfart; alternativ «estructura del avión».
7. **"SCROLL" beholdt engelsk** (`engineering.scroll`) — fr valgte «DÉFILER»;
   afgør konsistenslinjen på tværs af sprog.
8. **`efi.intelligent-nas-iems`** oversat «/ INTELIGENTE — NAS IEMS» — de
   beholdt engelsk her; endnu et konsistensvalg på tværs af sprog.
9. **«avance de encendido»** for ignition timing — alternativ «reglaje».
10. **«plano técnico en modo alámbrico (wireframe)»** — evt. blot «plano
    técnico wireframe».
11. **&amp; → «y»** i efi-featurelisterne («Hardware ECU y software embebido
    propios») — naturligt es-ES; entitetsændringen er valideret OK.
12. **Institutionsnavne:** «el aeropuerto Hans Christian Andersen», «la
    Universidad del Sur de Dinamarca» oversat; «UAS Denmark Test Center»
    beholdt. Bekræft om universitetet skal forblive engelsk (de/fr beholdt
    det engelske navn — konsistensvalg).
13. **`careers.every-seat-on-the`:** bænk-idiomet frit oversat «todos los
    puestos del taller están ocupados» — bekræft register.
14. **Roller:** CPO/Director de aprovisionamiento ·
    Director/Responsable de aprovisionamiento · Responsable de
    aprovisionamiento (Procurement Mgr) · Responsable de compras (Purchase
    Mgr) · Responsable de sourcing — bekræft femvejsopdelingen.
15. **Lande:** «Costa de Marfil» (RAE-eksonym; fr/de beholdt den franske
    form), «Catar», «Arabia Saudí», «Timor Oriental». Engelsk alfabetisk
    rækkefølge bevaret (bevidst — indsendte værdier er engelske).

## Faste rammer (skal IKKE "rettes")

- Tal fra `brand/specs.mjs` via {spec:} — byte-identiske, ingen
  komma-konvertering.
- Formularens indsendte værdier er ALTID engelske; spansk er kun labels.
- Forbliver EN/latinsk: produktnavne, tagline "Built on integrity" (også i
  hero — beslutning), firmanavn/adresse, HUD/telemetri-mono,
  dokumentreferencer.
- Footer-linjen «La versión en inglés es la versión auténtica.» er låst
  (liste §7); nav/CTA låst efter §8 (Plataformas, Soluciones inteligentes,
  Ingeniería, Código de conducta, Empleo, Contacto, «Solicitar información»).

## Drift-fund fra blind tilbageoversættelse (rettes IKKE stille)

| Nøgle | EN | Tilbageoversat | Vurdering |
|---|---|---|---|
| home.engineered-for-endurance-built(-2) | hero linje 2 | "Built on integrity" uoversat | medium — MEN låst beslutning, ingen handling |
| engineering.production-is-structured-for | "supporting consistent output" | "which guarantees…" | medium — **RETTET** til «favorece» |
| hero-slogan | "endurance" | "resistir" (robusthed) | lav |
| nas.our-registered-office-is | "co-located" | "junto al" (ved siden af) | lav |
| nas.deliveries/when-underlying | "underlying conditions … early" | "starting conditions … in advance" | lav |
| home.dropin-mounting-interface-for | "drop-in" | "direct" montering | lav |
| engineering.forcedair-cooled-mapped | "mapped" | "with thermal map" | lav — tilføjet præcision |
| efi.every-engine-platform-has | "dedicated" testfaciliteter | "own" faciliteter | lav |
| shared.primary | "Primary" | "Main navigation" | lav |
| shared.request-brief | "Request brief" | "Request information" | lav — låst §8-CTA |
| engineering.nas-2c-and-nas | "modified hobby or industrial engines" | let flertydig | lav |

Ingen høj-alvorlige fund: ingen komponent-/strøm-flips, ingen
negations-/omfangsfejl; NDAA-strengene er alle @hold. Landelisten og
rollelisten er verificeret 1:1 mod EN (samme rækkefølge, samme indeks).

**⚑ GARANTI-MØNSTER — fast tjekpunkt ved kommende sprog:** "supporting
consistent output" gled uafhængigt til en garanti i es, fr og it (rettet i
alle tre). Support/ensure/guarantee-graden må aldrig stige ift. EN — det er
en juridisk forskel for en forsvarsleverandør. Tjek specifikt ved enhver ny
oversættelse.
