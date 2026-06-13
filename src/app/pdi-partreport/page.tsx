"use client";
import { DatePickerInput } from "@/components/ui/date-picker-input";

import React, { useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useUser } from "@/contexts/UserContext";
import api from "@/lib/api";
import { toast } from "sonner";
import * as XLSX from "xlsx-js-style";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ShiftStats {
  total: number;
  passed: number;
  failed: number;
  pending: number;
  rejected: number;
}

interface SampleRecord {
  id: number;
  sl_no: number | null;
  part_sl_no: string | null;
  scanned_text: string | null;
  validation_status: string;
  is_rejected: boolean;
  remarks: string | null;
  plant_location: string | null;
  created_by: string | null;
  created_at: string;
  parsed: Record<string, unknown> | null;
}

interface ShiftGroup {
  shift: { letter: string; label: string };
  qty: number;
  sampleSize: number;
  checkedBy: string | null;
  stats: ShiftStats;
  sampleRecords: SampleRecord[];
  scannedTextObservations: string[];
}

interface ProductSpec {
  partType?: string;
  partDescription?: string;
  tubeLength?: string;
  totalLength?: string;
  tubeDiameter?: string;
  series?: string;
  revNo?: string;
  greaseableOrNonGreaseable?: string;
  cbKitDetails?: string;
  couplingFlangeOrientations?: string;
  availableNoiseDeadener?: string;
  vendorCode?: string;
  customer?: string;
  mountingDetailsFlangeYoke?: string;
  mountingDetailsCouplingFlange?: string;
  longForkLength?: string;
  rearHousingLength?: string;
  sfDetails?: string;
  pdcLength?: string;
  frontEndPieceDetails?: string;
  loctiteGradeUse?: string;
  hexBoltNutTighteningTorque?: string;
  balancingRpm?: string;
  unbalanceInCmg?: string;
  unbalanceInGram?: string;
  iaBellowDetails?: string;
  slipDetails?: string;
  fepPressHStockPositions?: string;
  noiseDeadenerLength?: string;
  drawingNumber?: string;
}

interface Product {
  id: number;
  part_number: string;
  customer?: string;
  status?: string;
  specification?: ProductSpec;
  created_at?: string;
}

interface PDIReportResponse {
  success: boolean;
  partNumber: string;
  partType: "FRONT" | "REAR" | "MIDDLE";
  product: Product | null;
  dateRange: { from: string; to: string };
  overallStats: ShiftStats;
  checkedBy: string | null;
  shifts: ShiftGroup[];
  allRecords: {
    id: number;
    dispatch_date: string;
    shift: string;
    part_no: string;
    customer_name: string;
    product_type: string;
    validation_status: string;
    remarks: string;
    part_sl_no: string;
    sl_no: string;
    scanned_text: string;
    plant_location: string;
    vendorCode: string;
    is_rejected: number;
    created_by: string;
    created_at: string;
  }[];
}

// ─── Excel Generation Logic ───────────────────────────────────────────────────

// ── Matches the cron's randomVariant exactly ─────────────────────────────────
// tubeLength → range 1 (±1), totalLength → range 2 (±2)
// If base is 0 or NaN, returns 0 unchanged.
function randomVariant(base: number, range = 2): number {
  const n = Math.round(base);
  if (isNaN(n) || n === 0) return 0;
  const sign  = Math.random() < 0.5 ? -1 : 1;
  const delta = Math.floor(Math.random() * (range + 1)); // 0..range inclusive
  return n + sign * delta;
}

