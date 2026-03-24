"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Plus, Loader2, Sliders, CheckCircle2, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function DynamicFieldsPage() {
    const { data, loading, updateFields } = useDynamicFields();
    
    // Add Field Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date">("text");
    const [newFieldCategory, setNewFieldCategory] = useState<"approval_fields" | "quality_verification_fields">("quality_verification_fields");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (loading && !data) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    const productFields = data?.product_fields || [];
    const approvalFields = data?.approval_fields || [];
    const qualityFields = data?.quality_verification_fields || [];

    const handleAddField = async () => {
        if (!newFieldName.trim()) {
            toast.error("Field name is required");
            return;
        }

        // basic camelCase format or alphanumeric check
        if (!/^[a-zA-Z0-9_]+$/.test(newFieldName)) {
            toast.error("Field name should only contain letters, numbers, and underscores.");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            product_fields: [{ name: newFieldName, type: newFieldType }],
            field_category: newFieldCategory
        };

        const success = await updateFields(payload);
        if (success) {
            setIsAddOpen(false);
            setNewFieldName("");
            setNewFieldType("text");
            setNewFieldCategory("quality_verification_fields");
        }
        setIsSubmitting(false);
    };

    const handleMoveToCategory = async (fieldName: string, targetCategory: "approval_fields" | "quality_verification_fields" | "none") => {
        setIsSubmitting(true);
        let payload: any = {};
        
        if (targetCategory === "approval_fields") {
            if (!approvalFields.includes(fieldName)) {
                payload = { approval_fields: [...approvalFields, fieldName] };
            }
        } else if (targetCategory === "quality_verification_fields") {
            if (!qualityFields.includes(fieldName)) {
                payload = { quality_verification_fields: [...qualityFields, fieldName] };
            }
        } else if (targetCategory === "none") {
            // Remove from both
            const newApprovals = approvalFields.filter(f => f !== fieldName);
            const newQuality = qualityFields.filter(f => f !== fieldName);
            payload = {
                approval_fields: newApprovals,
                quality_verification_fields: newQuality
            };
        }

        if (Object.keys(payload).length > 0) {
            await updateFields(payload);
        }
        setIsSubmitting(false);
    };

    const handleDeleteField = async (fieldName: string) => {
        if (!confirm(`Are you sure you want to completely remove the field "${fieldName}"? This will recreate the product_fields list without it.`)) {
            return;
        }
        
        setIsSubmitting(true);
        const newFields = productFields.filter(f => f.name !== fieldName);
        await updateFields({ product_fields: newFields });
        setIsSubmitting(false);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dynamic Fields</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage and categorize product specifications</p>
                    </div>
                    <Button onClick={() => setIsAddOpen(true)} className="gap-2 shadow-sm" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Add Field
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Main Fields List */}
                    <Card className="md:col-span-2 border-0 shadow-sm overflow-hidden min-h-[60vh]">
                        <CardHeader className="bg-muted/10 border-b px-6 py-5">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Sliders className="w-4 h-4 text-primary" />
                                All Product Fields
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11 pl-6">Field Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11">Type</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11">Category Tag</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11 pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {productFields.map((field) => {
                                        const isApproval = approvalFields.includes(field.name);
                                        const isQuality = qualityFields.includes(field.name);
                                        
                                        return (
                                            <TableRow key={field.name} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 py-4 font-medium">{field.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {field.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {isApproval && (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-xs font-medium">
                                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">Approval</span>
                                                                <span className="sm:hidden">A</span>
                                                            </div>
                                                        )}
                                                        {isQuality && (
                                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 border border-purple-100 text-purple-700 text-xs font-medium">
                                                                <ShieldCheck className="w-3.5 h-3.5" />
                                                                <span className="hidden sm:inline">Quality</span>
                                                                <span className="sm:hidden">Q</span>
                                                            </div>
                                                        )}
                                                        {!isApproval && !isQuality && (
                                                            <span className="text-xs text-muted-foreground italic">Uncategorized</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger render={<Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting} />}>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            {!isApproval && (
                                                                <DropdownMenuItem onClick={() => handleMoveToCategory(field.name, "approval_fields")}>
                                                                    Move to Approval
                                                                </DropdownMenuItem>
                                                            )}
                                                            {!isQuality && (
                                                                <DropdownMenuItem onClick={() => handleMoveToCategory(field.name, "quality_verification_fields")}>
                                                                    Move to Quality
                                                                </DropdownMenuItem>
                                                            )}
                                                            {(isApproval || isQuality) && (
                                                                <DropdownMenuItem onClick={() => handleMoveToCategory(field.name, "none")} className="text-orange-600">
                                                                    Remove from Category
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleDeleteField(field.name)} className="text-red-600 focus:text-red-600">
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Field
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {productFields.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-32 text-center text-muted-foreground">
                                                No fields found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    {/* Summary / Stats Card */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-blue-50/50 border-b border-blue-100 px-6 py-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-blue-900">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Approval Fields
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-wrap gap-2">
                                    {approvalFields.length > 0 ? (
                                        approvalFields.map(f => (
                                            <Badge key={f} variant="secondary" className="bg-white border text-xs text-gray-700 font-medium">{f}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No approval fields</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-sm">
                            <CardHeader className="bg-purple-50/50 border-b border-purple-100 px-6 py-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-purple-900">
                                    <ShieldCheck className="w-4 h-4" />
                                    Quality Fields
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="flex flex-wrap gap-2">
                                    {qualityFields.length > 0 ? (
                                        qualityFields.map(f => (
                                            <Badge key={f} variant="secondary" className="bg-white border text-xs text-gray-700  font-medium">{f}</Badge>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No quality fields</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Add Field Modal */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Field</DialogTitle>
                        <DialogDescription>
                            Create a new dynamic field and assign it to a category.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="fieldName">Field Name</Label>
                            <Input 
                                id="fieldName"
                                placeholder="e.g. coatingType" 
                                value={newFieldName} 
                                onChange={(e) => setNewFieldName(e.target.value)}
                            />
                            <p className="text-[11px] text-muted-foreground">Use camelCase without spaces.</p>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fieldType">Field Type</Label>
                            <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="fieldCategory">Initial Category</Label>
                            <Select value={newFieldCategory} onValueChange={(val: any) => setNewFieldCategory(val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="approval_fields">Approval Fields</SelectItem>
                                    <SelectItem value="quality_verification_fields">Quality Verification Fields</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddField} disabled={isSubmitting || !newFieldName}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Add Field
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
