# REVIEW-NOTES-UA — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

## DEL 0 — WEBSITE (/uk/ — preview, IKKE i produktion)

Al ukrainsk website-tekst ligger i `locales/uk.json` (390 strenge, oversat af
Claude; **ikke** indfødt korrekturlæst endnu). Ret direkte i uk.json og kør
`node brand/build_i18n.mjs --build-uk --strict`.
Preview (følger altid grenen `i18n-preview`):
https://nas-git-i18n-preview-nielsen9000s-projects.vercel.app
— ukrainsk under /uk/, engelsk på roden, sprogvælgeren EN · УКР skifter
mellem dem på samme side.

**VIGTIG STATUS-KORREKTION:** Copy-deck-formuleringerne er **IKKE godkendte** —
`NAS_UA_COPYDECK_CP_DS.md` ligger stadig hos korrekturlæseren sammen med
databladene. Hvor sitet genbruger deck-tekst, er det altså genbrug af
*ukorrekturlæste* formuleringer. Sporbarhedstabellen nederst viser præcis
hvilke uk.json-nøgler der stammer fra decket, så en rettelse i databladet kan
slås igennem på sitet uden manuel ledning.

### HOLDES TILBAGE FRA KORREKTUREN

**1. Hele drone stack-siden (alle `drone-stack.*`-nøgler i uk.json):
afventer engelsk omskrivning — læses ikke korrektur endnu.**
Den engelske kildetekst er faktuelt forkert: siden beskriver én stack med tre
strømvarianter, men 100A er et andet board (6S/8S, 18–35 V, anden FC). Siden
skrives om på engelsk først; den ukrainske oversættelse følger derefter.
NB: samme fejl står i DS-2026-FC-databladet ("Three current variants") og på
roll-up-banneret — se noten til Jesper/teamet nederst.

**2. NDAA-formuleringerne: afventer engelsk omskrivning — læses ikke
korrektur endnu.** EN er foreløbigt sat til "NDAA-compliant European chipset"
overalt på sitet ("silicon"-varianten og de bredere påstande om komponenter,
software og europæisk fremstilling er fjernet), men den endelige engelske
formulering er ikke låst. Berørte nøgler:
`home.meta.description`, `home.nas-2-series-ndaacompliant`,
`contact.danish-european-ndaacompliant`, `efi.nas-iems-is-developed`,
`efi.ndaacompliant-architecture` samt alle NDAA-nøgler under `drone-stack.*`
(som alligevel er holdt tilbage under punkt 1).

### DE TO FLAG ER UAFHÆNGIGE — MÅ IKKE SLÅS SAMMEN

- **Korrekturlæserens sign-off** åbner /uk/-ruten: `UK_SWITCHER_LIVE` flippes,
  og /uk/ må gå på produktionsgrenen.
- **`UK_NOINDEX`** er en **separat ledelsesbeslutning, der ikke er truffet**.
  Den **bliver stående på `true` uanset korrektur-sign-off** — /uk/ kan
  udmærket være live og synlig via sprogvælgeren uden at være indekserbar.
  Først når ledelsen eksplicit godkender indeksering, flippes UK_NOINDEX
  (én linje i `locales/config.mjs`), hvilket samtidig aktiverer hreflang.

### Valg til bekræftelse i korrekturen

- **політний контролер** (arvet fra DS-2026-FC-UA) — ikke «польотний»
- Nav: Платформи · Інтелектуальні рішення · Інженерія · NAS · Кодекс ·
  Кар’єра · Контакти; «Запросити бриф» for Request brief
- «опозитний твін» for boxer twin; reticle-label «ОПОЗИТНИЙ · 340CC»
- Conduct-siden (10 juridiske afsnit) er nyoversat — læs den grundigt
- Landeliste (178) og rolleliste (27) i kontaktformularen er oversat;
  formularens indsendte værdier forbliver engelske (value-attributter)
- Forbliver EN/latinsk: produktnavne (Drone Stack, NAS IEMS), tagline,
  firmanavn/adresse, HUD/telemetri-mono, LAT/LNG/ELEV, SYS·ACTIVE osv.
- Tal står ALDRIG i uk.json — de kommer fra brand/specs.mjs via
  {spec:…}-pladsholdere og er byte-identiske med EN

### Sporbarhed: uk.json-nøgler der stammer fra copy-decket

Når korrekturlæseren retter i decket/databladene, skal de samme rettelser
slås igennem her. "Verbatim" = ordret deck-tekst; "afledt" = deck-formulering
tilpasset sitets kortere EN-tekst (ret ånden, ikke nødvendigvis ordret).

**Fra CP-2026-UA (deck DEL 1):**

