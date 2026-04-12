"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    Eye,
} from "lucide-react";

import { useUser,MAIL_TYPES, MailType } from "@/contexts/UserContext";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
const roleBadge: Record<string, string> = {
    "super admin": "bg-violet-50 text-violet-700 border-violet-200",
    "admin": "bg-blue-50 text-blue-700 border-blue-200",
    "production": "bg-teal-50 text-teal-700 border-teal-200",
    "quality": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "viewer": "bg-gray-50 text-gray-600 border-gray-200",
};

import { useState } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { User } from "@/types/api";

// Initial state for the creation modal
const INITIAL_FORM_STATE = {
    name: "",
    mobile: "",
    email: "",
    username: "",
    password: "",
    role: "viewer" as User["role"],
    show_image: "true" // 👈 default
};

const allColumns = [
    "TubeLength", "Tube_Dia_Thickness", "Series", "TypeOfPart", 
    "Noise_Deadener", "Fep_Press_H", "Rear_Housing", "Long_Fork",
    "SF_Details", "PDC_Length", "Front_End_Piece", "Flange_Yoke",
    "Greaseable_NonGreaseable", "Coupling_Flange", "Coupling_Orientation", 
    "CB_Kit", "Loctite_Grade", "Tightening_Torque", "Balancing_RPM", 
    "Unbalance_CMG", "Unbalance_GM", "IA_Bellow", "Total_Length", 
    "Rear_Slip", "Mod_No", "Vendor_Code", "Customer_Name", "DWG_Weight"
];

