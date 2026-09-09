# REVIEW-NOTES-PT — til korrekturlæseren (indfødt gennemsyn FØR udsendelse)

Al portugisisk website-tekst ligger i `locales/pt.json` (305 oversatte
strenge + 27 roller + 178 lande, EUROPÆISK portugisisk (pt-PT, ikke
brasiliansk), oversat af Claude; **ikke** indfødt korrekturlæst endnu). Ret
direkte i pt.json og kør `node brand/build_i18n.mjs --build pt --strict`.
`<html lang="pt-PT">`, ruten er /pt/, noindex, ikke i produktion.

## HOLDES TILBAGE FRA KORREKTUREN (sentinels i pt.json)

- **`@hold` (43 nøgler): hele drone-stack-siden + fem NDAA-nøgler**
  (`home.meta.description`, `home.nas-2-series-ndaacompliant`,
  `contact.danish-european-ndaacompliant`, `efi.nas-iems-is-developed`,
  `efi.ndaacompliant-architecture`). EN-kilden skrives om (65A/100A;
  NDAA-formulering ikke låst). Vises på engelsk på /pt/, rapporteres højt.
  Den låste NDAA-sætning er «Chipset europeu em conformidade com a NDAA» —
  aldrig «certificado». FÆLDEN fra terminologiliste §1: continuous current =
  «corrente permanente», ALDRIG «corrente contínua» (= jævnstrøm).
- **`@en` (40 nøgler): hele Code of Conduct-siden** — engelsk ved beslutning.
  Siden viser noten "This section is available in English only."

## Kvalitetskontrol udført

- `--build pt --strict`: 0 manglende; skelet- og talvalidering grønne.
- `--check-layout pt --real`: nav, knapper og sider holder, desktop og mobil;
  Space Grotesk dækker ã õ ç (fontprobe).
- **Blind tilbageoversættelse** sammenlignet med kilden: **0 høje,
  0 medium**, 8 lave — tabel nederst. Reneste af de seks sprog.

## Valg til bekræftelse i korrekturen

1. **Hero:** «Concebido para autonomia» (tre ord til de tre animerede
   spans; §5-låst «autonomia»). Linje 2 "Built on integrity" er bevidst
   engelsk (låst tagline) — ikke en mangel.
2. **«célula»** for airframe; **«veio de saída montado na retaguarda»** for
   rear-mounted output shaft. Bekræft aeronautisk register.
3. **«Padrão standard de parede corta-fogo»** — alternativ «antepara
   corta-fogo»; og er låneordet «standard» ok?
4. **«mistura»** for premix («Sem chumbo·mistura {spec}») — alternativ
   «pré-mistura».
5. **`nas.built-on-operational-experience`:** accent-spans holder
   «experiência»/«operacional» i omvendt rækkefølge ift. EN (ordstilling
   tvang det; visuelt identisk resultat).
6. **«enquadramentos definidos»** for defined frameworks — vs «quadros».
7. **«antes da aprovação da unidade»** for before unit release
   (frigivelse-til-forsendelse-læsning; QC-flaget lavt).
8. **EFI:** «corpo de borboleta» (throttle body), «software embebido»
   (pt-PT, ikke «embarcado»), «avanço da ignição» (ignition timing — QC
   bemærker at det er konventionelt men snævrere end "timing").
9. **«pedido»** for enquiry gennemgående («Tipo de pedido», «Enviar
   pedido») — vs «consulta».
10. **«Fim de tarde (16–20)»** for Evening.
11. **`shared.registration` → «Registo»** — hvis det refererer til
    CVR-nummeret, overvej «Registo (CVR)». `nas.registered` → «REGISTADA»
    (kongruens med «sede») — bekræft.
12. **`careers.every-seat-on-the`:** «todos os lugares na bancada estão
    ocupados» — læser bænk-idiomet naturligt?
13. **Roller (fem tætte titler):** CPO/Diretor de Compras ·
    Diretor/Responsável de Compras · Gestor de Compras (Procurement Mgr) ·
    Gestor de Aquisições (Purchase Mgr) · Gestor de Sourcing. Bekræft at de
    forbliver skelnelige; «Responsável pela …» valgt for Head-of-titler.