| uk.json-nøgle | Deck-kilde | Status |
|---|---|---|
| nas.nordic-advanced-systems-is | CP side 2 · afsnit 01 | verbatim |
| nas.in-many-uav-operations | CP side 2 · afsnit 02 | afledt |
| nas.nas-is-organized-as | CP side 2 · afsnit 03 + 05 | afledt |
| nas.the-company-draws-on | CP side 2 · afsnit 03 | afledt |
| nas.the-working-method-is | CP side 2 · afsnit 03 | afledt |
| nas.nas-works-with-clear | CP side 2 · afsnit 05, sætn. 1 | verbatim |
| nas.configurations-are-finalized-before | CP side 2 · afsnit 05, sætn. 2–3 | verbatim |
| nas.deliveries-are-carried-out | CP side 2 · afsnit 05, sætn. 4–5 | verbatim |
| nas.when-underlying-conditions-change | CP side 2 · afsnit 05 | afledt |
| engineering.coldrun-testing + .mechanical-verification-under-controlled | CP side 3 · TEST PROTOCOL 01 | verbatim |
| engineering.hotrun-testing + .performance-validation-at-operational | CP side 3 · TEST PROTOCOL 02 | verbatim |
| engineering.visual-inspection + .final-review-before-unit | CP side 3 · TEST PROTOCOL 03 | verbatim |
| engineering.unit-traceability + .documentation-provided-with-every | CP side 3 · TEST PROTOCOL 04 | verbatim |
| engineering.the-engines-are-developed | CP side 2 · afsnit 04 intro | afledt |
| engineering.stable-rotational-speed / .controlled-vibration / .predictable-thermal-behavior / .consistent-performance (+ beskrivelser) | CP side 2 · afsnit 04 bullets | afledt (delt i label + tekst) |
| engineering.nas-2c-and-nas | CP side 3 · afsnit 07 intro | verbatim |
| engineering.constant-high-load / .direct-propeller-coupling / .long-endurance / .mechanical-and-thermal-stability / .precisionbalanced-crankshaft | CP side 3 · afsnit 07 bullets | verbatim |
| engineering.highgrade-bearings + .rated-for-continuous-cyclic | CP side 3 · afsnit 07, sidste bullet | afledt (delt i label + tekst) |

**Fra DS-2026-UA (deck DEL 2):**

