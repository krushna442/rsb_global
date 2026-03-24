"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Save,
    Send,
    Upload,
    FileText,
    Package,
    Ruler,
    FileCheck,
    Truck,
    ShieldCheck,
    Trash2,
} from "lucide-react";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductsContext";
import { Product } from "@/types/api";
import { toast } from "sonner";

interface ProductFormProps {
    isEdit?: boolean;
    productId?: number;
    initialData?: Product | null;
    isPopup?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ProductForm({ isEdit = false, productId, initialData, isPopup = false, onSuccess, onCancel }: ProductFormProps) {
    const router = useRouter();
    const { createProduct, updateProduct, loading } = useProducts();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState<Record<string, any>>({
        partNumber: "",
        customer: "",
        vendorCode: "",
        partWeightKg: "",
        revNo: "",
        tubeLength: "",
        tubeDiameter: "",
        partType: "",
        status: "Pending",
        poNumber: "",
        supplyDate: "",
        sampleStatus: "",
        sampleSupplyMode: "",
        acceptedMailDate: "",
        trsoDate: "",
        trsoModel: "",
        trsoRev: "",
        iqaDate: "",
        iqaModel: "",
        iqaVcNumber: "",
        ppapIntimateDate: "",
        ppapClosingDate: "",
        ppapStatus: "Initiated",
        drawingNumber: "",
        drawingModel: "",
        vehicleType: "",
        partDescription: "",
        series: "",
        noiseDeadenerLength: "",
        availableNoiseDeadener: "",
        fepPressHStockPositions: "",
        frontEndPieceDetails: "",
        rearHousingLength: "",
        longForkLength: "",
        sfDetails: "",
        pdcLength: "",
        couplingFlangeOrientations: "",
        hexBoltNutTighteningTorque: "",
        loctiteGradeUse: "",
        cbKitDetails: "",
        slipDetails: "",
        greaseableOrNonGreaseable: "",
        mountingDetailsFlangeYoke: "",
        mountingDetailsCouplingFlange: "",
        iaBellowDetails: "",
        totalLength: "",
        balancingRpm: "",
        unbalanceInCmg: "",
        unbalanceInGram: "",
        unbalanceInGram75Percent: ""
    });

    // Mock file state
    const [files, setFiles] = useState<{ id: string; name: string; type: string }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Load Data for Edit
    useEffect(() => {
        if (isEdit && initialData) {
            setFormData({
                partNumber: initialData.part_number || "",
                customer: initialData.customer || "",
                status: initialData.status || "Pending",
                ...(initialData.specification || {})
            });
            // Optional: Handle initialData documents if available
        }
    }, [isEdit, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(f => ({
                id: Math.random().toString(36).substring(7),
                name: f.name,
                type: f.type,
            }));
            setFiles(prev => [...prev, ...newFiles]);
            toast.success(`Added ${newFiles.length} file(s)`);
            e.target.value = ''; // Reset
        }
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.partNumber || !formData.customer || !formData.vendorCode) {
            toast.error("Please fill in all required fields.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isEdit && initialData && productId) {
                const payload: any = {};
                const specPayload: any = {};
                let hasChanges = false;

                const topLevelMap: Record<string, string> = {
                    partNumber: 'part_number',
                    customer: 'customer',
                    status: 'status'
                };

                Object.keys(formData).forEach(key => {
                    const newVal = (formData as any)[key];
                    if (topLevelMap[key]) {
                        const originalKey = topLevelMap[key];
                        const oldVal = (initialData as any)[originalKey];
                        if (newVal !== oldVal) {
                            payload[originalKey] = newVal;
                            hasChanges = true;
                        }
                    } else {
                        const oldVal = initialData.specification?.[key];
                        if (newVal !== oldVal) {
                            specPayload[key] = newVal;
                            hasChanges = true;
                        }
                    }
                });

                if (Object.keys(specPayload).length > 0) {
                    payload.specification = specPayload;
                }

                if (!hasChanges) {
                    toast.info("No changes to save.");
                    if (onSuccess) onSuccess();
                    return;
                }

                const success = await updateProduct(productId, payload);
                if (success) {
                    if (onSuccess) onSuccess();
                    else router.push("/product-master");
                }
            } else {
                // Create
                const payload: any = {
                    part_number: formData.partNumber,
                    customer: formData.customer,
                    status: formData.status,
                    specification: { ...formData }
                };
                delete payload.specification.partNumber;
                delete payload.specification.customer;
                delete payload.specification.status;

                const success = await createProduct(payload);
                if (success) {
                    if (onSuccess) onSuccess();
                    else router.push("/product-master");
                }
            }
        } catch {
            toast.error("Failed to save product.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const content = (
        <div className="space-y-6 max-w-4xl mx-auto pb-12">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/product-master">
                                <Button type="button" variant="ghost" size="icon" className="h-9 w-9">
                                    <ArrowLeft className="w-4 h-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight">
                                    {isEdit ? "Edit Product" : "Add New Product"}
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {isEdit ? `Updating details for ${formData.partNumber}` : "Enter product specifications and upload documents"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {isPopup ? (
                                <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 text-xs">
                                    Cancel
                                </Button>
                            ) : (
                                <Link href="/product-master">
                                    <Button type="button" variant="outline" size="sm" className="h-9 text-xs">
                                        Cancel
                                    </Button>
                                </Link>
                            )}
                            <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 gap-1.5 text-xs">
                                <Save className="w-3.5 h-3.5" />
                                {isEdit ? "Save Changes" : "Save Product"}
                            </Button>
                        </div>
                    </div>

                    {/* Product Info */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                    <Package className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">Product Information</CardTitle>
                                    <p className="text-xs text-muted-foreground">Basic product identification details</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Part Number *</Label>
                                    <Input 
                                        name="partNumber" 
                                        required 
                                        value={formData.partNumber || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. DS-1045-A" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Customer Name *</Label>
                                    <Input 
                                        name="customer" 
                                        required 
                                        value={formData.customer || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Tata Motors" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Vendor Code *</Label>
                                    <Input 
                                        name="vendorCode" 
                                        required 
                                        value={formData.vendorCode || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. VM-201" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Part Weight (kg) *</Label>
                                    <Input 
                                        name="partWeightKg" 
                                        step="0.01" 
                                        type="number" 
                                        required 
                                        value={formData.partWeightKg || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 12.5" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Rev No</Label>
                                    <Input 
                                        name="revNo" 
                                        value={formData.revNo || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 01" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Vehicle Type</Label>
                                    <Input 
                                        name="vehicleType" 
                                        value={formData.vehicleType || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. SUV, Truck" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Part Description</Label>
                                    <Input 
                                        name="partDescription" 
                                        value={formData.partDescription || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Front Drive Shaft" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Series</Label>
                                    <Input 
                                        name="series" 
                                        value={formData.series || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 1000" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Drawing & Dimensions */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                                    <Ruler className="w-4 h-4 text-teal-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">Drawing & Dimensions</CardTitle>
                                    <p className="text-xs text-muted-foreground">Technical measurements and drawing info</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Drawing Number</Label>
                                    <Input 
                                        name="drawingNumber" 
                                        value={formData.drawingNumber || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. DRW-100" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Drawing Model</Label>
                                    <Input 
                                        name="drawingModel" 
                                        value={formData.drawingModel || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. MOD-A" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tube Length (mm) *</Label>
                                    <Input 
                                        name="tubeLength" 
                                        required 
                                        value={formData.tubeLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 450" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Tube Diameter (mm) *</Label>
                                    <Input 
                                        name="tubeDiameter" 
                                        required 
                                        value={formData.tubeDiameter || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 38" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Rear Housing Length</Label>
                                    <Input 
                                        name="rearHousingLength" 
                                        value={formData.rearHousingLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 200mm" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Long Fork Length</Label>
                                    <Input 
                                        name="longForkLength" 
                                        value={formData.longForkLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 120mm" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">PDC Length</Label>
                                    <Input 
                                        name="pdcLength" 
                                        value={formData.pdcLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 300mm" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Total Length (mm)</Label>
                                    <Input 
                                        name="totalLength" 
                                        value={formData.totalLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 980" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Technical Features & Details */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">Technical Features & Details</CardTitle>
                                    <p className="text-xs text-muted-foreground">Specific component configurations</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Part Type *</Label>
                                    <Select value={formData.partType || ""} onValueChange={(val) => handleSelectChange("partType", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Drive Shaft">Drive Shaft</SelectItem>
                                            <SelectItem value="Propeller Shaft">Propeller Shaft</SelectItem>
                                            <SelectItem value="Coupling Shaft">Coupling Shaft</SelectItem>
                                            <SelectItem value="Prop Shaft">Prop Shaft</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Available Noise Deadener</Label>
                                    <Input 
                                        name="availableNoiseDeadener" 
                                        value={formData.availableNoiseDeadener || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. Yes/No" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Noise Deadener Length</Label>
                                    <Input 
                                        name="noiseDeadenerLength" 
                                        value={formData.noiseDeadenerLength || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 150mm" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">FEP Press H. Stock Positions</Label>
                                    <Input 
                                        name="fepPressHStockPositions" 
                                        value={formData.fepPressHStockPositions || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Front End Piece Details</Label>
                                    <Input 
                                        name="frontEndPieceDetails" 
                                        value={formData.frontEndPieceDetails || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">S.F Details</Label>
                                    <Input 
                                        name="sfDetails" 
                                        value={formData.sfDetails || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Coupling Flange Orientations</Label>
                                    <Input 
                                        name="couplingFlangeOrientations" 
                                        value={formData.couplingFlangeOrientations || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 0 deg" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Hex Bolt/Nut Tightening Torque</Label>
                                    <Input 
                                        name="hexBoltNutTighteningTorque" 
                                        value={formData.hexBoltNutTighteningTorque || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 120 Nm" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Loctite Grade Use</Label>
                                    <Input 
                                        name="loctiteGradeUse" 
                                        value={formData.loctiteGradeUse || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 242" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">CB KIT Details</Label>
                                    <Input 
                                        name="cbKitDetails" 
                                        value={formData.cbKitDetails || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Slip Details</Label>
                                    <Input 
                                        name="slipDetails" 
                                        value={formData.slipDetails || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Greaseable Or Non Greaseable</Label>
                                    <Select value={formData.greaseableOrNonGreaseable || ""} onValueChange={(val) => handleSelectChange("greaseableOrNonGreaseable", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Greaseable">Greaseable</SelectItem>
                                            <SelectItem value="Non Greaseable">Non Greaseable</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Mounting Details Flange Yoke</Label>
                                    <Input 
                                        name="mountingDetailsFlangeYoke" 
                                        value={formData.mountingDetailsFlangeYoke || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 4-Bolt" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Mounting Details Coupling Flange</Label>
                                    <Input 
                                        name="mountingDetailsCouplingFlange" 
                                        value={formData.mountingDetailsCouplingFlange || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 4-Bolt" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">I/A Bellow Details</Label>
                                    <Input 
                                        name="iaBellowDetails" 
                                        value={formData.iaBellowDetails || ""} 
                                        onChange={handleChange} 
                                        placeholder="..." 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Balancing RPM</Label>
                                    <Input 
                                        name="balancingRpm" 
                                        value={formData.balancingRpm || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 3000" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Unbalance In Cmg</Label>
                                    <Input 
                                        name="unbalanceInCmg" 
                                        value={formData.unbalanceInCmg || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 15" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Unbalance In Gram</Label>
                                    <Input 
                                        name="unbalanceInGram" 
                                        value={formData.unbalanceInGram || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 12" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Unbalance In Gram 75%</Label>
                                    <Input 
                                        name="unbalanceInGram75Percent" 
                                        value={formData.unbalanceInGram75Percent || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 9" 
                                        className="h-9 text-sm" 
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Order & Samples */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <Truck className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">Order & Samples</CardTitle>
                                    <p className="text-xs text-muted-foreground">PO and supply information</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="poNumber" className="text-xs font-medium">PO Number</Label>
                                    <Input id="poNumber" value={formData.poNumber || ""} onChange={handleChange} placeholder="e.g. PO-2023-001" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="supplyDate" className="text-xs font-medium">Supply Date</Label>
                                    <Input id="supplyDate" value={formData.supplyDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sampleStatus" className="text-xs font-medium">Sample Status</Label>
                                    <Select value={formData.sampleStatus || ""} onValueChange={(val) => handleSelectChange("sampleStatus", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                            <SelectItem value="Under Review">Under Review</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="sampleSupplyMode" className="text-xs font-medium">Sample Supply Mode</Label>
                                    <Select value={formData.sampleSupplyMode || ""} onValueChange={(val) => handleSelectChange("sampleSupplyMode", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select mode" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Air">Air</SelectItem>
                                            <SelectItem value="Sea">Sea</SelectItem>
                                            <SelectItem value="Road">Road</SelectItem>
                                            <SelectItem value="Rail">Rail</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="acceptedMailDate" className="text-xs font-medium">Accepted Mail Date</Label>
                                    <Input id="acceptedMailDate" value={formData.acceptedMailDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* TRSO Details */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                                    <FileText className="w-4 h-4 text-indigo-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">TRSO Details</CardTitle>
                                    <p className="text-xs text-muted-foreground">Technical Review Sign-Off information</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="trsoDate" className="text-xs font-medium">TRSO Date</Label>
                                    <Input id="trsoDate" value={formData.trsoDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="trsoModel" className="text-xs font-medium">TRSO Model</Label>
                                    <Input id="trsoModel" value={formData.trsoModel || ""} onChange={handleChange} placeholder="e.g. Model-X" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="trsoRev" className="text-xs font-medium">TRSO Rev</Label>
                                    <Input id="trsoRev" value={formData.trsoRev || ""} onChange={handleChange} placeholder="e.g. 02" className="h-9 text-sm" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* IQA & PPAP Details */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">IQA & PPAP Details</CardTitle>
                                    <p className="text-xs text-muted-foreground">Quality assurance and PPAP status</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1.5">
                                    <Label htmlFor="iqaDate" className="text-xs font-medium">IQA Date</Label>
                                    <Input id="iqaDate" value={formData.iqaDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="iqaModel" className="text-xs font-medium">IQA Model</Label>
                                    <Input id="iqaModel" value={formData.iqaModel || ""} onChange={handleChange} placeholder="e.g. IQA-M1" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="iqaVcNumber" className="text-xs font-medium">IQA VC Number</Label>
                                    <Input id="iqaVcNumber" value={formData.iqaVcNumber || ""} onChange={handleChange} placeholder="e.g. VC-1001" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ppapIntimateDate" className="text-xs font-medium">PPAP Intimate Date</Label>
                                    <Input id="ppapIntimateDate" value={formData.ppapIntimateDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ppapClosingDate" className="text-xs font-medium">PPAP Closing Date</Label>
                                    <Input id="ppapClosingDate" value={formData.ppapClosingDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ppapStatus" className="text-xs font-medium">PPAP Status</Label>
                                    <Select value={formData.ppapStatus || ""} onValueChange={(val) => handleSelectChange("ppapStatus", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Initiated">Initiated</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Closed">Closed</SelectItem>
                                            <SelectItem value="On Hold">On Hold</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="status" className="text-xs font-medium">Global Status</Label>
                                    <Select value={formData.status || ""} onValueChange={(val) => handleSelectChange("status", val as string)}>
                                        <SelectTrigger className="h-9 text-sm">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Approved">Approved</SelectItem>
                                            <SelectItem value="Pending">Pending</SelectItem>
                                            <SelectItem value="Rejected">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Document Upload */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                        <FileCheck className="w-4 h-4 text-violet-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-semibold">Document Upload</CardTitle>
                                        <p className="text-xs text-muted-foreground">Upload multiple related product documents (PDFs, images)</p>
                                    </div>
                                </div>
                                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="text-xs">
                                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                                    Add Files
                                </Button>
                                <input type="file" ref={fileInputRef} className="hidden" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={handleFileChange} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            {files.length === 0 ? (
                                <div 
                                    className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <Upload className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <p className="text-sm font-medium">Click to upload documents</p>
                                    <p className="text-xs text-muted-foreground mt-1">PDF, DOC, JPEG, PNG — Max 10MB each</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {files.map(file => (
                                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/10">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                                                <span className="text-xs font-medium truncate" title={file.name}>{file.name}</span>
                                            </div>
                                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeFile(file.id)}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pb-6 sticky bottom-0 bg-background/90 backdrop-blur-md pt-4 z-10 border-t mt-8">
                        {isPopup ? (
                            <Button type="button" variant="outline" size="sm" onClick={onCancel} className="h-9 text-xs">
                                Cancel
                            </Button>
                        ) : (
                            <Link href="/product-master">
                                <Button type="button" variant="outline" size="sm" className="h-9 text-xs">
                                    Cancel
                                </Button>
                            </Link>
                        )}
                        <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 gap-1.5 text-xs">
                            <Save className="w-3.5 h-3.5" />
                            {isEdit ? "Save Changes" : "Save Product"}
                        </Button>
                    </div>
                </form>
            </div>
    );

    if (isPopup) {
        return content;
    }

    return (
        <DashboardLayout>
            {content}
        </DashboardLayout>
    );
}
