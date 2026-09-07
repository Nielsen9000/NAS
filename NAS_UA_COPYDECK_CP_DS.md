# NAS — UA COPY DECK: Company Profile + Motor-datablad
Udkast til implementering i Claude Code. AFVENTER indfødt korrektur —
intet sendes ud på baggrund af dette deck alene.
Kilde: CP-2026 REV 01 og DS-2026 REV 01 (byg fra kildefiler, IKKE fra
CMYK-PDF'erne — 2C/2E-udgaven har defekt tekstlag).

## Implementeringsregler (fra NAS-BRAND.md)
- Al Space Grotesk-brødtekst → Inter i UA-varianterne
- Aldrig-oversæt-listen gælder: STM32, DSHOT, ELRS, UART, GPIO, CDI,
  ECU, EFI, CAN, NDAA, NAS, enheder (V, A, kW, hp, kg, km, cm³) osv.
- DOC-referencer forbliver latinske. Forslag til nye numre:
  **CP-2026-UA REV 01** og **DS-2026-UA REV 01** (mønster fra DS-2026-FC-UA)
- "Confidential" → Конфіденційно; "ALL RIGHTS RESERVED" → УСІ ПРАВА ЗАХИЩЕНІ
- Homoglyf-tjek + byte-identitets-assertion køres på begge nye filer
- Assertion udvides med: 35, 26, 340, 9, 1000, 1:50
- Forvent 10–15 % tekstudvidelse — CP har meget løbende tekst
- ⚑ BESLUTNING (Jesper): tagline "Built on integrity" — anbefaling: behold EN
- ⚑ BESLUTNING (korrekturlæser): "UAV" → БПЛА i løbende tekst (brugt herunder)
- ⚑ REGELBRUD i kilde: stjerne-ratings i DS-2026 — rækken UDELADES i UA
  (se DS-sektionen); EN/DA rettes ved næste REV

---

# DEL 1 — COMPANY PROFILE (CP-2026-UA)

## Forside
| EN | UA |
|---|---|
| Company Profile | Профіль компанії |
| / 2026 | / 2026 |
| BUILT ON INTEGRITY | *(behold EN — afventer Jesper)* |
| CONFIDENTIAL — CONTROLLED DOCUMENT | КОНФІДЕНЦІЙНО — КОНТРОЛЬОВАНИЙ ДОКУМЕНТ |
| Restricted distribution. No forwarding or disclosure without written authorization from Nordic Advanced Systems ApS. | Обмежене розповсюдження. Пересилання чи розкриття без письмового дозволу Nordic Advanced Systems ApS заборонено. |
| REC-overlay (NAS 2C · LIVE osv.) | *(uændret — teknisk mono, latinsk)* |

## Side 2 — About
| EN | UA |
|---|---|
| / ABOUT — NORDIC ADVANCED SYSTEMS | / ПРО КОМПАНІЮ — NORDIC ADVANCED SYSTEMS |
| Built for operations where propulsion **must work** | Створено для операцій, де силова установка **має працювати** |
| 01 About Nordic Advanced Systems | 01 Про Nordic Advanced Systems |
| Nordic Advanced Systems is a Danish company that develops and manufactures propulsion systems for UAV platforms. The engines are used in operations where propulsion must function correctly and predictably throughout the mission. The focus is on stable operation, consistent quality, and known behavior under load. | Nordic Advanced Systems — данська компанія, що розробляє та виробляє силові установки для платформ БПЛА. Двигуни використовуються в операціях, де силова установка має функціонувати коректно й передбачувано впродовж усієї місії. У фокусі — стабільна робота, незмінна якість і відома поведінка під навантаженням. |
| 02 Our contribution to UAV operations | 02 Наш внесок в операції БПЛА |
| In many UAV operations, the propulsion system must behave consistently from unit to unit and be produced in series with known characteristics. NAS develops engines based on this premise — designed to provide predictable mechanical and thermal behavior so overall platform performance is well understood in operational use. | У багатьох операціях БПЛА силова установка має поводитися однаково від виробу до виробу й вироблятися серійно з відомими характеристиками. NAS розробляє двигуни саме з цієї передумови — вони спроєктовані так, щоб забезпечувати передбачувану механічну й термічну поведінку, завдяки чому загальні характеристики платформи добре зрозумілі в експлуатації. |
| 03 How we work | 03 Як ми працюємо |
| NAS is organized as an industrial supplier with established processes and clear responsibility. The company draws on experience from operational military environments — experience that has shaped our approach to function, testing, and accountability for what is delivered. The working method is characterized by clear decision-making and clear ownership of both design and delivery. | NAS організована як промисловий постачальник з усталеними процесами та чіткою відповідальністю. Компанія спирається на досвід операційних військових середовищ — досвід, що сформував наш підхід до функціональності, тестування та відповідальності за те, що постачається. Робочий метод характеризується чітким ухваленням рішень і чіткою відповідальністю як за проєктування, так і за постачання. |
| 04 Design philosophy | 04 Філософія проєктування |
| Engines are developed based on actual operating conditions and known load profiles, ensuring: | Двигуни розробляються на основі реальних умов експлуатації та відомих профілів навантаження, що забезпечує: |
| Stable rotational speed throughout the mission | Стабільні оберти впродовж усієї місії |
| Controlled vibration during operation | Контрольовану вібрацію під час роботи |
| Predictable thermal behavior until mission completion | Передбачувану термічну поведінку до завершення місії |
| Consistent performance across series production | Незмінні характеристики в серійному виробництві |
| 05 Collaboration & framework | 05 Співпраця та рамки |
| NAS works with clear specifications and defined frameworks. Configurations are finalized before production. Any changes are handled in a structured manner and through direct dialogue between technical counterparts. Deliveries are carried out at the agreed pace and in the agreed form. If underlying conditions change, this is communicated early. | NAS працює з чіткими специфікаціями та визначеними рамками. Конфігурації фіналізуються до початку виробництва. Будь-які зміни опрацьовуються структуровано, через прямий діалог між технічними контрагентами. Постачання здійснюються в узгодженому темпі та в узгодженій формі. Якщо базові умови змінюються, про це повідомляється завчасно. |

## Side 3 — Engineering & delivery
| EN | UA |
|---|---|
| / ENGINEERING & DELIVERY | / ІНЖЕНЕРІЯ ТА ПОСТАЧАННЯ |
| Continued — production, quality, and the NAS Series. | Продовження — виробництво, якість і серія NAS. |
| 06 Production & quality | 06 Виробництво та якість |
| All engines are assembled and tested in Denmark. For security and discretion, the production address is not publicly disclosed. | Усі двигуни складаються й тестуються в Данії. З міркувань безпеки та обачності виробнича адреса публічно не розкривається. |
| / TEST PROTOCOL | / ПРОТОКОЛ ВИПРОБУВАНЬ |
| 01 COLD-RUN TESTING — Mechanical verification under controlled conditions | 01 ХОЛОДНИЙ ПРОГІН — Механічна перевірка в контрольованих умовах |
| 02 HOT-RUN TESTING — Performance validation at operational load | 02 ГАРЯЧИЙ ПРОГІН — Перевірка характеристик під експлуатаційним навантаженням |
| 03 VISUAL INSPECTION — Final review before unit release | 03 ВІЗУАЛЬНИЙ КОНТРОЛЬ — Фінальний огляд перед випуском виробу |
| 04 UNIT TRACEABILITY — Documentation provided with every delivery | 04 ПРОСТЕЖУВАНІСТЬ ВИРОБІВ — Документація надається з кожною поставкою |
| 07 The NAS Series | 07 Серія NAS |
| NAS 2C and NAS 2E are not modified hobby or industrial engines. They are purpose-built UAV engines, designed from the ground up for: | NAS 2C і NAS 2E — це не модифіковані хобійні чи промислові двигуни. Це двигуни, спеціально створені для БПЛА та спроєктовані з нуля для: |
| Constant high load | Постійного високого навантаження |
| Direct propeller coupling | Прямого приводу повітряного гвинта |
| Long endurance | Тривалої безперервної роботи |
| Mechanical and thermal stability | Механічної та термічної стабільності |
| Precision-balanced crankshaft | Прецизійно збалансованого колінчастого вала |
| High-grade bearings rated for continuous cyclic loads | Підшипників високого класу, розрахованих на безперервні циклічні навантаження |
| FULL ENGINE SPECIFICATIONS ENCLOSED SEPARATELY | ПОВНІ ХАРАКТЕРИСТИКИ ДВИГУНА ДОДАЮТЬСЯ ОКРЕМО |
| NAS 2 · SCHEMATIC | NAS 2 · СХЕМА |
| NAS · TEST RIG *(billedcaption)* | NAS · ВИПРОБУВАЛЬНИЙ СТЕНД |

## Side 4 — Kontakt
| EN | UA |
|---|---|
| / CONTACT | / КОНТАКТ |
| Nordic Advanced Systems ApS + adresse | *(uændret — postadresse forbliver latinsk)* |
| +45 2362 1040 (Signal) | +45 2362 1040 (Signal) |
| ALL RIGHTS RESERVED | УСІ ПРАВА ЗАХИЩЕНІ |
| CONFIDENTIAL | КОНФІДЕНЦІЙНО |

---

# DEL 2 — MOTOR-DATABLAD NAS 2C / 2E (DS-2026-UA)

## Side 1
| EN | UA |
|---|---|
| / DATASHEET — NAS 2 SERIES | / ТЕХНІЧНИЙ ОПИС — СЕРІЯ NAS 2 |
| NAS 2C / NAS 2E | NAS 2C / NAS 2E *(uændret)* |
| BOXER ENGINE | ОПОЗИТНИЙ ДВИГУН |
| Continuous-operation platforms requiring over 1000 km range. Built for altitude shifts and harsh weather conditions. | Платформи безперервної роботи з дальністю понад 1000 km. Створено для перепадів висоти та суворих погодних умов. |
| / 01 — OVERVIEW | / 01 — ОГЛЯД |
| The NAS 2 series includes two dual-cylinder, 2-stroke boxer engine models designed for long-endurance platforms: | Серія NAS 2 включає дві моделі двоциліндрових двотактних опозитних двигунів для платформ тривалої дії: |
| NAS 2C — Dual-cylinder, 2-stroke boxer engine with carburettor. | NAS 2C — двоциліндровий двотактний опозитний двигун з карбюратором. |
| NAS 2E — Features electronic fuel injection (EFI) and ignition adjustment with barometric-compensated ECU for altitude-independent operation. | NAS 2E — має електронне впорскування палива (EFI) та корекцію запалювання з барометрично компенсованим ECU для роботи незалежно від висоти. |
| Both models feature dual-spark redundancy and a high-strength crankshaft assembly, ensuring reliable performance in continuous operation. | Обидві моделі мають резервування подвійного запалювання та високоміцний вузол колінчастого вала, що забезпечує надійну роботу в безперервній експлуатації. |
| NAS 2 · BOXER ENGINE *(caption)* | NAS 2 · ОПОЗИТНИЙ ДВИГУН |
| / 02 — MECHANICAL & FUNCTIONAL FEATURES | / 02 — МЕХАНІЧНІ ТА ФУНКЦІОНАЛЬНІ ОСОБЛИВОСТІ |
| Dual-spark system reduces misfire risk and improves combustion stability. | Система подвійних свічок знижує ризик пропусків запалювання та покращує стабільність згоряння. |
| High-strength crankshaft with large bearing surfaces supports continuous load and high RPM. | Високоміцний колінчастий вал з великими опорними поверхнями витримує безперервне навантаження та високі оберти. |
| High-precision rods with needle bearings at both ends deliver efficiency and long endurance. | Прецизійні шатуни з голчастими підшипниками на обох кінцях забезпечують ефективність і тривалий ресурс. |
| The rear output shaft allows integration of a generator or auxiliary systems. | Задній вихідний вал дозволяє інтегрувати генератор або допоміжні системи. |
| / 03 — ORIGIN | / 03 — ПОХОДЖЕННЯ |
| European origin with secure, NDAA-compliant electronics. | Європейське походження із захищеною електронікою, що відповідає NDAA. |

## Side 2 — Tekniske specifikationer
| EN | UA |
|---|---|
| / 04 — TECHNICAL SPECIFICATIONS | / 04 — ТЕХНІЧНІ ХАРАКТЕРИСТИКИ |
| Engineered for **predictable behavior** | Спроєктовано для **передбачуваної поведінки** |
| / COMMON SPECS | / ЗАГАЛЬНІ ХАРАКТЕРИСТИКИ |
| ENGINE CONFIGURATION: 2-cylinder, 2-stroke, horizontally opposed (boxer layout) | КОНФІГУРАЦІЯ ДВИГУНА: 2 циліндри, 2-тактний, горизонтально опозитний (boxer) |
| DISPLACEMENT: 340 cm³ | РОБОЧИЙ ОБ'ЄМ: 340 cm³ |
| COOLING: Air-cooled, finned cylinder heads | ОХОЛОДЖЕННЯ: Повітряне, оребрені головки циліндрів |
| POWER OUTPUT: Up to 35 hp / 26 kW | ПОТУЖНІСТЬ: До 35 hp / 26 kW |
| FUEL TYPE: Unleaded gasoline with premix oil (typically 1:50 ratio) | ПАЛИВО: Неетильований бензин з маслом premix (типово 1:50) |
| STARTER SYSTEM: Integrated electric starter with gear reduction + external square drive option | СТАРТЕР: Інтегрований електростартер з редуктором + опція зовнішнього квадратного привода |
| DRY WEIGHT: 9 kg | СУХА МАСА: 9 kg |
| / MODEL COMPARISON | / ПОРІВНЯННЯ МОДЕЛЕЙ |
| ALTITUDE ADAPTATION: Manual tuning / Automatic via ECU with barometric sensor | АДАПТАЦІЯ ДО ВИСОТИ: Ручне налаштування / Автоматична через ECU з барометричним датчиком |
| IGNITION CONTROL: Dual independent CDI coils / ECU-tuned ignition curve | КЕРУВАННЯ ЗАПАЛЮВАННЯМ: Дві незалежні котушки CDI / Крива запалювання, налаштована ECU |
| FUEL SYSTEM: Carburettor / Electronic Fuel Injection (EFI) with throttle position & temperature sensors | ПАЛИВНА СИСТЕМА: Карбюратор / Електронне впорскування палива (EFI) з датчиками положення дросельної заслінки та температури |
| FUEL EFFICIENCY: ★★★★☆ / ★★★★★ | **UDELADES** — regelbrud i kilde (ingen stjerne-ratings i datablade, NAS-BRAND). Ingen konkrete tal findes → rækken droppes helt. EN/DA rettes ved næste REV. |
| WEATHER RESISTANCE: Standard / All-weather compatible | СТІЙКІСТЬ ДО ПОГОДНИХ УМОВ: Стандартна / Всепогодна |
| COLD START PERFORMANCE: Standard / ECU enrichment, temperature and altitude aware | ХОЛОДНИЙ ЗАПУСК: Стандартний / Збагачення ECU з урахуванням температури та висоти |
| TELEMETRY INTERFACE: None / Live CAN/UART reporting | ІНТЕРФЕЙС ТЕЛЕМЕТРІЇ: Немає / Телеметрія CAN/UART у реальному часі |
| MAINTENANCE LOAD: Carburettor tuning / Low (programmable) | ОБСЯГ ОБСЛУГОВУВАННЯ: Налаштування карбюратора / Низький (програмований) |
| IN-FLIGHT RESTART CAPABILITY: Not supported / Windmilling-assisted automatic restart | ПЕРЕЗАПУСК У ПОЛЬОТІ: Не підтримується / Автоматичний перезапуск з авторотацією (windmilling) |
| CONFIDENTIAL *(footer)* | КОНФІДЕНЦІЙНО |

## QA-tjekliste for begge nye filer (samme som DS-2026-FC-UA)
1. Byte-identiske tal mod config (inkl. nye værdier: 35, 26, 340, 9, 1000, 1:50)
2. Homoglyf-tjek (ingen kyrilliske tegn i latinske tokens)
3. pdffonts: ingen SpaceGrotesk i UA-filerne
4. DOC-referencer latinske; Конфіденційно oversat
5. Diagrammer/fotos med indbagt engelsk: mono-nøgle under caption
6. Indfødt korrektur FØR noget sendes ud
