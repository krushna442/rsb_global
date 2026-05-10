"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import api from "@/lib/api";
import { useUser } from "@/contexts/UserContext";
import { Loader2, Calendar as CalendarIcon, Save, Plus, Download } from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────
interface RecordRow {
  id?: number;
  production_date: string;
  hour_slot: number;
  part_type: "front" | "rear" | "ia";
  tube_length: string;
  quantity: number;
  remarks: string;
  isNew?: boolean;
}

const PART_TYPES = ["front", "rear", "ia"] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i + 6);

const formatHour = (h: number) => {
  const ampm = h % 24 < 12 ? "AM" : "PM";
  let hour = h % 12;
  if (hour === 0) hour = 12;
  return `${hour}:00 ${ampm}`;
};

const partConfig = [
  { key: "front" as const, label: "Front", color: "text-orange-700", bg: "bg-orange-50", headerBg: "bg-orange-100", chartColor: "#ea580c" },
  { key: "rear"  as const, label: "Rear",  color: "text-blue-700",   bg: "bg-blue-50",   headerBg: "bg-blue-100",   chartColor: "#2563eb" },
  { key: "ia"    as const, label: "IA",    color: "text-emerald-700", bg: "bg-emerald-50", headerBg: "bg-emerald-100", chartColor: "#059669" },
];

const subCols = [
  { key: "tube_length", label: "Tube Length", width: "min-w-[130px]" },
  { key: "quantity",    label: "Quantity",    width: "min-w-[90px]"  },
  { key: "remarks",     label: "Remarks",     width: "min-w-[160px]" },
];

