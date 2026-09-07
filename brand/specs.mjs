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

// ---- Drone Stack — FC + 4-in-1 ESC ----------------------------------------
// 65A/100A/200A is maximum continuous current for the stack, corrected from
// 60A in August 2026. Deliberately UNQUALIFIED: not "per motor", not "total"
// (NAS-FAKTA) — just the number.
export const DRONE_STACK = {
  cellCounts:    ['4S', '6S'],
  currents:      ['65A', '100A', '200A'],
  inputRange:    '12–26V',
  fcMcu:         'STM32F405',
  escMcu:        'STM32F051',
  imu:           'ICM-42688-P',
  imuAxes:       6,
  blackbox:      '128 Mbit',
  uarts:         6,
  gpio:          2,
  protocols:     'ELRS · I2C · SBUS / IBUS / CRSF',
  rails:         '5V / 12V',
  cameraRails:   ['5V', '12V'],
  railMax:       '2A',
  motorOutputs:  4,
  capacitor:     '1500uF',
  battConnector: 'XT60',
};

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

// Figures that must never reappear anywhere — the site build fails if one does.
export const FORBIDDEN = [
  /\b60\s?A\b/,          // pre-August-2026 current rating (now 65A)
  /NDAA[- ]CERTIFIED/i,  // NDAA is complied with, never certified (NAS-BRAND)
];
