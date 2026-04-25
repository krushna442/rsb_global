"use client";

import React, { useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useDashboard } from "@/contexts/DashboardContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { useProducts } from "@/contexts/ProductsContext";

const statusColors: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-orange-50 text-orange-700 border-orange-200",
  fail: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function DashboardPage() {
  const { counts, loading: countsLoading } = useDashboard();
  const { scannedProducts, scanStats, loading: scansLoading } = useScannedProducts();
  const { products, loading: productsLoading } = useProducts();

  const loading = countsLoading || scansLoading || productsLoading;

  // Formatting date natively
  const lastUpdated = useMemo(() => {
    return new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
  }, []);

  // 1. Dynamic Stats Cards
  const stats = useMemo(() => [
    {
      title: "Total Products",
      value: (counts?.total ?? 0).toLocaleString(),
      change: "+0%",
      trend: "up",
      icon: Package,
      bgLight: "bg-blue-50",
      textColor: "text-blue-600",
    },
    {
      title: "Pending Approvals",
      value: (counts?.approval_pending ?? 0).toLocaleString(),
      change: "0%",
      trend: "down",
      icon: Clock,
      bgLight: "bg-orange-50",
      textColor: "text-orange-600",
    },
    {
      title: "Verified Products",
      value: (counts?.approved ?? 0).toLocaleString(),
      change: "+0%",
      trend: "up",
      icon: CheckCircle2,
      bgLight: "bg-emerald-50",
      textColor: "text-emerald-600",
    },
    {
      title: "Rejected Products",
      value: (counts?.rejected ?? 0).toLocaleString(),
      change: "0%",
      trend: "up",
      icon: XCircle,
      bgLight: "bg-red-50",
      textColor: "text-red-600",
    },
    {
      title: "Production Checks This Month",
      value: (scannedProducts?.length ?? 0).toLocaleString(),
      change: "+0%",
      trend: "up",
      icon: ClipboardCheck,
      bgLight: "bg-violet-50",
      textColor: "text-violet-600",
    },
  ], [counts, scannedProducts]);

  // 2. Approval Statistics (Pie Chart)
  const approvalStats = useMemo(() => {
    if (!counts) return [];
    const total = counts.total || 1;
    return [
      { name: "Approved", value: Math.round(((counts.approved ?? 0) / total) * 100), color: "#16a34a" },
      { name: "Pending", value: Math.round(((counts.approval_pending ?? 0) / total) * 100), color: "#ea580c" },
      { name: "Rejected", value: Math.round(((counts.approval_rejected ?? 0) / total) * 100), color: "#dc2626" },
      { name: "In Review", value: Math.round(((counts.qv_pending ?? 0) / total) * 100), color: "#2563eb" },
    ];
  }, [counts]);

  // 3. Live Check Activity (24h starting 6 AM)
  const hourlyLogs = useMemo(() => {
    const hours = [
      "6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM",
      "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM", "9 PM",
      "10 PM", "11 PM", "12 AM", "1 AM", "2 AM", "3 AM", "4 AM", "5 AM"
    ];
    const buckets = hours.map(h => ({ time: h, scans: 0 }));
    
const now = new Date();
const start = new Date();
start.setHours(6, 0, 0, 0);

if (now.getHours() < 6) {
  start.setDate(start.getDate() - 1);
}

const end = new Date(start);
end.setDate(end.getDate() + 1);

scannedProducts?.forEach(scan => {
const raw = scan.created_at;

// Remove UTC interpretation
const date = new Date(raw.replace("Z", ""));

  if (date >= start && date < end) {
    const hour = date.getHours();

    let index = hour - 6;
    if (index < 0) index += 24;

    if (index >= 0 && index < 24) {
      buckets[index].scans++;
    }
  }
});


    return buckets;
  }, [scannedProducts]);

  // 4. Weekly Scanning Performance
  const weeklyPerformance = useMemo(() => {
    const orderedWeekData = [
      { day: "Mon", pass: 0, fail: 0 },
      { day: "Tue", pass: 0, fail: 0 },
      { day: "Wed", pass: 0, fail: 0 },
      { day: "Thu", pass: 0, fail: 0 },
      { day: "Fri", pass: 0, fail: 0 },
      { day: "Sat", pass: 0, fail: 0 },
      { day: "Sun", pass: 0, fail: 0 },
    ];
    const daysMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const now = new Date();
const firstDayOfWeek = new Date(now);
firstDayOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday
firstDayOfWeek.setHours(0,0,0,0);

const lastDayOfWeek = new Date(firstDayOfWeek);
lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 7);

scannedProducts?.forEach(scan => {
  const date = new Date(scan.created_at);

  if (date >= firstDayOfWeek && date < lastDayOfWeek) {
    const dayName = daysMap[date.getDay()];
    const target = orderedWeekData.find(d => d.day === dayName);

    if (target) {
      if (scan.validation_status === 'pass') target.pass++;
      else if (scan.validation_status === 'fail') target.fail++;
    }
  }
});


    return orderedWeekData;
  }, [scannedProducts]);

  // 5. Monthly Trend
  const verificationTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = months[new Date().getMonth()];
    return [
      { month: "Prev", verified: (scanStats?.pass || 0) * 0.8, pending: 20, rejected: 5 },
      { month: currentMonth, verified: scanStats?.pass || 0, pending: scanStats?.total ? scanStats.total - scanStats.pass - scanStats.rejected : 0, rejected: scanStats?.rejected || 0 },
    ];
  }, [scanStats]);

  // NEW: Row 1 - Approval Status Data
  const productionApprovalData = useMemo(() => {
    if (!products) return [];
    const map = { Approved: 0, Pending: 0, Rejected: 0 };
    products.forEach(p => {
      if (p.approved === "approved") map.Approved++;
      else if (p.approved === "rejected") map.Rejected++;
      else map.Pending++;
    });
    return [
      { name: "Approved", value: map.Approved, color: "#10b981" },
      { name: "Pending", value: map.Pending, color: "#f59e0b" },
      { name: "Rejected", value: map.Rejected, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [products]);

  const qualityApprovalData = useMemo(() => {
    if (!products) return [];
    const map = { Approved: 0, Pending: 0, Rejected: 0 };
    products.forEach(p => {
      if (p.quality_verified === "approved") map.Approved++;
      else if (p.quality_verified === "rejected") map.Rejected++;
      else map.Pending++;
    });
    return [
      { name: "Approved", value: map.Approved, color: "#10b981" },
      { name: "Pending", value: map.Pending, color: "#f59e0b" },
      { name: "Rejected", value: map.Rejected, color: "#ef4444" },
    ].filter(d => d.value > 0);
  }, [products]);

  const totalProductData = useMemo(() => {
    if (!products) return [];
    const map = { Active: 0, Draft: 0, Inactive: 0 };
    products.forEach(p => {
      if (p.status === "active") map.Active++;
      else if (p.status === "inactive") map.Inactive++;
      else map.Draft++;
    });
    return [
      { name: "Active (Approved)", value: map.Active, color: "#3b82f6" },
      { name: "Draft (Pending)", value: map.Draft, color: "#8b5cf6" },
      { name: "Inactive", value: map.Inactive, color: "#94a3b8" },
    ].filter(d => d.value > 0);
  }, [products]);

  // NEW: Row 2 - Grouping of Products Data
  const customerGroupData = useMemo(() => {
    if (!products) return [];
    const map: Record<string, number> = {};
    products.forEach(p => {
      const customerStr = p.customer || "Unknown";
      const customers = customerStr.split(',').map(c => c.trim()).filter(Boolean);
      customers.forEach(c => {
        map[c] = (map[c] || 0) + 1;
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b)=>b.value - a.value).slice(0, 6);
  }, [products]);

  const partTypeGroupData = useMemo(() => {
    if (!products) return [];
    const map: Record<string, number> = {};
    products.forEach(p => {
      const t = p.specification?.product_type || p.specification?.productType || p.specification?.partType || "Unknown";
      map[t] = (map[t] || 0) + 1;
    });
    const colors = ["#6366f1","#8b5cf6","#a78bfa","#c084fc","#e879f9","#f472b6","#fb7185"];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })).sort((a,b)=>b.value - a.value).slice(0, 6);
  }, [products]);

  const seriesGroupData = useMemo(() => {
    if (!products) return [];
    const map: Record<string, number> = {};
    products.forEach(p => {
      const s = p.specification?.series || "Unknown";
      map[s] = (map[s] || 0) + 1;
    });
    const colors = ["#3b82f6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"];
    return Object.entries(map).map(([name, value], i) => ({ name, value, color: colors[i % colors.length] })).sort((a,b)=>b.value - a.value).slice(0, 6);
  }, [products]);

  if (loading && !counts) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground font-medium">Synchronizing dashboard data...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your manufacturing verification system
            </p>
          </div>
          <Badge variant="outline" className="w-fit h-7 px-3 bg-background font-medium border-border/50 shadow-sm">
            Last updated: {lastUpdated}
          </Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-300 group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-1.5">
                      <div className={`p-0.5 rounded-full bg-emerald-100`}>
                        {stat.trend === "up" ? (
                          <ArrowUpRight className="w-2.5 h-2.5 text-emerald-600" />
                        ) : (
                          <ArrowDownRight className="w-2.5 h-2.5 text-emerald-600" />
                        )}
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">{stat.change}</span>
                      <span className="text-[10px] text-muted-foreground font-medium">real-time</span>
                    </div>
                  </div>
                  <div className={`w-11 h-11 rounded-2xl ${stat.bgLight} flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Verification Trend</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Scanning Performance comparison </p>
                </div>
                <Badge variant="secondary" className="text-[10px] font-bold gap-1 bg-emerald-50 text-emerald-700 border-emerald-100">
                  <TrendingUp className="w-3 h-3" />
                  STABLE
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={verificationTrend}>
                  <defs>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} 
                  />
                  <Area type="monotone" dataKey="verified" stroke="#3b82f6" strokeWidth={3} fill="url(#colorVerified)" />
                  <Area type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Approval Statistics</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Master data status</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-full md:w-[60%] h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={approvalStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {approvalStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-1 gap-4 w-full md:flex-1">
                  {approvalStats.map((stat) => (
                    <div key={stat.name} className="flex flex-col gap-1 p-2 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-[11px] font-medium text-muted-foreground">{stat.name}</span>
                      </div>
                      <span className="text-lg font-bold pl-4">{stat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Weekly Scanning Performance</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Pass and fail scans by day</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="pass" name="Pass" fill="#10b981" radius={[0, 0, 0, 0]} barSize={20} />
                  <Bar dataKey="fail" name="Fail" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Live Check Activity</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Scans from 6 AM today to 6 AM tomorrow</p>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold border-emerald-200 text-emerald-700 bg-emerald-50">
                  LIVE TRACKING
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={hourlyLogs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} interval={2} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Line 
                    type="monotone" 
                    dataKey="scans" 
                    name="Scans"
                    stroke="#0d9488" 
                    strokeWidth={3} 
                    dot={{ fill: "#0d9488", r: 3, strokeWidth: 1, stroke: "#fff" }} 
                    activeDot={{ r: 5, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Row 1: Approval Status Diagrams */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Production Approval */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Production Status</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Approved vs Rejected (Production)</p>
            </CardHeader>
            <CardContent className="pt-2 flex justify-center h-[260px]">
              {productionApprovalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={productionApprovalData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {productionApprovalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>

          {/* Quality Approval */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quality Status</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Approved vs Rejected (Quality)</p>
            </CardHeader>
            <CardContent className="pt-2 flex justify-center h-[260px]">
              {qualityApprovalData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={qualityApprovalData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {qualityApprovalData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>

          {/* Total Product Status */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Total Product Status</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Overall master status</p>
            </CardHeader>
            <CardContent className="pt-2 flex justify-center h-[260px]">
              {totalProductData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={totalProductData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${(name || '').split(' ')[0]} ${((percent || 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {totalProductData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 2: Grouping of Products */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Wise */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Customer Distribution</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Products grouped by customer</p>
            </CardHeader>
            <CardContent className="pt-2 h-[260px]">
              {customerGroupData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={customerGroupData} layout="vertical" margin={{ top: 0, right: 20, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" name="Products" fill="#3b82f6" radius={[0, 4, 4, 0]} animationDuration={1000} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>

          {/* Part Type Wise */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Part Type Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Front, Rear, IA, Integrated, etc.</p>
            </CardHeader>
            <CardContent className="pt-2 h-[260px]">
              {partTypeGroupData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={partTypeGroupData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" name="Products" radius={[4, 4, 0, 0]} animationDuration={1000}>
                      {partTypeGroupData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>

          {/* Series Wise */}
          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Series Distribution</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Products grouped by series</p>
            </CardHeader>
            <CardContent className="pt-2 h-[260px]">
              {seriesGroupData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={seriesGroupData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#334155" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} cursor={{ fill: "#f8fafc" }} />
                    <Bar dataKey="value" name="Products" radius={[4, 4, 0, 0]} animationDuration={1000}>
                      {seriesGroupData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Data</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
