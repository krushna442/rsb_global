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
import { MoreHorizontal, Plus, Loader2, Sliders, Trash2, FileText, Star } from "lucide-react";
import { toast } from "sonner";

export default function DynamicFieldsPage() {
    const { 
        data, 
        loading, 
        updateFields, 
        addImportantFields, 
        removeImportantFields, 
        addDocuments, 
        removeDocuments 
    } = useDynamicFields();
    
    // Add Field Modal State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState<"text" | "number" | "date">("text");
    
    // Important Fields State
    const [isAddImportantOpen, setIsAddImportantOpen] = useState(false);
    const [selectedImpField, setSelectedImpField] = useState("");
    
    // Documents State
    const [isAddDocOpen, setIsAddDocOpen] = useState(false);
    const [newDocName, setNewDocName] = useState("");
    const [newDocCategory, setNewDocCategory] = useState<"individual" | "ppap">("individual");
    
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
    const importantFields = data?.important_fields || [];
    const documents = data?.documents || [];

    // --- Handlers for Product Fields ---
    const handleAddField = async () => {
        if (!newFieldName.trim()) {
            toast.error("Field name is required");
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(newFieldName)) {
            toast.error("Field name should only contain letters, numbers, and underscores.");
            return;
        }

        setIsSubmitting(true);
        const payload = {
            product_fields: [...productFields, { name: newFieldName, type: newFieldType }],
        };

        const success = await updateFields(payload);
        if (success) {
            setIsAddOpen(false);
            setNewFieldName("");
            setNewFieldType("text");
        }
        setIsSubmitting(false);
    };

    const handleDeleteField = async (fieldName: string) => {
        if (!confirm(`Are you sure you want to remove the field "${fieldName}"?`)) {
            return;
        }
        
        setIsSubmitting(true);
        const newFields = productFields.filter(f => f.name !== fieldName);
        await updateFields({ product_fields: newFields });
        setIsSubmitting(false);
    };

    // --- Handlers for Important Fields ---
    const handleAddImportantField = async () => {
        if (!selectedImpField) return;
        setIsSubmitting(true);
        const success = await addImportantFields([selectedImpField]);
        if (success) {
            setIsAddImportantOpen(false);
            setSelectedImpField("");
        }
        setIsSubmitting(false);
    };

    const handleRemoveImportantField = async (name: string) => {
        if (!confirm(`Remove "${name}" from important fields?`)) return;
        setIsSubmitting(true);
        await removeImportantFields([name]);
        setIsSubmitting(false);
    };

    // --- Handlers for Documents ---
    const handleAddDocument = async () => {
        if (!newDocName.trim()) {
            toast.error("Document name is required");
            return;
        }
        setIsSubmitting(true);
        const success = await addDocuments([{ name: newDocName.trim(), category: newDocCategory }]);
        if (success) {
            setIsAddDocOpen(false);
            setNewDocName("");
            setNewDocCategory("individual");
        }
        setIsSubmitting(false);
    };

    const handleRemoveDocument = async (name: string, category: "individual" | "ppap") => {
        if (!confirm(`Remove document "${name}" (${category})?`)) return;
        setIsSubmitting(true);
        await removeDocuments([{ name, category }]);
        setIsSubmitting(false);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Dynamic Fields Configuration</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage global product schema, highlights, and document requirements</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Fields List */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b px-6 py-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Sliders className="w-4 h-4 text-primary" />
                                    Product Specification Fields
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{productFields.length}</Badge>
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} className="h-8 gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" /> Add Field
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 pl-6">Field Name</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Type</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 pr-6 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {productFields.map((field) => (
                                            <TableRow key={field.name} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 py-3 font-medium text-sm">{field.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[10px] font-medium capitalize py-0">
                                                        {field.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 transition-colors"
                                                        onClick={() => handleDeleteField(field.name)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        {/* Documents Section */}
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <CardHeader className="bg-muted/10 border-b px-6 py-4 flex flex-row items-center justify-between">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" />
                                    Document Definitions
                                    <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">{documents.length}</Badge>
                                </CardTitle>
                                <Button size="sm" variant="outline" onClick={() => setIsAddDocOpen(true)} className="h-8 gap-1.5 text-xs">
                                    <Plus className="w-3.5 h-3.5" /> Add Document
                                </Button>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 pl-6">Document Name</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10">Category</TableHead>
                                            <TableHead className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground h-10 pr-6 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {documents.map((doc, idx) => (
                                            <TableRow key={`${doc.name}-${idx}`} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 py-3 font-medium text-sm">{doc.name}</TableCell>
                                                <TableCell>
                                                    <Badge className={`text-[10px] font-bold uppercase ${doc.category === 'ppap' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>
                                                        {doc.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="pr-6 text-right">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600 transition-colors"
                                                        onClick={() => handleRemoveDocument(doc.name, doc.category)}
                                                        disabled={isSubmitting}
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Important Fields Sidebar */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm overflow-hidden bg-amber-50/30 border-amber-100">
                            <CardHeader className="bg-amber-100/20 border-b border-amber-100 px-6 py-4">
                                <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-900">
                                    <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                                    Important Highlights
                                </CardTitle>
                                <p className="text-[11px] text-amber-700/70 leading-relaxed mt-1">
                                    Fields selected here will blink on the product specification page to alert users of critical data.
                                </p>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="flex flex-wrap gap-2 min-h-[100px] items-start content-start">
                                        {importantFields.map((field) => (
                                            <Badge 
                                                key={field} 
                                                variant="secondary" 
                                                className="bg-white border-amber-200 text-amber-900 pr-1 py-1 hover:bg-white shadow-sm flex items-center gap-1.5"
                                            >
                                                {field}
                                                <Button 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-4 w-4 rounded-full hover:bg-amber-100 text-amber-600"
                                                    onClick={() => handleRemoveImportantField(field)}
                                                    disabled={isSubmitting}
                                                >
                                                    <span className="text-[10px] font-bold">×</span>
                                                </Button>
                                            </Badge>
                                        ))}
                                        {importantFields.length === 0 && (
                                            <div className="w-full py-8 text-center border-2 border-dashed border-amber-200 rounded-lg">
                                                <p className="text-xs text-amber-600/50">No important fields defined</p>
                                            </div>
                                        )}
                                    </div>
                                    
                                    <Button 
                                        variant="outline" 
                                        className="w-full h-9 text-xs border-amber-200 text-amber-800 hover:bg-amber-100/50 gap-2"
                                        onClick={() => setIsAddImportantOpen(true)}
                                        disabled={isSubmitting}
                                    >
                                        <Plus className="w-3.5 h-3.5" /> Add Important Field
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Modals */}
            
            {/* Add Specification Field */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add Specification Field</DialogTitle>
                        <DialogDescription className="text-xs">
                            Define a new data point for the product master schema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="fieldName" className="text-xs">Field Name (camelCase)</Label>
                            <Input 
                                id="fieldName"
                                placeholder="e.g. surfaceFinish" 
                                value={newFieldName} 
                                onChange={(e) => setNewFieldName(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="fieldType" className="text-xs">Data Type</Label>
                            <Select value={newFieldType} onValueChange={(val: any) => setNewFieldType(val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="text">Text</SelectItem>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button size="sm" onClick={handleAddField} disabled={isSubmitting || !newFieldName}>Add Field</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Important Field */}
            <Dialog open={isAddImportantOpen} onOpenChange={setIsAddImportantOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                            Highlight Field
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Choose a field to make it blink in the product specification view.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="space-y-2">
                            <Label className="text-xs">Select Field</Label>
                            <Select value={selectedImpField} onValueChange={(val: any) => setSelectedImpField(val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Pick a field..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {productFields
                                        .filter(f => !importantFields.includes(f.name))
                                        .map(f => (
                                            <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsAddImportantOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button size="sm" onClick={handleAddImportantField} disabled={isSubmitting || !selectedImpField} className="bg-amber-600 hover:bg-amber-700">Add Highlight</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Add Document Definition */}
            <Dialog open={isAddDocOpen} onOpenChange={setIsAddDocOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add Document Definition</DialogTitle>
                        <DialogDescription className="text-xs">
                            Define a required document for quality or production check.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="docName" className="text-xs">Document Name</Label>
                            <Input 
                                id="docName"
                                placeholder="e.g. INVOICE" 
                                value={newDocName} 
                                onChange={(e) => setNewDocName(e.target.value)}
                                className="h-9 text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs">Category</Label>
                            <Select value={newDocCategory} onValueChange={(val: any) => setNewDocCategory(val)}>
                                <SelectTrigger className="h-9 text-sm">
                                    <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="individual">Individual (Production)</SelectItem>
                                    <SelectItem value="ppap">PPAP (Quality)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setIsAddDocOpen(false)} disabled={isSubmitting}>Cancel</Button>
                        <Button size="sm" onClick={handleAddDocument} disabled={isSubmitting || !newDocName}>Add Document</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
