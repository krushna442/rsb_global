"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Download, ListChecks, CheckCircle2, AlertTriangle, Eye, Pencil, Copy } from "lucide-react";

const plans = [
    { id: 1, name: "Drive Shaft Assembly — DS Series", parts: ["DS-1045-A", "DS-1046-B"], rev: "Rev 3.2", date: "2026-03-10", status: "Active", checks: 24, owner: "Rajesh P." },
    { id: 2, name: "Propeller Shaft — TL Series", parts: ["TL-2089-C"], rev: "Rev 2.1", date: "2026-03-08", status: "Active", checks: 18, owner: "Priya M." },
    { id: 3, name: "Coupling Shaft — FL Series", parts: ["FL-3021-B"], rev: "Rev 1.5", date: "2026-03-05", status: "Under Review", checks: 15, owner: "Anil K." },
    { id: 4, name: "Balancing Process — CP Series", parts: ["CP-5067-D"], rev: "Rev 4.0", date: "2026-03-01", status: "Active", checks: 32, owner: "Suresh R." },
    { id: 5, name: "Surface Treatment — SH Series", parts: ["SH-8034-F"], rev: "Rev 2.0", date: "2026-02-28", status: "Draft", checks: 12, owner: "Meena S." },
];
const sts: Record<string, string> = { Active: "bg-emerald-50 text-emerald-700 border-emerald-200", "Under Review": "bg-orange-50 text-orange-700 border-orange-200", Draft: "bg-gray-50 text-gray-600 border-gray-200" };

export default function ControlPlanPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Control Plan</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage manufacturing control plans and checkpoints</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs"><Download className="w-3.5 h-3.5" /> Export</Button>
                        <Button size="sm" className="h-9 gap-1.5 text-xs"><Plus className="w-3.5 h-3.5" /> New Control Plan</Button>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[{ l: "Active Plans", v: 3, icon: CheckCircle2, bg: "bg-emerald-50", c: "text-emerald-600" }, { l: "Under Review", v: 1, icon: AlertTriangle, bg: "bg-orange-50", c: "text-orange-600" }, { l: "Total Checkpoints", v: 101, icon: ListChecks, bg: "bg-blue-50", c: "text-blue-600" }].map((s) => (
                        <Card key={s.l} className="border-0 shadow-sm"><CardContent className="p-5 flex items-center gap-4"><div className={`w-11 h-11 rounded-xl ${s.bg} flex items-center justify-center`}><s.icon className={`w-5 h-5 ${s.c}`} /></div><div><p className="text-2xl font-bold">{s.v}</p><p className="text-xs text-muted-foreground">{s.l}</p></div></CardContent></Card>
                    ))}
                </div>
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 px-6 pt-5"><CardTitle className="text-sm font-semibold">All Control Plans</CardTitle></CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader><TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-6">Plan Name</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Parts</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Revision</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Checkpoints</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Owner</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Status</TableHead>
                                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 text-right">Actions</TableHead>
                                </TableRow></TableHeader>
                                <TableBody>
                                    {plans.map((p) => (
                                        <TableRow key={p.id} className="group hover:bg-muted/20 transition-colors">
                                            <TableCell className="pl-6"><p className="text-sm font-medium">{p.name}</p><p className="text-[10px] text-muted-foreground mt-0.5">Updated {new Date(p.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p></TableCell>
                                            <TableCell><div className="flex gap-1 flex-wrap">{p.parts.map((pn) => (<Badge key={pn} variant="secondary" className="text-[10px] font-mono">{pn}</Badge>))}</div></TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{p.rev}</TableCell>
                                            <TableCell><div className="flex items-center gap-1.5"><ListChecks className="w-3.5 h-3.5 text-muted-foreground" /><span className="text-sm font-medium">{p.checks}</span></div></TableCell>
                                            <TableCell className="text-sm">{p.owner}</TableCell>
                                            <TableCell><Badge variant="outline" className={`text-[10px] ${sts[p.status]}`}>{p.status}</Badge></TableCell>
                                            <TableCell className="pr-6"><div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="w-3.5 h-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="w-3.5 h-3.5" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8"><Copy className="w-3.5 h-3.5" /></Button>
                                            </div></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
