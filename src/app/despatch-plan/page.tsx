"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import {
  Plus, Save, Loader2, Trash2, AlertTriangle, CheckCircle2,
  Truck, Download, Upload, FileSpreadsheet, X, BarChart2,
} from "lucide-react";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useProducts } from "@/contexts/ProductsContext";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Pallet {
  id?: number;
  pallet_label: string;
  part_number: string;
  tube_length: string;
  target_qty: number;
  scanned_qty: number;
  filled_quantity: number;
  is_fulfilled: boolean;
  invalid?: boolean;
}
interface Vehicle {
  id?: number;
  vehicle_label: string;
  customer: string;
  priority_number: number | null;
  is_completed: boolean;
  pallets: Pallet[];
}
interface DespatchPlan {
  id?: number;
  plan_date: string;
  vehicles: Vehicle[];
}

// ── helpers ───────────────────────────────────────────────────────────────────
function getPlanDate(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  if (ist.getUTCHours() < 6) ist.setUTCDate(ist.getUTCDate() - 1);
  return ist.toISOString().slice(0, 10);
}

const CUSTOMER_COLORS: Record<string, string> = {
  TML: "bg-blue-100 text-blue-800 border-blue-300",
  "ALL ALW": "bg-orange-100 text-orange-800 border-orange-300",
  "ALL PNR": "bg-violet-100 text-violet-800 border-violet-300",
};
function customerColor(c: string) {
  return CUSTOMER_COLORS[c] || "bg-slate-100 text-slate-700 border-slate-300";
}

function makeEmptyPallet(): Pallet {
  return { pallet_label: "", part_number: "", tube_length: "", target_qty: 0, scanned_qty: 0, filled_quantity: 0, is_fulfilled: false };
}
function makeEmptyVehicle(label: string): Vehicle {
  return { vehicle_label: label, customer: "", priority_number: null, is_completed: false, pallets: [makeEmptyPallet()] };
}