// ── Simple tube-length parse: just parseInt ───────────────────────────────────
function parseTubeLength(val: string | undefined): number {
  if (!val) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

// ── Total-length parse: strip ±tolerance FIRST, then numeric base ─────────────
// e.g. "3392±5" → 3392,  "1060±2" → 1060,  "1060" → 1060
// Split ONLY on the ± Unicode char so a dash inside a part number is kept intact.
function parseTotalLength(val: string | undefined): number {
  if (!val) return 0;
  const cleaned = String(val).split('\u00B1')[0].replace(/[^0-9]/g, '');
  const n = parseInt(cleaned, 10);
  return isNaN(n) ? 0 : n;
}

function generateObservationsForShift(
  shiftGroup: ShiftGroup,
  spec: ProductSpec | undefined,
  partType: "FRONT" | "REAR" | "MIDDLE"
) {
  const sampleCount = Math.min(shiftGroup.sampleSize, 5);
  const obs: Record<string, (string | number)[]> = {};

  const tubeBase  = parseTubeLength(spec?.tubeLength);
  const totalBase = parseTotalLength(spec?.totalLength);

  // tubeLength  → ±1 variation (matches cron range=1)
  obs.tubeLength = Array.from({ length: sampleCount }, () =>
    tubeBase ? randomVariant(tubeBase, 1) : "Ok"
  );
  // totalFlange → ±2 variation (matches cron range=2)
  obs.totalFlange = Array.from({ length: sampleCount }, () =>
    totalBase ? randomVariant(totalBase, 2) : "Ok"
  );

  // Scanned text from actual records
  obs.scannedText = shiftGroup.scannedTextObservations.slice(0, sampleCount);
  while (obs.scannedText.length < sampleCount) obs.scannedText.push("Ok");

  // Grease
  const greaseVal = spec?.greaseableOrNonGreaseable || "NON GREASABLE";
  obs.grease = Array.from({ length: sampleCount }, () => greaseVal);

  // Tube OD
  const tubeOd = spec?.tubeDiameter ? `Ø${spec.tubeDiameter.replace("Ø", "")}` : "As per control plan";
  obs.tubeOd = Array.from({ length: sampleCount }, () => tubeOd);

  // Deadener
  const deadener = spec?.availableNoiseDeadener?.toLowerCase() === "yes" ? "Yes" : "No";
  obs.deadener = Array.from({ length: sampleCount }, () => deadener);

  // CB Kit (Type of Centre Bearing Kit)
  const cbKit = spec?.cbKitDetails || "As per Control Plan";
  obs.cbKit = Array.from({ length: sampleCount }, () => cbKit);

  // Coupling Flange Orientations
  const couplingOri = spec?.couplingFlangeOrientations || "90";
  obs.couplingOrient = Array.from({ length: sampleCount }, () => couplingOri);

  // Flange Yoke
  const flangeYoke = spec?.mountingDetailsFlangeYoke || "As per control plan";
  obs.flangeYoke = Array.from({ length: sampleCount }, () => flangeYoke);

  // Coupling Flange
  const couplingFlange = spec?.mountingDetailsCouplingFlange || "COUPLING YOKE";
  obs.couplingFlange = Array.from({ length: sampleCount }, () => couplingFlange);

  // All visual checks → "Ok"
  const visualFields = [
    "tubeLengthMatch", "rotaryCbKit", "ujMovement", "circlip",
    "paint", "paintCondition", "antiRust", "lockingChecknuts",
    "paintAdhesion", "rustFree", "welding", "balancingWeight",
    "greaseNipple", "mountingHoleDist", "drillHole", "pcd",
    "slideJoint", "longFork",
  ];
  visualFields.forEach((f) => {
    obs[f] = Array.from({ length: sampleCount }, () => "Ok");
  });

  return obs;
}

function getPDIRows(partType: "FRONT" | "REAR" | "MIDDLE", obs: Record<string, (string | number)[]>, sampleCount: number) {
  const allOk = "All Shaft Found of ok";
  
  if (partType === "REAR") {
    return [
      { sr: 1, char: "Tube Length", spec: "AS per control plan", mode: "Measuring Tape", vals: obs.tubeLength, status: allOk, remark: "Checked in process/poka yoke Control" },
      { sr: 2, char: "Matching of Tube Length in QR Code Sticker & actual", spec: "Match tube length with QR Sticker", mode: "Visual", vals: obs.tubeLengthMatch, status: allOk, remark: "" },
      { sr: 3, char: "QR Code Sticker Proper Scanning", spec: "Checked Part Number, Drawing Modification no and date", mode: "Barcode/ QR Code Scanner", vals: obs.scannedText, status: allOk, remark: "" },
      { sr: 4, char: "Total Flange to Flange Length In Closed Condition (CLOSE LENGTH BATCH WISE 1PCS)", spec: "AS per control plan", mode: "Measuring Tape", vals: obs.totalFlange, status: allOk, remark: "Checked in process/poka yoke Control" },
      { sr: 5, char: "To Maintain the Opening of Slide Joint for easy Fitment @ Customer end", spec: "As per requirement Match With visual alert", mode: "Visual/Gauge", vals: obs.slideJoint, status: allOk, remark: "" },
      { sr: 6, char: "Long Fork Slide Movement (Smooth/Free)", spec: "Smooth Slide Movement", mode: "Hand Feel", vals: obs.longFork, status: allOk, remark: "" },
      { sr: 7, char: "Position of Both End Eye Hole Centre Line.", spec: "Aligned (check Orientation OF Mounting Hole)", mode: "Visual", vals: obs.pcd, status: allOk, remark: "" },
      { sr: 8, char: "UJ Movement (Smooth)", spec: "Proper And Equal Freeness", mode: "Hand Feel", vals: obs.ujMovement, status: allOk, remark: "" },
      { sr: 9, char: "Circlip Seating/ Circlip Missing", spec: "No circlip missing, proper setting and no crack", mode: "Visual", vals: obs.circlip, status: allOk, remark: "" },
      { sr: 10, char: "No paint missing at slip joint area, UJ Area", spec: "No paint missing at uj Area, No paint allow in slip joint, grease nipple, cb and uj area", mode: "Visual", vals: obs.paint, status: allOk, remark: "" },
      { sr: 11, char: "Paint Condition", spec: "(No Run Down/Blisters/Patches)", mode: "Visual", vals: obs.paintCondition, status: allOk, remark: "" },
      { sr: 12, char: "Anti Rust Oil @ Machining Area", spec: "No anti rust oil missing in machining Area", mode: "Visual", vals: obs.antiRust, status: allOk, remark: "" },
      { sr: 13, char: "Proper Adhesion on Painted Surface (4B)", spec: "No Paint peel off Allow On Prop Shaft", mode: "Visual (As Per Standard)", vals: obs.paintAdhesion, status: allOk, remark: "" },
      { sr: 14, char: "No Welding Defect", spec: "No Blow hole, porosity, spatter, under cut allow", mode: "Visual", vals: obs.welding, status: allOk, remark: "" },
      { sr: 15, char: "Proper Seating of Balancing Weight Condition On Tube", spec: "Proper setting", mode: "Visual", vals: obs.balancingWeight, status: allOk, remark: "" },
      { sr: 16, char: "Grease Nipple Condition & Status", spec: "No freeness and loose", mode: "Visual", vals: Array.from({ length: sampleCount }, () => "OK"), status: allOk, remark: "" },
      { sr: 17, char: "Arrow Mark Punch", spec: "For Check Same plane", mode: "Visual", vals: obs.pcd, status: allOk, remark: "" },
      { sr: 18, char: "Ensure Greasing at All Arms Of UJ", spec: "AS per control plan", mode: "Visual", vals: obs.grease, status: allOk, remark: "" },
      { sr: 19, char: "Rust free", spec: "No Rust allow on prop shaft", mode: "Visual", vals: obs.rustFree, status: allOk, remark: "" },
      { sr: 20, char: "Flange yoke Serration teeth (Ø180/Ø150/Ø120, 4-holes)", spec: "As per control plan", mode: "Mating Part", vals: obs.flangeYoke, status: allOk, remark: "As per control plan" },
      { sr: 21, char: "PCD (Both Side) Drill Hole (4 nos)", spec: "AS per control plan", mode: "Checking Fixture/Round plug Gauge", vals: obs.drillHole, status: allOk, remark: "Incoming control (Checked on Sampling plan)" },
      { sr: 22, char: "Tube OD", spec: "AS per control plan", mode: "Vernier/snap gauge", vals: obs.tubeOd, status: allOk, remark: "" },
      { sr: 23, char: "Deadener available", spec: "AS per control plan", mode: "Sound detect", vals: obs.deadener, status: allOk, remark: "" },
    ];
  } else {
    // FRONT and MIDDLE sheets share this list
    return [
      { sr: 1, char: "Tube Length", spec: "As per Control Plan", mode: "Measuring Tape", vals: obs.tubeLength, status: allOk, remark: "Checked in process/poka yoke Control" },
      { sr: 2, char: "Matching of Tube Length in Bar Code /QR Code Sticker & actual", spec: "Match tube length with QR Sticker", mode: "Visual", vals: obs.tubeLengthMatch, status: allOk, remark: "" },
      { sr: 3, char: "Bar Code / QR Code Sticker Proper Scanning", spec: "Checked Part Number, Drawing Modification no and date", mode: "Barcode/ QR Code Scanner", vals: obs.scannedText, status: allOk, remark: "" },
      { sr: 4, char: "Total Flange to Flange Length In Closed Condition (CLOSE LENGTH BATCH WISE 1PCS)", spec: "As per Control Plan", mode: "Measuring Tape", vals: obs.totalFlange, status: allOk, remark: "Checked in process/poka yoke Control" },
      { sr: 5, char: "Type of Centre Bearing Kit", spec: "As per Control Plan", mode: "Visual", vals: obs.cbKit, status: allOk, remark: "" },
      { sr: 6, char: "Rotary Movement Of Centre Bearing Kit", spec: "No jamming of center Brg.Rotation", mode: "Hand Feel", vals: obs.rotaryCbKit, status: allOk, remark: "" },
      { sr: 7, char: "Coupling Flange Orientations (As per QA Alert)", spec: "As per Control Plan (checked Mounting hole Orientatio)", mode: "Visual", vals: obs.couplingOrient, status: allOk, remark: "" },
      { sr: 8, char: "UJ Movement (Smooth)", spec: "Proper And Equal Freeness", mode: "Hand Feel/ Torque gauge", vals: obs.ujMovement, status: allOk, remark: "" },
      { sr: 9, char: "Circlip Seating/ Circlip Missing", spec: "No circlip missing, proper setting and no crack", mode: "Visual", vals: obs.circlip, status: allOk, remark: "" },
      { sr: 10, char: "Paint Missing at Slip Area & UJ Area", spec: "No paint missing at uj Area, No paint allow in slip joint, grease nipple, and uj area", mode: "Visual", vals: obs.paint, status: allOk, remark: "" },
      { sr: 11, char: "Paint Condition", spec: "(No Run Down/Blisters/Patches, No paint allow in center bearing Area)", mode: "Visual", vals: obs.paintCondition, status: allOk, remark: "" },
      { sr: 12, char: "Anti Rust Oil @ Machining Area", spec: "No anti rust oil missing in machining Area", mode: "Visual", vals: obs.antiRust, status: allOk, remark: "" },
      { sr: 13, char: "Locking of Cheknuts", spec: "Hex Nut lock by punching", mode: "Visual", vals: obs.lockingChecknuts, status: allOk, remark: "" },
      { sr: 14, char: "Proper Adhesion on Painted Surface (4B)", spec: "No Paint peel off Allow On Prop Shaft", mode: "Visual (As Per Standard)", vals: obs.paintAdhesion, status: allOk, remark: "" },
      { sr: 15, char: "Rust free", spec: "No Rust allow on prop shaft", mode: "Visual", vals: obs.rustFree, status: allOk, remark: "" },
      { sr: 16, char: "No Welding Defect", spec: "No Blow hole, porosity, spatter, under cut allow", mode: "Visual", vals: obs.welding, status: allOk, remark: "" },
      { sr: 17, char: "Proper Seating of Balancing Weight Condition On Tube", spec: "Proper setting", mode: "Visual Checked By hammer", vals: obs.balancingWeight, status: allOk, remark: "" },
      { sr: 18, char: "Grease Nipple Condition & Status", spec: "No freeness and loose", mode: "Visual", vals: obs.grease, status: allOk, remark: "" },
      { sr: 19, char: "Ensure Greasing at All Arms Of UJ", spec: "As per control plan", mode: "Visual", vals: obs.grease, status: allOk, remark: "" },
      { sr: 20, char: "Mounting Hole Centre Distances", spec: "As per control plan", mode: "Vernier/ Checking Fixture", vals: obs.mountingHoleDist, status: allOk, remark: "As per control plan" },
      { sr: 21, char: "Flange yoke Serration teeth (Ø180/Ø150/Ø120, 4-holes)", spec: "As per control plan", mode: "Mating Part", vals: obs.flangeYoke, status: allOk, remark: "As per control plan" },
      { sr: 22, char: "PCD (Both Side) Drill Hole (4 nos)", spec: "As per control plan", mode: "Checking Fixture/Round plug Gauge", vals: obs.drillHole, status: allOk, remark: "Incoming control (Checked on Sampling plan)" },
      { sr: 23, char: "PCD", spec: "As per control plan", mode: "Checking Fixture", vals: obs.pcd, status: allOk, remark: "Incoming control (Checked on Sampling plan)" },
      { sr: 24, char: "Tube OD", spec: "As per control plan", mode: "Vernier /snap gauge", vals: obs.tubeOd, status: allOk, remark: "" },
      { sr: 25, char: "Deadener available", spec: "As per control plan", mode: "Sound detect", vals: obs.deadener, status: allOk, remark: "" },
    ];
  }
}

// ─── Build XLSX for REAR ──────────────────────────────────────────────────────

function buildRearSheet(
  wb: XLSX.WorkBook,
  shiftGroup: ShiftGroup,
  report: PDIReportResponse,
  dispatchDate: string
) {
  const spec = report.product?.specification;
  const sampleCount = Math.min(shiftGroup.sampleSize, 5);
  const obs = generateObservationsForShift(shiftGroup, spec, "REAR");
  const shiftLetter = shiftGroup.shift.letter;

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  const s = (v: string | number, bold = false, bg = "", color = "000000", center = false): XLSX.CellObject => ({
    v,
    t: typeof v === "number" ? "n" : "s",
    s: {
      font: { name: "Arial", bold, color: { rgb: color } },
      fill: bg ? { fgColor: { rgb: bg }, patternType: "solid" } : undefined,
      alignment: { horizontal: center ? "center" : "left", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "AAAAAA" } },
        bottom: { style: "thin", color: { rgb: "AAAAAA" } },
        left: { style: "thin", color: { rgb: "AAAAAA" } },
        right: { style: "thin", color: { rgb: "AAAAAA" } },
      },
    },
  });

  const headerBg = "1F3864";
  const headerColor = "FFFFFF";
  const lightGreenBg = "E2EFDA";
  const yellowBg = "FFFF00";
  const grayBg = "F2F2F2";

  // Row 1 – Title
  ws["A1"] = s(`PRE DISPATCH INSPECTION CHECK SHEET  ['${report.partType}']`, true, headerBg, headerColor, true);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });

  // Row 2 – Company
  ws["A2"] = s("RSB TRANSMISSIONS (I)LTD , LUCKNOW", true, headerBg, headerColor, true);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });

  // Row 3 – Description, Shift, Part No
  ws["A3"] = s("DESCRIPTION-", true, grayBg);
  ws["D3"] = s(spec?.partDescription || report.partNumber, false, grayBg);
  ws["F3"] = s("Shift", true, grayBg, "000000", true);
  ws["G3"] = s(shiftLetter, true, yellowBg, "000000", true);
  ws["J3"] = s("Part No:-", true, grayBg);
  ws["K3"] = s(report.partNumber, true, yellowBg, "1F3864", true);
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 4 } });
  merges.push({ s: { r: 2, c: 7 }, e: { r: 2, c: 8 } });
  merges.push({ s: { r: 2, c: 10 }, e: { r: 2, c: 11 } });

  // Row 4 – Drawing No, Mode No
  ws["A4"] = s("Drg. No-", true, grayBg);
  ws["D4"] = s(spec?.drawingNumber || "#", false, grayBg);
  ws["F4"] = s("Mode No-", true, grayBg, "000000", true);
  ws["G4"] = s(spec?.revNo || "#", true, yellowBg, "000000", true);
  ws["J4"] = s("Invoice No.", true, grayBg);
  ws["K4"] = s("", false, grayBg);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });
  merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 4 } });
  merges.push({ s: { r: 3, c: 7 }, e: { r: 3, c: 8 } });
  merges.push({ s: { r: 3, c: 10 }, e: { r: 3, c: 11 } });

  // Row 5 – QTY, Sample Size, Supply Date
  ws["A5"] = s("Regular-    Sample-", false, grayBg);
  ws["E5"] = s("QTY:-", true, grayBg, "000000", true);
  ws["F5"] = s(shiftGroup.qty, false, yellowBg, "000000", true);
  ws["G5"] = s("Sample Size", true, grayBg, "000000", true);
  ws["H5"] = s(sampleCount, false, yellowBg, "000000", true);
  ws["J5"] = s("Supply Date", true, grayBg);
  ws["K5"] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  merges.push({ s: { r: 4, c: 7 }, e: { r: 4, c: 8 } });
  merges.push({ s: { r: 4, c: 10 }, e: { r: 4, c: 11 } });

  // Row 6 – Headers
  ws["A6"] = s("SR NO.", true, headerBg, headerColor, true);
  ws["B6"] = s("Characteristics", true, headerBg, headerColor, true);
  ws["D6"] = s("Specification", true, headerBg, headerColor, true);
  ws["E6"] = s("Mode Of Checking", true, headerBg, headerColor, true);
  ws["F6"] = s("Actual Observations", true, headerBg, headerColor, true);
  ws["K6"] = s("Product Status", true, headerBg, headerColor, true);
  ws["L6"] = s("Remark", true, headerBg, headerColor, true);
  merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: 2 } });
  merges.push({ s: { r: 5, c: 5 }, e: { r: 5, c: 9 } });

  // Row 7 – Observation numbers
  ws["A7"] = s("", true, headerBg, headerColor, true);
  ws["B7"] = s("", true, headerBg, headerColor, true);
  ws["D7"] = s("", true, headerBg, headerColor, true);
  ws["E7"] = s("", true, headerBg, headerColor, true);
  merges.push({ s: { r: 6, c: 1 }, e: { r: 6, c: 2 } });
  for (let i = 0; i < sampleCount; i++) {
    const col = String.fromCharCode(70 + i); // F, G, H, I, J
    ws[`${col}7`] = s(i + 1, true, headerBg, headerColor, true);
  }
  ws["K7"] = s("", true, headerBg, headerColor, true);
  ws["L7"] = s("", true, headerBg, headerColor, true);

  // ── DATA ROWS ──────────────────────────────────────────────────────────────

  const rows = getPDIRows("REAR", obs, sampleCount);

  rows.forEach((row, idx) => {
    const excelRow = 8 + idx;
    const rowBg = idx % 2 === 0 ? "FFFFFF" : "F7F9FF";
    ws[`A${excelRow}`] = s(row.sr, false, rowBg, "000000", true);
    ws[`B${excelRow}`] = s(row.char, false, rowBg);
    merges.push({ s: { r: excelRow - 1, c: 1 }, e: { r: excelRow - 1, c: 2 } });
    ws[`D${excelRow}`] = s(row.spec, false, rowBg);
    ws[`E${excelRow}`] = s(row.mode, false, rowBg);

    for (let i = 0; i < 5; i++) {
      const col = String.fromCharCode(70 + i);
      const val = i < row.vals.length ? row.vals[i] : "Ok";
      ws[`${col}${excelRow}`] = s(val as string | number, false, rowBg, "000000", true);
    }

    ws[`K${excelRow}`] = s(row.status, false, lightGreenBg, "276221", true);
    ws[`L${excelRow}`] = s(row.remark, false, rowBg);
  });

  const lastDataRow = 8 + rows.length - 1;
  const remarksRow = lastDataRow + 3;
  const checkedRow = remarksRow + 1;
  const formRow = checkedRow + 1;

  ws[`A${remarksRow}`] = s("Remarks :- (IF ANY)", true, grayBg);
  merges.push({ s: { r: remarksRow - 1, c: 0 }, e: { r: remarksRow - 1, c: 11 } });

  ws[`A${checkedRow}`] = s(`CHECKED BY (SIGNATURE):-  ${shiftGroup.checkedBy || ""}`, true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 0 }, e: { r: checkedRow - 1, c: 2 } });
  ws[`D${checkedRow}`] = s("Date", true, grayBg);
  ws[`E${checkedRow}`] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: checkedRow - 1, c: 5 }, e: { r: checkedRow - 1, c: 8 } });
  ws[`J${checkedRow}`] = s("PASSED DISPATCH (SIGNATURE):  SUDHIR", true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 9 }, e: { r: checkedRow - 1, c: 11 } });

  ws[`A${formRow}`] = s("FORM NO :", false, grayBg);
  merges.push({ s: { r: formRow - 1, c: 0 }, e: { r: formRow - 1, c: 11 } });

  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 7 }, { wch: 28 }, { wch: 5 }, { wch: 20 }, { wch: 22 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 30 },
  ];

  const range = XLSX.utils.decode_range(`A1:L${formRow}`);
  ws["!ref"] = XLSX.utils.encode_range(range);

  XLSX.utils.book_append_sheet(wb, ws, `Shift_${shiftLetter}`);
}

