"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Package,
    CheckCircle2,
    XCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Download
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import * as XLSX from "xlsx";

const formatDateTime = (dateString?: string, onlyDate = false) => {
    if (!dateString) return "-";
    const cleanDate = dateString.endsWith('Z') ? dateString.slice(0, -1) : dateString;
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, '0');
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    if (onlyDate) return `${day} ${month} ${year}`;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strTime = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;

    return `${day} ${month} ${year}, ${strTime}`;
};

// ── Excel date label helper ────────────────────────────────────────────────────
const getExcelDateLabel = (
    dateFilter: string,
    fromDate: string,
    toDate: string
): string => {
    const fmt = (iso: string) => {
        if (!iso) return "";
        const [y, m, d] = iso.split("-");
        const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        return `${d} ${months[Number(m) - 1]} ${y}`;
    };

    const today = new Date();
    const todayStr = fmt(today.toISOString().split("T")[0]);

    if (dateFilter === "today" || dateFilter === "default") return `${todayStr} to ${todayStr}`;
    if (dateFilter === "this_month") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        return `${fmt(firstDay.toISOString().split("T")[0])} to ${todayStr}`;
    }
    if (dateFilter === "custom") {
        const from = fromDate ? fmt(fromDate) : "Start";
        const to   = toDate   ? fmt(toDate)   : "End";
        return `${from} to ${to}`;
    }
    return `All Dates`;
};

