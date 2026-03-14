"use client";

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
  Legend,
} from "recharts";

const stats = [
  {
    title: "Total Products",
    value: "2,847",
    change: "+12.5%",
    trend: "up",
    icon: Package,
    color: "from-blue-500 to-blue-600",
    bgLight: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    title: "Pending Approvals",
    value: "142",
    change: "-3.2%",
    trend: "down",
    icon: Clock,
    color: "from-orange-500 to-orange-600",
    bgLight: "bg-orange-50",
    textColor: "text-orange-600",
  },
  {
    title: "Verified Products",
    value: "2,156",
    change: "+8.1%",
    trend: "up",
    icon: CheckCircle2,
    color: "from-emerald-500 to-emerald-600",
    bgLight: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    title: "Rejected Products",
    value: "89",
    change: "+2.4%",
    trend: "up",
    icon: XCircle,
    color: "from-red-500 to-red-600",
    bgLight: "bg-red-50",
    textColor: "text-red-600",
  },
  {
    title: "Production Checks Today",
    value: "324",
    change: "+18.7%",
    trend: "up",
    icon: ClipboardCheck,
    color: "from-violet-500 to-violet-600",
    bgLight: "bg-violet-50",
    textColor: "text-violet-600",
  },
];

const verificationTrend = [
  { month: "Jan", verified: 320, pending: 45, rejected: 12 },
  { month: "Feb", verified: 380, pending: 52, rejected: 18 },
  { month: "Mar", verified: 420, pending: 38, rejected: 15 },
  { month: "Apr", verified: 460, pending: 62, rejected: 22 },
  { month: "May", verified: 510, pending: 48, rejected: 10 },
  { month: "Jun", verified: 540, pending: 55, rejected: 14 },
  { month: "Jul", verified: 580, pending: 42, rejected: 8 },
];

const approvalStats = [
  { name: "Approved", value: 62, color: "#16a34a" },
  { name: "Pending", value: 20, color: "#ea580c" },
  { name: "Rejected", value: 8, color: "#dc2626" },
  { name: "In Review", value: 10, color: "#2563eb" },
];

const productionErrors = [
  { day: "Mon", errors: 4 },
  { day: "Tue", errors: 7 },
  { day: "Wed", errors: 2 },
  { day: "Thu", errors: 5 },
  { day: "Fri", errors: 3 },
  { day: "Sat", errors: 1 },
  { day: "Sun", errors: 0 },
];

const dailyLogs = [
  { time: "6AM", checks: 12 },
  { time: "8AM", checks: 45 },
  { time: "10AM", checks: 78 },
  { time: "12PM", checks: 56 },
  { time: "2PM", checks: 89 },
  { time: "4PM", checks: 67 },
  { time: "6PM", checks: 34 },
  { time: "8PM", checks: 15 },
];

const recentActivity = [
  { part: "DS-1045-A", action: "Verified", user: "Rajesh P.", time: "2 min ago", status: "approved" },
  { part: "TL-2089-C", action: "Pending Approval", user: "Priya M.", time: "15 min ago", status: "pending" },
  { part: "FL-3021-B", action: "Rejected", user: "Anil K.", time: "32 min ago", status: "rejected" },
  { part: "CP-5067-D", action: "QR Scanned", user: "Suresh R.", time: "1 hr ago", status: "info" },
  { part: "BL-7012-E", action: "Document Uploaded", user: "Meena S.", time: "2 hr ago", status: "info" },
];

const statusColors: Record<string, string> = {
  approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-orange-50 text-orange-700 border-orange-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
};

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your manufacturing verification system
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow duration-300">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{stat.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
                    <div className="flex items-center gap-1">
                      {stat.trend === "up" ? (
                        <ArrowUpRight className={`w-3 h-3 ${stat.title === "Rejected Products" ? "text-red-500" : "text-emerald-500"}`} />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                      )}
                      <span className={`text-xs font-medium ${stat.title === "Rejected Products" ? "text-red-500" : stat.trend === "up" ? "text-emerald-500" : "text-emerald-500"
                        }`}>
                        {stat.change}
                      </span>
                      <span className="text-xs text-muted-foreground">vs last month</span>
                    </div>
                  </div>
                  <div className={`w-10 h-10 rounded-xl ${stat.bgLight} flex items-center justify-center`}>
                    <stat.icon className={`w-5 h-5 ${stat.textColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Verification Trend */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-semibold">Verification Trend</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">Monthly verification overview</p>
                </div>
                <Badge variant="secondary" className="text-xs font-medium gap-1">
                  <TrendingUp className="w-3 h-3" />
                  +12.5%
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={verificationTrend}>
                  <defs>
                    <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Area type="monotone" dataKey="verified" stroke="#3b82f6" strokeWidth={2} fill="url(#colorVerified)" />
                  <Area type="monotone" dataKey="pending" stroke="#f97316" strokeWidth={2} fill="url(#colorPending)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Approval Statistics */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Approval Statistics</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Current approval distribution</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={260}>
                  <PieChart>
                    <Pie
                      data={approvalStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      dataKey="value"
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {approvalStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3 flex-1">
                  {approvalStats.map((stat) => (
                    <div key={stat.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.color }} />
                        <span className="text-xs text-muted-foreground">{stat.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{stat.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Production Errors */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Production Errors</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Weekly error count by day</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={productionErrors}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="errors" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Verification Logs */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div>
                <CardTitle className="text-sm font-semibold">Daily Verification Logs</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Today&apos;s hourly check activity</p>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={dailyLogs}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Line type="monotone" dataKey="checks" stroke="#0d9488" strokeWidth={2.5} dot={{ fill: "#0d9488", r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Latest actions across the system</p>
              </div>
              <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent transition-colors">
                View All
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {recentActivity.map((activity, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Package className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.part}</p>
                      <p className="text-xs text-muted-foreground">{activity.action} by {activity.user}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-[10px] ${statusColors[activity.status]}`}>
                      {activity.action}
                    </Badge>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
