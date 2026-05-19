"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import {
  Loader2, Calendar as CalendarIcon, Save, Plus, X, Download, Upload, FileSpreadsheet, BarChart2
} from "lucide-react";
import * as XLSX from "xlsx";



// Build a dynamic key for shifts beyond the initial 3
const shiftKey = (i: number) => `shift${i + 1}_qty` as keyof PlanRow;

interface PlanRow {
  id?: number;
  jt_type: string;
  type: "G" | "NG";
  shift1_qty: number;
  shift2_qty: number;
  shift3_qty: number;
  [extra: string]: any; // shift4_qty, shift5_qty ...
  target: number;
  total_qty: number;
  previous_diff?: number;
  is_synthetic?: boolean;
}

// ── Difference badge ──────────────────────────────────────────────────────────
function DiffBadge({ target, total, prefix = "" }: { target: number; total: number; prefix?: string }) {
  const diff = target - total; // diff = Actual - Total Target
  if (target === 0 && total === 0 && diff === 0)
    return <span className="text-xs text-muted-foreground">—</span>;
  if (diff === 0)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">{prefix}= 0</span>;
  if (diff > 0)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">{prefix}+{diff}</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">{prefix}{diff}</span>;
}

// ── 6 AM boundary helper ─────────────────────────────────────────────────────
function getCurrentPlanDate(): string {
  const now = new Date();
  // If before 06:00, the "day" belongs to yesterday's plan
  if (now.getHours() < 6) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  return now.toISOString().slice(0, 10);
}

