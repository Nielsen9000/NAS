# NAS — TERMINOLOGILISTE, 6 SPROG
Låst terminologi til website og datablade. Bruges af Claude Code som
opslagsværk under oversættelse, så samme begreb hedder det samme på
tværs af alle sider og dokumenter.

Sprogkoder: `fi` · `de` · `fr` · `es-ES` · `pt-PT` · `it`
Version 1 · 7. september 2026 · engelsk er den autoritative kilde

---

## 0. OVERSÆTTES ALDRIG (uændret i alle sprog)

STM32F405 · STM32F051 · STM32F722 · ICM-42688-P · IIM-42652 ·
BMP280 · DPS310 · AT7456E · DSHOT · ELRS · I2C · SBUS · IBUS · CRSF ·
UART · GPIO · SPI · VTX · RC · GPS · CAN · KISS · AM32 · Betaflight ·
ArduPilot · NDAA · NAS · ESC · FC · EFI · ECU · CDI · IMU · Blackbox ·
XT60 · XT60H-M · MOSFET · 4S / 6S / 8S · Drone Stack · NAS 2C · NAS 2E ·
NAS IEMS · alle enheder (V, A, kW, hp, g, mm, cm³, km, Mbit) ·
firmanavn og adresse · taglinen "Built on integrity" ·
HUD- og telemetri-mono (LAT, LNG, ELEV, SYS·ACTIVE)

**Dokumentreferencer** (DOC · DS-2026-FC65 · REV 01) forbliver latinske
og uoversatte i alle sprog.

---

## 1. FÆLDER — læs denne inden noget oversættes

**"Continuous current" må ALDRIG oversættes ordret i de romanske sprog.**
*Courant continu* (fr), *corriente continua* (es), *corrente contínua* (pt)
og *corrente continua* (it) betyder alle **jævnstrøm (DC)** — ikke
vedvarende strøm. Et datablad, der siger "corriente continua: 100 A",
påstår noget helt andet end det, der står i den engelske kilde.
Brug de former, der står i tabellen nedenfor.

**"Certified" må aldrig bruges om NDAA** — heller ikke som oversættelse.
Gælder alle sprog. Se den låste sætning i afsnit 7.

**Tal oversættes aldrig og formateres ikke om.** De kommer fra
`brand/specs.mjs` og skal være byte-identiske på tværs af sprog.
Ingen komma-til-punktum-konvertering, ingen tusindtalsseparatorer.
`46.5 × 52.5 mm` står ens i alle sprogversioner.

---

## 2. HARDWARE

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| flight controller | lennonohjain | Flight Controller *(beholdes)* | contrôleur de vol | controlador de vuelo | controlador de voo | controllore di volo |
| 4-in-1 ESC | 4-in-1 ESC | 4-in-1 ESC | ESC 4-en-1 | ESC 4 en 1 | ESC 4 em 1 | ESC 4 in 1 |
| electronic speed controller | sähköinen nopeudensäädin | elektronischer Drehzahlregler | contrôleur électronique de vitesse | controlador electrónico de velocidad | controlador eletrónico de velocidade | regolatore elettronico di velocità |
| stack | stack *(beholdes)* | Stack | stack | stack | stack | stack |
| board | piirilevy | Platine | carte | placa | placa | scheda |
| firmware | laiteohjelmisto | Firmware | firmware | firmware | firmware | firmware |
| pinout | pinnijärjestys | Pinbelegung | brochage | asignación de pines | atribuição de pinos | piedinatura |
| wiring | johdotus | Verdrahtung | câblage | cableado | cablagem | cablaggio |
| solder pad | juotospinta | Lötpad | pastille de soudure | pad de soldadura | pad de soldadura | pad di saldatura |
| connector | liitin | Steckverbinder | connecteur | conector | conetor | connettore |

---

## 3. STRØM OG SPÆNDING

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| **continuous current** | jatkuva virta | Dauerstrom | **courant permanent** | **corriente permanente** | **corrente permanente** | **corrente permanente** |
| burst current | huippuvirta | Spitzenstrom | courant de pointe | corriente de pico | corrente de pico | corrente di picco |
| input voltage | syöttöjännite | Eingangsspannung | tension d'entrée | tensión de entrada | tensão de entrada | tensione di ingresso |
| power output | teho | Ausgangsleistung | puissance de sortie | potencia de salida | potência de saída | potenza in uscita |
| power rails | jännitekiskot | Spannungsschienen | rails d'alimentation | raíles de alimentación | barramentos de alimentação | linee di alimentazione |
| motor output | moottorilähtö | Motorausgang | sortie moteur | salida de motor | saída para motores | uscita motori |
| current sensor | virta-anturi | Stromsensor | capteur de courant | sensor de corriente | sensor de corrente | sensore di corrente |
| telemetry | telemetria | Telemetrie | télémétrie | telemetría | telemetria | telemetria |
| capacitor | kondensaattori | Kondensator | condensateur | condensador | condensador | condensatore |
| bidirectional | kaksisuuntainen | bidirektional | bidirectionnel | bidireccional | bidirecional | bidirezionale |

