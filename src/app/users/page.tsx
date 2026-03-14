"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    MoreHorizontal,
    Pencil,
    Trash2,
    ShieldCheck,
    UserX,
    Users as UsersIcon,
} from "lucide-react";

const users = [
    { id: 1, name: "Anil Kumar", email: "anil.kumar@factory.com", role: "Super Admin", status: "Active", initials: "AK", color: "from-blue-500 to-blue-700" },
    { id: 2, name: "Rajesh Patel", email: "rajesh.patel@factory.com", role: "Admin", status: "Active", initials: "RP", color: "from-violet-500 to-violet-700" },
    { id: 3, name: "Priya Mehta", email: "priya.mehta@factory.com", role: "Quality", status: "Active", initials: "PM", color: "from-emerald-500 to-emerald-700" },
    { id: 4, name: "Suresh Rao", email: "suresh.rao@factory.com", role: "Production", status: "Active", initials: "SR", color: "from-teal-500 to-teal-700" },
    { id: 5, name: "Meena Singh", email: "meena.singh@factory.com", role: "Quality", status: "Active", initials: "MS", color: "from-pink-500 to-pink-700" },
    { id: 6, name: "Vikram Joshi", email: "vikram.joshi@factory.com", role: "Viewer", status: "Inactive", initials: "VJ", color: "from-gray-400 to-gray-600" },
    { id: 7, name: "Deepak Sharma", email: "deepak.sharma@factory.com", role: "Production", status: "Active", initials: "DS", color: "from-orange-500 to-orange-700" },
    { id: 8, name: "Kavita Nair", email: "kavita.nair@factory.com", role: "Admin", status: "Active", initials: "KN", color: "from-cyan-500 to-cyan-700" },
];

const roleBadge: Record<string, string> = {
    "Super Admin": "bg-violet-50 text-violet-700 border-violet-200",
    Admin: "bg-blue-50 text-blue-700 border-blue-200",
    Production: "bg-teal-50 text-teal-700 border-teal-200",
    Quality: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Viewer: "bg-gray-50 text-gray-600 border-gray-200",
};