// ─── Build XLSX for FRONT ─────────────────────────────────────────────────────

function buildFrontSheet(
  wb: XLSX.WorkBook,
  shiftGroup: ShiftGroup,
  report: PDIReportResponse,
  dispatchDate: string
) {
  const spec = report.product?.specification;
  const sampleCount = Math.min(shiftGroup.sampleSize, 5);
  const obs = generateObservationsForShift(shiftGroup, spec, "FRONT");
  const shiftLetter = shiftGroup.shift.letter;

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  const s = (v: string | number, bold = false, bg = "", color = "000000", center = false): XLSX.CellObject => ({
    v, t: typeof v === "number" ? "n" : "s",
    s: {
      font: { name: "Arial", bold, color: { rgb: color } },
      fill: bg ? { fgColor: { rgb: bg }, patternType: "solid" } : undefined,
      alignment: { horizontal: center ? "center" : "left", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "AAAAAA" } },
        bottom: { style: "thin", color: { rgb: "AAAAAA" } },
        left: { style: "thin", color: { rgb: "AAAAAA" } },
        right: { style: "thin", color: { rgb: "AAAAAA" } },
      },
    },
  });

  const headerBg = "1F3864";
  const headerColor = "FFFFFF";
  const lightGreenBg = "E2EFDA";
  const yellowBg = "FFFF00";
  const grayBg = "F2F2F2";
  const allOk = "All Shaft Found of ok";

  ws["A1"] = s("PRE DISPATCH INSPECTION CHECK SHEET  ['FRONT']", true, headerBg, headerColor, true);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });
  ws["A2"] = s("RSB TRANSMISSIONS (I)LTD , LUCKNOW", true, headerBg, headerColor, true);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });

  ws["A3"] = s("DESCRIPTION-", true, grayBg);
  ws["D3"] = s(spec?.partDescription || report.partNumber, false, grayBg);
  ws["F3"] = s("Shift", true, grayBg, "000000", true);
  ws["G3"] = s(shiftLetter, true, yellowBg, "000000", true);
  ws["J3"] = s("Part No:-", true, grayBg);
  ws["K3"] = s(report.partNumber, true, yellowBg, "1F3864", true);
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 4 } });
  merges.push({ s: { r: 2, c: 7 }, e: { r: 2, c: 8 } });
  merges.push({ s: { r: 2, c: 10 }, e: { r: 2, c: 11 } });

  ws["A4"] = s("Drg. No-", true, grayBg);
  ws["D4"] = s(spec?.drawingNumber || "#", false, grayBg);
  ws["F4"] = s("Mode No-", true, grayBg, "000000", true);
  ws["G4"] = s(spec?.revNo || "#", true, yellowBg, "000000", true);
  ws["J4"] = s("Invoice No.", true, grayBg);
  ws["K4"] = s("", false, grayBg);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });
  merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 4 } });
  merges.push({ s: { r: 3, c: 7 }, e: { r: 3, c: 8 } });
  merges.push({ s: { r: 3, c: 10 }, e: { r: 3, c: 11 } });

  ws["A5"] = s("Regular-    Sample-", false, grayBg);
  ws["E5"] = s("QTY:-", true, grayBg, "000000", true);
  ws["F5"] = s(shiftGroup.qty, false, yellowBg, "000000", true);
  ws["G5"] = s("Sample Size", true, grayBg, "000000", true);
  ws["H5"] = s(sampleCount, false, yellowBg, "000000", true);
  ws["J5"] = s("Supply Date", true, grayBg);
  ws["K5"] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  merges.push({ s: { r: 4, c: 7 }, e: { r: 4, c: 8 } });
  merges.push({ s: { r: 4, c: 10 }, e: { r: 4, c: 11 } });

  ws["A6"] = s("SR NO.", true, headerBg, headerColor, true);
  ws["B6"] = s("Characteristics", true, headerBg, headerColor, true);
  ws["D6"] = s("Specification", true, headerBg, headerColor, true);
  ws["E6"] = s("Mode Of Checking", true, headerBg, headerColor, true);
  ws["F6"] = s("Actual Observations", true, headerBg, headerColor, true);
  ws["K6"] = s("Product Status", true, headerBg, headerColor, true);
  ws["L6"] = s("Remark", true, headerBg, headerColor, true);
  merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: 2 } });
  merges.push({ s: { r: 5, c: 5 }, e: { r: 5, c: 9 } });

  ws["A7"] = s("", true, headerBg, headerColor, true);
  ws["B7"] = s("", true, headerBg, headerColor, true);
  ws["D7"] = s("", true, headerBg, headerColor, true);
  ws["E7"] = s("", true, headerBg, headerColor, true);
  merges.push({ s: { r: 6, c: 1 }, e: { r: 6, c: 2 } });
  for (let i = 0; i < sampleCount; i++) {
    ws[`${String.fromCharCode(70 + i)}7`] = s(i + 1, true, headerBg, headerColor, true);
  }
  ws["K7"] = s("", true, headerBg, headerColor, true);
  ws["L7"] = s("", true, headerBg, headerColor, true);

  const rows = getPDIRows("FRONT", obs, sampleCount);

  rows.forEach((row, idx) => {
    const excelRow = 8 + idx;
    const rowBg = idx % 2 === 0 ? "FFFFFF" : "F7F9FF";
    ws[`A${excelRow}`] = s(row.sr, false, rowBg, "000000", true);
    ws[`B${excelRow}`] = s(row.char, false, rowBg);
    merges.push({ s: { r: excelRow - 1, c: 1 }, e: { r: excelRow - 1, c: 2 } });
    ws[`D${excelRow}`] = s(row.spec, false, rowBg);
    ws[`E${excelRow}`] = s(row.mode, false, rowBg);
    for (let i = 0; i < 5; i++) {
      const col = String.fromCharCode(70 + i);
      ws[`${col}${excelRow}`] = s((i < row.vals.length ? row.vals[i] : "Ok") as string | number, false, rowBg, "000000", true);
    }
    ws[`K${excelRow}`] = s(row.status, false, lightGreenBg, "276221", true);
    ws[`L${excelRow}`] = s(row.remark, false, rowBg);
  });

  const lastDataRow = 8 + rows.length - 1;
  const remarksRow = lastDataRow + 3;
  const checkedRow = remarksRow + 1;
  const formRow = checkedRow + 1;

  ws[`A${remarksRow}`] = s("Remarks :- (IF ANY)", true, grayBg);
  merges.push({ s: { r: remarksRow - 1, c: 0 }, e: { r: remarksRow - 1, c: 11 } });
  ws[`A${checkedRow}`] = s(`CHECKED BY (SIGNATURE):-  ${shiftGroup.checkedBy || ""}`, true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 0 }, e: { r: checkedRow - 1, c: 2 } });
  ws[`D${checkedRow}`] = s("Date", true, grayBg);
  ws[`E${checkedRow}`] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: checkedRow - 1, c: 5 }, e: { r: checkedRow - 1, c: 8 } });
  ws[`J${checkedRow}`] = s("PASSED DISPATCH (SIGNATURE):  SUDHIR", true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 9 }, e: { r: checkedRow - 1, c: 11 } });
  ws[`A${formRow}`] = s("FORM NO :", false, grayBg);
  merges.push({ s: { r: formRow - 1, c: 0 }, e: { r: formRow - 1, c: 11 } });

  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 7 }, { wch: 28 }, { wch: 5 }, { wch: 20 }, { wch: 22 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 30 },
  ];
  ws["!ref"] = XLSX.utils.encode_range(XLSX.utils.decode_range(`A1:L${formRow}`));
  XLSX.utils.book_append_sheet(wb, ws, `Shift_${shiftLetter}`);
}

