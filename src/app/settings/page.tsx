"use client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Bell, Shield, Globe, Palette, Database } from "lucide-react";

export default function SettingsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-3xl">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage system preferences and configuration</p>
                </div>

                {/* Profile */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Shield className="w-4 h-4 text-blue-600" /></div><div><CardTitle className="text-sm font-semibold">Profile Settings</CardTitle><p className="text-xs text-muted-foreground">Update your personal information</p></div></div></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Full Name</Label><Input defaultValue="Anil Kumar" className="h-9 text-sm" /></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Email</Label><Input defaultValue="anil.kumar@factory.com" className="h-9 text-sm" /></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Phone</Label><Input defaultValue="+91 98765 43210" className="h-9 text-sm" /></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Department</Label><Input defaultValue="Quality Assurance" className="h-9 text-sm" /></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Notifications */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center"><Bell className="w-4 h-4 text-orange-600" /></div><div><CardTitle className="text-sm font-semibold">Notifications</CardTitle><p className="text-xs text-muted-foreground">Configure notification preferences</p></div></div></CardHeader>
                    <CardContent className="space-y-4">
                        {["Email notifications for approvals", "SMS alerts for rejections", "Daily summary reports", "Real-time production alerts"].map((item) => (
                            <div key={item} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                                <span className="text-sm">{item}</span>
                                <button className="w-10 h-5 bg-primary rounded-full relative transition-colors"><div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" /></button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* System Preferences */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><Palette className="w-4 h-4 text-violet-600" /></div><div><CardTitle className="text-sm font-semibold">System Preferences</CardTitle><p className="text-xs text-muted-foreground">Configure system-wide settings</p></div></div></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Language</Label><Select defaultValue="en"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Timezone</Label><Select defaultValue="ist"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ist">IST (UTC+5:30)</SelectItem><SelectItem value="utc">UTC</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Date Format</Label><Select defaultValue="dmy"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="dmy">DD/MM/YYYY</SelectItem><SelectItem value="mdy">MM/DD/YYYY</SelectItem></SelectContent></Select></div>
                            <div className="space-y-1.5"><Label className="text-xs font-medium">Measurement Unit</Label><Select defaultValue="metric"><SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="metric">Metric (mm)</SelectItem><SelectItem value="imperial">Imperial (in)</SelectItem></SelectContent></Select></div>
                        </div>
                    </CardContent>
                </Card>

                {/* Data Management */}
                <Card className="border-0 shadow-sm">
                    <CardHeader><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center"><Database className="w-4 h-4 text-teal-600" /></div><div><CardTitle className="text-sm font-semibold">Data Management</CardTitle><p className="text-xs text-muted-foreground">Backup and data export options</p></div></div></CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium">Export All Data</p><p className="text-xs text-muted-foreground">Download complete database as CSV</p></div><Button variant="outline" size="sm" className="h-8 text-xs">Export</Button></div>
                        <Separator />
                        <div className="flex items-center justify-between py-2"><div><p className="text-sm font-medium">Backup Database</p><p className="text-xs text-muted-foreground">Last backup: 10 Mar 2026, 2:30 AM</p></div><Button variant="outline" size="sm" className="h-8 text-xs">Backup Now</Button></div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pb-6">
                    <Button size="sm" className="h-9 gap-1.5 text-xs"><Save className="w-3.5 h-3.5" /> Save Changes</Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
