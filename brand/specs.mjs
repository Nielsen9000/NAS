// NAS product figures — THE single source. Every figure below appears in the
// datasheets (brand/build_datasheet_dronestack.mjs, brand/build_cp_ds_ua.mjs)
// AND on nordicadvancedsystems.com (stamped in by brand/build_site_specs.mjs),
// so a change here propagates to PDF and web in one edit. Prose stays in the
// documents; numbers do not live there.
//
// Mirrors NAS-FAKTA.md. When a value changes: edit it here, update NAS-FAKTA.md,
// then run
//   node brand/build_site_specs.mjs                → restamp the website
//   node brand/build_datasheet_dronestack.mjs --both
//   node brand/build_cp_ds_ua.mjs                  → rebuild the PDFs

// ---- Drone Stack — TWO variants, not one product -------------------------
// The stack is NOT one product with three current variants (NAS-FAKTA,
// September 2026). 65A and 100A are two different boards, each with its own
// voltage range and flight controller. 200A is not current: no data, no
// document. The current rating is PER MOTOR OUTPUT — confirmed 7 September
// 2026 (matches 7FLYS's 6/12 kW totals, which only add up per channel), and
// the datasheets qualify it as such. "Total" must never appear.
//
// Shared between the two ESCs.
export const DRONE_STACK_BASE = {
  escMcu:        'STM32F051',
  escFirmware:   'AM32',
  // Bare count — each language composes its own "4 channels, bidirectional"
  // sentence around it (prose lives in the locales, numbers do not).
  motorChannels: 4,
  burstWindow:   '5 s',
  // Connectors and pads, identical on both boards.
  escConnectorPins: 8,
  battOutPins:      4,
  motorPadsGrid:    '3×4',
  capacitor:     '1500uF',
  battConnector: 'XT60',
};

// Shared by BOTH 7FLYS flight controllers (F405 and F722) — source: the
// product-card spec panels on 7flys.com, captured 7 September 2026. The IMU is
// listed as either-of-two exactly as 7FLYS documents it; naming only one would
// promise a specific chip the supplier does not guarantee.
export const DRONE_STACK_FC_BASE = {
  imu:       'ICM-42688-P / IIM-42652',
  imuAxes:   6,
  barometer: 'BMP280 / DPS310',
  uarts:     6,
  blackbox:  '128 Mbit',
  servos:    2,
  osd:       'AT7456E',
  fcDims:    '40 × 49.5 mm',
};

// 65A stack — FC F405 + 4-in-1 ESC on one stack.
export const DRONE_STACK_65 = {
  current:     '65 A',
  burst:       '70 A',
  cellCounts:  ['4S', '6S'],
  inputRange:  '12.0–26 V',
  powerPerMotor: '1.5 kW',                       // 7FLYS 65A ESC panel:
  powerTotal:    '6 kW',                         //   "1.5 kW/motor · 6 kW total"
  capacitorSpec: '2× 1500 µF / 35 V low-ESR',    // 7FLYS 65A ESC panel
  powerConnector: 'XT60H-M · 12 AWG',            // 7FLYS 65A ESC panel
  fcMcu:       'STM32F405',
  fcSoftware:  'Betaflight & ArduPilot',
  fcWeight:    '12 g',
  gpio:        2,
  protocols:   'ELRS · I2C · SBUS / IBUS / CRSF',
  rails:       '5 V / 12 V',
  cameraRails: ['5 V', '12 V'],
  railMax:     '2 A',
  escDims:     '46.5 × 52.5 mm',
  escWeight:   '24 g',
};

// 100A stack — FC F722 + 4-in-1 ESC. FC specs from the 7flys.com F722 panel
// (7 September 2026); still missing for both boards: mounting hole pattern and
// operating temperature (the REV 02 notes carry that gap).
export const DRONE_STACK_100 = {
  current:     '100 A',
  burst:       '105 A',
  cellCounts:  ['6S', '8S'],
  inputRange:  '18.0–35 V',
  telemetry:   'DSHOT, UART KISS',
  power:       '12 kW',                          // "heavy-lift stacks up to 12 kW"
  fcMcu:       'STM32F722',
  fcCore:      'Arm Cortex-M7',
  fcSoftware:  'Betaflight',
  fcVideoLink: 'DJI Air Unit',                   // dual cam prose composed per locale
  fcPower:     '60 V / 3 A',                     // "robust 60V/3A power system"
  fcWeight:    '14 g',
  protocols:   'ELRS · SBUS / IBUS / CRSF',      // F722 panel lists no I2C
  dims:        '59 × 63 mm',
  weight:      '36 g',
};

// Product-name forms ("Drone Stack 65A") write the current without the space
// the unit string carries. Derived, never restated, so they cannot drift.
DRONE_STACK_65.currentTight  = DRONE_STACK_65.current.replace(/\s/g, '');   // '65A'
DRONE_STACK_100.currentTight = DRONE_STACK_100.current.replace(/\s/g, ''); // '100A'

// ---- NAS 2 series — 2C / 2E boxer engines ---------------------------------
export const NAS2 = {
  powerHp:      '35 hp',
  powerKw:      '26 kW',
  displacement: '340 cm³',
  dryWeight:    '9 kg',
  range:        '1000 km',
  premix:       '1:50',
  mtowClass:    '25–50 kg',
};

// Bare numerals, derived — for animated counters, HUD labels and other places
// that set the unit separately. Derived rather than restated so they cannot
// drift from the unit strings above.
const numOf = (s) => {
  const m = String(s).match(/^\d+/);
  if (!m) throw new Error(`specs.mjs: "${s}" does not start with a number`);
  return m[0];
};
export const NAS2_NUM = {
  hp: numOf(NAS2.powerHp),          // '35'
  kw: numOf(NAS2.powerKw),          // '26'
  cc: numOf(NAS2.displacement),     // '340'
  kg: numOf(NAS2.dryWeight),        // '9'
  rangeKm: numOf(NAS2.range),       // '1000'
};

// Figures and claims that must never reappear anywhere — the site build fails
// if one does.
export const FORBIDDEN = [
  /\b60\s?A\b/,                    // pre-August-2026 current rating (now 65A)
  /\b200\s?A\b/,                   // 200A is not current: no data, no document (NAS-FAKTA, Sept 2026)
  /three\s+(current\s+)?variants/i,// retired one-product story — the stack is TWO boards (65A/100A)
  /NDAA[- ]CERTIFIED/i,            // NDAA is complied with, never certified (NAS-BRAND)
  /NDAA[- ]COMPLIANT\s+SILICON/i,  // retired Sept 2026 — the claim is "NDAA-compliant European chipset"
  // The per-motor/per-channel bans were lifted 7 Sept 2026: the rating is
  // confirmed PER MOTOR OUTPUT and the datasheets now say so. The datasheet
  // build still bans "total" — that claim is factually wrong.
];
