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

const statusColors: Record<string, string> = {
  pass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-orange-50 text-orange-700 border-orange-200",
  fail: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function DashboardPage() {
  const { counts, loading: countsLoading } = useDashboard();
  const { scannedProducts, scanStats, loading: scansLoading } = useScannedProducts();

  const loading = countsLoading || scansLoading;

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
      value: (counts?.qv_approved ?? 0).toLocaleString(),
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
      title: "Production Checks Today",
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

  // 3. Daily Verification Logs (Hourly Trend)
  const hourlyLogs = useMemo(() => {
    const buckets: Record<string, number> = {
      "6AM": 0, "8AM": 0, "10AM": 0, "12PM": 0, "2PM": 0, "4PM": 0, "6PM": 0, "8PM": 0
    };
    
    scannedProducts?.forEach(scan => {
      const date = new Date(scan.created_at);
      const hour = date.getHours();
      if (hour < 8) buckets["6AM"]++;
      else if (hour < 10) buckets["8AM"]++;
      else if (hour < 12) buckets["10AM"]++;
      else if (hour < 14) buckets["12PM"]++;
      else if (hour < 16) buckets["2PM"]++;
      else if (hour < 18) buckets["4PM"]++;
      else if (hour < 20) buckets["6PM"]++;
      else buckets["8PM"]++;
    });

    return Object.entries(buckets).map(([time, checks]) => ({ time, checks }));
  }, [scannedProducts]);

  // 4. Production Errors
  const weeklyErrors = useMemo(() => {
    return [
      { day: "Mon", errors: 0 },
      { day: "Tue", errors: 0 },
      { day: "Wed", errors: 0 },
      { day: "Thu", errors: 0 },
      { day: "Fri", errors: 0 },
      { day: "Sat", errors: 0 },
      { day: "Today", errors: scanStats?.rejected || 0 },
    ];
  }, [scanStats]);

  // 5. Monthly Trend
  const verificationTrend = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = months[new Date().getMonth()];
    return [
      { month: "Prev", verified: (scanStats?.pass || 0) * 0.8, pending: 20, rejected: 5 },
      { month: currentMonth, verified: scanStats?.pass || 0, pending: scanStats?.total ? scanStats.total - scanStats.pass - scanStats.rejected : 0, rejected: scanStats?.rejected || 0 },
    ];
  }, [scanStats]);

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
                  <p className="text-xs text-muted-foreground mt-0.5">Performance comparison</p>
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
                <CardTitle className="text-sm font-semibold">Production Errors</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Weekly rejection count</p>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={weeklyErrors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Bar dataKey="errors" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Daily Check Activity</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Hourly scan distribution</p>
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
                  <XAxis dataKey="time" tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 500 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }} />
                  <Line 
                    type="monotone" 
                    dataKey="checks" 
                    stroke="#0d9488" 
                    strokeWidth={4} 
                    dot={{ fill: "#0d9488", r: 4, strokeWidth: 2, stroke: "#fff" }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Scan Activity</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Latest logs from production lines</p>
              </div>
              <Badge variant="outline" className="text-xs font-bold bg-muted/50 cursor-pointer hover:bg-accent transition-colors">
                View All Scans
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/30">
              {(scannedProducts?.length ?? 0) === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-muted-foreground">
                  <ClipboardCheck className="w-8 h-8 mb-2 opacity-20" />
                  <p className="text-sm">No scans recorded today</p>
                </div>
              ) : (
                (scannedProducts || []).slice(0, 10).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center group-hover:bg-background transition-colors border border-border/50">
                        <Package className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{activity.part_no}</p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          {activity.customer_name} • <span className="text-foreground/70">{activity.shift} Shift</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="hidden sm:flex flex-col items-end">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">Status</span>
                        <Badge variant="outline" className={`text-[10px] px-2 py-0 h-5 font-bold uppercase ${statusColors[activity.validation_status] || statusColors.info}`}>
                          {activity.validation_status}
                        </Badge>
                      </div>
                      <div className="text-end min-w-[80px]">
                        <p className="text-xs font-bold text-foreground">
                          {new Date(activity.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString('en-IN', { month: 'short', day: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