export default function HourlyProductionPage() {
  const { user } = useUser();
  const canEdit = ["admin", "super admin", "production"].includes(user?.role || "");
  const isAdmin  = ["admin", "super admin"].includes(user?.role || "");

  // ── active tab ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"daily" | "cumulative">("daily");

  // ── daily entry state ────────────────────────────────────────────────────────
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // ── cumulative state ─────────────────────────────────────────────────────────
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [summaryCum, setSummaryCum] = useState({ front: 0, rear: 0, ia: 0 });
  const [loadingSummary, setLoadingSummary] = useState(false);

  // ── loaders ──────────────────────────────────────────────────────────────────
  const loadDaily = useCallback(async (d: string) => {
    setLoading(true);
    setDeletedIds([]);
    try {
      const res = await api.get(`/hourly-production?date=${d}`);
      setRecords(res.data.data || []);
    } catch { toast.error("Failed to load records for this date"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDaily(date); }, [date, loadDaily]);

  const loadSummary = useCallback(async (ym: string) => {
    const [year, month] = ym.split("-");
    if (!year || !month) return;
    setLoadingSummary(true);
    try {
      const res = await api.get(`/hourly-production/monthly?year=${year}&month=${month}`);
      setSummaryData(res.data.data || []);
      setSummaryCum(res.data.cumulative || { front: 0, rear: 0, ia: 0 });
    } catch { toast.error("Failed to load monthly summary"); }
    finally { setLoadingSummary(false); }
  }, []);

  useEffect(() => { loadSummary(summaryMonth); }, [summaryMonth, loadSummary]);

  // ── daily helpers ─────────────────────────────────────────────────────────────
  const getRecords = useCallback(
    (hour_slot: number, part_type: "front" | "rear" | "ia"): RecordRow[] => {
      const filtered = records.filter((r) => r.hour_slot === hour_slot && r.part_type === part_type);
      if (filtered.length === 0) {
        return [{ production_date: date, hour_slot, part_type, tube_length: "", quantity: 0, remarks: "", isNew: true }];
      }
      return filtered;
    },
    [records, date]
  );

  const handleUpdate = (
    hour_slot: number, part_type: "front" | "rear" | "ia",
    index: number, field: keyof RecordRow, val: any
  ) => {
    if (!canEdit) return;
    setRecords((prev) => {
      const filtered = prev.filter((r) => r.hour_slot === hour_slot && r.part_type === part_type);
      if (index < filtered.length) {
        const mainIdx = prev.indexOf(filtered[index]);
        if (mainIdx >= 0) {
          const copy = [...prev];
          copy[mainIdx] = { ...copy[mainIdx], [field]: val };
          return copy;
        }
      } else {
        return [...prev, { production_date: date, hour_slot, part_type, tube_length: "", quantity: 0, remarks: "", isNew: true, [field]: val }];
      }
      return prev;
    });
  };

  const handleAddRow = (hour_slot: number, part_type: "front" | "rear" | "ia") => {
    if (!canEdit) return;
    setRecords((prev) => [...prev, { production_date: date, hour_slot, part_type, tube_length: "", quantity: 0, remarks: "", isNew: true }]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const id of deletedIds) await api.delete(`/hourly-production/${id}`);
      for (const r of records) {
        if (r.isNew) {
          if (r.tube_length || r.quantity > 0 || r.remarks) {
            await api.post("/hourly-production", { production_date: date, hour_slot: r.hour_slot, part_type: r.part_type, tube_length: r.tube_length, quantity: r.quantity, remarks: r.remarks });
          }
        } else if (r.id) {
          await api.put(`/hourly-production/${r.id}`, { tube_length: r.tube_length, quantity: r.quantity, remarks: r.remarks });
        }
      }
      toast.success("Saved successfully");
      loadDaily(date);
      loadSummary(summaryMonth);
    } catch { toast.error("Failed to save changes"); }
    finally { setSaving(false); }
  };

  const dailySums = useMemo(() => {
    const sums = { front: 0, rear: 0, ia: 0, total: 0 };
    records.forEach((r) => { sums[r.part_type] += Number(r.quantity) || 0; sums.total += Number(r.quantity) || 0; });
    return sums;
  }, [records]);

  // ── chart data ────────────────────────────────────────────────────────────────
  const chartData = useMemo(() =>
    summaryData.map((row) => ({
      date: new Date(row.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      Front: row.front,
      Rear: row.rear,
      IA: row.ia,
      Total: row.front + row.rear + row.ia,
    })),
    [summaryData]
  );

  // ── tab styles ────────────────────────────────────────────────────────────────
  const tabCls = (t: "daily" | "cumulative") =>
    `px-5 py-2 text-sm font-semibold rounded-t-lg transition-all border-b-2 ${
      activeTab === t
        ? "border-primary text-primary bg-white shadow-sm"
        : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Hourly Production Board</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Track production hourly across Front, Rear, and IA lines</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {activeTab === "daily" && (
              <>
                <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1.5 shadow-sm">
                  <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  <input type="date" className="text-sm border-none bg-transparent outline-none cursor-pointer" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
                {canEdit && (
                  <Button onClick={handleSave} disabled={loading || saving} className="gap-1.5">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Board
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b">
          <button className={tabCls("daily")} onClick={() => setActiveTab("daily")}>Daily Entry</button>
          <button className={tabCls("cumulative")} onClick={() => setActiveTab("cumulative")}>Cumulative Analysis</button>
        </div>

        {/* ── Daily Entry ── */}
        {activeTab === "daily" && (
          <div className="border rounded-xl shadow-sm bg-white overflow-hidden flex flex-col">
            <div className="px-4 py-3 bg-slate-50 border-b flex flex-wrap justify-between items-center gap-2">
              <h2 className="font-semibold text-slate-700">Daily Entry — {new Date(date + "T00:00:00").toLocaleDateString()}</h2>
              <div className="text-sm flex gap-4 font-medium">
                <span className="text-orange-600">Front: {dailySums.front}</span>
                <span className="text-blue-600">Rear: {dailySums.rear}</span>
                <span className="text-emerald-600">IA: {dailySums.ia}</span>
                <span className="text-slate-800 font-bold ml-2">Total: {dailySums.total}</span>
              </div>
            </div>
            <div className="overflow-x-auto overflow-y-auto max-h-[600px]">
              {loading ? (
                <div className="flex justify-center items-center py-20 text-muted-foreground gap-2">
                  <Loader2 className="w-6 h-6 animate-spin" /> Loading data...
                </div>
              ) : (
                <table className="text-sm border-collapse" style={{ minWidth: "1100px", width: "100%" }}>
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-100">
                      <th rowSpan={2} className="px-4 py-3 border border-slate-200 text-left font-semibold text-slate-700 bg-slate-100 whitespace-nowrap align-middle min-w-[120px]">Time Slot</th>
                      {partConfig.map((pt) => (
                        <th key={pt.key} colSpan={subCols.length} className={`px-4 py-2 border border-slate-200 text-center font-bold ${pt.color} ${pt.headerBg}`}>{pt.label}</th>
                      ))}
                    </tr>
                    <tr className="bg-slate-50">
                      {partConfig.map((pt) => subCols.map((sc) => (
                        <th key={`${pt.key}-${sc.key}`} className={`px-3 py-2 border border-slate-200 text-center font-medium text-slate-600 ${sc.width}`}>{sc.label}</th>
                      )))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {HOURS.map((hour, rowIdx) => {
                      const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/60";
                      return (
                        <tr key={hour} className={`${rowBg} hover:bg-slate-100/70 transition-colors`}>
                          <td className="px-4 py-2 border border-slate-200 font-medium text-slate-600 whitespace-nowrap align-middle">
                            <span className="font-semibold">{formatHour(hour)}</span>
                            <span className="text-muted-foreground text-xs block">–{formatHour(hour + 1)}</span>
                          </td>
                          {partConfig.map((pt) => {
                            const recs = getRecords(hour, pt.key);
                            return (
                              <React.Fragment key={pt.key}>
                                <td className={`px-2 py-1.5 border border-slate-200 ${pt.bg}/30`}>
                                  {recs.map((rec, idx) => (
                                    <Input key={idx} value={rec.tube_length} onChange={(e) => handleUpdate(hour, pt.key, idx, "tube_length", e.target.value)} disabled={!canEdit} className="h-8 text-xs w-full mb-1 last:mb-0" placeholder="—" />
                                  ))}
                                </td>
                                <td className={`px-2 py-1.5 border border-slate-200 ${pt.bg}/30`}>
                                  {recs.map((rec, idx) => (
                                    <Input key={idx} type="number" min="0" value={rec.quantity || ""} onChange={(e) => handleUpdate(hour, pt.key, idx, "quantity", parseInt(e.target.value) || 0)} disabled={!canEdit} className="h-8 text-xs w-full mb-1 last:mb-0" placeholder="0" />
                                  ))}
                                </td>
                                <td className={`px-2 py-1.5 border border-slate-200 ${pt.bg}/30`}>
                                  {recs.map((rec, idx) => (
                                    <div key={idx} className="flex gap-1 items-center mb-1 last:mb-0">
                                      <Input value={rec.remarks} onChange={(e) => handleUpdate(hour, pt.key, idx, "remarks", e.target.value)} disabled={!canEdit} className="h-8 text-xs w-full" placeholder="—" />
                                      {idx === recs.length - 1 && canEdit && (
                                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleAddRow(hour, pt.key)}>
                                          <Plus className="w-4 h-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </td>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-semibold">
                      <td className="px-4 py-3 border border-slate-700 text-right text-xs uppercase tracking-wide">Day Total</td>
                      {partConfig.map((pt) => (
                        <React.Fragment key={pt.key}>
                          <td className="px-3 py-3 border border-slate-700 text-center text-xs text-slate-400">—</td>
                          <td className="px-3 py-3 border border-slate-700 text-center font-bold">{dailySums[pt.key]}</td>
                          <td className="px-3 py-3 border border-slate-700 text-center text-xs text-slate-400">—</td>
                        </React.Fragment>
                      ))}
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}

        {/* ── Cumulative Tab ── */}
        {activeTab === "cumulative" && (
          <div className="space-y-6">
            {/* Month picker */}
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-700">Monthly Cumulative Summary</h2>
              <div className="flex items-center gap-2">
                <Input type="month" className="h-8 text-sm w-40" value={summaryMonth} onChange={(e) => setSummaryMonth(e.target.value)} />
                <Button variant="outline" size="sm" className="h-8 gap-1.5"><Download className="w-3.5 h-3.5" />Export</Button>
              </div>
            </div>

            {loadingSummary ? (
              <div className="flex justify-center py-20 text-muted-foreground gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> Loading...
              </div>
            ) : summaryData.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-16 border border-dashed rounded-xl">
                No data available for this month.
              </p>
            ) : (
              <>
                {/* Cumulative KPI cards */}
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { label: "Front", value: summaryCum.front, color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
                    { label: "Rear",  value: summaryCum.rear,  color: "text-blue-700",   bg: "bg-blue-50 border-blue-200"   },
                    { label: "IA",    value: summaryCum.ia,    color: "text-emerald-700", bg: "bg-emerald-50 border-emerald-200" },
                    { label: "Total", value: summaryCum.front + summaryCum.rear + summaryCum.ia, color: "text-slate-800", bg: "bg-slate-50 border-slate-200" },
                  ].map((c) => (
                    <div key={c.label} className={`rounded-xl border p-4 ${c.bg}`}>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{c.label}</p>
                      <p className={`text-3xl font-bold mt-1 ${c.color}`}>{c.value.toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                {/* Bar chart – daily breakdown */}
                <div className="border rounded-xl bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Quantity by Part Type</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      {partConfig.map((pt) => (
                        <Bar key={pt.key} dataKey={pt.label} fill={pt.chartColor} radius={[3, 3, 0, 0]} maxBarSize={28} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Line chart – daily total trend */}
                <div className="border rounded-xl bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Daily Total Trend</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      {partConfig.map((pt) => (
                        <Line key={pt.key} type="monotone" dataKey={pt.label} stroke={pt.chartColor} strokeWidth={1.5} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Table */}
                <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-2 border-r text-left text-xs font-semibold text-muted-foreground">Date</th>
                        <th className="px-4 py-2 border-r text-right text-xs font-semibold text-orange-700">Front</th>
                        <th className="px-4 py-2 border-r text-right text-xs font-semibold text-blue-700">Rear</th>
                        <th className="px-4 py-2 border-r text-right text-xs font-semibold text-emerald-700">IA</th>
                        <th className="px-4 py-2 text-right text-xs font-semibold text-slate-700">Day Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {summaryData.map((row, i) => (
                        <tr key={row.date} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                          <td className="px-4 py-2 border-r text-xs">{new Date(row.date + "T00:00:00").toLocaleDateString("en-IN")}</td>
                          <td className="px-4 py-2 border-r text-right text-xs">{row.front}</td>
                          <td className="px-4 py-2 border-r text-right text-xs">{row.rear}</td>
                          <td className="px-4 py-2 border-r text-right text-xs">{row.ia}</td>
                          <td className="px-4 py-2 text-right text-xs font-medium">{row.front + row.rear + row.ia}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-800 text-white font-semibold">
                      <tr>
                        <td className="px-4 py-3 border-r border-slate-700 text-xs uppercase tracking-wide">Cumulative Total</td>
                        <td className="px-4 py-3 border-r border-slate-700 text-right">{summaryCum.front}</td>
                        <td className="px-4 py-3 border-r border-slate-700 text-right">{summaryCum.rear}</td>
                        <td className="px-4 py-3 border-r border-slate-700 text-right">{summaryCum.ia}</td>
                        <td className="px-4 py-3 text-right">{summaryCum.front + summaryCum.rear + summaryCum.ia}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}