14. **Lande — EU-stilguidens pt-PT-eksonymer:** Baamas, Barém, Bangladeche,
    Benim, Jibuti, Essuatíni, Quiribáti, Maláui, Maurícia, Catar,
    Usbequistão, São Marinho, Seicheles, Chéquia, Países Baixos, Vietname.
    Bevidste afvigelser mod dominerende sprogbrug: «Liechtenstein» (ikke
    «Listenstaine»), «Sri Lanka» (ikke «Sri Lanca»), «El Salvador» (EU-guide:
    «Salvador»), «Bósnia e Herzegovina» (EU binder med bindestreg).
    Korrekturlæseren bør bekræfte især Baamas/Barém/Bangladeche/Jibuti/
    Maláui/Essuatíni-sættet. Engelsk alfabetisk rækkefølge bevaret (bevidst).

## Faste rammer (skal IKKE "rettes")

- Tal fra `brand/specs.mjs` via {spec:} — byte-identiske.
- Formularens indsendte værdier er ALTID engelske; portugisisk er kun labels.
- Forbliver EN/latinsk: produktnavne, tagline "Built on integrity",
  firmanavn/adresse, HUD/telemetri-mono, dokumentreferencer.
- Footer-linjen «A versão em inglês é a versão autêntica.» er låst (liste
  §7); nav/CTA låst efter §8 (Plataformas, Soluções inteligentes, Engenharia,
  Código de conduta, Carreiras, Contacto, «Solicitar informação»).
- Låste pt-PT-former fra §2–§6: conetor, cambota, controlador de voo, ESC 4
  em 1, dois tempos, bicilíndrico, cilindrada, peso a seco, arrefecido a ar,
  ensaio a frio/a quente, inspeção visual, rastreabilidade das unidades.

## Drift-fund fra blind tilbageoversættelse (rettes IKKE stille)

| Nøgle | EN | Tilbageoversat | Vurdering |
|---|---|---|---|
| home.dropin-mounting-interface-for | "drop-in mounting interface" | "direct mounting" | lav — drop-in-begrebet tabt |
| shared.request-brief | "Request brief" | "Request information" | lav — låst §8-CTA |
| nas.deliveries-are-carried-out | "communicated early" | "in a timely manner" | lav |
| engineering.coldrun/hotrun-testing | "COLD-RUN/HOT-RUN" | "cold/hot test" | lav — låste §6-termer |
| engineering.final-review-before-unit | "unit release" | "unit approval" | lav |
| careers.if-you-want-to | "first in line" | "first to know" | lav |
| efi.ecucontrolled-ignition-timing | "ignition timing" | "ignition advance" | lav — konventionelt |
| home.engineered-for-endurance-built | hero linje 2 | "Built on integrity" uoversat | note — låst beslutning |

0 høje, 0 medium. Ingen komponent-/strøm-flips, ingen negations-/omfangsfejl;
roller og lande verificeret positionsvist 1:1 mod EN.

**⚑ GARANTI-MØNSTER — fast tjekpunkt ved kommende sprog:** "supporting
consistent output" gled uafhængigt til en garanti i fr/es/it (rettet 9/9).
Support/ensure/guarantee-graden må aldrig stige ift. EN — juridisk forskel
for en forsvarsleverandør. pt's «assegurando» (ensuring) i samme nøgle
(`engineering.production-is-structured-for`) er GRÆNSETILFÆLDET: mildere end
«garantindo», men stadig et hak over "supporting". Ikke rettet — korrektur-
læseren afgør, om «apoiando/favorecendo» er bedre.

## pt-PT-verifikation (kørt 9/9 efter QC)

Maskinel stikprøve på brasilianske markører i pt.json: **0 hits** på
virabrequim, contato, eletrônico/-a, tela, usuário, gerenciamento, equipe,
planejamento, cadastro, registro, conosco, embarcado, você(s), econômico
m.fl. Positivt til stede (pt-PT): cambota ×4, contacto ×3, eletrónica ×5,
equipa ×2, connosco ×2, embebido ×2, gestão ×10, registo ×1.
(utilizador/ecrã/conetor: 0 forekomster, fordi user/screen/connector ikke
optræder i det oversatte indhold — connector ligger i @hold-drone-stack og
skal bruge den låste form «conetor», når den oversættes.)