| uk.json-nøgle | Deck-kilde | Status |
|---|---|---|
| home.meta.description + home.longendurance-dualcylinder-boxer-engines | DS side 1 · lede | afledt |
| home.two-dualcylinder-2stroke-boxer | DS side 1 · 01 Overview intro | afledt |
| home.dualcylinder-2stroke-boxer-engine | DS side 1 · NAS 2C-bullet | afledt |
| home.electronic-fuel-injection-with | DS side 1 · NAS 2E-bullet | afledt |
| home.displacement («Робочий об'єм») / home.dry-weight («Суха маса») | DS side 2 · Common specs | verbatim (labels) |
| home.carburettor / .manual-tuning / .dual-cdi-coils / .none / .live-canuart / .auto-barometric / .ecutuned-curve | DS side 2 · Model comparison | afledt (forkortede celler) |

**Fra DS-2026-FC-UA (drone stack-datablad, uk-locale i
brand/build_datasheet_dronestack.mjs):** terminologien політний контролер /
стек / «зв’язок і журналювання»-registret er arvet dertil — men hele
drone-stack-siden er alligevel holdt tilbage, jf. punkt 1 ovenfor.



Gælder: **DATASHEETS/NAS_COMPANY_PROFILE_2026_UA_CMYK.pdf** (CP-2026-UA REV 01)
og **DATASHEETS/NAS_DATASHEET_2C2E_2026_UA_CMYK.pdf** (DS-2026-UA REV 01).
Al ukrainsk tekst er taget 1:1 fra `NAS_UA_COPYDECK_CP_DS.md`; der er ikke
opfundet nye oversættelser i implementeringen. Byg: `node brand/build_cp_ds_ua.mjs`.

## Terminologivalg der skal bekræftes

- **БПЛА** for "UAV" i al løbende tekst (deckets beslutning, brugt konsekvent:
  «платформ БПЛА», «операції БПЛА», «створені для БПЛА»).
- **опозитний двигун** for "boxer engine" — i undertitlen, overskriftskeys og
  overview. I spec-tabellen står «горизонтально опозитний (boxer)», hvor
  "(boxer)" bevidst er beholdt på latin som teknisk term (fra decket).
- «двоциліндровий двотактний» — decket staver "dual-cylinder, 2-stroke" ud i
  ord i prosaen, men beholder cifrene i spec-tabellen («2 циліндри, 2-тактний»).
  Det giver en bevidst afvigelse i tal-pariteten to steder (logget i buildet).

## Billeder med indbagt engelsk — mono-nøgler

De tre engelske labels, der sidder som del af artworket, er beholdt på engelsk,
og deckets oversættelse står i en lille mono-nøgle under figuren (cyan engelsk
term · ukrainsk oversættelse — samme mønster som DS-2026-FC-UA):

| Sted | Label (EN, på billedet) | Nøgle (UA) |
|---|---|---|
| CP s. 3, test rig-foto | NAS · TEST RIG | Test Rig · Випробувальний стенд |
| CP s. 3, motor-schematic | NAS 2 · SCHEMATIC | Schematic · Схема |
| DS s. 1, motorfoto | NAS 2 · BOXER ENGINE | Boxer Engine · Опозитний двигун |

- Test rig-fotoet har desuden vægdekalen «NORDIC ADVANCED SYSTEMS · BUILT ON
  INTEGRITY» indbagt. Den er IKKE oversat i nøglen — taglinen forbliver på
  engelsk pr. beslutning (Jesper), og firmanavnet er latin i alle sprog.
- Taglinen «Built on integrity» står også uoversat på UA-forsiden (beslutning).

## Udeladt i DS-2026-UA

- Rækken **FUEL EFFICIENCY (★★★★☆ / ★★★★★)** er udeladt helt — stjerne-ratings
  er et regelbrud i kilden (NAS-BRAND: ingen stjerne-ratings i datablade), og
  der findes ingen målte tal at erstatte dem med. EN/DA rettes tilsvarende ved
  næste REV (TODO-kommentar ligger på rækken i `.tmp_pdf/datasheet_print.html`).

## Layout — hvad udvidelsen kostede

Ingen omformuleringer var nødvendige; ingen typestørrelser er ændret. Kun
marginer er strammet i UA-varianterne (EN/DA-masterne er urørte):

- CP s. 3: test rig-banner bundmargin 4→2,5 mm; protokol-eyebrow 4→3 mm
  (siden løb ellers 1,6 mm forbi footer-linjen; nu 0,9 mm fri).
- DS s. 1: hero-margin 8→6 mm; sektionsmargin 6→5 mm (1,5 mm fri).
- DS s. 2: margin under overskriften 8→6 mm (2,4 mm fri).
- DS s. 2: labellen «СТІЙКІСТЬ ДО ПОГОДНИХ УМОВ» ombrydes til to linjer i
  venstre kolonne — accepteret, samme adfærd som designet tillader på EN.

## Kørt QA (alle grønne)

1. Tal-assertion mod config (35 hp, 26 kW, 340 cm³, 9 kg, 1000 km, 1:50) —
   byte-identiske i EN-kilde, UA-HTML og ekstraheret UA-PDF-tekst; fuld
   tal-token-paritet på alle øvrige erstatningspar.
2. Homoglyf-tjek: ingen kyrilliske tegn i latinske tokens.
3. Font-tjek på begge UA-PDF'er + DS-2026-FC-UA (pdffonts-ækvivalent, læser
   /FontName i FontDescriptors): kun Inter + JetBrains Mono, subset;
   SpaceGrotesk fraværende i alle tre.
4. DOC-referencer latinske (Doc · CP-2026-UA / DS-2026-UA · Rev 01);
   Конфіденційно oversat i footer og på forsiden (КОНФІДЕНЦІЙНО —
   КОНТРОЛЬОВАНИЙ ДОКУМЕНТ); «All rights reserved» → «УСІ ПРАВА ЗАХИЩЕНІ».
5. CMYK-eksport: PDF/X-3, DeviceCMYK, FOGRA39L Coated embedded, levende
   vektortekst, 0 shadings tilbage.

---

## ADDENDUM (8. september 2026) — seks nye sprog + ny sprogvælger

Tre ting ændrer sig for /uk/ i samme ombæring; de kræver korrekturlæserens blik:

1. **Ny footer-linje på alle sprogversioner:** «Англійська версія є автентичною.»
   (EN: "English is the authoritative version.") Oversættelsen er Claudes og er
   IKKE korrekturlæst — bekræft eller ret formuleringen (alternativ overvejet:
   «Офіційною версією є англійська»). Rettes i LANG_META i brand/build_i18n.mjs
   (uk.authoritative), ikke i uk.json.
2. **Sprogvælgeren er bygget om** (otte sprogversioner): lukket viser den kun
   aktiv sprogkode + chevron («УКР ⌄»), åben viser sprogene på deres eget sprog.
   BESLUTNING FASTHOLDT: /uk/ står ikke i vælgeren på andre sprogs sider — den
   nås kun via direkte link (flaget UK_IN_SWITCHER i locales/config.mjs, default
   false). På /uk/-siderne selv vises «Українська» som aktivt sprog. Knappens
   aria-label på uk: «Вибрати мову» — også Claudes oversættelse, bekræft.
3. **Formular-fix:** rolle- og landelisten indsendte tidligere den OVERSATTE
   tekst som værdi. Nu er værdien altid engelsk; ukrainsk vises kun som label.
   Ingen handling nødvendig, men adfærden i punktet "formularens indsendte
   værdier forbliver engelske" passer først NU for dropdown-listerne.