export default function UsersPage() {
    const { allUsers, fetchAllUsers, updateProfile, deactivateUser, deleteUser , addMailTypes, removeMailTypes} = useUser();
    const {data} = useDynamicFields();
    const [open, setOpen] = useState(false);
    const [viewOpen, setViewOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    
    // Modal state Mode
    const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

    // User details state
    const [formData, setFormData] = useState(INITIAL_FORM_STATE);

    // Arrays state
    const [columnArray, setColumnArray] = useState<string[]>(allColumns);
    const [menuArray, setMenuArray] = useState<string[]>([]);
    const [documentArray, setDocumentArray] = useState<string[]>([]);

    const allMenus = ["Engineering", "BOM Dashboard", "Quality", "Production"];
    const allDocs = data?.documents.map((doc) => doc.name) || [];
const [mailTypesArray, setMailTypesArray] = useState<MailType[]>([]);

const MAIL_TYPE_LABELS: Record<MailType, string> = {
  shift_scan_report:      "Shift Scan Report",
  day_scan_report:        "Day Scan Report",
  monthly_scan_report:    "Monthly Scan Report",
  monthly_product_report: "Monthly Product Report",
};


    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handleRoleChange = (val: string | null) => {
        if (val) setFormData(prev => ({ ...prev, role: val as User["role"] }));
    };

const handleCheckboxToggle = <T extends string>(
    state: T[],
    setState: React.Dispatch<React.SetStateAction<T[]>>,
    item: T,
    checked: boolean
) => {
    if (checked) {
        setState(prev => [...prev, item]);
    } else {
        setState(prev => prev.filter(i => i !== item));
    }
};

    const handleCheckboxChange = (checked: boolean | "indeterminate") => {
        setFormData(prev => ({
            ...prev,
            show_image: checked === true ? "true" : "false"
        }));
    };

    const openAddModal = () => {
        setModalMode("add");
        setSelectedUserId(null);
        setFormData(INITIAL_FORM_STATE);
        setColumnArray(allColumns);
        setMenuArray([]);
        setDocumentArray([]);
        setMailTypesArray([]);  

        setOpen(true);
    };

    const openUserModal = (user: User, mode: "edit" | "view") => {
        setModalMode(mode);
        setSelectedUserId(user.id);
        setFormData({
            name: user.name || "",
            mobile: user.mobile || "",
            email: user.email || "",
            username: user.username || "",
            password: user.password || "", // Backend now provides plaintext
            role: user.role || "viewer",
            show_image: user.show_image === "true" || user.show_image === "1" || user.show_image === true as any ? "true" : "false"
        });
        setColumnArray(user.column_array || []);
        setMenuArray(user.menu_array || []);
        setDocumentArray(user.document_name_array || []);
        setMailTypesArray(
        (user.mail_types || []).filter((type): type is MailType =>
        MAIL_TYPES.includes(type as MailType)
         )
        );

        
        if (mode === "view") {
            setViewOpen(true);
        } else {
            setOpen(true);
        }
    };
    const handleSaveUser = async () => {
        if (!formData.name || !formData.email || !formData.username || !formData.password) {
            toast.error("Please fill in all required fields (Name, Email, Username, Password).");
            return;
        }

        try {
            setIsSaving(true);
            const payload = {
                ...formData,
                column_array: columnArray,
                menu_array: menuArray,
                document_name_array: documentArray,
                mail_types: mailTypesArray,   // 👈 add this

                is_active: 1
            };

            if (modalMode === "add") {
                const response = await api.post("/users/register", payload);
                if (response.data.success) {
                    toast.success("User created successfully!");
                    setOpen(false);
                    fetchAllUsers();
                } else {
                    toast.error(response.data.message || "Failed to create user.");
                }
            } else if (modalMode === "edit" && selectedUserId) {
                // Update profile logic
                const success = await updateProfile(selectedUserId, payload);
                if (success) {
                    setOpen(false);
                }
            }
            
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || "An error occurred.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">User Management</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage system users and permissions</p>
                    </div>
                    <Button size="sm" className="h-9 gap-1.5 text-xs" onClick={openAddModal}>
                        <Plus className="w-3.5 h-3.5" />
                        Add User
                    </Button>
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent className="max-w-[95vw] lg:max-w-5xl h-[90vh] flex flex-col p-0 overflow-hidden">
    <div className="bg-[#07859b] text-white px-6 py-3 shrink-0 flex items-center justify-between">
      <h2 className="text-lg font-semibold">
        {modalMode === "add" ? "Add New User" : modalMode === "edit" ? "Edit User Detail" : "View User Detail"}
      </h2>
    </div>

    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
      {/* Top Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Name <span className="text-red-500">*</span></Label>
          <Input id="name" value={formData.name} onChange={handleFormChange} className="h-9 text-sm bg-white" placeholder="JOHN DOE" disabled={modalMode === "view"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Mobile</Label>
          <Input id="mobile" value={formData.mobile} onChange={handleFormChange} className="h-9 text-sm bg-white" placeholder="67265524266" disabled={modalMode === "view"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Email <span className="text-red-500">*</span></Label>
          <Input id="email" value={formData.email} onChange={handleFormChange} type="email" className="h-9 text-sm bg-white" placeholder="john.doe@example.com" disabled={modalMode === "view"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">UserName <span className="text-red-500">*</span></Label>
          <Input id="username" value={formData.username} onChange={handleFormChange} className="h-9 text-sm bg-white" placeholder="john_doe_001" disabled={modalMode === "view"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Password <span className="text-red-500">*</span></Label>
          <Input id="password" value={formData.password} onChange={handleFormChange} type="text" className="h-9 text-sm bg-white" placeholder="••••••••" disabled={modalMode === "view"} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">Role</Label>
          <Select value={formData.role} onValueChange={handleRoleChange} disabled={modalMode === "view"}>
            <SelectTrigger className="h-9 text-sm bg-white">
              <SelectValue placeholder="Select role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="super admin">Super Admin</SelectItem>
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
            {allColumns.map((col, idx) => (
              <div key={col} className={`grid grid-cols-[80px_1fr] p-3 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <div className="pl-2">
                  <Checkbox
                    checked={columnArray.includes(col)}
                    onCheckedChange={(checked) => handleCheckboxToggle(columnArray, setColumnArray, col, checked as boolean)}
                    disabled={modalMode === "view"}
                    className="h-4 w-4 bg-white border-muted-foreground/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white disabled:opacity-50"
                  />
                </div>
                <div className="text-muted-foreground">{col}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side Tables */}
        <div className="flex flex-col gap-4 h-full">

          {/* Document Access Table */}
          <div className="flex-1 border rounded-md shadow-sm bg-white flex flex-col overflow-hidden">
            <div className="grid grid-cols-[60px_1fr] bg-slate-100 border-b p-2 font-semibold text-xs text-muted-foreground shrink-0">
              <div>Select</div>
              <div>Document Name</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {allDocs.map((doc, idx) => (
                <div key={idx} className={`grid grid-cols-[60px_1fr] p-2 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <div className="pl-1">
                    <Checkbox
                      checked={documentArray.includes(doc)}
                      onCheckedChange={(checked) => handleCheckboxToggle(documentArray, setDocumentArray, doc, checked as boolean)}
                      disabled={modalMode === "view"}
                      className="h-4 w-4 bg-white border-muted-foreground/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white disabled:opacity-50"
                    />
                  </div>
                  <div className="text-muted-foreground text-xs">{doc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Mail Type Access Table ── */}
          <div className="border rounded-md shadow-sm bg-white flex flex-col overflow-hidden shrink-0">
            <div className="grid grid-cols-[60px_1fr] bg-slate-100 border-b p-2 font-semibold text-xs text-muted-foreground shrink-0">
              <div>Select</div>
              <div>Mail Report</div>
            </div>
            {MAIL_TYPES.map((type, idx) => (
              <div key={type} className={`grid grid-cols-[60px_1fr] p-2 text-sm items-center border-b last:border-0 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                <div className="pl-1">
                  <Checkbox
                    checked={mailTypesArray.includes(type)}
                    onCheckedChange={(checked) => handleCheckboxToggle(mailTypesArray, setMailTypesArray, type, checked as boolean)}
                    disabled={modalMode === "view"}
                    className="h-4 w-4 bg-white border-muted-foreground/30 data-[state=checked]:bg-blue-500 data-[state=checked]:border-blue-500 data-[state=checked]:text-white disabled:opacity-50"
                  />
                </div>
                <div className="text-muted-foreground text-xs">{MAIL_TYPE_LABELS[type]}</div>
              </div>
            ))}
          </div>

        </div>
      </div>


    </div>
      {/* Show Product Image toggle */}
      <div className="space-y-1.5 ml-6 flex items-center gap-2">
        <Checkbox
          checked={formData.show_image === "true"}
          onCheckedChange={handleCheckboxChange}
          disabled={modalMode === "view"}
          className="h-4 w-4 disabled:opacity-50"
        />
        <Label className="text-xs font-semibold text-muted-foreground">
          Show Product Image
        </Label>
      </div>

    {/* Footer */}
    <div className="p-4 bg-white border-t shrink-0 flex items-center justify-end gap-3">
      <Button variant="outline" onClick={() => setOpen(false)}>
        {modalMode === "view" ? "Close" : "Cancel"}
      </Button>
      {modalMode !== "view" && (
        <Button
          onClick={handleSaveUser}
          disabled={isSaving}
          className="bg-[#1f9344] hover:bg-[#1a7a38] text-white px-6 min-w-[100px]"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      )}
    </div>
  </DialogContent>
</Dialog>

                    {/* View User Dialog */}
                    <Dialog open={viewOpen} onOpenChange={setViewOpen}>
                        <DialogContent className=" !max-w-3xl h-auto p-0 overflow-hidden bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl">
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 shrink-0 flex items-center justify-between">
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    User Details
                                </h2>
                            </div>
                            <div className="p-1">
                                <div className="grid grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-xl border border-slate-100">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</Label>
                                        <p className="text-sm font-medium">{formData.name}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mobile</Label>
                                        <p className="text-sm font-medium">{formData.mobile || "N/A"}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email</Label>
                                        <p className="text-sm font-medium">{formData.email}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Username / User ID</Label>
                                        <p className="text-sm font-medium">{formData.username}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Password</Label>
                                        <p className="text-sm font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded inline-block border border-blue-100">{formData.password}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Role</Label>
                                        <div className="mt-1">
                                            <Badge variant="outline" className={`text-xs ${roleBadge[formData.role]}`}>
                                                {formData.role}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-white/50 border-t border-slate-100 shrink-0 flex items-center justify-end">
                                <Button className="bg-slate-900 text-white hover:bg-slate-800" onClick={() => setViewOpen(false)}>Close Window</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Role Stats */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { role: "Super Admin", count: allUsers.filter(u => u.role === "super admin" && u.is_active).length, icon: ShieldCheck },
                        { role: "Admin", count: allUsers.filter(u => u.role === "admin" && u.is_active).length, icon: UsersIcon },
                        { role: "Production", count: allUsers.filter(u => u.role === "production" && u.is_active).length, icon: UsersIcon },
                        { role: "Quality", count: allUsers.filter(u => u.role === "quality" && u.is_active).length, icon: UsersIcon },
                        { role: "Viewer", count: allUsers.filter(u => u.role === "viewer" && u.is_active).length, icon: UsersIcon },
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
                            <span className="text-xs text-muted-foreground">{allUsers.length} users</span>
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
                                    {allUsers.map((user) => (
                                        <TableRow key={user.id} className="group hover:bg-muted/20 transition-colors">
                                            <TableCell className="pl-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-8 h-8">
                                                        {user.profile_image ? (
                                                            <AvatarImage src={`${process.env.NEXT_PUBLIC_URL}/${user.profile_image}`} alt={user.name} />
                                                        ) : (
                                                            <AvatarFallback className={`bg-gradient-to-br from-blue-500 to-blue-700 text-white text-[10px] font-semibold`}>
                                                                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                                                            </AvatarFallback>
                                                        )}
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
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                                                    <span className={`text-xs ${user.is_active ? "text-emerald-600" : "text-gray-500"}`}>
                                                        {user.is_active ? "Active" : "Inactive"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36">
                                                        <DropdownMenuItem className="text-xs gap-2" onClick={() => openUserModal(user, "view")}>
                                                            <Eye className="w-3.5 h-3.5" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2" onClick={() => openUserModal(user, "edit")}>
                                                            <Pencil className="w-3.5 h-3.5" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2 text-orange-600 focus:text-orange-600 focus:bg-orange-50" onClick={() => deactivateUser(user.id)}>
                                                            <UserX className="w-3.5 h-3.5" /> Deactivate
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2 text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => deleteUser(user.id)}>
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