export default function ScannedProductsPage() {
    const { scannedProducts, scanStats, meta, loading, fetchScannedProducts, fetchScanStats } = useScannedProducts();
    const [dateFilter, setDateFilter] = useState("default");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [isExporting, setIsExporting] = useState(false);
    const initialMount = useRef(true);

    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }

        const options: any = { page: currentPage };

        if (searchQuery) options.part_no = searchQuery;

        if (dateFilter === "today") options.today = true;
        else if (dateFilter === "this_month") options.this_month = true;
        else if (dateFilter === "custom") {
            if (fromDate) options.from_date = fromDate;
            if (toDate) options.to_date = toDate;
        } else if (dateFilter === "default") {
            options.today = true;
        }

        fetchScannedProducts(options);

        if (dateFilter === "default") {
            fetchScanStats({ this_month: true });
        } else {
            fetchScanStats({ today: options.today, this_month: options.this_month, from_date: options.from_date, to_date: options.to_date });
        }
    }, [dateFilter, fromDate, toDate, currentPage, searchQuery, fetchScannedProducts, fetchScanStats]);

    // ── Excel export ───────────────────────────────────────────────────────────
    const handleDownloadExcel = async () => {
        setIsExporting(true);
        try {
            // Fetch ALL pages for the current filter (no page limit)
            const options: any = { limit: 9999 };
            if (searchQuery) options.part_no = searchQuery;
            if (dateFilter === "today" || dateFilter === "default") options.today = true;
            else if (dateFilter === "this_month") options.this_month = true;
            else if (dateFilter === "custom") {
                if (fromDate) options.from_date = fromDate;
                if (toDate) options.to_date = toDate;
            }

            // Re-use the context fetch but grab all records
            // We call the API directly here to get unpaginated data
            const allData = await fetchScannedProducts({ ...options, page: 1, exportAll: true });

            // Flatten each record into a row
            const rows = (allData ?? scannedProducts).map((scan: any, idx: number) => ({
                "Sr No.":          scan.sl_no || idx + 1,
                "Shift":           scan.shift || "-",
                "Scanned Date":    formatDateTime(scan.created_at),
                "Customer Name":   scan.customer_name || "-",
                "Vendor Code":     scan.vendorCode || "-",
                "Plant Code":      "25100",
                "Part No.":        scan.part_no || "-",
                "Plant Location":  scan.plant_location || "-",
                "Part SL No.":     scan.part_sl_no || "-",
                "Scanned Text":    scan.scanned_text || "-",
                "Product Type":    scan.product_type || "-",
                "Validation Status": scan.validation_status?.toUpperCase() || "-",
                "Is Rejected?":    scan.is_rejected ? "Yes" : "No",
                "Remarks":         scan.remarks || "-",
                "Created By":      scan.created_by || "System",
            }));

            const ws = XLSX.utils.json_to_sheet(rows);

            // Auto column widths
            const colWidths = Object.keys(rows[0] ?? {}).map(key => ({
                wch: Math.max(key.length, ...rows.map((r: any) => String(r[key] ?? "").length)) + 2,
            }));
            ws["!cols"] = colWidths;

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Scanned Report");

            const dateLabel = getExcelDateLabel(dateFilter, fromDate, toDate);
            const fileName = `Scanned Report (${dateLabel}).xlsx`;

            XLSX.writeFile(wb, fileName);
        } catch (err) {
            console.error("Export failed:", err);
            // Fallback: export current page data
            const rows = scannedProducts.map((scan, idx) => ({
                "Sr No.":          scan.sl_no || idx + 1,
                "Shift":           scan.shift || "-",
                "Scanned Date":    formatDateTime(scan.created_at),
                "Customer Name":   scan.customer_name || "-",
                "Vendor Code":     scan.vendorCode || "-",
                "Plant Code":      "25100",
                "Part No.":        scan.part_no || "-",
                "Plant Location":  scan.plant_location || "-",
                "Part SL No.":     scan.part_sl_no || "-",
                "Scanned Text":    scan.scanned_text || "-",
                "Product Type":    scan.product_type || "-",
                "Validation Status": scan.validation_status?.toUpperCase() || "-",
                "Is Rejected?":    scan.is_rejected ? "Yes" : "No",
                "Remarks":         scan.remarks || "-",
                "Created By":      scan.created_by || "System",
            }));

            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Scanned Report");

            const dateLabel = getExcelDateLabel(dateFilter, fromDate, toDate);
            XLSX.writeFile(wb, `Scanned Report (${dateLabel}).xlsx`);
        } finally {
            setIsExporting(false);
        }
    };

    // ── Chart data ─────────────────────────────────────────────────────────────
    const pieData = useMemo(() => {
        if (!scanStats) return [];
        return [
            { name: 'Passed', value: scanStats.pass, color: '#10b981' },
            { name: 'Rejected', value: scanStats.rejected, color: '#ef4444' },
            { name: 'Pending', value: Math.max(0, scanStats.total - scanStats.pass - scanStats.rejected), color: '#f59e0b' }
        ].filter(d => d.value > 0);
    }, [scanStats]);

    const lineData = useMemo(() => {
        if (!scannedProducts.length) return [];
        const hourly = scannedProducts.reduce((acc, curr) => {
            if (!curr.created_at) return acc;
            const cleanDate = curr.created_at.endsWith('Z') ? curr.created_at.slice(0, -1) : curr.created_at;
            const d = new Date(cleanDate);
            if (isNaN(d.getTime())) return acc;
            const hour = d.getHours();
            const hourLabel = hour === 0 ? '12AM' : hour < 12 ? `${hour}AM` : hour === 12 ? '12PM' : `${hour - 12}PM`;
            if (!acc[hourLabel]) acc[hourLabel] = { time: hourLabel, count: 0, hourNum: hour };
            acc[hourLabel].count += 1;
            return acc;
        }, {} as Record<string, { time: string, count: number, hourNum: number }>);
        return Object.values(hourly).sort((a, b) => a.hourNum - b.hourNum);
    }, [scannedProducts]);

    const customerData = useMemo(() => {
        const map: Record<string, number> = {};
        scannedProducts.forEach(s => {
            const name = s.customer_name || 'Unknown';
            map[name] = (map[name] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name: name.length > 14 ? name.slice(0, 14) + '…' : name, fullName: name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8);
    }, [scannedProducts]);

    const seriesData = useMemo(() => {
        const map: Record<string, number> = {};
        scannedProducts.forEach(s => {
            const series = s.scanned_specification?.series || 'N/A';
            map[series] = (map[series] || 0) + 1;
        });
        return Object.entries(map)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }, [scannedProducts]);

    const productTypeData = useMemo(() => {
        const map: Record<string, number> = {};
        scannedProducts.forEach(s => {
            const type = (s.product_type || 'Unknown').toUpperCase();
            map[type] = (map[type] || 0) + 1;
        });
        const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185'];
        return Object.entries(map)
            .map(([name, value], i) => ({ name, value, color: colors[i % colors.length] }))
            .sort((a, b) => b.value - a.value);
    }, [scannedProducts]);

    const shiftData = useMemo(() => {
        const map: Record<string, number> = {};
        scannedProducts.forEach(s => {
            const shift = s.shift || 'N/A';
            map[shift] = (map[shift] || 0) + 1;
        });
        const colors: Record<string, string> = { 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#10b981' };
        return Object.entries(map)
            .map(([name, value]) => ({ name: `Shift ${name}`, value, fill: colors[name] || '#94a3b8' }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [scannedProducts]);

    const acceptRejectByType = useMemo(() => {
        const map: Record<string, { accepted: number, rejected: number }> = {};
        scannedProducts.forEach(s => {
            const type = (s.product_type || 'Unknown').toUpperCase();
            if (!map[type]) map[type] = { accepted: 0, rejected: 0 };
            if (s.is_rejected) map[type].rejected += 1;
            else map[type].accepted += 1;
        });
        return Object.entries(map)
            .map(([type, val]) => ({ type, ...val }))
            .sort((a, b) => (b.accepted + b.rejected) - (a.accepted + a.rejected));
    }, [scannedProducts]);

    const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];
    const tooltipStyle = { borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)', fontSize: 12 };

    const totalPages = meta?.total && meta?.limit ? Math.ceil(meta.total / meta.limit) : 1;

    return (
        <DashboardLayout>
            <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Scanned Products Dashboard</h2>
                </div>

                {/* ---------- CHARTS SECTION ---------- */}
                {scanStats && (
                    <div className="space-y-6 print:hidden">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <Card className="border shadow-sm col-span-1 border-border/50 rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-emerald-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                        Validation Summary
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="flex justify-center h-[260px] pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie data={pieData} innerRadius={65} outerRadius={85} paddingAngle={5} dataKey="value">
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip contentStyle={tooltipStyle} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm col-span-1 lg:col-span-2 rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-teal-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-teal-500" />
                                        Daily Verification Logs
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Hourly scan activity</p>
                                </CardHeader>
                                <CardContent className="h-[260px] p-6">
                                    {lineData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={lineData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="time" tick={{fontSize: 11, fill: '#64748b'}} tickMargin={12} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                                <Line type="monotone" dataKey="count" name="Scans" stroke="#0d9488" strokeWidth={3} dot={{ r: 5, fill: "#0d9488", strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 7, fill: "#0d9488", strokeWidth: 0 }} animationDuration={1500} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-sm">No scan activity logged.</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-blue-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                        Customer Distribution
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Top customers by scan count</p>
                                </CardHeader>
                                <CardContent className="h-[280px] p-4 pt-6">
                                    {customerData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={customerData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 10, fill: '#334155'}} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={tooltipStyle} labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''} />
                                                <Bar dataKey="count" name="Scans" radius={[0, 6, 6, 0]} animationDuration={1200}>
                                                    {customerData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-violet-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                                        Series Breakdown
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Product series scan frequency</p>
                                </CardHeader>
                                <CardContent className="h-[280px] p-4 pt-6">
                                    {seriesData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={seriesData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#334155'}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Bar dataKey="count" name="Scans" radius={[6, 6, 0, 0]} animationDuration={1200}>
                                                    {seriesData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-indigo-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-indigo-500" />
                                        Product Type
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Front, Rear, Middle, etc.</p>
                                </CardHeader>
                                <CardContent className="flex justify-center h-[260px] pt-4">
                                    {productTypeData.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={productTypeData} innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                                                    {productTypeData.map((entry, index) => (
                                                        <Cell key={`pt-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={tooltipStyle} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-amber-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-amber-500" />
                                        Shift Distribution
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">A, B, C shift counts</p>
                                </CardHeader>
                                <CardContent className="h-[260px] p-4 pt-2">
                                    {shiftData.length > 0 ? (
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                            {shiftData.map((item) => {
                                                const maxVal = Math.max(...shiftData.map(s => s.value), 1);
                                                const pct = (item.value / maxVal) * 100;
                                                return (
                                                    <div key={item.name} className="w-full">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-xs font-semibold text-slate-700">{item.name}</span>
                                                            <span className="text-xs font-bold" style={{ color: item.fill }}>{item.value}</span>
                                                        </div>
                                                        <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, backgroundColor: item.fill }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </CardContent>
                            </Card>

                            <Card className="border shadow-sm rounded-2xl bg-white overflow-hidden">
                                <CardHeader className="pb-2 border-b bg-gradient-to-r from-rose-50/50 to-transparent">
                                    <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                                        Accept vs Reject
                                    </CardTitle>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">By product type</p>
                                </CardHeader>
                                <CardContent className="h-[260px] p-4 pt-6">
                                    {acceptRejectByType.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={acceptRejectByType} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="type" tick={{fontSize: 10, fill: '#334155'}} axisLine={false} tickLine={false} />
                                                <YAxis tick={{fontSize: 11, fill: '#64748b'}} axisLine={false} tickLine={false} />
                                                <Tooltip contentStyle={tooltipStyle} />
                                                <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                                                <Bar dataKey="accepted" name="Accepted" fill="#10b981" radius={[4, 4, 0, 0]} stackId="stack" />
                                                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} stackId="stack" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400 text-sm">No data</div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card className="border border-border/50 shadow-sm relative overflow-hidden rounded-2xl">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Products Scanned</p>
                                <p className="text-3xl font-extrabold text-slate-800">{loading ? "..." : scanStats?.total || 0}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
                                <Package className="w-7 h-7 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 shadow-sm relative overflow-hidden rounded-2xl">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-emerald-600/80 uppercase tracking-wider">Total PDI (Passed)</p>
                                <p className="text-3xl font-extrabold text-emerald-600">{loading ? "..." : scanStats?.pass || 0}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center border border-emerald-100">
                                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border border-border/50 shadow-sm relative overflow-hidden rounded-2xl">
                        <CardContent className="p-6 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs font-semibold text-red-600/80 uppercase tracking-wider">Rejected</p>
                                <p className="text-3xl font-extrabold text-red-600">{loading ? "..." : scanStats?.rejected || 0}</p>
                            </div>
                            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center border border-red-100">
                                <XCircle className="w-7 h-7 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border border-border/50 shadow-sm rounded-2xl print:hidden overflow-hidden">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-3 bg-slate-50/30">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by part number..."
                                className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if (e.target.value === "") setCurrentPage(1);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") setCurrentPage(1);
                                }}
                            />
                        </div>

                        <select
                            className="h-9 rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="default">Default</option>
                            <option value="all">All Dates</option>
                            <option value="today">Today</option>
                            <option value="this_month">This Month</option>
                            <option value="custom">Custom Range</option>
                        </select>

                        {dateFilter === "custom" && (
                            <div className="flex items-center gap-2">
                                <Input
                                    type="date"
                                    className="h-9 text-sm w-[130px] bg-white border border-input rounded-md px-3"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                />
                                <span className="text-muted-foreground text-xs font-medium">to</span>
                                <Input
                                    type="date"
                                    className="h-9 text-sm w-[130px] bg-white border border-input rounded-md px-3"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                />
                            </div>
                        )}

                        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                            <Filter className="w-3.5 h-3.5" />
                            More Filters
                        </Button>

                        {/* ── Download Excel button ── */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 gap-1.5 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                            onClick={handleDownloadExcel}
                            disabled={isExporting || scannedProducts.length === 0}
                        >
                            <Download className="w-3.5 h-3.5" />
                            {isExporting ? "Exporting…" : "Download Excel"}
                        </Button>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden bg-white">
                    <CardHeader className="pb-0 px-6 pt-6 border-b bg-slate-50/50">
                        <div className="flex items-center justify-between mb-4">
                            <CardTitle className="text-base font-bold text-slate-800">
                                {dateFilter === "today" ? "Today's Scans" :
                                 dateFilter === "this_month" ? "This Month's Scans" :
                                 dateFilter === "default" ? "Today's Scans Overview" :
                                 "Scanned Records"}
                            </CardTitle>
                            <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full">Total: {meta?.total || 0} records</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50 border-b">
                                        {["Sr no.", "Shift", "Scanned Date", "Customer Name", "Vendor Code", "Plant Code", "Part No.", "Plant Location", "Part SL No.", "Scanned Text", "Remarks", "Created By"].map(h => (
                                            <TableHead key={h} className="text-xs font-bold uppercase tracking-wider text-slate-500 h-12 px-4 whitespace-nowrap first:pl-6 last:pr-6">{h}</TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-12 text-muted-foreground font-medium">Loading scans...</TableCell>
                                        </TableRow>
                                    ) : scannedProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-12 text-muted-foreground font-medium">No scanned products found for the selected date.</TableCell>
                                        </TableRow>
                                    ) : (
                                        scannedProducts.map((scan) => (
                                            <TableRow key={scan.id} className="hover:bg-slate-50/50 transition-colors border-b last:border-0">
                                                <TableCell className="pl-6 font-mono text-xs font-medium text-slate-600">{scan.sl_no || scan.id || "-"}</TableCell>
                                                <TableCell className="text-xs font-semibold text-center whitespace-nowrap text-slate-700">{scan.shift || "-"}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">{formatDateTime(scan.created_at)}</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-700 whitespace-nowrap">{scan.customer_name || "-"}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">{scan.vendorCode || "-"}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600 whitespace-nowrap">25100</TableCell>
                                                <TableCell className="text-xs font-semibold text-slate-800 whitespace-nowrap">{scan.part_no || "-"}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">{scan.plant_location || "-"}</TableCell>
                                                <TableCell className="text-xs font-mono font-medium text-slate-700 whitespace-nowrap">{scan.part_sl_no || "-"}</TableCell>
                                                <TableCell className="text-xs font-mono font-medium text-slate-500 max-w-[200px] truncate" title={scan.scanned_text}>{scan.scanned_text || "-"}</TableCell>
                                                <TableCell className="text-xs font-medium text-slate-600 max-w-[200px] truncate" title={scan.remarks}>{scan.remarks || "-"}</TableCell>
                                                <TableCell className="pr-6 text-xs font-medium text-slate-500 whitespace-nowrap">{scan.created_by || "System"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {meta && scannedProducts.length > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                                <p className="text-xs text-muted-foreground">
                                    Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || loading}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>

                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        let pageNum;
                                        if (totalPages <= 5) pageNum = i + 1;
                                        else if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;

                                        return (
                                            <Button
                                                key={pageNum}
                                                variant={currentPage === pageNum ? "default" : "outline"}
                                                size="icon"
                                                className="h-8 w-8 text-xs"
                                                onClick={() => setCurrentPage(pageNum)}
                                                disabled={loading}
                                            >
                                                {pageNum}
                                            </Button>
                                        );
                                    })}

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                        disabled={currentPage === totalPages || loading}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}