---

## 4. MOTOR (NAS 2-serien)

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| boxer engine | boxermoottori | Boxermotor | moteur boxer | motor bóxer | motor boxer | motore boxer |
| two-stroke | kaksitahtinen | Zweitakt- | deux temps | dos tiempos | dois tempos | due tempi |
| dual-cylinder | kaksisylinterinen | Zweizylinder- | bicylindre | bicilíndrico | bicilíndrico | bicilindrico |
| displacement | iskutilavuus | Hubraum | cylindrée | cilindrada | cilindrada | cilindrata |
| dry weight | kuivapaino | Trockengewicht | poids à sec | peso en seco | peso a seco | peso a secco |
| air-cooled | ilmajäähdytteinen | luftgekühlt | refroidi par air | refrigerado por aire | arrefecido a ar | raffreddato ad aria |
| crankshaft | kampiakseli | Kurbelwelle | vilebrequin | cigüeñal | cambota *(pt-PT)* | albero motore |
| carburettor | kaasutin | Vergaser | carburateur | carburador | carburador | carburatore |
| ignition | sytytys | Zündung | allumage | encendido | ignição | accensione |
| bearing | laakeri | Lager | roulement | rodamiento | rolamento | cuscinetto |
| output shaft | ulostuloakseli | Abtriebswelle | arbre de sortie | eje de salida | veio de saída | albero di uscita |
| propeller | potkuri | Propeller | hélice | hélice | hélice | elica |

---

## 5. OPERATIONER

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| UAV *(forkortelse beholdes)* | miehittämätön ilma-alus (UAV) | unbemanntes Luftfahrzeug (UAV) | aéronef sans équipage (UAV) | vehículo aéreo no tripulado (UAV) | veículo aéreo não tripulado (UAV) | velivolo senza pilota (UAV) |
| propulsion system | voimalaite | Antriebssystem | système de propulsion | sistema de propulsión | sistema de propulsão | sistema di propulsione |
| platform | alusta | Plattform | plateforme | plataforma | plataforma | piattaforma |
| mission | tehtävä | Einsatz | mission | misión | missão | missione |
| continuous operation | jatkuva käyttö | Dauerbetrieb | fonctionnement continu | funcionamiento continuo | funcionamento contínuo | funzionamento continuo |
| heavy-lift | raskaan kuorman | Schwerlast- | forte charge utile | alta carga útil | alta carga útil | carico elevato |
| endurance | toiminta-aika | Einsatzdauer | endurance | autonomía | autonomia | autonomia |
| under load | kuormitettuna | unter Last | en charge | bajo carga | sob carga | sotto carico |
| series production | sarjatuotanto | Serienfertigung | production en série | producción en serie | produção em série | produzione in serie |

---

## 6. TESTPROTOKOL

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| cold-run testing | kylmäkäyttötesti | Kaltlauftest | essai à froid | prueba en frío | ensaio a frio | prova a freddo |
| hot-run testing | kuumakäyttötesti | Warmlauftest | essai à chaud | prueba en caliente | ensaio a quente | prova a caldo |
| visual inspection | silmämääräinen tarkastus | Sichtprüfung | contrôle visuel | inspección visual | inspeção visual | ispezione visiva |
| unit traceability | yksikkökohtainen jäljitettävyys | Rückverfolgbarkeit der Einheiten | traçabilité des unités | trazabilidad de unidades | rastreabilidade das unidades | tracciabilità delle unità |

---

## 7. LÅSTE SÆTNINGER

Disse oversættes én gang og genbruges ordret. Ret aldrig lokalt.

**"NDAA-compliant European chipset."**

| fi | NDAA-yhteensopiva eurooppalainen piirisarja. |
|---|---|
| de | NDAA-konformer europäischer Chipsatz. |
| fr | Chipset européen conforme à la NDAA. |
| es | Chipset europeo conforme con la NDAA. |
| pt | Chipset europeu em conformidade com a NDAA. |
| it | Chipset europeo conforme alla NDAA. |