export default function BearingCupPlanPage() {
  const { user } = useUser();
  const canEdit = ["admin", "super admin", "production"].includes(user?.role || "");

  const todayPlanDate = getCurrentPlanDate();
  const [date, setDate] = useState(todayPlanDate);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [numShifts, setNumShifts] = useState(3);
  const [planExists, setPlanExists] = useState(false); // true = fetched from DB, only Actual editable

  // Rows shown in the table (user-selected JT types)
  const [rows, setRows] = useState<PlanRow[]>([]);
  const [jtOptions, setJtOptions] = useState<string[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"plan"|"graphs">("plan");

  // Import dialog
  const [importOpen, setImportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── helpers ─────────────────────────────────────────────────────────────────
  const makeEmptyRow = (jt: string, type: "G" | "NG"): PlanRow => {
    const r: PlanRow = { jt_type: jt, type, shift1_qty: 0, shift2_qty: 0, shift3_qty: 0, target: 0, total_qty: 0, previous_diff: 0 };
    for (let i = 3; i < numShifts; i++) r[`shift${i + 1}_qty`] = 0;
    return r;
  };

  const calcTotal = (row: PlanRow, shifts: number) => {
    let t = 0;
    for (let i = 0; i < shifts; i++) t += Number(row[shiftKey(i)]) || 0;
    return t;
  };

  // ── load ────────────────────────────────────────────────────────────────────
  const loadPlan = useCallback(async (d: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/bearing-cup-plans?date=${d}`);
      const rawData: PlanRow[] = res.data.data || [];

      const loaded: PlanRow[] = [];
      let inferredShifts = 3;
      const hasData = rawData.length > 0;

      rawData.forEach((r) => {
        // Detect extra shifts from keys
        const keys = Object.keys(r).filter((k) => /^shift\d+_qty$/.test(k));
        const max = Math.max(...keys.map((k) => parseInt(k.replace(/\D/g, ""))));
        if (max > inferredShifts) inferredShifts = max;
        loaded.push({ ...r });
      });

      setNumShifts(inferredShifts);
      setRows(loaded);
      
      // If it only has synthetic rows (carry overs), we shouldn't lock it as an existing plan
      const hasRealData = loaded.some(r => !r.is_synthetic);
      setPlanExists(hasRealData);
      setIsEditing(false);
    } catch {
      toast.error("Failed to load plan for this date");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch dynamic fields for jt types
    api.get("/dynamic-fields").then(res => {
      if (res.data?.data?.bearing_JT_types?.length > 0) {
        setJtOptions(res.data.data.bearing_JT_types);
      }
    }).catch(console.error);
  }, []);

  useEffect(() => { loadPlan(date); }, [date, loadPlan]);

  const isFormEditable = canEdit && (!planExists || isEditing);

  // ── row mutation ─────────────────────────────────────────────────────────────
  const updateRow = (idx: number, field: string, valStr: string) => {
    const isActualField = field === "target";
    const allowedForEveryone = planExists && isActualField;

    // If not allowed for everyone, must have canEdit permission
    if (!allowedForEveryone && !canEdit) return;

    // If plan exists and we are NOT in explicit editing mode, only the 'Actual' field is changeable
    if (planExists && !isEditing && !isActualField) return;
    
    const val = parseInt(valStr, 10) || 0;
    setRows((prev) => {
      const copy = [...prev];
      const r = { ...copy[idx], [field]: val };
      r.total_qty = calcTotal(r, numShifts);
      copy[idx] = r;
      return copy;
    });
  };

  const addJtRow = () => {
    setRows((prev) => [
      ...prev,
      makeEmptyRow(jtOptions[0] || "NEW", "G"),
      makeEmptyRow(jtOptions[0] || "NEW", "NG"),
    ]);
  };

  const removeJtPair = (jtType: string) => {
    setRows((prev) => prev.filter((r) => r.jt_type !== jtType));
  };

  const changeJtType = (oldJt: string, newJt: string) => {
    setRows((prev) =>
      prev.map((r) => (r.jt_type === oldJt ? { ...r, jt_type: newJt } : r))
    );
  };

  // When numShifts changes, re-calc totals and ensure keys exist
  const addShift = () => {
    setNumShifts((n) => n + 1);
    setRows((prev) =>
      prev.map((r) => {
        const next = { ...r, [`shift${numShifts + 1}_qty`]: 0 };
        next.total_qty = calcTotal(next, numShifts + 1);
        return next;
      })
    );
  };

  const removeShift = () => {
    if (numShifts <= 1) return;
    setNumShifts((n) => n - 1);
    setRows((prev) =>
      prev.map((r) => {
        const next = { ...r };
        delete next[`shift${numShifts}_qty`];
        next.total_qty = calcTotal(next, numShifts - 1);
        return next;
      })
    );
  };

  // ── save ─────────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put("/bearing-cup-plans", { date, rows });
      toast.success("Plan saved successfully");
      setIsEditing(false);
      loadPlan(date);
    } catch {
      toast.error("Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  // ── grand totals ─────────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const t: Record<string, number> = { target: 0, total: 0 };
    for (let i = 0; i < numShifts; i++) t[`s${i + 1}`] = 0;
    rows.forEach((r) => {
      for (let i = 0; i < numShifts; i++) t[`s${i + 1}`] += Number(r[shiftKey(i)]) || 0;
      t.target += Number(r.target) || 0;
      t.total += Number(r.total_qty) || 0;
    });
    return t;
  }, [rows, numShifts]);

  // ── unique JT types for display ───────────────────────────────────────────
  const jtTypes = useMemo(() => {
    const seen = new Set<string>();
    rows.forEach((r) => seen.add(r.jt_type));
    return Array.from(seen);
  }, [rows]);

  // ── Excel template download ──────────────────────────────────────────────────
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Build header row
    const header = ["JT Type", "Type", "Shift 1", "Shift 2", "Shift 3"];
    const sheetData: any[][] = [header];

    // For each JT option, add two rows (G and NG) with empty shift cells and Actual
    jtOptions.forEach((jt) => {
      sheetData.push([jt, "G", "", "", "", ""]);  // G row
      sheetData.push([jt, "NG", "", "", "", ""]);  // NG row (same JT)
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);

    // Add dropdown validation for column A (JT Type) — rows 2 onwards
    if (!ws["!dataValidations"]) ws["!dataValidations"] = [];
    const dvRange = { s: { r: 1, c: 0 }, e: { r: sheetData.length - 1, c: 0 } };
    (ws as any)["!dataValidations"].push({
      sqref: XLSX.utils.encode_range(dvRange),
      type: "list",
      formula1: `"${jtOptions.join(",")}"`,
      showDropDown: false,
    });

    // Column widths
    ws["!cols"] = [{ wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

    XLSX.utils.book_append_sheet(wb, ws, "BearingCupPlan");
    XLSX.writeFile(wb, "bearing_cup_plan_template.xlsx");
    toast.success("Template downloaded");
  };

  // ── Excel export of current table data ───────────────────────────────────────
  const exportToExcel = () => {
    if (!rows.length) return toast.error("No data to export");
    const wb = XLSX.utils.book_new();

    // Header
    const shiftHeaders = Array.from({ length: numShifts }, (_, i) => `Shift ${i + 1}`);
    const header = ["JT Type", "Type", "Prev Diff", ...shiftHeaders, "Actual", "Total Target", "Diff"];
    const sheetData: any[][] = [header];

    jtTypes.forEach((jt) => {
      const gRow = rows.find(r => r.jt_type === jt && r.type === "G");
      const ngRow = rows.find(r => r.jt_type === jt && r.type === "NG");
      [gRow, ngRow].forEach((r) => {
        if (!r) return;
        const shiftVals = Array.from({ length: numShifts }, (_, i) => Number(r[shiftKey(i)]) || 0);
        const diff = r.target - r.total_qty; // Actual - Total Target
        sheetData.push([r.jt_type, r.type, r.previous_diff || 0, ...shiftVals, r.target, r.total_qty, diff]);
      });
    });

    // Totals row
    const shiftTotals = Array.from({ length: numShifts }, (_, i) => totals[`s${i + 1}`]);
    sheetData.push(["TOTAL", "", "", ...shiftTotals, totals.target, totals.total, totals.target - totals.total]);

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    ws["!cols"] = [{ wch: 14 }, { wch: 6 }, { wch: 10 }, ...shiftHeaders.map(() => ({ wch: 10 })), { wch: 10 }, { wch: 13 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, date);
    XLSX.writeFile(wb, `bearing_cup_plan_${date}.xlsx`);
    toast.success("Exported successfully");
  };

  // ── Excel import ─────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        const importedMap: Record<string, { G: PlanRow; NG: PlanRow }> = {};
        // Initialize with empty rows
        jtOptions.forEach(jt => {
          importedMap[jt] = {
            G: { jt_type: jt, type: "G", shift1_qty: 0, shift2_qty: 0, shift3_qty: 0, target: 0, total_qty: 0, previous_diff: 0 },
            NG: { jt_type: jt, type: "NG", shift1_qty: 0, shift2_qty: 0, shift3_qty: 0, target: 0, total_qty: 0, previous_diff: 0 }
          };
        });

        // Skip header row (row 0)
        for (let ri = 1; ri < raw.length; ri++) {
          const row = raw[ri];
          const jt = String(row[0] || "").trim();
          if (!jt) continue;

          const typeInFile = String(row[1] || "").trim().toUpperCase();
          const type: "G" | "NG" = typeInFile === "NG" ? "NG" : "G";

          const s1 = parseInt(String(row[2])) || 0;
          const s2 = parseInt(String(row[3])) || 0;
          const s3 = parseInt(String(row[4])) || 0;
          const actual = parseInt(String(row[5])) || 0;

          if (!importedMap[jt]) {
            importedMap[jt] = {
              G: { jt_type: jt, type: "G", shift1_qty: 0, shift2_qty: 0, shift3_qty: 0, target: 0, total_qty: 0, previous_diff: 0 },
              NG: { jt_type: jt, type: "NG", shift1_qty: 0, shift2_qty: 0, shift3_qty: 0, target: 0, total_qty: 0, previous_diff: 0 }
            };
          }

          importedMap[jt][type] = {
            jt_type: jt,
            type,
            shift1_qty: s1,
            shift2_qty: s2,
            shift3_qty: s3,
            target: actual,
            total_qty: s1 + s2 + s3,
            previous_diff: 0,
          };
        }

        // Filter and flatten
        const imported: PlanRow[] = [];
        Object.keys(importedMap).forEach(jt => {
          const g = importedMap[jt].G;
          const ng = importedMap[jt].NG;
          const hasValue = (g.shift1_qty || g.shift2_qty || g.shift3_qty || 
                            ng.shift1_qty || ng.shift2_qty || ng.shift3_qty ||
                            g.target || ng.target);
          if (hasValue) {
            imported.push(g);
            imported.push(ng);
          }
        });

        if (imported.length === 0) {
          toast.error("No valid data found in the file (all shifts are empty)");
          return;
        }

        setNumShifts(3);
        setRows(imported);
        setImportOpen(false);
        toast.success(`Imported ${imported.length} rows. Review and save.`);
      } catch (err) {
        toast.error("Failed to parse Excel file");
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Bearing Cup Production Plan</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Daily production plan and status tracking</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center rounded-lg border overflow-hidden h-9 divide-x text-xs font-semibold">
              <button onClick={() => setActiveMainTab("plan")} className={`px-3 h-full transition-colors ${activeMainTab === "plan" ? "bg-slate-800 text-white" : "bg-background text-muted-foreground hover:bg-muted/60"}`}>Plan</button>
              <button onClick={() => setActiveMainTab("graphs")} className={`px-3 h-full transition-colors flex items-center gap-1 ${activeMainTab === "graphs" ? "bg-slate-800 text-white" : "bg-background text-muted-foreground hover:bg-muted/60"}`}><BarChart2 className="w-3 h-3" />Graphs</button>
            </div>

            {activeMainTab === "plan" && (
              <>
            <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
              <CalendarIcon className="w-4 h-4 text-muted-foreground" />
              <input
                type="date"
                className="text-sm border-none bg-transparent outline-none cursor-pointer"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Shift controls — hidden when plan exists unless editing */}
            {canEdit && isFormEditable && (
              <div className="flex items-center gap-1 border rounded-md overflow-hidden h-9">
                <button
                  className="px-2 h-full text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-r"
                  onClick={removeShift}
                  disabled={numShifts <= 1}
                  title="Remove last shift"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-xs font-medium">{numShifts} Shift{numShifts !== 1 ? "s" : ""}</span>
                <button
                  className="px-2 h-full text-xs text-muted-foreground hover:bg-muted/60 transition-colors border-l"
                  onClick={addShift}
                  title="Add shift"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {canEdit && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={() => setImportOpen(true)}>
                <Upload className="w-3.5 h-3.5" /> Import Excel
              </Button>
            )}

            {canEdit && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Template
              </Button>
            )}

            <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportToExcel} disabled={!rows.length}>
              <Download className="w-3.5 h-3.5" /> Export Excel
            </Button>

            {canEdit && !planExists && (
              <Button size="sm" className="h-9 gap-1.5" onClick={handleSave} disabled={loading || saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Plan
              </Button>
            )}

            {canEdit && planExists && (
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <Button size="sm" variant="secondary" className="h-9 gap-1.5" onClick={() => setIsEditing(true)}>
                    Edit Plan
                  </Button>
                )}
                {isEditing && (
                  <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => { setIsEditing(false); loadPlan(date); }} disabled={loading || saving}>
                    Cancel
                  </Button>
                )}
                <Button size="sm" className="h-9 gap-1.5" onClick={handleSave} disabled={loading || saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isEditing ? "Save Plan" : "Update Actual"}
                </Button>
              </div>
            )}

            {canEdit && isFormEditable && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={addJtRow}>
                <Plus className="w-3.5 h-3.5" /> Add JT Row
              </Button>
            )}
              </>
            )}
          </div>
        </div>

        {activeMainTab === "graphs" ? (
          <GraphsTab />
        ) : (
          <>
            {/* Locked plan banner */}
        {planExists && !isEditing && date === todayPlanDate && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
            <span className="text-base">🔒</span>
            Today&apos;s plan is loaded. Shift quantities and JT types are locked — only the actuals can be updated. Click "Edit Plan" to modify.
          </div>
        )}

        {/* Table */}
        <div className="border rounded-xl shadow-sm bg-white overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-32 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin" /> Loading plan data...
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-sm">
              No data for this date. {canEdit && (
                <button className="text-primary underline ml-1" onClick={addJtRow}>
                  Add JT rows
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-center">
                <thead>
                  <tr className="bg-slate-100/80 border-b">
                    <th className="px-4 py-3 font-semibold text-slate-700 text-left w-48">JT Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 w-16 border-x">Type</th>
                    <th className="px-3 py-3 font-semibold text-slate-700 min-w-[70px]">Prev Diff</th>
                    {Array.from({ length: numShifts }).map((_, i) => (
                      <th key={i} className="px-4 py-3 font-semibold text-slate-700 min-w-[130px]">
                        Shift {i + 1}
                      </th>
                    ))}
                    <th className="px-4 py-3 font-semibold text-slate-700 bg-blue-50/50 min-w-[75px]">Actual</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-50 border-l min-w-[80px]">Total Target</th>
                    <th className="px-4 py-3 font-semibold text-slate-700 min-w-[80px]">Diff</th>
                    {canEdit && <th className="px-3 py-3 w-8"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {jtTypes.map((jt) => {
                    const gIdx = rows.findIndex((r) => r.jt_type === jt && r.type === "G");
                    const ngIdx = rows.findIndex((r) => r.jt_type === jt && r.type === "NG");
                    const gRow = rows[gIdx];
                    const ngRow = rows[ngIdx];

                    return (
                      <>
                        {/* Row G */}
                        {gRow && (
                          <tr key={`${jt}-G`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2 text-left border-r border-b">
                              {canEdit && isFormEditable ? (
                                <select
                                  value={gRow.jt_type}
                                  onChange={(e) => changeJtType(jt, e.target.value)}
                                  className="w-full text-xs border rounded px-2 py-1 bg-background font-medium text-slate-800"
                                >
                                  {jtOptions.map((opt) => (
                                    <option key={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : (
                                <span className="font-medium text-slate-800">{jt} {gRow.is_synthetic && <span className="text-[10px] text-muted-foreground ml-1">(Carry)</span>}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 border-r font-medium text-emerald-600 bg-emerald-50/30">G</td>
                            <td className="px-3 py-1.5">
                              {gRow.previous_diff !== 0 && (
                                <span className={`text-xs font-bold ${gRow.previous_diff! > 0 ? "text-blue-600" : "text-red-600"}`}>
                                  {gRow.previous_diff! > 0 ? `+${gRow.previous_diff}` : gRow.previous_diff}
                                </span>
                              )}
                            </td>
                            {Array.from({ length: numShifts }).map((_, i) => (
                              <td key={i} className="px-3 py-1.5">
                                {!isFormEditable ? (
                                  <span className="block h-8 flex items-center justify-center text-sm font-bold text-slate-800">{gRow[shiftKey(i)] || 0}</span>
                                ) : (
                                  <Input
                                    type="number" min="0"
                                    value={gRow[shiftKey(i)] || ""}
                                    onChange={(e) => updateRow(gIdx, shiftKey(i) as string, e.target.value)}
                                    disabled={!canEdit}
                                    className="h-8 text-center text-sm font-bold"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 bg-blue-50/30">
                              <Input type="number" min="0" value={gRow.target || ""} onChange={(e) => updateRow(gIdx, "target", e.target.value)} disabled={!canEdit && !planExists} className="h-8 text-center text-xs border-blue-200 focus-visible:ring-blue-400" />
                            </td>
                            <td className={`px-4 py-2 font-bold bg-slate-50/50 border-l ${gRow.target < gRow.total_qty ? "text-red-600" : gRow.target > gRow.total_qty ? "text-green-500" : "text-slate-700"}`}>
                              {gRow.total_qty}
                            </td>
                            <td className="px-4 py-2">
                              <DiffBadge target={gRow.target} total={gRow.total_qty} />
                            </td>
                            {canEdit && isFormEditable && (
                              <td className="px-2 py-2 border-b">
                                <button
                                  onClick={() => removeJtPair(jt)}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                                  title="Remove this JT type"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        )}
                        {/* Row NG */}
                        {ngRow && (
                          <tr key={`${jt}-NG`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-3 py-2 text-left border-r border-b">
                              <span className="font-medium text-slate-400">{jt}</span>
                            </td>
                            <td className="px-4 py-2 border-r border-b font-medium text-rose-600 bg-rose-50/30">NG</td>
                            <td className="px-3 py-1.5 border-b">
                              {ngRow.previous_diff !== 0 && (
                                <span className={`text-xs font-bold ${ngRow.previous_diff! > 0 ? "text-blue-600" : "text-red-600"}`}>
                                  {ngRow.previous_diff! > 0 ? `+${ngRow.previous_diff}` : ngRow.previous_diff}
                                </span>
                              )}
                            </td>
                            {Array.from({ length: numShifts }).map((_, i) => (
                              <td key={i} className="px-3 py-1.5 border-b">
                                {!isFormEditable ? (
                                  <span className="block h-8 flex items-center justify-center text-sm font-bold text-slate-800">{ngRow[shiftKey(i)] || 0}</span>
                                ) : (
                                  <Input
                                    type="number" min="0"
                                    value={ngRow[shiftKey(i)] || ""}
                                    onChange={(e) => updateRow(ngIdx, shiftKey(i) as string, e.target.value)}
                                    disabled={!canEdit}
                                    className="h-8 text-center text-sm font-bold"
                                  />
                                )}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 bg-blue-50/30 border-b">
                              <Input type="number" min="0" value={ngRow.target || ""} onChange={(e) => updateRow(ngIdx, "target", e.target.value)} disabled={!canEdit && !planExists} className="h-8 text-center text-xs border-blue-200 focus-visible:ring-blue-400" />
                            </td>
                            <td className={`px-4 py-2 font-bold text-slate-700 bg-slate-50/50 border-l border-b ${ngRow.target < ngRow.total_qty ? "text-red-600" : ngRow.target > ngRow.total_qty ? "text-green-500" : "text-slate-700"}`}>{ngRow.total_qty}</td>
                            <td className="px-4 py-2 border-b">
                              <DiffBadge target={ngRow.target} total={ngRow.total_qty} />
                            </td>
                            {canEdit && isFormEditable && (
                              <td className="px-2 py-2 border-b">
                                {/* Empty cell or another delete button if needed */}
                              </td>
                            )}
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                {/* Grand Total Footer */}
                <tfoot className="bg-slate-800 text-white font-semibold">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right uppercase tracking-wider text-xs border-r border-slate-700">Daily Grand Total</td>
                    {Array.from({ length: numShifts }).map((_, i) => (
                      <td key={i} className="px-4 py-3">{totals[`s${i + 1}`]}</td>
                    ))}
                    <td className="px-4 py-3 bg-blue-900/40 text-blue-100">{totals.target}</td>
                    <td className="px-4 py-3 bg-slate-900 border-l border-slate-700 text-emerald-400">{totals.total}</td>
                    <td className="px-4 py-3">
                      <DiffBadge target={totals.target} total={totals.total} />
                    </td>
                    {canEdit && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
          </>
        )}
      </div>

      {/* ── Import Dialog ── */}
      <Dialog open={importOpen} onOpenChange={(o) => !o && setImportOpen(false)}>
        <DialogContent className="!max-w-md">
          <DialogTitle>Import from Excel</DialogTitle>
          <div className="space-y-4 mt-3">
            <p className="text-sm text-muted-foreground">
              Use the template (3 shifts). Only rows with at least one non-zero shift value will be imported.
              The first occurrence of each JT type is treated as <strong>G</strong>, the second as <strong>NG</strong>.
              If you have added new dynamic JT types, you should download the template again.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={downloadTemplate}>
                <FileSpreadsheet className="w-3.5 h-3.5" /> Download Template
              </Button>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1">Select Excel File (.xlsx)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImport}
                className="block text-sm w-full border rounded-md px-3 py-2 bg-background"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

// ── Graphs Tab ───────────────────────────────────────────────────────────────
function GraphsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(startOfMonth);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any[]>([]);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/bearing-cup-plans/summary?from=${from}&to=${to}`);
      setSummaryData(res.data.data || []);
    } catch { toast.error("Failed to load graph data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGraph(); }, []);

  const jtStats = useMemo(() => {
    const map: Record<string, { jt_type: string; target: number; actual: number }> = {};
    summaryData.forEach((row: any) => {
      if (!map[row.jt_type]) {
        map[row.jt_type] = { jt_type: row.jt_type, target: 0, actual: 0 };
      }
      map[row.jt_type].target += Number(row.total_qty) || 0; // total_qty is the plan target
      map[row.jt_type].actual += Number(row.target) || 0;    // target is the actual production
    });
    return Object.values(map).sort((a, b) => b.actual - a.actual);
  }, [summaryData]);

  const maxActual = Math.max(1, ...jtStats.map(s => s.actual));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 bg-white border rounded-xl p-4 shadow-sm">
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">From Date</label>
          <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="h-9 text-sm w-40" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground block mb-1">To Date</label>
          <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="h-9 text-sm w-40" />
        </div>
        <Button size="sm" className="h-9 text-xs gap-1.5" onClick={loadGraph} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BarChart2 className="w-3.5 h-3.5" />}
          Load Graph
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="font-bold text-white text-sm">Series Wise Production</h3>
        </div>
        <div className="p-5 overflow-x-auto">
          {jtStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for selected range</p>
          ) : (
            <div className="space-y-3">
              {jtStats.map((d, i) => {
                const pctActual = maxActual > 0 ? (d.actual / maxActual) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold w-32 truncate text-right text-slate-700">{d.jt_type}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-6 overflow-hidden relative">
                      <div className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${pctActual}%` }}>
                        <span className="text-[10px] text-white font-bold">{d.actual}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-24 text-left">Target: {d.target}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