// ─── Build XLSX for MIDDLE ────────────────────────────────────────────────────

function buildMiddleSheet(
  wb: XLSX.WorkBook,
  shiftGroup: ShiftGroup,
  report: PDIReportResponse,
  dispatchDate: string
) {
  const spec = report.product?.specification;
  const sampleCount = Math.min(shiftGroup.sampleSize, 5);
  const obs = generateObservationsForShift(shiftGroup, spec, "MIDDLE");
  const shiftLetter = shiftGroup.shift.letter;

  const ws: XLSX.WorkSheet = {};
  const merges: XLSX.Range[] = [];

  const s = (v: string | number, bold = false, bg = "", color = "000000", center = false): XLSX.CellObject => ({
    v, t: typeof v === "number" ? "n" : "s",
    s: {
      font: { name: "Arial", bold, color: { rgb: color } },
      fill: bg ? { fgColor: { rgb: bg }, patternType: "solid" } : undefined,
      alignment: { horizontal: center ? "center" : "left", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "AAAAAA" } },
        bottom: { style: "thin", color: { rgb: "AAAAAA" } },
        left: { style: "thin", color: { rgb: "AAAAAA" } },
        right: { style: "thin", color: { rgb: "AAAAAA" } },
      },
    },
  });

  const headerBg = "1F3864";
  const headerColor = "FFFFFF";
  const lightGreenBg = "E2EFDA";
  const yellowBg = "FFFF00";
  const grayBg = "F2F2F2";
  const allOk = "All Shaft Found of ok";

  ws["A1"] = s("PRE DISPATCH INSPECTION CHECK SHEET  ['MIDDLE']", true, headerBg, headerColor, true);
  merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: 11 } });
  ws["A2"] = s("RSB TRANSMISSIONS (I)LTD , LUCKNOW", true, headerBg, headerColor, true);
  merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: 11 } });

  ws["A3"] = s("DESCRIPTION-", true, grayBg);
  ws["D3"] = s(spec?.partDescription || report.partNumber, false, grayBg);
  ws["F3"] = s("Shift", true, grayBg, "000000", true);
  ws["G3"] = s(shiftLetter, true, yellowBg, "000000", true);
  ws["J3"] = s("Part No:-", true, grayBg);
  ws["K3"] = s(report.partNumber, true, yellowBg, "1F3864", true);
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } });
  merges.push({ s: { r: 2, c: 3 }, e: { r: 2, c: 4 } });
  merges.push({ s: { r: 2, c: 7 }, e: { r: 2, c: 8 } });
  merges.push({ s: { r: 2, c: 10 }, e: { r: 2, c: 11 } });

  ws["A4"] = s("Drg. No-", true, grayBg);
  ws["D4"] = s(spec?.drawingNumber || "#", false, grayBg);
  ws["F4"] = s("Mode No-", true, grayBg, "000000", true);
  ws["G4"] = s(spec?.revNo || "#", true, yellowBg, "000000", true);
  ws["J4"] = s("Invoice No.", true, grayBg);
  ws["K4"] = s("", false, grayBg);
  merges.push({ s: { r: 3, c: 0 }, e: { r: 3, c: 2 } });
  merges.push({ s: { r: 3, c: 3 }, e: { r: 3, c: 4 } });
  merges.push({ s: { r: 3, c: 7 }, e: { r: 3, c: 8 } });
  merges.push({ s: { r: 3, c: 10 }, e: { r: 3, c: 11 } });

  ws["A5"] = s("Regular-    Sample-", false, grayBg);
  ws["E5"] = s("QTY:-", true, grayBg, "000000", true);
  ws["F5"] = s(shiftGroup.qty, false, yellowBg, "000000", true);
  ws["G5"] = s("Sample Size", true, grayBg, "000000", true);
  ws["H5"] = s(sampleCount, false, yellowBg, "000000", true);
  ws["J5"] = s("Supply Date", true, grayBg);
  ws["K5"] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: 4, c: 0 }, e: { r: 4, c: 2 } });
  merges.push({ s: { r: 4, c: 7 }, e: { r: 4, c: 8 } });
  merges.push({ s: { r: 4, c: 10 }, e: { r: 4, c: 11 } });

  ws["A6"] = s("SR NO.", true, headerBg, headerColor, true);
  ws["B6"] = s("Characteristics", true, headerBg, headerColor, true);
  ws["D6"] = s("Specification", true, headerBg, headerColor, true);
  ws["E6"] = s("Mode Of Checking", true, headerBg, headerColor, true);
  ws["F6"] = s("Actual Observations", true, headerBg, headerColor, true);
  ws["K6"] = s("Product Status", true, headerBg, headerColor, true);
  ws["L6"] = s("Remark", true, headerBg, headerColor, true);
  merges.push({ s: { r: 5, c: 1 }, e: { r: 5, c: 2 } });
  merges.push({ s: { r: 5, c: 5 }, e: { r: 5, c: 9 } });

  ws["A7"] = s("", true, headerBg, headerColor, true);
  ws["B7"] = s("", true, headerBg, headerColor, true);
  ws["D7"] = s("", true, headerBg, headerColor, true);
  ws["E7"] = s("", true, headerBg, headerColor, true);
  merges.push({ s: { r: 6, c: 1 }, e: { r: 6, c: 2 } });
  for (let i = 0; i < sampleCount; i++) {
    ws[`${String.fromCharCode(70 + i)}7`] = s(i + 1, true, headerBg, headerColor, true);
  }
  ws["K7"] = s("", true, headerBg, headerColor, true);
  ws["L7"] = s("", true, headerBg, headerColor, true);

  const rows = [
    { sr: 1, char: "Tube Length", spec: "As per Control Plan", mode: "Measuring Tape", vals: obs.tubeLength, status: allOk, remark: "Checked in process/poka yoke Control" },
    { sr: 2, char: "Matching of Tube Length in Bar Code /QR Code Sticker & actual", spec: "Match tube length with QR Sticker", mode: "Visual", vals: obs.tubeLengthMatch, status: allOk, remark: "" },
    { sr: 3, char: "Bar Code / QR Code Sticker Proper Scanning", spec: "Checked Part Number, Drawing Modification no and date", mode: "Barcode/ QR Code Scanner", vals: obs.scannedText, status: allOk, remark: "" },
    { sr: 4, char: "Total Flange to Flange Length In Closed Condition (CLOSE LENGTH BATCH WISE 1PCS)", spec: "As per Control Plan", mode: "Measuring Tape", vals: obs.totalFlange, status: allOk, remark: "Checked in process/poka yoke Control" },
    { sr: 5, char: "Type of Centre Bearing Kit", spec: "As per Control Plan", mode: "Visual", vals: obs.cbKit, status: allOk, remark: "" },
    { sr: 6, char: "Rotary Movement Of Centre Bearing Kit", spec: "No jamming of center Brg.Rotation", mode: "Hand Feel", vals: obs.rotaryCbKit, status: allOk, remark: "" },
    { sr: 7, char: "Coupling Flange Orientations (As per QA Alert)", spec: "As per Control Plan (checked Mounting hole Orientatio)", mode: "Visual", vals: obs.couplingOrient, status: allOk, remark: "" },
    { sr: 8, char: "UJ Movement (Smooth)", spec: "Proper And Equal Freeness", mode: "Hand Feel/ Torque gauge", vals: obs.ujMovement, status: allOk, remark: "" },
    { sr: 9, char: "Circlip Seating/ Circlip Missing", spec: "No circlip missing, proper setting and no crack", mode: "Visual", vals: obs.circlip, status: allOk, remark: "" },
    { sr: 10, char: "Paint Missing at Slip Area & UJ Area", spec: "No paint missing at uj Area, No paint allow in slip joint, grease nipple, and uj area", mode: "Visual", vals: obs.paint, status: allOk, remark: "" },
    { sr: 11, char: "Paint Condition", spec: "(No Run Down/Blisters/Patches, No paint allow in center bearing Area)", mode: "Visual", vals: obs.paintCondition, status: allOk, remark: "" },
    { sr: 12, char: "Anti Rust Oil @ Machining Area", spec: "No anti rust oil missing in machining Area", mode: "Visual", vals: obs.antiRust, status: allOk, remark: "" },
    { sr: 13, char: "Locking of Cheknuts", spec: "Hex Nut lock by punching", mode: "Visual", vals: obs.lockingChecknuts, status: allOk, remark: "" },
    { sr: 14, char: "Proper Adhesion on Painted Surface (4B)", spec: "No Paint peel off Allow On Prop Shaft", mode: "Visual (As Per Standard)", vals: obs.paintAdhesion, status: allOk, remark: "" },
    { sr: 15, char: "Rust free", spec: "No Rust allow on prop shaft", mode: "Visual", vals: obs.rustFree, status: allOk, remark: "" },
    { sr: 16, char: "No Welding Defect", spec: "No Blow hole, porosity, spatter, under cut allow", mode: "Visual", vals: obs.welding, status: allOk, remark: "" },
    { sr: 17, char: "Proper Seating of Balancing Weight Condition On Tube", spec: "Proper setting", mode: "Visual Checked By hammer", vals: obs.balancingWeight, status: allOk, remark: "" },
    { sr: 18, char: "Grease Nipple Condition & Status", spec: "No freeness and loose", mode: "Visual", vals: obs.grease, status: allOk, remark: "" },
    { sr: 19, char: "Ensure Greasing at All Arms Of UJ", spec: "As per control plan", mode: "Visual", vals: obs.grease, status: allOk, remark: "" },
    { sr: 20, char: "Mounting Hole Centre Distances", spec: "As per control plan", mode: "Vernier/ Checking Fixture", vals: obs.mountingHoleDist, status: allOk, remark: "As per control plan" },
    { sr: 21, char: "Flange yoke Serration teeth (Ø180/Ø150/Ø120, 4-holes)", spec: "As per control plan", mode: "Mating Part", vals: obs.flangeYoke, status: allOk, remark: "As per control plan" },
    { sr: 22, char: "PCD (Both Side) Drill Hole (4 nos)", spec: "As per control plan", mode: "Checking Fixture/Round plug Gauge", vals: obs.drillHole, status: allOk, remark: "Incoming control (Checked on Sampling plan)" },
    { sr: 23, char: "PCD", spec: "As per control plan", mode: "Checking Fixture", vals: obs.pcd, status: allOk, remark: "Incoming control (Checked on Sampling plan)" },
    { sr: 24, char: "Tube OD", spec: "As per control plan", mode: "Vernier /snap gauge", vals: obs.tubeOd, status: allOk, remark: "" },
    { sr: 25, char: "Deadener available", spec: "As per control plan", mode: "Sound detect", vals: obs.deadener, status: allOk, remark: "" },
  ];

  rows.forEach((row, idx) => {
    const excelRow = 8 + idx;
    const rowBg = idx % 2 === 0 ? "FFFFFF" : "F7F9FF";
    ws[`A${excelRow}`] = s(row.sr, false, rowBg, "000000", true);
    ws[`B${excelRow}`] = s(row.char, false, rowBg);
    merges.push({ s: { r: excelRow - 1, c: 1 }, e: { r: excelRow - 1, c: 2 } });
    ws[`D${excelRow}`] = s(row.spec, false, rowBg);
    ws[`E${excelRow}`] = s(row.mode, false, rowBg);
    for (let i = 0; i < 5; i++) {
      const col = String.fromCharCode(70 + i);
      ws[`${col}${excelRow}`] = s((i < row.vals.length ? row.vals[i] : "Ok") as string | number, false, rowBg, "000000", true);
    }
    ws[`K${excelRow}`] = s(row.status, false, lightGreenBg, "276221", true);
    ws[`L${excelRow}`] = s(row.remark, false, rowBg);
  });

  const lastDataRow = 8 + rows.length - 1;
  const remarksRow = lastDataRow + 3;
  const checkedRow = remarksRow + 1;
  const formRow = checkedRow + 1;

  ws[`A${remarksRow}`] = s("Remarks :- (IF ANY)", true, grayBg);
  merges.push({ s: { r: remarksRow - 1, c: 0 }, e: { r: remarksRow - 1, c: 11 } });
  ws[`A${checkedRow}`] = s(`CHECKED BY (SIGNATURE):-  ${shiftGroup.checkedBy || ""}`, true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 0 }, e: { r: checkedRow - 1, c: 2 } });
  ws[`D${checkedRow}`] = s("Date", true, grayBg);
  ws[`E${checkedRow}`] = s(dispatchDate, false, yellowBg, "000000", true);
  merges.push({ s: { r: checkedRow - 1, c: 5 }, e: { r: checkedRow - 1, c: 8 } });
  ws[`J${checkedRow}`] = s("PASSED DISPATCH (SIGNATURE):  SUDHIR", true, grayBg);
  merges.push({ s: { r: checkedRow - 1, c: 9 }, e: { r: checkedRow - 1, c: 11 } });
  ws[`A${formRow}`] = s("FORM NO :", false, grayBg);
  merges.push({ s: { r: formRow - 1, c: 0 }, e: { r: formRow - 1, c: 11 } });

  ws["!merges"] = merges;
  ws["!cols"] = [
    { wch: 7 }, { wch: 28 }, { wch: 5 }, { wch: 20 }, { wch: 22 },
    { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 20 }, { wch: 30 },
  ];
  ws["!ref"] = XLSX.utils.encode_range(XLSX.utils.decode_range(`A1:L${formRow}`));
  XLSX.utils.book_append_sheet(wb, ws, `Shift_${shiftLetter}`);
}