⚑ Aldrig *certified / zertifiziert / certifié / certificado / certificato*.

**"Confidential"**
fi Luottamuksellinen · de Vertraulich · fr Confidentiel ·
es Confidencial · pt Confidencial · it Riservato

**"All rights reserved"**
fi Kaikki oikeudet pidätetään · de Alle Rechte vorbehalten ·
fr Tous droits réservés · es Todos los derechos reservados ·
pt Todos os direitos reservados · it Tutti i diritti riservati

**Footer-linje (ny, tilføjes alle sprogversioner):**
"English is the authoritative version."
fi Englanninkielinen versio on virallinen. ·
de Maßgeblich ist die englische Fassung. ·
fr La version anglaise fait foi. ·
es La versión en inglés es la versión auténtica. ·
pt A versão em inglês é a versão autêntica. ·
it Fa fede la versione inglese.

---

## 8. NAVIGATION OG UI

| EN | fi | de | fr | es | pt | it |
|---|---|---|---|---|---|---|
| Platforms | Alustat | Plattformen | Plateformes | Plataformas | Plataformas | Piattaforme |
| Intelligent Solutions | Älykkäät ratkaisut | Intelligente Lösungen | Solutions intelligentes | Soluciones inteligentes | Soluções inteligentes | Soluzioni intelligenti |
| Engineering | Suunnittelu | Engineering | Ingénierie | Ingeniería | Engenharia | Ingegneria |
| Conduct | Toimintaperiaatteet | Verhaltenskodex | Code de conduite | Código de conducta | Código de conduta | Codice di condotta |
| Careers | Ura | Karriere | Carrières | Empleo | Carreiras | Carriere |
| Contact | Yhteystiedot | Kontakt | Contact | Contacto | Contacto | Contatti |
| Request brief | Pyydä aineisto | Unterlagen anfordern | Demander le dossier | Solicitar información | Solicitar informação | Richiedi la documentazione |
| Request datasheet | Pyydä tekniset tiedot | Datenblatt anfordern | Demander la fiche technique | Solicitar ficha técnica | Solicitar ficha técnica | Richiedi la scheda tecnica |

⚑ "Request brief" er en marketing-CTA, ikke en teknisk term. Oversættelserne
ovenfor er neutrale og korrekte, men NAS bør se dem — det er den knap, folk
skal trykke på.

---

## 9. UDELADES AF OVERSÆTTELSEN

**Code of Conduct-siden holdes på engelsk i alle sprogversioner.**
Ti juridiske afsnit er den højeste risiko på sitet; en forkert oversat
compliance-formulering er en påstand, ikke en sjuskefejl. Siden linkes
normalt fra navigationen, men indholdet forbliver engelsk med en kort
note: "This section is available in English only."

---

## BILAG — FINSK UDDRAG TIL KOLIBRI

Til gennemsyn hos Kolibri Defence. Alt finsk fra listen ovenfor,
samlet ét sted. Spørgsmål til dem:

1. Er `lennonohjain` det, branchen bruger for flight controller, eller
   bruges det engelske udtryk i praksis?
2. `jatkuva virta` for continuous current — korrekt i et datablad?
3. `voimalaite` mod `propulsiojärjestelmä` for propulsion system?
4. `Toimintaperiaatteet` som navigationspunkt for Conduct — eller noget andet?
5. `Pyydä aineisto` som CTA — virker den naturlig som knaptekst?

| EN | fi |
|---|---|
| flight controller | lennonohjain |
| electronic speed controller | sähköinen nopeudensäädin |
| continuous current | jatkuva virta |
| burst current | huippuvirta |
| input voltage | syöttöjännite |
| power rails | jännitekiskot |
| motor output | moottorilähtö |
| current sensor | virta-anturi |
| boxer engine | boxermoottori |
| displacement | iskutilavuus |
| dry weight | kuivapaino |
| air-cooled | ilmajäähdytteinen |
| crankshaft | kampiakseli |
| propulsion system | voimalaite |
| continuous operation | jatkuva käyttö |
| series production | sarjatuotanto |
| cold-run testing | kylmäkäyttötesti |
| hot-run testing | kuumakäyttötesti |
| visual inspection | silmämääräinen tarkastus |
| unit traceability | yksikkökohtainen jäljitettävyys |
| NDAA-compliant European chipset | NDAA-yhteensopiva eurooppalainen piirisarja |
| Request brief | Pyydä aineisto |