// ── Input View: vehicle card for data entry ────────────────────────────────────
function VehicleCard({ vehicle, idx, canEdit, customerOptions, onChange, onRemove }: {
  vehicle: Vehicle; idx: number; canEdit: boolean; customerOptions: string[];
  onChange: (v: Vehicle) => void; onRemove: () => void;
}) {
  const isComplete = vehicle.is_completed;
  const cardBg = isComplete ? "bg-green-50 border-green-300" : "bg-yellow-50 border-yellow-300";
  const headerBg = isComplete ? "bg-green-500 text-white" : "bg-yellow-400 text-gray-900";

  const addPallet = () => onChange({ ...vehicle, pallets: [...vehicle.pallets, makeEmptyPallet()] });
  const removePallet = (pi: number) => onChange({ ...vehicle, pallets: vehicle.pallets.filter((_, i) => i !== pi) });
  const updatePallet = (pi: number, field: keyof Pallet, val: any) => {
    const next = vehicle.pallets.map((p, i) => i === pi ? { ...p, [field]: val } : p);
    onChange({ ...vehicle, pallets: next });
  };

  return (
    <div className={`flex flex-col min-w-[230px] max-w-[250px] border-2 rounded-xl shadow-sm overflow-hidden ${cardBg}`}>
      {/* Header */}
      <div className={`px-3 py-2 font-bold text-sm ${headerBg}`}>
        <div className="flex items-center justify-between">
          <Input
            value={vehicle.vehicle_label}
            onChange={e => onChange({ ...vehicle, vehicle_label: e.target.value })}
            placeholder="V1"
            className="h-6 text-xs w-20 bg-white/80 border-white/60 font-bold px-1"
          />
          <div className="flex items-center gap-1">
            {isComplete && <CheckCircle2 className="w-4 h-4" />}
            {canEdit && (
              <button onClick={onRemove} className="w-5 h-5 flex items-center justify-center rounded hover:bg-black/10">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Customer */}
      <div className="px-2 py-2 border-b border-inherit">
        <select
          value={vehicle.customer}
          onChange={e => onChange({ ...vehicle, customer: e.target.value })}
          className="w-full text-xs border rounded px-2 py-1.5 bg-white"
        >
          <option value="">— Customer —</option>
          {customerOptions.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Priority */}
      <div className="px-2 py-1.5 border-b border-inherit flex items-center gap-1.5">
        <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">Priority #</span>
        <input
          type="number" min="1"
          value={vehicle.priority_number ?? ""}
          onChange={e => onChange({ ...vehicle, priority_number: e.target.value ? parseInt(e.target.value) : null })}
          placeholder="—"
          className="w-full h-6 text-xs border rounded px-1.5 bg-white"
        />
      </div>

      {/* Pallets */}
      <div className="flex flex-col gap-2 px-2 py-2 flex-1">
        {vehicle.pallets.map((p, pi) => (
          <div key={pi} className="rounded-lg border bg-white px-2 py-1.5 text-xs space-y-1 relative">
            <button
              onClick={() => removePallet(pi)}
              className="absolute top-1 right-1 w-4 h-4 flex items-center justify-center rounded hover:bg-red-100 text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
            <Input
              value={p.pallet_label}
              onChange={e => updatePallet(pi, "pallet_label", e.target.value)}
              placeholder="P1, P2..."
              className="h-6 text-xs font-semibold"
            />
            <Input
              value={p.part_number}
              onChange={e => {
                const pn = e.target.value;
                updatePallet(pi, "part_number", pn);
              }}
              placeholder="Part Number"
              className={`h-6 text-xs ${p.invalid ? "border-red-500 bg-red-50" : ""}`}
            />
            <div className="flex items-center gap-1.5">
              <Input
                type="number" min="0"
                value={p.target_qty || ""}
                onChange={e => updatePallet(pi, "target_qty", parseInt(e.target.value) || 0)}
                placeholder="Qty"
                className="h-6 text-xs w-20"
              />

            </div>
          </div>
        ))}
        <button
          onClick={addPallet}
          className="text-xs text-blue-600 hover:text-blue-800 border border-dashed border-blue-300 rounded-lg py-1 flex items-center justify-center gap-1 hover:bg-blue-50 transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Pallet
        </button>
      </div>

      {/* Footer total */}
      <div className="px-2 pb-2 text-xs font-semibold text-center text-slate-600 border-t border-inherit pt-1.5">
        Total: {vehicle.pallets.reduce((s, p) => s + (p.target_qty || 0), 0)} units
      </div>
    </div>
  );
}

// ── Read-only Table View ──────────────────────────────────────────────────────
function PlanTable({ vehicles, onPriorityChange }: {
  vehicles: Vehicle[];
  onPriorityChange?: (vehicleId: number, priority: number | null) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border shadow-sm">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-slate-800 text-white">
            {["Vehicle", "Customer", "Priority", "Pallet", "Part Number", "Tube Length", "Target Qty", "Filled Qty", "Fulfilled"].map(h => (
              <th key={h} className="px-4 py-4 font-bold text-sm uppercase tracking-wider whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {vehicles.flatMap((v) => {
            if (!v.pallets || v.pallets.length === 0) {
              const isComplete = v.is_completed;
              return (
                <tr key={v.vehicle_label} className={`border-b ${isComplete ? "bg-green-50" : "bg-white"}`}>
                  <td className={`px-4 py-3 font-extrabold text-base border-r ${isComplete ? "text-green-700" : "text-yellow-700"}`}>
                    <div className="flex items-center gap-1.5">
                      {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {v.vehicle_label}
                    </div>
                  </td>
                  <td className="px-4 py-3 border-r">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${customerColor(v.customer)}`}>{v.customer || "—"}</span>
                  </td>
                  <td colSpan={7} className="px-4 py-3 text-center text-slate-400 italic font-bold">No pallets</td>
                </tr>
              );
            }
            return v.pallets.map((p, pi) => {
              const isComplete = v.is_completed;
              const isFulfilled = !!p.is_fulfilled;
              const rowBg = isComplete ? "bg-green-50" : isFulfilled ? "bg-green-100" : p.filled_quantity > 0 ? "bg-yellow-50" : "bg-white";
              return (
                <tr key={`${v.vehicle_label}-${pi}`} className={`border-b ${rowBg} hover:brightness-95 transition`}>
                  {pi === 0 ? (
                    <td className={`px-4 py-3 font-extrabold text-lg border-r ${isComplete ? "text-green-700" : "text-yellow-700"}`} rowSpan={v.pallets.length}>
                      <div className="flex items-center gap-1.5">
                        {isComplete && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                        {v.vehicle_label}
                      </div>
                    </td>
                  ) : null}
                  {pi === 0 ? (
                    <td className="px-4 py-3 border-r" rowSpan={v.pallets.length}>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${customerColor(v.customer)}`}>{v.customer || "—"}</span>
                    </td>
                  ) : null}
                  {pi === 0 ? (
                    <td className="px-4 py-3 border-r text-center" rowSpan={v.pallets.length}>
                      {onPriorityChange && v.id ? (
                        <input
                          type="number" min="1"
                          defaultValue={v.priority_number ?? ""}
                          placeholder="—"
                          className="w-16 h-8 text-sm font-bold border-2 rounded px-1 text-center"
                          onBlur={e => {
                            const val = e.target.value;
                            onPriorityChange(v.id!, val ? parseInt(val) : null);
                          }}
                        />
                      ) : (
                        v.priority_number != null
                          ? <span className="px-3 py-1 text-xs font-black rounded-full bg-blue-100 text-blue-800 border-2 border-blue-300">P{v.priority_number}</span>
                          : <span className="text-slate-400 text-sm font-bold">—</span>
                      )}
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-bold text-base border-r">{p.pallet_label || "—"}</td>
                  <td className="px-4 py-3 font-mono text-base font-bold border-r">{p.part_number || "—"}</td>
                  <td className="px-4 py-3 text-sm font-bold border-r text-slate-700">{p.tube_length || "—"}</td>
                  <td className="px-4 py-3 text-center font-black text-lg border-r">{p.target_qty}</td>
                  <td className={`px-4 py-3 text-center font-black text-lg border-r ${p.filled_quantity >= p.target_qty && p.target_qty > 0 ? "text-green-700" : p.filled_quantity > 0 ? "text-orange-600" : "text-slate-500"}`}>
                    {p.filled_quantity}
                  </td>
                  <td className="px-4 py-3 text-center border-r">
                    {isFulfilled
                      ? <span className="px-3 py-1 text-xs font-black rounded-full bg-green-500 text-white shadow-sm">✓ YES</span>
                      : <span className="px-3 py-1 text-xs font-black rounded-full bg-yellow-400 text-yellow-900 shadow-sm">PENDING</span>}
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}

function IncompleteBanner({ vehicles }: { vehicles: any[] }) {
  if (!vehicles.length) return null;
  return (
    <div className="border border-yellow-300 bg-yellow-50 rounded-xl overflow-hidden shadow-sm">
      <div className="flex items-center gap-2 p-4 bg-yellow-100 border-b border-yellow-200">
        <AlertTriangle className="w-5 h-5 text-yellow-600" />
        <span className="font-bold text-yellow-800 text-sm">Pending Despatches (Previous Day)</span>
      </div>
      <PlanTable vehicles={vehicles} />
    </div>
  );
}

// ── Graphs Tab ─────────────────────────────────────────────────────────
function GraphsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const sevenDaysAgo = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const [from, setFrom] = useState(sevenDaysAgo);
  const [to, setTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);

  const loadGraph = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/despatch-plan/graph?from=${from}&to=${to}`);
      setGraphData(res.data);
    } catch { toast.error("Failed to load graph data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadGraph(); }, []);

  const handleRangeDownload = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/despatch-plan/export-range?from=${from}&to=${to}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url; a.download = `despatch_${from}_to_${to}.xlsx`; a.click();
      URL.revokeObjectURL(url);
      toast.success("Excel downloaded");
    } catch { toast.error("Download failed"); }
    finally { setDownloading(false); }
  };

  const vpd = graphData?.vehiclesPerDay || [];
  const pnw = graphData?.partNumberWise || [];
  const maxVpd = Math.max(1, ...vpd.map((d: any) => Number(d.total_vehicles)));
  const maxPnw = Math.max(1, ...pnw.map((d: any) => Number(d.total_despatched)));

  return (
    <div className="space-y-6">
      {/* Date range controls */}
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
        <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 text-emerald-700 border-emerald-300 hover:bg-emerald-50" onClick={handleRangeDownload} disabled={downloading}>
          {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          Download Range Excel
        </Button>
      </div>

      {/* Vehicles per day chart */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="font-bold text-white text-sm">Vehicles Despatched Per Day</h3>
        </div>
        <div className="p-5 overflow-x-auto">
          {vpd.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for selected range</p>
          ) : (
            <div className="flex items-end gap-3 min-w-max h-48">
              {vpd.map((d: any, i: number) => {
                const total = Number(d.total_vehicles) || 0;
                const completed = Number(d.completed_vehicles) || 0;
                const dateStr = typeof d.plan_date === 'string' ? d.plan_date : new Date(d.plan_date).toISOString().slice(0,10);
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-slate-700">{total}</span>
                    <div className="w-12 flex flex-col justify-end" style={{ height: '140px' }}>
                      <div className="w-full rounded-t-sm bg-blue-500 transition-all" style={{ height: `${(total/maxVpd)*140}px` }} title={`Total: ${total}`} />
                    </div>
                    <span className="text-[9px] text-slate-500 text-center">{dateStr.slice(5)}</span>
                    <span className="text-[9px] text-green-600">{completed}✓</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Part number wise chart */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-800 to-slate-700">
          <h3 className="font-bold text-white text-sm">Part Number Wise Despatched Pieces</h3>
        </div>
        <div className="p-5 overflow-x-auto">
          {pnw.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No data for selected range</p>
          ) : (
            <div className="space-y-2">
              {pnw.slice(0, 20).map((d: any, i: number) => {
                const val = Number(d.total_despatched) || 0;
                const target = Number(d.total_target) || 0;
                const pct = maxPnw > 0 ? (val / maxPnw) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-mono w-28 truncate text-right text-slate-600">{d.part_number}</span>
                    <div className="flex-1 bg-slate-100 rounded-full h-5 overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all flex items-center justify-end pr-2" style={{ width: `${pct}%` }}>
                        <span className="text-[10px] text-white font-bold">{val}</span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 w-14 text-left">/ {target}</span>
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
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DespatchPlanPage() {
  const { user } = useUser();
  const canEdit = ["admin", "super admin", "production"].includes(user?.role || "");

  const { dropdownOptions, products } = useProducts();
  const customerList = dropdownOptions?.CUSTOMER_OPTIONS || [];

  const [planDate, setPlanDate] = useState(getPlanDate());
  const [vehicles, setVehicles] = useState<Vehicle[]>([makeEmptyVehicle("V1")]);
  const [incompleteFromPrev, setIncompleteFromPrev] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  const [planExists, setPlanExists] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState<"plan"|"graphs">("plan");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Download Matrix Template
  const downloadMatrixTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('DespatchPlan');

    // Headers
    const header = [];
    const subHeader = [];
    for (let i = 1; i <= 8; i++) {
      header.push('Part number', 'TUBE LENGTH', `V${i}`, '');
      subHeader.push('', '', 'CUSTOMER', 'PALLET');
    }
    worksheet.addRow(header);
    worksheet.addRow(subHeader);

    // Styling
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(2).font = { bold: true };

    // Dropdowns and widths
    for (let i = 0; i < 8; i++) {
      const colIdx = 3 + (i * 4);
      const cell = worksheet.getRow(2).getCell(colIdx);
      cell.dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`"${customerList.join(',')}"`],
      };
      worksheet.getColumn(colIdx - 2).width = 18; // Part number
      worksheet.getColumn(colIdx - 1).width = 16; // TUBE LENGTH
      worksheet.getColumn(colIdx).width = 10;     // Qty (V)
      worksheet.getColumn(colIdx + 1).width = 12; // PALLET
    }

    // Sample Data
    const samples = [
      ['FC327100', '1329', 10, 'p1', 'FEA55700', '1100', 5, 'p1'],
    ];
    samples.forEach(s => worksheet.addRow(s));

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'despatch_plan_template.xlsx');
    toast.success("Matrix template downloaded");
  };

  // Load plan
  const loadPlan = useCallback(async (date: string) => {
    setLoading(true);
    try {
      const [planRes, dynRes] = await Promise.all([
        api.get(`/despatch-plan?date=${date}`),
        api.get("/dynamic-fields"),
      ]);
      setCustomerOptions(dynRes.data.data?.customer_names || []);
      setIncompleteFromPrev(planRes.data.incompleteFromPrev || []);

      const plan: DespatchPlan | null = planRes.data.plan;

      if (plan) {
        setPlanExists(true);
        setVehicles(plan.vehicles.map(v => ({
          ...v,
          pallets: (v.pallets || []).map(p => ({
            ...p,
            part_number: p.part_number || "",
            tube_length: p.tube_length || "",
          })),
        })));
      } else {
        setPlanExists(false);
        setIsEditing(false);
        setVehicles([makeEmptyVehicle("V1")]);
      }
    } catch { toast.error("Failed to load plan"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadPlan(planDate);
  }, [planDate, loadPlan]);

  // Auto-refresh plan every 30s in read-only mode to pick up filled_quantity updates from scans
  useEffect(() => {
    if (!planExists || isEditing) return;
    const interval = setInterval(() => loadPlan(planDate), 30000);
    return () => clearInterval(interval);
  }, [planExists, isEditing, planDate, loadPlan]);


  // displayedVehicles: in read-only mode, use backend data directly (backend manages filled_quantity & is_fulfilled)
  const displayedVehicles = useMemo(() => {
    if (!planExists || isEditing) return vehicles;
    return vehicles; // backend already has correct filled_quantity & is_fulfilled
  }, [vehicles, planExists, isEditing]);

  // handlePriorityChange: inline priority update from table
  const handlePriorityChange = useCallback(async (vehicleId: number, priority: number | null) => {
    try {
      await api.patch(`/despatch-plan/vehicles/${vehicleId}/priority`, { priority_number: priority });
      toast.success("Priority updated");
      loadPlan(planDate); // reload so backend re-orders by priority
    } catch { toast.error("Failed to update priority"); }
  }, [planDate, loadPlan]);

  const addVehicle = () => {
    const nextLabel = `V${vehicles.length + 1}`;
    setVehicles(prev => [...prev, makeEmptyVehicle(nextLabel)]);
  };
  const removeVehicle = (idx: number) => setVehicles(prev => prev.filter((_, i) => i !== idx));
  const updateVehicle = (idx: number, v: Vehicle) =>
    setVehicles(prev => { const next = [...prev]; next[idx] = v; return next; });

  const handleSave = async () => {
    const invalidPallets: string[] = [];
    const validPartNumbers = new Set(
      (products || []).map((p: any) => (p.part_number || p.partNumber || "").trim().toUpperCase())
    );

    const checkedVehicles = vehicles.map(v => ({
      ...v,
      pallets: v.pallets.map(p => {
        const pn = (p.part_number || "").trim();
        const isInvalid = !!(pn && !validPartNumbers.has(pn.toUpperCase()));
        if (isInvalid) invalidPallets.push(`${v.vehicle_label}/${p.pallet_label || pn}`);
        return { ...p, invalid: isInvalid };
      }),
    }));
    setVehicles(checkedVehicles);

    if (invalidPallets.length > 0) {
      toast.error(`Invalid part numbers found: ${invalidPallets.join(", ")}. Please correct before saving.`);
      return;
    }

    setSaving(true);
    try {
      await api.post("/despatch-plan/save", { plan_date: planDate, vehicles });
      toast.success("Plan saved");
      setIsEditing(false);
      loadPlan(planDate);
    } catch (e: any) { toast.error(e.response?.data?.message || "Save failed"); }
    finally { setSaving(false); }
  };



  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await api.get(`/despatch-plan/export?date=${planDate}`, { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `despatch_plan_${planDate}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Export failed"); }
    finally { setExporting(false); }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // raw[0] = Row1: Part Number | Tube Length | V1 | (blank) | V2 | (blank) ...
        // raw[1] = Row2: (blank) | (blank) | Customer | Pallet | Customer | Pallet ...
        // raw[2+] = data: part_number | tube_length | target_qty | pallet_label | ...
        const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (raw.length < 3) return toast.error("File is empty or invalid structure");

        const vehicleMap: Record<string, Vehicle> = {};
        const vehicleOrder: string[] = [];

        // Detect how many vehicle groups (4 cols each) exist
        let col = 0;
        while (col < (raw[0]?.length || 0)) {
          const vLabel = String(raw[0][col + 2] || "").trim();
          const customer = String(raw[1]?.[col + 2] || "").trim();
          
          if (vLabel.startsWith("V") && customer && customer.toUpperCase() !== "CUSTOMER") {
            vehicleMap[vLabel] = { vehicle_label: vLabel, customer, priority_number: null, is_completed: false, pallets: [] };
            vehicleOrder.push(vLabel);
          }
          col += 4;
        }

        // Parse data rows
        for (let ri = 2; ri < raw.length; ri++) {
          const row = raw[ri];
          if (!row || row.length === 0) continue;

          let col = 0;
          while (col < row.length) {
            const vLabel = String(raw[0][col + 2] || "").trim();
            if (vLabel.startsWith("V") && vehicleMap[vLabel]) {
              const partNumber = String(row[col] || "").trim();
              const tubeLength = String(row[col + 1] || "").trim();
              const targetQty = parseInt(String(row[col + 2])) || 0;
              const palletLabel = String(row[col + 3] || "").trim();

              if (partNumber && targetQty > 0) {
                vehicleMap[vLabel].pallets.push({
                  pallet_label: palletLabel || `p${vehicleMap[vLabel].pallets.length + 1}`,
                  part_number: partNumber,
                  tube_length: tubeLength,
                  target_qty: targetQty,
                  scanned_qty: 0,
                  filled_quantity: 0,
                  is_fulfilled: false,
                });
              }
            }
            col += 4;
          }
        }

        const imported = vehicleOrder.map(l => vehicleMap[l]).filter(Boolean);
        if (!imported.length) return toast.error("No valid vehicle/pallet data found");

        setVehicles(imported);
        setPlanExists(false);
        setIsEditing(true);
        toast.success(`Imported ${imported.length} vehicles`);
      } catch (e) {
        console.error(e);
        toast.error("Failed to parse Excel file");
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const grandTotal = useMemo(() =>
    vehicles.reduce((s, v) => s + v.pallets.reduce((ps, p) => ps + (p.target_qty || 0), 0), 0), [vehicles]);
  const completedCount = vehicles.filter(v => v.is_completed).length;

  return (
    <DashboardLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Truck className="w-6 h-6 text-blue-600" /> Despatch Plan
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {completedCount}/{vehicles.length} vehicles complete · Grand Total: {grandTotal} units
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Main Tab Toggle */}
            <div className="flex items-center rounded-lg border overflow-hidden h-9 divide-x text-xs font-semibold">
              <button onClick={() => setActiveMainTab("plan")} className={`px-3 h-full transition-colors ${activeMainTab === "plan" ? "bg-slate-800 text-white" : "bg-background text-muted-foreground hover:bg-muted/60"}`}>Plan</button>
              <button onClick={() => setActiveMainTab("graphs")} className={`px-3 h-full transition-colors flex items-center gap-1 ${activeMainTab === "graphs" ? "bg-slate-800 text-white" : "bg-background text-muted-foreground hover:bg-muted/60"}`}><BarChart2 className="w-3 h-3" />Graphs</button>
            </div>

            {/* Plan-tab-only controls */}
            {activeMainTab === "plan" && (
              <>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)} className="text-sm border rounded-md px-3 py-1.5 h-9" />
            {/* Import */}
            {canEdit && (!planExists || isEditing) && (
              <>
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5"
                  onClick={() => fileInputRef.current?.click()}>
                  <Upload className="w-3.5 h-3.5" /> Import Excel
                </Button>
                <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5"
                  onClick={downloadMatrixTemplate}>
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Template
                </Button>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
              </>
            )}

            {/* Export */}
            <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5"
              onClick={handleExport} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Export Excel
            </Button>

            {canEdit && planExists && !isEditing && (
              <Button size="sm" variant="outline" className="h-9 text-xs gap-1.5 text-blue-600 hover:text-blue-700 border-blue-300"
                onClick={() => setIsEditing(true)}>
                Edit Plan
              </Button>
            )}

            {canEdit && (!planExists || isEditing) && (
              <Button size="sm" className="h-9 text-xs gap-1.5"
                onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Plan
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
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" />In Progress</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-500 inline-block" />Complete</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-200 border border-green-400 inline-block" />Pallet Fulfilled</span>
              {planExists && (
                <span className="flex items-center gap-1.5 ml-auto text-amber-700 font-medium">
                  🔒 Viewing saved plan — Syncing with today's scans automatically
                </span>
              )}
            </div>

            {/* Previous day incomplete */}
            <IncompleteBanner vehicles={incompleteFromPrev} />

            {loading ? (
              <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading despatch plan...
              </div>
            ) : planExists && !isEditing ? (
              <div className="space-y-4">
                <PlanTable vehicles={displayedVehicles} onPriorityChange={handlePriorityChange} />
              </div>
            ) : (
              <div className="bg-white border rounded-xl shadow-sm p-4">
                <div className="flex gap-3 overflow-x-auto pb-2 items-start">
                  {vehicles.map((v, idx) => (
                    <VehicleCard key={idx} idx={idx} vehicle={v} canEdit={canEdit} customerOptions={customerList} onChange={nv => updateVehicle(idx, nv)} onRemove={() => removeVehicle(idx)} />
                  ))}
                  {canEdit && (
                    <div className="flex flex-col items-center justify-start pt-2 min-w-[90px]">
                      <Button variant="outline" size="sm" className="h-10 w-10 p-0 rounded-full border-2 border-dashed border-blue-400 text-blue-500 hover:bg-blue-50" onClick={addVehicle}><Plus className="w-5 h-5" /></Button>
                      <span className="text-xs text-muted-foreground mt-1">Add Vehicle</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