export default function UsersPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage system users and permissions</p>
                    </div>
                    <Dialog>
                        <DialogTrigger render={<Button size="sm" className="h-9 gap-1.5 text-xs" />}>
                            <Plus className="w-3.5 h-3.5" />
                            Add User
                        </DialogTrigger>
                        <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
                            <div className="bg-[#07859b] text-white px-6 py-3 shrink-0 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">Edit User Detail</h2>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
                                {/* Top Input Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Name</Label>
                                        <Input className="h-9 text-sm bg-white" placeholder="JOHN DOE" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Mobile</Label>
                                        <Input className="h-9 text-sm bg-white" placeholder="67265524266" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                                        <Input type="email" className="h-9 text-sm bg-white" placeholder="john.doe@example.com" />
                                    </div>
                                    
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">UserName</Label>
                                        <Input className="h-9 text-sm bg-white" placeholder="john_doe_001" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Password</Label>
                                        <Input type="password" className="h-9 text-sm bg-white" placeholder="••••••••" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
                                        <Select defaultValue="admin">
                                            <SelectTrigger className="h-9 text-sm bg-white">
                                                <SelectValue placeholder="Select role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="super-admin">Super Admin</SelectItem>
                                                <SelectItem value="admin">Admin</SelectItem>
                                                <SelectItem value="production">Production</SelectItem>
                                                <SelectItem value="quality">Quality</SelectItem>
                                                <SelectItem value="viewer">Viewer</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Access Matrix Layout */}
                                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[400px]">
                                    
                                    {/* Column Name Access Table */}
                                    <div className="lg:col-span-3 border rounded-md shadow-sm bg-white flex flex-col h-full overflow-hidden">
                                        <div className="grid grid-cols-[80px_1fr] bg-slate-100 border-b p-3 font-semibold text-xs text-muted-foreground shrink-0">
                                            <div>Select</div>
                                            <div>Column Name</div>
                                        </div>
                                        <div className="flex-1 overflow-y-auto">
                                            {[
                                                "TubeLength", "Tube_Dia_Thickness", "Series", "TypeOfPart", 
                                                "Noise_Deadener", "Fep_Press_H", "Rear_Housing", "Long_Fork",
                                                "SF_Details", "PDC_Length", "Front_End_Piece", "Flange_Yoke",
                                                "Greaseable_NonGreaseable", "Coupling_Flange", "Coupling_Orientation", 
                                                "CB_Kit", "Loctite_Grade", "Tightening_Torque", "Balancing_RPM", 
                                                "Unbalance_CMG", "Unbalance_GM", "IA_Bellow", "Total_Length", 
                                                "Rear_Slip", "Mod_No", "Vendor_Code", "Customer_Name", "DWG_Weight"
                                            ].map((col, idx) => (
                                                <div key={col} className={`grid grid-cols-[80px_1fr] p-3 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                    <div className="pl-2">
                                                        <Checkbox defaultChecked className="h-4 w-4 bg-blue-500 border-blue-500 text-white data-[state=checked]:bg-blue-500" />
                                                    </div>
                                                    <div className="text-muted-foreground">{col}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Right Side Tables (Menu & Documents) */}
                                    <div className="flex flex-col gap-6 h-full">
                                        {/* Menu Access Table */}
                                        <div className="flex-1 border rounded-md shadow-sm bg-white flex flex-col overflow-hidden">
                                            <div className="grid grid-cols-[60px_1fr] bg-slate-100 border-b p-2 font-semibold text-xs text-muted-foreground shrink-0">
                                                <div>Select</div>
                                                <div>Menu</div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                {["Engineering", "BOM Dashboard", "Quality", "Production"].map((menu, idx) => (
                                                    <div key={menu} className={`grid grid-cols-[60px_1fr] p-2 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                        <div className="pl-1">
                                                            <Checkbox defaultChecked className="h-4 w-4 bg-blue-500 border-blue-500 text-white data-[state=checked]:bg-blue-500" />
                                                        </div>
                                                        <div className="text-muted-foreground text-xs">{menu}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Document Access Table */}
                                        <div className="flex-1 border rounded-md shadow-sm bg-white flex flex-col overflow-hidden">
                                            <div className="grid grid-cols-[60px_1fr] bg-slate-100 border-b p-2 font-semibold text-xs text-muted-foreground shrink-0">
                                                <div>Select</div>
                                                <div>Document Name</div>
                                            </div>
                                            <div className="flex-1 overflow-y-auto">
                                                {["Drawing_Document", "IQA_Document", "Po_Document", "TRSO_Document"].map((doc, idx) => (
                                                    <div key={doc} className={`grid grid-cols-[60px_1fr] p-2 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                        <div className="pl-1">
                                                            <Checkbox defaultChecked className="h-4 w-4 bg-blue-500 border-blue-500 text-white data-[state=checked]:bg-blue-500" />
                                                        </div>
                                                        <div className="text-muted-foreground text-xs">{doc}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                </div>
                            </div>
                            
                            {/* Footer Actions */}
                            <div className="p-4 bg-white border-t shrink-0 flex items-center gap-2">
                                <Button className="bg-[#1f9344] hover:bg-[#1a7a38] text-white px-6">Save</Button>
                                <Button variant="destructive" className="bg-[#ef4444] hover:bg-[#dc2626] text-white px-6">Cancel</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Role Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { role: "Super Admin", count: 1, icon: ShieldCheck },
                        { role: "Admin", count: 2, icon: UsersIcon },
                        { role: "Production", count: 2, icon: UsersIcon },
                        { role: "Quality", count: 2, icon: UsersIcon },
                        { role: "Viewer", count: 1, icon: UsersIcon },
                    ].map((stat) => (
                        <Card key={stat.role} className="border-0 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-lg font-bold">{stat.count}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.role}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users by name, email, or role..."
                                className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Users Table */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">All Users</CardTitle>
                            <span className="text-xs text-muted-foreground">{users.length} users</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-6">Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Email</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Role</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id} className="group hover:bg-muted/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarFallback className={`bg-gradient-to-br ${user.color} text-white text-[10px] font-semibold`}>
                                                            {user.initials}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-sm font-medium">{user.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] ${roleBadge[user.role]}`}>
                                                    {user.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === "Active" ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                    <span className={`text-xs ${user.status === "Active" ? "text-emerald-600" : "text-gray-500"}`}>
                                                        {user.status}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36">
                                                        <DropdownMenuItem className="text-xs gap-2">
                                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2">
                                                            <ShieldCheck className="w-3.5 h-3.5" /> Change Role
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2 text-red-500 focus:text-red-500">
                                                            <UserX className="w-3.5 h-3.5" /> Deactivate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2 text-red-500 focus:text-red-500">
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
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