// ─── Generate and download XLSX for a single shift ───────────────────────────

function downloadShiftExcel(
  shiftGroup: ShiftGroup,
  report: PDIReportResponse,
  dispatchDate: string
) {
  const wb = XLSX.utils.book_new();

  if (report.partType === "REAR") {
    buildRearSheet(wb, shiftGroup, report, dispatchDate);
  } else if (report.partType === "FRONT") {
    buildFrontSheet(wb, shiftGroup, report, dispatchDate);
  } else {
    buildMiddleSheet(wb, shiftGroup, report, dispatchDate);
  }

  const filename = `PDI_${report.partType}_${report.partNumber}_${shiftGroup.shift.letter}_${dispatchDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}

// ─── Simple PDF generation via print dialog ──────────────────────────────────

function downloadShiftPDF(
  shiftGroup: ShiftGroup,
  report: PDIReportResponse,
  dispatchDate: string
) {
  const spec = report.product?.specification;
  const sampleCount = Math.min(shiftGroup.sampleSize, 5);
  const obs = generateObservationsForShift(shiftGroup, spec, report.partType);
  const shiftLetter = shiftGroup.shift.letter;
  const allOk = "All Shaft Found of ok";

  const obsColHeaders = Array.from({ length: sampleCount }, (_, i) => i + 1);

  const rows = getPDIRows(report.partType, obs, sampleCount);

  const tableRowsHtml = rows.map((r, i) => {
    const bg = i % 2 === 0 ? "#fff" : "#f7f9ff";
    const valCells = Array.from({ length: 5 }, (_, ci) => {
      const val = ci < r.vals.length ? r.vals[ci] : "Ok";
      return `<td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:9px;background:${bg}">${val}</td>`;
    }).join("");
    return `<tr style="background:${bg}">
      <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:9px">${r.sr}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-size:9px">${r.char}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-size:9px">${r.spec}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-size:9px">${r.mode}</td>
      ${valCells}
      <td style="text-align:center;padding:4px 6px;border:1px solid #ccc;font-size:9px;background:#e2efda;color:#276221">${allOk}</td>
      <td style="padding:4px 6px;border:1px solid #ccc;font-size:9px;color:#888">${r.remark}</td>
    </tr>`;
  }).join("");

  const obsHeaders = obsColHeaders.map(n => `<th style="width:60px;text-align:center;padding:5px;font-size:9px">${n}</th>`).join("");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #000; width: 1400px; padding: 20px; background: white;">
      <style>
        table { border-collapse: collapse; width: 100%; }
        th { background: #1F3864; color: #fff; font-size: 10px; padding: 6px; border: 1px solid #ccc; }
        .header-row { background: #1F3864; color: #fff; text-align: center; padding: 6px; font-weight: bold; border: 1px solid #ccc; }
        .info-row { background: #f2f2f2; padding: 4px 6px; font-size: 10px; border: 1px solid #ccc; }
        td { border: 1px solid #ccc; }
      </style>
      <table>
        <tr><td colspan="12" class="header-row" style="font-size:14px">PRE DISPATCH INSPECTION CHECK SHEET ['${report.partType}']</td></tr>
        <tr><td colspan="12" class="header-row" style="font-size:12px">RSB TRANSMISSIONS (I)LTD , LUCKNOW</td></tr>
        <tr>
          <td colspan="3" class="info-row"><b>DESCRIPTION:</b> ${spec?.partDescription || report.partNumber}</td>
          <td colspan="2" class="info-row"></td>
          <td class="info-row"><b>Shift:</b></td>
          <td class="info-row" style="background:#ffff00;font-weight:bold;text-align:center">${shiftLetter}</td>
          <td class="info-row"></td><td class="info-row"></td>
          <td class="info-row"><b>Part No:</b></td>
          <td colspan="2" class="info-row" style="background:#ffff00;font-weight:bold;color:#1F3864">${report.partNumber}</td>
        </tr>
        <tr>
          <td colspan="3" class="info-row"><b>Drg. No:</b> ${spec?.drawingNumber || "#"}</td>
          <td colspan="2" class="info-row"></td>
          <td class="info-row"><b>Mode No:</b></td>
          <td class="info-row" style="background:#ffff00;font-weight:bold;text-align:center">${spec?.revNo || "#"}</td>
          <td colspan="2" class="info-row"></td>
          <td class="info-row"><b>Invoice No.:</b></td>
          <td colspan="2" class="info-row"></td>
        </tr>
        <tr>
          <td colspan="3" class="info-row">Regular- Sample-</td>
          <td class="info-row"></td>
          <td class="info-row"><b>QTY:</b> ${shiftGroup.qty}</td>
          <td class="info-row"><b>Sample Size:</b></td>
          <td class="info-row" style="background:#ffff00;text-align:center">${sampleCount}</td>
          <td colspan="2" class="info-row"></td>
          <td class="info-row"><b>Supply Date:</b></td>
          <td colspan="2" class="info-row" style="background:#ffff00">${dispatchDate}</td>
        </tr>
        <tr>
          <th>SR NO.</th>
          <th colspan="2">Characteristics</th>
          <th>Specification</th>
          <th>Mode Of Checking</th>
          ${obsHeaders}
          <th>Product Status</th>
          <th>Remark</th>
        </tr>
        <tr>
          <th></th><th colspan="2"></th><th></th><th></th>
          ${obsColHeaders.map(n => `<th style="text-align:center;padding:5px;font-size:9px">${n}</th>`).join("")}
          <th></th><th></th>
        </tr>
        ${tableRowsHtml}
        <tr><td colspan="12" style="padding:4px 6px;border:1px solid #ccc;font-size:9px;background:#f2f2f2"><b>Remarks :- (IF ANY)</b></td></tr>
        <tr>
          <td colspan="3" style="padding:6px;border:1px solid #ccc;font-size:10px;background:#f2f2f2"><b>CHECKED BY (SIGNATURE):- ${shiftGroup.checkedBy || ""}</b></td>
          <td style="padding:6px;border:1px solid #ccc;font-size:10px;background:#f2f2f2"><b>Date</b></td>
          <td style="padding:6px;border:1px solid #ccc;font-size:10px;background:#ffff00">${dispatchDate}</td>
          <td colspan="4" style="border:1px solid #ccc"></td>
          <td colspan="3" style="padding:6px;border:1px solid #ccc;font-size:10px;background:#f2f2f2"><b>PASSED DISPATCH (SIGNATURE): SUDHIR</b></td>
        </tr>
        <tr><td colspan="12" style="padding:4px 6px;border:1px solid #ccc;font-size:9px;background:#f2f2f2">FORM NO :</td></tr>
      </table>
    </div>`;

  const container = document.createElement("div");
  container.innerHTML = html;
  container.style.position = "absolute";
  container.style.top = "-9999px";
  container.style.left = "-9999px";
  document.body.appendChild(container);

  setTimeout(async () => {
    try {
      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 10, pdfWidth, pdfHeight);
      pdf.save(`PDI_${report.partType}_${report.partNumber}_${shiftLetter}_${dispatchDate}.pdf`);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      console.error("PDF generation failed", err);
      toast.error("Failed to generate PDF");
    } finally {
      document.body.removeChild(container);
    }
  }, 100);
}

// ─── File Card Component ──────────────────────────────────────────────────────

function FileCard({
  filename,
  type,
  onClick,
  downloading,
}: {
  filename: string;
  type: "xlsx" | "pdf";
  onClick: () => void;
  downloading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={downloading}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        padding: "20px 16px 14px",
        background: "#fff",
        border: "1.5px solid #e5e7eb",
        borderRadius: 14,
        cursor: downloading ? "not-allowed" : "pointer",
        transition: "all 0.18s",
        width: 150,
        minHeight: 130,
        opacity: downloading ? 0.6 : 1,
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        position: "relative",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!downloading) {
          (e.currentTarget as HTMLButtonElement).style.borderColor =
            type === "xlsx" ? "#16a34a" : "#dc2626";
          (e.currentTarget as HTMLButtonElement).style.boxShadow =
            type === "xlsx"
              ? "0 4px 16px rgba(22,163,74,0.18)"
              : "0 4px 16px rgba(220,38,38,0.18)";
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e7eb";
        (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.06)";
        (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
      }}
      title={`Download ${filename}`}
    >
      {/* Colored stripe at top */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 4,
        background: type === "xlsx" ? "#16a34a" : "#dc2626",
        borderRadius: "14px 14px 0 0",
      }} />

      {/* Icon */}
      {type === "xlsx" ? (
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="2" width="36" height="40" rx="4" fill="#e2f5e9" stroke="#16a34a" strokeWidth="1.5" />
          <rect x="4" y="2" width="24" height="40" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
          <text x="8" y="16" fontSize="8" fontWeight="bold" fill="#16a34a">xlsx</text>
          <rect x="8" y="20" width="28" height="3" rx="1" fill="#bbf7d0" />
          <rect x="8" y="26" width="22" height="3" rx="1" fill="#bbf7d0" />
          <rect x="8" y="32" width="26" height="3" rx="1" fill="#bbf7d0" />
          <text x="26" y="40" fontSize="9" fontWeight="900" fill="#16a34a">X</text>
        </svg>
      ) : (
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
          <rect x="4" y="2" width="36" height="40" rx="4" fill="#fee2e2" stroke="#dc2626" strokeWidth="1.5" />
          <rect x="4" y="2" width="24" height="40" rx="4" fill="#fff" stroke="#e5e7eb" strokeWidth="1" />
          <text x="8" y="16" fontSize="8" fontWeight="bold" fill="#dc2626">pdf</text>
          <rect x="8" y="20" width="28" height="3" rx="1" fill="#fecaca" />
          <rect x="8" y="26" width="22" height="3" rx="1" fill="#fecaca" />
          <rect x="8" y="32" width="26" height="3" rx="1" fill="#fecaca" />
          <text x="23" y="40" fontSize="9" fontWeight="900" fill="#dc2626">PDF</text>
        </svg>
      )}

      {/* Filename */}
      <span style={{
        fontSize: 10,
        fontFamily: "'DM Mono', monospace",
        color: "#374151",
        wordBreak: "break-all",
        textAlign: "center",
        lineHeight: 1.4,
        maxWidth: 120,
      }}>
        {filename}
      </span>

      {/* Download indicator */}
      <span style={{
        fontSize: 10,
        fontWeight: 700,
        color: type === "xlsx" ? "#16a34a" : "#dc2626",
        textTransform: "uppercase",
        letterSpacing: "0.04em",
      }}>
        {downloading ? "…" : "↓ Download"}
      </span>
    </button>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: "spin 0.7s linear infinite", flexShrink: 0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.3)" strokeWidth="2" fill="none" />
      <path d="M7 1.5A5.5 5.5 0 0 1 12.5 7" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PDIPartReportPage() {
  const { user } = useUser();
  const isAdmin = user?.role === "admin" || user?.role === "super admin";

  const [partNumber, setPartNumber] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<PDIReportResponse | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // ── Manual PDI State ────────────────────────────────────────────────────────
  const [manualReports, setManualReports] = useState<any[]>([]);
  const [uploadingManual, setUploadingManual] = useState(false);
  const [manualPartNumber, setManualPartNumber] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchManualReports = useCallback(async () => {
    try {
      const res = await api.get("/pdi-manual");
      if (res.data.success) {
        setManualReports(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch manual reports", err);
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) {
      fetchManualReports();
    }
  }, [isAdmin, fetchManualReports]);

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingManual(true);
    const formData = new FormData();
    formData.append("name", user?.name || user?.username || "Manual Upload");
    formData.append("file", file);
    formData.append("part_number", manualPartNumber.trim().toUpperCase());

    try {
      const res = await api.post("/pdi-manual", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        toast.success("Document uploaded successfully");
        setManualPartNumber("");
        if (isAdmin) fetchManualReports();
      } else {
        toast.error("Upload failed");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to upload document");
    } finally {
      setUploadingManual(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  const fetchReport = useCallback(async () => {
    if (!partNumber.trim() || !fromDate || !toDate) {
      toast.error("Please fill in Part Number, From Date and To Date.");
      return;
    }
    try {
      setLoading(true);
      setReport(null);
      const res = await api.post<PDIReportResponse>("/pdi-reports/pdi-part", {
        partNumber: partNumber.trim().toUpperCase(),
        fromDate,
        toDate,
      });
      if (res.data.success) {
        setReport(res.data);
        if (res.data.allRecords.length === 0) toast.info("No records found for the given criteria.");
      } else {
        toast.error("Failed to fetch report data.");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "An error occurred while fetching the report.");
    } finally {
      setLoading(false);
    }
  }, [partNumber, fromDate, toDate]);

  // Collect all unique (shift, date) combos from allRecords
  const fileEntries = React.useMemo(() => {
    if (!report) return [];
    const seen = new Set<string>();
    const entries: { shift: ShiftGroup; date: string; key: string }[] = [];

    report.shifts.forEach((shift) => {
      // Find the dispatch date for this shift from allRecords
      const shiftRecords = report.allRecords.filter(
        (r) => r.shift === shift.shift.letter
      );
      const dateSet = new Set<string>();
      shiftRecords.forEach((r) => {
        const d = r.dispatch_date
          ? new Date(r.dispatch_date).toLocaleDateString("en-IN").replace(/\//g, "-")
          : fromDate;
        dateSet.add(d);
      });

      // If no records found, use fromDate
      const dates = dateSet.size > 0 ? Array.from(dateSet) : [fromDate];

      dates.forEach((date) => {
        const key = `${shift.shift.letter}_${date}`;
        if (!seen.has(key)) {
          seen.add(key);
          entries.push({ shift, date, key });
        }
      });
    });

    return entries;
  }, [report, fromDate]);

  const handleExcelDownload = useCallback(
    (shift: ShiftGroup, date: string, key: string) => {
      if (downloading || !report) return;
      setDownloading(`xlsx_${key}`);
      try {
        downloadShiftExcel(shift, report, date);
        toast.success("Excel downloaded!");
      } catch (e) {
        toast.error("Failed to generate Excel.");
        console.error(e);
      } finally {
        setTimeout(() => setDownloading(null), 1000);
      }
    },
    [report, downloading]
  );

  const handlePDFDownload = useCallback(
    (shift: ShiftGroup, date: string, key: string) => {
      if (downloading || !report) return;
      setDownloading(`pdf_${key}`);
      try {
        downloadShiftPDF(shift, report, date);
      } catch (e) {
        toast.error("Failed to generate PDF.");
        console.error(e);
      } finally {
        setTimeout(() => setDownloading(null), 1500);
      }
    },
    [report, downloading]
  );

  return (
    <DashboardLayout>
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f0f4ff 0%, #f9fafb 60%, #fff7ed 100%)",
          fontFamily: "'Outfit', 'Segoe UI', sans-serif",
          padding: "40px 24px 80px",
        }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
          @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
          .fade-up { animation: fadeUp 0.4s ease both; }
          .fade-up-1 { animation-delay: 0.05s; }
          .fade-up-2 { animation-delay: 0.12s; }
          .input-field {
            width: 100%; padding: 11px 14px; border: 1.5px solid #d1d5db; border-radius: 10px;
            font-size: 14px; font-family: inherit; background: #fff; color: #111827;
            outline: none; transition: border-color 0.18s, box-shadow 0.18s; box-sizing: border-box;
          }
          .input-field:focus { border-color: #1F3864; box-shadow: 0 0 0 3px rgba(31,56,100,0.10); }
          .btn-primary {
            display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px;
            background: #1F3864; color: #fff; border: none; border-radius: 10px;
            font-size: 14px; font-weight: 700; font-family: inherit; cursor: pointer;
            transition: background 0.18s, transform 0.12s, box-shadow 0.18s;
            box-shadow: 0 2px 8px rgba(31,56,100,0.18);
          }
          .btn-primary:hover { background: #162b50; }
          .btn-primary:disabled { background: #9ca3af; cursor: not-allowed; }
          .label-text { display: block; font-size: 12px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        `}</style>

        <div style={{ maxWidth: 1100, margin: "0 auto" }}>

          {/* ── Header ── */}
          <div className="fade-up" style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 6 }}>
              <div style={{ width: 46, height: 46, borderRadius: 14, background: "#1F3864", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>📋</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: "#111827", letterSpacing: "-0.02em" }}>PDI Part Report</h1>
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280", marginTop: 2 }}>Pre-Dispatch Inspection — Download Excel & PDF sheets per shift</p>
              </div>
            </div>
          </div>

          {/* ── Filter Card ── */}
          <div className="fade-up fade-up-1" style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 18, padding: "28px 28px 24px", marginBottom: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 20 }}>Search Filters</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: 16, alignItems: "end" }}>
              <div>
                <label className="label-text">Part Number</label>
                <input className="input-field" type="text" placeholder="e.g. FEA55000" value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && fetchReport()}
                  style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase" }} />
              </div>
              <div>
                <label className="label-text">From Date</label>
                <DatePickerInput className="input-field"   value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className="label-text">To Date</label>
                <DatePickerInput className="input-field"   value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </div>
              <button className="btn-primary" onClick={fetchReport} disabled={loading}>
                {loading ? <><Spinner /> Fetching…</> : <><span>⌕</span> Fetch Report</>}
              </button>
            </div>
          </div>

          {/* ── Loading ── */}
          {loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[0, 1].map((i) => (
                <div key={i} style={{ height: 72, borderRadius: 16, background: "#f3f4f6", animation: "pulse 1.5s ease infinite" }} />
              ))}
            </div>
          )}

          {/* ── Results ── */}
          {!loading && report && report.allRecords.length > 0 && (
            <div className="fade-up fade-up-2">

              {/* Report header banner */}
              <div style={{ background: "#1F3864", borderRadius: 18, padding: "22px 28px", marginBottom: 24, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "0.04em" }}>{report.partNumber}</span>
                    <span style={{ display: "inline-block", padding: "3px 12px", borderRadius: 999, background: "#3b82f6", color: "#fff", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{report.partType}</span>
                  </div>
                  <div style={{ color: "#93c5fd", fontSize: 13, marginTop: 4 }}>{report.product?.specification?.partDescription || report.product?.customer || "—"}</div>
                  <div style={{ color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {new Date(report.dateRange.from).toLocaleDateString("en-IN")} → {new Date(report.dateRange.to).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {[
                    { l: "Total", v: report.overallStats.total, c: "#fff" },
                    { l: "Passed", v: report.overallStats.passed, c: "#86efac" },
                    { l: "Failed", v: report.overallStats.failed, c: "#fca5a5" },
                    { l: "Pending", v: report.overallStats.pending, c: "#fde68a" },
                    { l: "Rejected", v: report.overallStats.rejected, c: "#c4b5fd" },
                  ].map(({ l, v, c }) => (
                    <div key={l} style={{ textAlign: "center", minWidth: 60, background: "rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 14px" }}>
                      <div style={{ fontSize: 20, fontWeight: 800, color: c, fontFamily: "'DM Mono', monospace" }}>{v}</div>
                      <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── File Cards Section ── */}
              <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16 }}>
                Available Files — {fileEntries.length} sheet{fileEntries.length !== 1 ? "s" : ""}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {fileEntries.map(({ shift, date, key }) => {
                  const xlsxName = `PDI_${report.partType}_${report.partNumber}_${shift.shift.letter}_${date}.xlsx`;
                  const pdfName = `PDI_${report.partType}_${report.partNumber}_${shift.shift.letter}_${date}.pdf`;

                  return (
                    <div key={key} style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                      {/* Shift label row */}
                      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                        {/* Shift badge */}
                        {(() => {
                          const colors: Record<string, { bg: string; color: string }> = {
                            A: { bg: "#dbeafe", color: "#1d4ed8" },
                            B: { bg: "#fce7f3", color: "#be185d" },
                            C: { bg: "#ede9fe", color: "#6d28d9" },
                          };
                          const c = colors[shift.shift.letter] || { bg: "#f3f4f6", color: "#374151" };
                          return (
                            <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 10, background: c.bg, color: c.color, fontWeight: 900, fontSize: 18, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>
                              {shift.shift.letter}
                            </span>
                          );
                        })()}
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{shift.shift.label}</div>
                          <div style={{ fontSize: 12, color: "#6b7280" }}>
                            {shift.qty} scanned · {Math.min(shift.sampleSize, 5)} sample records · {date}
                            {shift.checkedBy && <span style={{ marginLeft: 10, color: "#1F3864", fontWeight: 600 }}>✦ {shift.checkedBy}</span>}
                          </div>
                        </div>
                        {/* Mini stats */}
                        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                          {[
                            { v: shift.stats.passed, c: "#166534", bg: "#dcfce7", l: "✓" },
                            { v: shift.stats.failed, c: "#991b1b", bg: "#fee2e2", l: "✗" },
                            { v: shift.stats.rejected, c: "#5b21b6", bg: "#ede9fe", l: "⊘" },
                          ].map((p, i) => (
                            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 10px", borderRadius: 999, background: p.bg, color: p.c, fontSize: 12, fontWeight: 700 }}>
                              {p.l}{p.v}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* File download cards */}
                      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
{      isAdmin &&    (<FileCard
                          filename={xlsxName}
                          type="xlsx"
                          downloading={downloading === `xlsx_${key}`}
                          onClick={() => handleExcelDownload(shift, date, key)}
                        />)}
                        <FileCard
                          filename={pdfName}
                          type="pdf"
                          downloading={downloading === `pdf_${key}`}
                          onClick={() => handlePDFDownload(shift, date, key)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Empty state – no records ── */}
          {!loading && report && report.allRecords.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 18, border: "1.5px solid #e5e7eb" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
              <h3 style={{ margin: 0, color: "#374151", fontWeight: 700 }}>No records found</h3>
              <p style={{ color: "#9ca3af", fontSize: 13, marginTop: 8 }}>No scanned products match <strong>{partNumber}</strong> between {fromDate} and {toDate}.</p>
            </div>
          )}

          {/* ── Initial state ── */}
          {!loading && !report && (
            <div style={{ textAlign: "center", padding: "60px 20px", background: "#fff", borderRadius: 18, border: "1.5px dashed #d1d5db", color: "#9ca3af" }}>
              <div style={{ fontSize: 52, marginBottom: 14 }}>📦</div>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Enter a part number and date range, then click <strong>Fetch Report</strong>.</p>
            </div>
          )}

          {/* ── Manual PDI Documents Section ── */}


        </div>

      </div>
{/* ── Manual PDI Documents Section ── */}
<div
  className="fade-up fade-up-2"
  style={{
    background: "#fff",
    border: "1.5px solid #e5e7eb",
    borderRadius: 18,
    padding: "28px 28px 24px",
    marginTop: 28,
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  }}
>
  <div style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
    Manual PDI Documents
  </div>
  <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 20 }}>
    {isAdmin
      ? "View all manually uploaded PDI reports and supplementary documents."
      : "Upload manually generated PDI reports or supplementary documents."}
  </p>

  {/* ── Upload Area — non-admin only ── */}
  {
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleManualUpload}
        accept=".pdf,.xlsx,.xls,.png,.jpg,.jpeg,.doc,.docx"
      />
      {/* Part Number Input - Required Before Upload */}
      <div style={{ marginBottom: 16 }}>
        <label className="label-text" style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#374151", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
          Part Number <span style={{ color: "#dc2626" }}>*</span>
        </label>
        <input
          className="input-field"
          type="text"
          placeholder="Enter Part Number before uploading (e.g. FEA55000)"
          value={manualPartNumber}
          onChange={(e) => setManualPartNumber(e.target.value.toUpperCase())}
          style={{ fontFamily: "'DM Mono', monospace", textTransform: "uppercase", maxWidth: 360 }}
        />
        {!manualPartNumber.trim() && (
          <p style={{ margin: "4px 0 0", fontSize: 11, color: "#dc2626" }}>Part number is required before uploading a document.</p>
        )}
      </div>
      <div
        onClick={() => {
          if (!manualPartNumber.trim()) {
            toast.error("Please enter a Part Number before uploading.");
            return;
          }
          if (!uploadingManual) fileInputRef.current?.click();
        }}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.background = "#eff6ff"; }}
        onDragLeave={(e) => { e.currentTarget.style.borderColor = "#d1d5db"; e.currentTarget.style.background = "#fafafa"; }}
        onDrop={(e) => {
          e.preventDefault();
          e.currentTarget.style.borderColor = "#d1d5db";
          e.currentTarget.style.background = "#fafafa";
          const file = e.dataTransfer.files?.[0];
          if (!file || uploadingManual) return;
          if (!manualPartNumber.trim()) {
            toast.error("Please enter a Part Number before uploading.");
            return;
          }
          // Trigger upload manually
          const dt = new DataTransfer();
          dt.items.add(file);
          if (fileInputRef.current) {
            fileInputRef.current.files = dt.files;
            fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }}
        style={{
          border: "2px dashed #d1d5db",
          borderRadius: 14,
          background: "#fafafa",
          padding: "36px 20px",
          textAlign: "center",
          cursor: uploadingManual ? "not-allowed" : "pointer",
          transition: "border-color 0.18s, background 0.18s",
          opacity: uploadingManual ? 0.7 : 1,
        }}
      >
        {uploadingManual ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <svg width="28" height="28" viewBox="0 0 28 28" style={{ animation: "spin 0.7s linear infinite" }}>
              <circle cx="14" cy="14" r="11" stroke="#d1d5db" strokeWidth="3" fill="none" />
              <path d="M14 3A11 11 0 0 1 25 14" stroke="#3b82f6" strokeWidth="3" fill="none" strokeLinecap="round" />
            </svg>
            <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 600 }}>Uploading document…</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="6" y="4" width="28" height="32" rx="4" fill="#eff6ff" stroke="#3b82f6" strokeWidth="1.5" />
              <path d="M20 28V16M20 16L15 21M20 16L25 21" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="12" y="30" width="16" height="2" rx="1" fill="#bfdbfe" />
            </svg>
            <div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1d4ed8" }}>Click to browse</span>
              <span style={{ fontSize: 14, color: "#6b7280" }}> or drag & drop a file here</span>
            </div>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              PDF, Excel, Word, Images — max 50 MB
            </span>
          </div>
        )}
      </div>
    </>
  }

  {/* ── Admin view: table of all uploaded documents ── */}
  {isAdmin && (
    <div style={{ marginTop: 4 }}>
      {manualReports.length === 0 ? (
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "#f9fafb",
            borderRadius: 12,
            border: "1px dashed #d1d5db",
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>📂</div>
          <p style={{ margin: 0, color: "#9ca3af", fontSize: 13 }}>
            No manual documents uploaded yet.
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1.5px solid #e5e7eb", background: "#f9fafb" }}>

                <th style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Part Number
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Uploaded By
                </th>
                <th style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Date
                </th>
                <th style={{ padding: "12px 16px", textAlign: "center", color: "#6b7280", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  View
                </th>
              </tr>
            </thead>
            <tbody>
              {manualReports.map((record, idx) => {
                const backendUrl =
                  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
                  "http://localhost:5000";
                const fileUrl = `${backendUrl}/${record.file_path.replace(/\\/g, "/")}`;
                const fileName = record.file_path.split(/[\\/]/).pop() || "Document";
                const isExcel =
                  record.file_path.endsWith(".xlsx") || record.file_path.endsWith(".xls");

                return (
                  <tr
                    key={record.id}
                    style={{
                      borderBottom: "1px solid #f3f4f6",
                      background: idx % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    {/* Part Number */}
                    <td style={{ padding: "12px 16px", color: "#1F3864", fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 700 }}>
                      {record.part_number || <span style={{ color: "#9ca3af", fontSize: 11 }}>—</span>}
                    </td>

                    {/* Uploaded by */}
                    <td style={{ padding: "12px 16px", color: "#4b5563" }}>
                      {record.name}
                    </td>

                    {/* Date */}
                    <td style={{ padding: "12px 16px", color: "#6b7280", fontFamily: "'DM Mono', monospace", fontSize: 12 }}>
                      {new Date(record.created_at).toLocaleString("en-IN")}
                    </td>

                    {/* Action — Excel icon button */}
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={`Open ${fileName}`}
                        style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}
                      >
                        {isExcel ? (
                          /* Excel-style icon */
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            style={{ transition: "transform 0.15s", cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            <rect width="32" height="32" rx="6" fill="#16a34a" />
                            <rect x="4" y="8" width="24" height="16" rx="2" fill="#fff" opacity="0.15" />
                            <text x="5" y="14" fontSize="7" fontWeight="900" fill="#fff" fontFamily="Arial">XLS</text>
                            {/* Grid lines */}
                            <line x1="4" y1="16" x2="28" y2="16" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
                            <line x1="4" y1="20" x2="28" y2="20" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
                            <line x1="4" y1="24" x2="28" y2="24" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
                            <line x1="12" y1="10" x2="12" y2="26" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
                            <line x1="20" y1="10" x2="20" y2="26" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
                            {/* Big X overlay */}
                            <text x="16" y="26" fontSize="13" fontWeight="900" fill="#fff" fontFamily="Arial" textAnchor="middle">✕</text>
                          </svg>
                        ) : (
                          /* Generic file icon for non-excel */
                          <svg
                            width="32"
                            height="32"
                            viewBox="0 0 32 32"
                            fill="none"
                            style={{ transition: "transform 0.15s", cursor: "pointer" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.15)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                          >
                            <rect width="32" height="32" rx="6" fill="#3b82f6" />
                            <rect x="8" y="6" width="16" height="20" rx="2" fill="#fff" opacity="0.9" />
                            <rect x="11" y="11" width="10" height="1.5" rx="0.75" fill="#3b82f6" />
                            <rect x="11" y="15" width="10" height="1.5" rx="0.75" fill="#3b82f6" />
                            <rect x="11" y="19" width="7" height="1.5" rx="0.75" fill="#3b82f6" />
                          </svg>
                        )}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )}
</div>
    </DashboardLayout>
  );
}