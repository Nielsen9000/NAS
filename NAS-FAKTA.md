# NAS — FAKTA
Én kilde til sandhed for tal og navne. Rettes HER når noget ændrer sig.
Sidst opdateret: 30. august 2026

## Virksomhed
- Nordic Advanced Systems ApS (footer-stil: NORDIC ADVANCED SYSTEMS APS)
- Lufthavnvej 131, Beldringe, 5270 Odense N, Denmark
- contact@nordicadvancedsystems.com · www.nordicadvancedsystems.com
- Koordinater (visitkort-bagside): 55.476°N 10.331°E
- Tagline: Built on integrity

## Kontakter
| Navn | Titel | Telefon | E-mail |
|---|---|---|---|
| Christoffer Feilberg | Chief Executive Officer | +45 26 88 02 50 (Signal) | cfe@nordicadvancedsystems.com |
| Henrik Radich | Partner | +45 23 62 10 40 (Signal) | hro@nordicadvancedsystems.com |
| Jesper Nielsen | Intelligent Solutions | +45 27 83 13 23 (Signal) | jni@nordicadvancedsystems.com |
| Claus Vilsen | (visitkort findes) | — | — |

## Drone Stack — FC + 4-in-1 ESC
- Strømvarianter: **65A / 100A / 200A** — max kontinuerlig strøm
  - RETTET fra 60A → 65A, august 2026. Tallet er SAMLET for stacken
    (ESC'en fordeler til den udgang der trækker), skal IKKE kvalificeres
    som "per motor" eller "total" på materiale — bare tallet.
- Indgangsspænding: 4S / 6S · 12–26 V
- Flight controller MCU: STM32F405
- ESC MCU: STM32F051
- IMU: ICM-42688-P, 6-akset
- Blackbox: 128 Mbit integreret SPI flash
- UART: 6 × (VTX, RC, ESC-telemetri, GPS)
- GPIO: 2 × konfigurerbare
- Protokoller: ELRS · I2C · SBUS / IBUS / CRSF
- Kamera: dual, 5 V og 12 V op til 2 A
- Motorudgang: DSHOT, quad
- Strømskinner: 5 V / 12 V valgbar, op til 2 A
- MANGLER (kommer i REV 02): fysiske mål, monteringshulmønster,
  driftstemperatur — afventer tal fra Cem

## NAS 2-serien — boxermotorer (2C / 2E)
- 35 hk / 26 kW · 340 cm³ · 9 kg tørvægt
- Boxer twin, 2-takt, luftkølet (finnede cylindre)
- 1000+ km rækkevidde, kontinuerlig drift
- Brændstof: blyfri med premix-olie, typisk 1:50 (AVGAS/MOGAS)
- Starter: integreret elektrisk med gearreduktion + ekstern firkantdrev-mulighed
- Dual-spark CDI · bagudvendt udgangsaksel, direkte propeltræk, ingen reduktion
- Platformklasse: 25–50 kg MTOW fastvinge
- 2C: karburator, manuel højdetuning, ingen telemetri
- 2E: EFI, barometrisk ECU, live CAN/UART-telemetri, windmilling-genstart

## Dokumentnumre
| Dokument | Nummer | Status |
|---|---|---|
| Company Profile | CP-2026 REV 01 | trykt |
| Datablad NAS 2C/2E | DS-2026 REV 01 | trykt (CMYK-udgaven har defekt tekstlag) |
| Datablad Drone Stack (EN) | DS-2026-FC REV 01 | aktiv |
| Datablad Drone Stack (UA) | DS-2026-FC-UA REV 01 | afventer indfødt korrektur |

## Partnere
- Kolibri Defence (kolibridefence) — finsk; NAS-avionik flyver på deres
  FPV-platforme. CEO Henri Christensen har givet testimonial.
  KLBR-C-mærkning må ikke vises på markedsføringsmateriale.

## Sprogregler for tal
Alle talværdier (strøm, spænding, kapacitet, antal) SKAL være
byte-identiske på tværs af sprogversioner og komme fra én config-kilde.

Maskinkilden er **brand/specs.mjs** — databladene og websitet trækker
begge derfra. Når et tal ændres: ret specs.mjs + dette dokument, og kør
`node brand/build_site_specs.mjs` (website) samt datablad-builds.
`--check` fejler hvis en side er ude af sync, og buildet fejler hårdt
hvis 60A eller "NDAA-certified" nogensinde dukker op igen.
