# REVIEW-NOTES-UA — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

## DEL 0 — WEBSITE (/uk/ — preview, IKKE i produktion)

Al ukrainsk website-tekst ligger i `locales/uk.json` (390 strenge, oversat af
Claude med deck-terminologien; **ikke** indfødt korrekturlæst endnu). Ret
direkte i uk.json og kør `node brand/build_i18n.mjs --build-uk --strict`.
Preview: Vercel-deployment af grenen `i18n-preview`.

Valg til bekræftelse (ud over dem fra datablads-decket, som er genbrugt 1:1):
- **політний контролер** (fra DS-2026-FC-UA) — ikke «польотний»
- Nav: Платформи · Інтелектуальні рішення · Інженерія · NAS · Кодекс ·
  Кар’єра · Контакти; «Запросити бриф» for Request brief
- «Мозок літального апарата» (The brain of the aircraft)
- «КРЕМНІЙ, ЩО ВІДПОВІДАЄ NDAA» (NDAA-COMPLIANT SILICON — aldrig
  «сертифікований»)
- «опозитний твін» for boxer twin; reticle-label «ОПОЗИТНИЙ · 340CC»
- Kolibri-testimonial og conduct-siden (10 juridiske afsnit) er nyoversat —
  læs dem grundigt
- Landeliste (178) og rolleliste (27) i kontaktformularen er oversat;
  formularens indsendte værdier forbliver engelske (value-attributter)
- Forbliver EN/latinsk: produktnavne (Drone Stack, NAS IEMS), tagline,
  firmanavn/adresse, HUD/telemetri-mono, LAT/LNG/ELEV, SYS·ACTIVE osv.
- Tal står ALDRIG i uk.json — de kommer fra brand/specs.mjs via
  {spec:…}-pladsholdere og er byte-identiske med EN



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
