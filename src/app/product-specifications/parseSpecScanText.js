import { parseScanText as baseParseScanText } from "@/app/production-verification/parseScanText";

// ---------------------------------------------------------------------------
// Known vendor codes for F7 detection (add more as needed)
// Each entry also declares:
//   partNoLen – length of the part number field that follows the vendor prefix
//   slLen     – length of the serial-number (SL) field
// Ordered longest-first so a longer prefix wins over a shorter one.
// ---------------------------------------------------------------------------
const F7_KNOWN_VENDORS = [
  { code: '7205761', partNoLen: 8,  slLen: 6 },  // alphanumeric part (e.g. FEA73900)
  { code: '7201012', partNoLen: 8,  slLen: 6 },  // alphanumeric part (e.g. FEA73900)
  { code: '7200868', partNoLen: 8,  slLen: 6 },  // alphanumeric part
  { code: 'V113072', partNoLen: 8,  slLen: 6 },  // alphanumeric part
  { code: 'R64535',  partNoLen: 12, slLen: 7 },  // 12-digit numeric part, 7-digit SL
];

function isF7(text) {
  return /^[A-Z]\d{5}\d{10}/.test(text);
}

/**
 * F7 – Fixed-width, no delimiters; vendor prefix followed by part number, SL, REV, YY.
 *
 * Layout:
 *   VENDOR(6|7) + PART_NO(partNoLen) + SL(slLen) + REV(1|2) + YY(2)
 *
 * partNoLen and slLen come from the F7_KNOWN_VENDORS lookup for the matched vendor.
 * REV is whatever remains between SL and YY (typically 1–2 chars, e.g. "D", "0D").
 * No month field is present; dispatchDate is set to YYYY-01-01.
 *
 * Examples (vendor R64535: partNoLen=12, slLen=7):
 *   "R645355147411201040009780D26" → vendor=R64535 part=514741120104 sl=0009780 rev=#D  yy=2026
 *   "R645355147411201040009779D26" → vendor=R64535 part=514741120104 sl=0009779 rev=#D  yy=2026
 *
 * Example (vendor 7201012: partNoLen=8, slLen=6):
 *   "7201012FEA73900009781D26"     → vendor=7201012 part=FEA73900  sl=009781  rev=#D  yy=2026
 */
function parseF7(text) {
  const t = text.trim();

  if (!isF7(t)) return null;

  const vendor = t.slice(0, 6);     // R64535
  const partNo = t.slice(6, 18);    // 514741120104

  console.log("DEBUG: F7 Vendor:", vendor);
  console.log("DEBUG: F7 PartNo:", partNo);

  return {
    format: 'F7',
    partNo,
    revNo: '#',
    vendorCode: vendor,
    partSlNo: t.slice(16), // optional
    dispatchDate: null
  };
}

function isF8(text) {
  return /[A-Z]{3}\d{5}/.test(text);
}

function parseF8(text) {
  const t = text.trim();

  // Extract part number (first occurrence)
  const match = t.match(/[A-Z]{3}\d{5}/);

  if (!match) return null;

  const partNo = match[0];
  const index = match.index;

  const vendor = t.slice(0, index);       // before partNo
  const remaining = t.slice(index + 8);   // after partNo

  console.log("DEBUG: F8 Vendor:", vendor);
  console.log("DEBUG: F8 PartNo:", partNo);

  return {
    format: 'F8',
    partNo,
    revNo: '#',
    vendorCode: vendor,
    partSlNo: remaining,
    dispatchDate: null
  };
}

/**
 * Product Specification Scan parser.
 * Supports F7, F8, as well as falling back to base production scan formats.
 *
 * @param {string} scannedText
 * @returns {import('@/app/production-verification/parseScanText').ParsedScan|null}
 */
export function parseSpecScanText(scannedText) {
  if (!scannedText) return null;
  const text = scannedText.trim();
  
  if (isF7(text)) return parseF7(text);
  if (isF8(text)) return parseF8(text);
  
  return baseParseScanText(text);
}
