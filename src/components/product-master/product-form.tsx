"use client";

import { useState, useEffect, useRef, useMemo } from "react";
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
    Eye,
    Loader2,
    Plus,
    ImageIcon,
    X
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";
import { useProducts } from "@/contexts/ProductsContext";
import { Product } from "@/types/api";
import { toast } from "sonner";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";

interface ProductFormProps {
    isEdit?: boolean;
    productId?: number;
    initialData?: Product | null;
    isPopup?: boolean;
    onSuccess?: () => void;
    onCancel?: () => void;
}




const FIELD_LABELS: Record<string, string> = {
    customer: "Customer Name",
    vendorCode: "Vendor Code",
    poNumber: "PO Number",
    supplyDate: "Supply Date",
    sampleStatus: "Sample Status",
    sampleSupplyMode: "Sample Supply Mode",
    acceptedMailDate: "Accepted Mail Date",
    trsoDate: "TRSO Date",
    trsoModel: "TRSO Model",
    trsoRev: "TRSO Rev",
    iqaDate: "IQA Date",
    iqaModel: "IQA Model",
    iqaVcNumber: "IQA VC Number",
    ppapIntimateDate: "PPAP Intimate Date",
    ppapClosingDate: "PPAP Closing Date",
    ppapStatus: "PPAP Status",
    revNo: "Rev No",
    drawingNumber: "Drawing Number",
    drawingModel: "Drawing Model",
    vehicleType: "Vehicle Type",
    partNumber: "Part No.",
    partDescription: "Part Description",
    partWeightKg: "Part Weight in kg"
};





const formatLabel = (key: string) => {
    if (FIELD_LABELS[key]) return FIELD_LABELS[key];
    const split = key.replace(/([A-Z])/g, ' $1').trim();
    return split.charAt(0).toUpperCase() + split.slice(1);
};

export function ProductForm({ isEdit = false, productId, initialData, isPopup = false, onSuccess, onCancel }: ProductFormProps) {
    const router = useRouter();
    const { createProduct, updateProduct, uploadDocument, deleteDocument, getProductByPart, uploadProductImage, deleteProductImage } = useProducts();
        const { data: dynamicData, loading: dynamicLoading } = useDynamicFields();
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Document View State
    const [viewDoc, setViewDoc] = useState<{name: string, url: string} | null>(null);
    const [isDeletingDoc, setIsDeletingDoc] = useState(false);
    const [existingDocs, setExistingDocs] = useState<Record<string, string>>({});

    // Product Images State
    const [existingImages, setExistingImages] = useState<Record<string, string>>({});
    const [newImageLabel, setNewImageLabel] = useState("");
    const [newImageFile, setNewImageFile] = useState<File | null>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDeletingImage, setIsDeletingImage] = useState<string | null>(null);
    const [viewImage, setViewImage] = useState<{label: string, url: string} | null>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    // Pending images queued before product is created
    const [pendingImages, setPendingImages] = useState<{id: string; label: string; file: File}[]>([]);
    
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

    // File state
    const [files, setFiles] = useState<{ id: string; name: string; category: string; type: string; file: File }[]>([]);
    const [newDocCategory, setNewDocCategory] = useState<"individual" | "ppap">("individual");
    const [newDocName, setNewDocName] = useState("");
    const [customDocName, setCustomDocName] = useState("");
    const [newDocFile, setNewDocFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Drawing upload state
    const [drawingFile, setDrawingFile] = useState<File | null>(null);
    const [existingDrawingUrl, setExistingDrawingUrl] = useState<string | null>(null);
    const [isUploadingDrawing, setIsUploadingDrawing] = useState(false);
    const drawingInputRef = useRef<HTMLInputElement>(null);


    const INDIVIDUAL_DOCS = dynamicData?.documents.filter(
        (doc) => doc.category === "individual"
    ) || [];
    const PPAP_DOCS = dynamicData?.documents.filter(
        (doc) => doc.category === "ppap"
    ) || [];
    // Helper to view files
    const getFileUrl = (filePath: string) => {
        if (filePath.startsWith('http')) return filePath;
        const normalizedPath = filePath.replace(/\\/g, '/');
        return `${process.env.NEXT_PUBLIC_URL}/${normalizedPath}`;
    };

    // Load Data for Edit
    useEffect(() => {
        if (isEdit && initialData) {
            setFormData({
                partNumber: initialData.part_number || "",
                customer: initialData.customer || "",
                status: initialData.status || "Pending",
                ...(initialData.specification || {})
            });
            
            if (initialData.ppap_documents) {
                try {
                    const raw = typeof initialData.ppap_documents === 'string' 
                        ? JSON.parse(initialData.ppap_documents) 
                        : initialData.ppap_documents;
                    // Handle categorized shape: flatten both buckets for display
                    if (raw && (raw.individual || raw.ppap)) {
                        setExistingDocs({ ...(raw.individual || {}), ...(raw.ppap || {}) });
                        // Extract existing drawing URL
                        const drawingPath = raw.individual?.Drawing || raw.ppap?.Drawing;
                        if (drawingPath) {
                            setExistingDrawingUrl(getFileUrl(drawingPath));
                        }
                    } else {
                        setExistingDocs(raw || {});
                        if (raw?.Drawing) {
                            setExistingDrawingUrl(getFileUrl(raw.Drawing));
                        }
                    }
                } catch (e) {
                    console.error("Failed to parse documents", e);
                }
            }

            // Load product_images
            if (initialData.product_images) {
                try {
                    const raw = typeof initialData.product_images === 'string'
                        ? JSON.parse(initialData.product_images)
                        : initialData.product_images;
                    setExistingImages(raw || {});
                } catch (e) {
                    console.error("Failed to parse product_images", e);
                }
            }
        }
    }, [isEdit, initialData]);

        const allFields = useMemo(() => {
            const fields = dynamicData?.product_fields || [];
            return fields.map(f => ({ key: f.name, label: formatLabel(f.name) }));
        }, [dynamicData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSelectChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleAddFile = () => {
        const finalName = newDocName === "Others" ? customDocName : newDocName;
        if (!finalName || !newDocFile) return;

        setFiles(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            name: finalName,
            category: newDocCategory,
            type: newDocFile.type,
            file: newDocFile
        }]);
        setNewDocName("");
        setCustomDocName("");
        setNewDocFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles(prev => prev.filter(f => f.id !== id));
    };

    const handleDeleteExistingDoc = async (fileName: string) => {
        if (!productId) return;
        setIsDeletingDoc(true);
        // Try deleting from both categories
        const success = await deleteDocument(productId, "individual", fileName) || await deleteDocument(productId, "ppap", fileName);
        if (success) {
            setViewDoc(null);
            
            // Refresh documents by fetching product again
            if (formData.partNumber) {
                const updated = await getProductByPart(formData.partNumber);
                if (updated && updated.ppap_documents) {
                    try {
                        const raw = typeof updated.ppap_documents === 'string' 
                            ? JSON.parse(updated.ppap_documents) 
                            : updated.ppap_documents;
                        if (raw && (raw.individual || raw.ppap)) {
                            setExistingDocs({ ...(raw.individual || {}), ...(raw.ppap || {}) });
                        } else {
                            setExistingDocs(raw || {});
                        }
                    } catch (e) {
                        console.error(e);
                    }
                } else {
                    setExistingDocs({});
                }
            }
        }
        setIsDeletingDoc(false);
    };

    // ---- Product Image Handlers ----
    const handleUploadImageNow = async () => {
        if (!newImageLabel.trim() || !newImageFile || !productId) return;
        setIsUploadingImage(true);
        const result = await uploadProductImage(productId, newImageLabel.trim(), newImageFile);
        if (result) {
            setExistingImages(result);
            setNewImageLabel("");
            setNewImageFile(null);
            if (imageInputRef.current) imageInputRef.current.value = '';
        }
        setIsUploadingImage(false);
    };

    const handleAddPendingImage = () => {
        if (!newImageLabel.trim() || !newImageFile) return;
        setPendingImages(prev => [...prev, {
            id: Math.random().toString(36).substring(7),
            label: newImageLabel.trim(),
            file: newImageFile
        }]);
        setNewImageLabel("");
        setNewImageFile(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    const handleDeleteImage = async (label: string) => {
        if (!productId) {
            // Not saved yet — remove from pending
            setPendingImages(prev => prev.filter(p => p.label !== label));
            return;
        }
        setIsDeletingImage(label);
        const result = await deleteProductImage(productId, label);
        if (result) {
            setExistingImages(result);
        }
        setIsDeletingImage(null);
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

                if (hasChanges) {
                    const success = await updateProduct(productId, payload);
                    if (!success) {
                        setIsSubmitting(false);
                        return;
                    }
                }
                
                // Upload drawing if selected
                if (drawingFile) {
                    await uploadDocument(productId, "individual", "Drawing", drawingFile);
                }

                // Upload new documents if any
                if (files.length > 0) {
                    for (const f of files) {
                        await uploadDocument(productId, f.category, f.name, f.file);
                    }
                }

                // Upload pending product images (in edit mode, images are uploaded immediately;
                // this path handles any images added before the product existed)
                if (pendingImages.length > 0) {
                    for (const img of pendingImages) {
                        await uploadProductImage(productId, img.label, img.file);
                    }
                    setPendingImages([]);
                }

                toast.success("Product saved successfully.");
                if (onSuccess) onSuccess();
                else router.push("/product-master");
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

                const createdId = await createProduct(payload);
                if (createdId !== false) {
                    if (typeof createdId === 'number') {
                        // Upload drawing if selected
                        if (drawingFile) {
                            await uploadDocument(createdId, "individual", "Drawing", drawingFile);
                        }
                        // Upload documents if any
                        if (files.length > 0) {
                            for (const f of files) {
                                await uploadDocument(createdId, f.category, f.name, f.file);
                            }
                        }
                        // Upload pending product images
                        if (pendingImages.length > 0) {
                            for (const img of pendingImages) {
                                await uploadProductImage(createdId, img.label, img.file);
                            }
                        }
                    }
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
                                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
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
                                    <Label className="text-xs font-medium">Series</Label>
                                    <Input 
                                        name="series" 
                                        value={formData.series || ""} 
                                        onChange={handleChange} 
                                        placeholder="e.g. 1000" 
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

                            {/* Upload Drawing */}
                            <Separator className="my-2" />
                            <div className="space-y-3">
                                <Label className="text-xs font-medium">Upload Drawing</Label>
                                {existingDrawingUrl && !drawingFile ? (
                                    <div className="flex items-center gap-3 p-3 border rounded-lg bg-background shadow-sm">
                                        <div 
                                            className="flex items-center gap-3 flex-1 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                                            onClick={() => setViewDoc({ name: 'Drawing', url: existingDrawingUrl })}
                                        >
                                            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                <FileText className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <div className="overflow-hidden">
                                                <span className="text-sm font-semibold block truncate">Drawing</span>
                                                <span className="text-[10px] text-muted-foreground block">Click to view drawing</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-primary hover:text-primary/80 hover:bg-primary/10"
                                                onClick={() => setViewDoc({ name: 'Drawing', url: existingDrawingUrl! })}
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => {
                                                    if (window.confirm("Are you sure you want to delete this drawing?")) {          
                                                        if (drawingInputRef.current) drawingInputRef.current.value = '';
                                                        setDrawingFile(null);
                                                        setExistingDrawingUrl(null);
                                                        if (isEdit && productId) {
                                                            handleDeleteExistingDoc('Drawing');
                                                        }
                                                    }
                                                }}
                                                disabled={isDeletingDoc}
                                            >
                                                {isDeletingDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed rounded-xl p-4 hover:bg-muted/20 transition-colors relative">
                                        <Input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg,.png,.dwg,.dxf"
                                            ref={drawingInputRef}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files.length > 0) {
                                                    setDrawingFile(e.target.files[0]);
                                                }
                                            }}
                                        />
                                        {drawingFile ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                                                        <Upload className="w-5 h-5 text-teal-600" />
                                                    </div>
                                                    <div>
                                                        <span className="text-sm font-semibold block truncate max-w-[250px]">{drawingFile.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">Ready to upload on save</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 relative z-20"
                                                    onClick={(e) => {
                                                        setDrawingFile(null);
                                                        e.stopPropagation();
                                                        if (drawingInputRef.current) drawingInputRef.current.value = '';
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center text-center py-2">
                                                <Upload className="w-6 h-6 text-muted-foreground mb-2" />
                                                <p className="text-sm font-medium text-foreground">Click or drag drawing file here</p>
                                                <p className="text-xs text-muted-foreground mt-1">PDF, Images, DWG, DXF (Max 10MB)</p>
                                            </div>
                                        )}
                                    </div>
                                )}
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
                                        disabled={ true }

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
                                    <Input id="poNumber" name="poNumber" value={formData.poNumber || ""} onChange={handleChange} placeholder="e.g. PO-2023-001" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="supplyDate" className="text-xs font-medium">Supply Date</Label>
                                    <Input id="supplyDate" name="supplyDate" value={formData.supplyDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
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
                                    <Input id="acceptedMailDate" name="acceptedMailDate" value={formData.acceptedMailDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
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
                                    <Input id="trsoDate" name="trsoDate" value={formData.trsoDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="trsoModel" className="text-xs font-medium">TRSO Model</Label>
                                    <Input id="trsoModel" name="trsoModel" value={formData.trsoModel || ""} onChange={handleChange} placeholder="e.g. Model-X" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="trsoRev" className="text-xs font-medium">TRSO Rev</Label>
                                    <Input id="trsoRev" name="trsoRev" value={formData.trsoRev || ""} onChange={handleChange} placeholder="e.g. 02" className="h-9 text-sm" />
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
                                    <Input id="iqaDate" name="iqaDate" value={formData.iqaDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="iqaModel" className="text-xs font-medium">IQA Model</Label>
                                    <Input id="iqaModel" name="iqaModel" value={formData.iqaModel || ""} onChange={handleChange} placeholder="e.g. IQA-M1" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="iqaVcNumber" className="text-xs font-medium">IQA VC Number</Label>
                                    <Input id="iqaVcNumber" name="iqaVcNumber" value={formData.iqaVcNumber || ""} onChange={handleChange} placeholder="e.g. VC-1001" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ppapIntimateDate" className="text-xs font-medium">PPAP Intimate Date</Label>
                                    <Input id="ppapIntimateDate" name="ppapIntimateDate" value={formData.ppapIntimateDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="ppapClosingDate" className="text-xs font-medium">PPAP Closing Date</Label>
                                    <Input id="ppapClosingDate" name="ppapClosingDate" value={formData.ppapClosingDate || ""} onChange={handleChange} type="date" className="h-9 text-sm" />
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
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Existing Documents */}
                            {Object.entries(existingDocs).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium">Existing Documents</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {Object.entries(existingDocs).map(([name, url]) => (
                                            <div key={name} className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm hover:border-primary/30 transition-colors">
                                                <div 
                                                    className="flex items-center gap-3 overflow-hidden cursor-pointer" 
                                                    onClick={() => setViewDoc({name, url: getFileUrl(url)})}
                                                >
                                                    <FileText className="w-4 h-4 text-primary shrink-0" />
                                                    <div>
                                                        <span className="text-xs font-semibold truncate block" title={name}>{name}</span>
                                                        <span className="text-[10px] text-muted-foreground block">Click to view</span>
                                                    </div>
                                                </div>
                                                <Button 
                                                    type="button" 
                                                    variant="ghost" 
                                                    size="icon" 
                                                    className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    disabled={isDeletingDoc}
                                                    onClick={() => handleDeleteExistingDoc(name)}
                                                >
                                                    {isDeletingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-4" />
                                </div>
                            )}

                            {/* New Uploads */}
                            <div className="space-y-4 pt-2">
                                <h4 className="text-sm font-medium">Add New Document</h4>
                                <div className="space-y-4 bg-muted/10 p-4 rounded-xl border border-dashed text-foreground">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Document Category</Label>
                                            <Select value={newDocCategory} onValueChange={(val) => {
                                                setNewDocCategory(val as "individual" | "ppap");
                                                setNewDocName("");
                                                setCustomDocName("");
                                            }}>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue placeholder="Select Category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="individual">Individual Docs</SelectItem>
                                                    <SelectItem value="ppap">PPAP Docs</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-medium">Document Name</Label>
                                            <Select value={newDocName} onValueChange={(val) => {
                                                setNewDocName(val as string);
                                                if (val !== "Others") setCustomDocName("");
                                            }}>
                                                <SelectTrigger className="h-9 text-sm">
                                                    <SelectValue placeholder="Select Name" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {
                                                        newDocCategory === "individual" ? INDIVIDUAL_DOCS.map(doc => (
                                                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                                                        )) : PPAP_DOCS.map(doc => (
                                                            <SelectItem key={doc.name} value={doc.name}>{doc.name}</SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>



                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Select File</Label>
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                type="file" 
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setNewDocFile(e.target.files[0]);
                                                    } else {
                                                        setNewDocFile(null);
                                                    }
                                                }}
                                                className="h-9 text-xs flex-1 bg-background border-border"
                                                ref={fileInputRef}
                                            />
                                            <Button 
                                                type="button" 
                                                onClick={handleAddFile} 
                                                disabled={!newDocName || (newDocName === "Others" && !customDocName) || !newDocFile}
                                                className="h-9 bg-primary text-primary-foreground"
                                            >
                                                <Plus className="w-4 h-4 mr-1" /> Add
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                                
                                {files.length > 0 && (
                                    <div className="space-y-3 mt-4">
                                        <h4 className="text-sm font-medium">Files to upload upon save</h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {files.map(file => (
                                                <div key={file.id} className="flex items-center justify-between p-3 border border-dashed rounded-lg bg-muted/10">
                                                    <div className="flex items-center gap-3 overflow-hidden">
                                                        <FileText className="w-4 h-4 text-violet-500 shrink-0" />
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className="text-xs font-semibold truncate" title={file.name}>{file.name}</span>
                                                            <span className="text-[10px] text-muted-foreground truncate" title={file.file.name}>{file.file.name}</span>
                                                        </div>
                                                    </div>
                                                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeFile(file.id)}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Product Images */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center">
                                    <ImageIcon className="w-4 h-4 text-pink-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-sm font-semibold">Product Images</CardTitle>
                                    <p className="text-xs text-muted-foreground">Label-based product part images (JPG, PNG, SVG, WEBP, PDF — max 20 MB)</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            {/* Existing images */}
                            {Object.entries(existingImages).length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium">Uploaded Images</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {Object.entries(existingImages).map(([label, path]) => {
                                            const url = getFileUrl(path);
                                            const isImg = /\.(jpeg|jpg|gif|png|svg|webp)$/i.test(path);
                                            return (
                                                <div
                                                    key={label}
                                                    className="group relative border rounded-xl overflow-hidden bg-muted/10 hover:border-pink-300 transition-colors"
                                                >
                                                    {/* Thumbnail */}
                                                    <div
                                                        className="w-full h-28 flex items-center justify-center cursor-pointer"
                                                        onClick={() => setViewImage({ label, url })}
                                                    >
                                                        {isImg ? (
                                                            <img
                                                                src={url}
                                                                alt={label}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                                                <FileText className="w-8 h-8" />
                                                                <span className="text-[10px]">PDF</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {/* Label + Actions */}
                                                    <div className="flex items-center justify-between px-2 py-1.5 border-t bg-background">
                                                        <span className="text-[11px] font-medium truncate flex-1" title={label}>{label}</span>
                                                        <div className="flex items-center gap-0.5 shrink-0">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-primary hover:text-primary/80 hover:bg-primary/10"
                                                                onClick={() => setViewImage({ label, url })}
                                                            >
                                                                <Eye className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                disabled={isDeletingImage === label}
                                                                onClick={() => handleDeleteImage(label)}
                                                            >
                                                                {isDeletingImage === label
                                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                                    : <Trash2 className="w-3.5 h-3.5" />}
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <Separator className="my-4" />
                                </div>
                            )}

                            {/* Pending images (create mode queue) */}
                            {pendingImages.length > 0 && (
                                <div className="space-y-3">
                                    <h4 className="text-sm font-medium text-amber-600">Queued — will upload on save</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {pendingImages.map(img => (
                                            <div key={img.id} className="border border-dashed rounded-xl overflow-hidden bg-amber-50/30">
                                                <div className="w-full h-24 flex items-center justify-center bg-muted/20">
                                                    {img.file.type.startsWith('image/') ? (
                                                        <img
                                                            src={URL.createObjectURL(img.file)}
                                                            alt={img.label}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <FileText className="w-8 h-8 text-muted-foreground" />
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between px-2 py-1.5 border-t bg-background">
                                                    <span className="text-[11px] font-medium truncate flex-1" title={img.label}>{img.label}</span>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteImage(img.label)}
                                                    >
                                                        <X className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <Separator className="my-4" />
                                </div>
                            )}

                            {/* Add new image */}
                            <div className="bg-muted/10 border border-dashed rounded-xl p-4 space-y-3">
                                <h4 className="text-sm font-medium">Add Image</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Image Label</Label>
                                        {/* <Input
                                            placeholder="e.g. Tube Dia & Thickness"
                                            value={newImageLabel}
                                            onChange={(e) => setNewImageLabel(e.target.value)}
                                            className="h-9 text-sm bg-background border-border"
                                        /> */}
                                        <select
                                            value={newImageLabel}
                                            onChange={(e) => setNewImageLabel(e.target.value)}
                                        > 
                                            <option value="">Select Image Label</option>
                                            {allFields.map((field) => (
                                                <option key={field.key} value={field.key}> {field.label}</option>
                                            ))} 
                                        </select> 

                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-medium">Select Image / PDF</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="file"
                                                accept=".jpg,.jpeg,.png,.svg,.webp,.pdf"
                                                ref={imageInputRef}
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files.length > 0) {
                                                        setNewImageFile(e.target.files[0]);
                                                    } else {
                                                        setNewImageFile(null);
                                                    }
                                                }}
                                                className="h-9 text-xs flex-1 bg-background border-border"
                                            />
                                            {isEdit && productId ? (
                                                <Button
                                                    type="button"
                                                    onClick={handleUploadImageNow}
                                                    disabled={!newImageLabel.trim() || !newImageFile || isUploadingImage}
                                                    className="h-9 bg-pink-600 hover:bg-pink-700 text-white shrink-0"
                                                >
                                                    {isUploadingImage
                                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                                        : <Upload className="w-4 h-4" />}
                                                    <span className="ml-1">Upload</span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    type="button"
                                                    onClick={handleAddPendingImage}
                                                    disabled={!newImageLabel.trim() || !newImageFile}
                                                    className="h-9 bg-pink-600 hover:bg-pink-700 text-white shrink-0"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    <span className="ml-1">Queue</span>
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {!isEdit && (
                                    <p className="text-[11px] text-amber-600">
                                        Images will be uploaded automatically when you save the product.
                                    </p>
                                )}
                            </div>

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
                            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            {isEdit ? "Save Changes" : "Save Product"}
                        </Button>
                    </div>
                </form>

                {/* View Document Modal */}
                <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                    <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg">{viewDoc?.name}</DialogTitle>
                                    <p className="text-sm text-muted-foreground">{formData.partNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mx-4">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    disabled={isDeletingDoc}
                                    onClick={() => viewDoc && handleDeleteExistingDoc(viewDoc.name)}
                                >
                                    {isDeletingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 bg-muted/10 p-4 relative overflow-auto">
                            {viewDoc && (
                                <div className="w-full h-full min-h-[500px] bg-background border rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                    {viewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                        <img src={viewDoc.url} alt={viewDoc.name} className="max-w-full max-h-full object-contain p-4" />
                                    ) : (
                                        <iframe
                                            src={viewDoc.url}
                                            className="w-full h-full border-0"
                                            title={viewDoc.name}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

                {/* View Image Modal */}
                <Dialog open={!!viewImage} onOpenChange={(open) => !open && setViewImage(null)}>
                    <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                                    <ImageIcon className="w-5 h-5 text-pink-600" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg">{viewImage?.label}</DialogTitle>
                                    <p className="text-sm text-muted-foreground">{formData.partNumber}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mx-4">
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="gap-2"
                                    disabled={!!isDeletingImage}
                                    onClick={() => {
                                        if (viewImage) {
                                            handleDeleteImage(viewImage.label);
                                            setViewImage(null);
                                        }
                                    }}
                                >
                                    {isDeletingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    Delete
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 bg-muted/10 p-4 relative overflow-auto">
                            {viewImage && (
                                <div className="w-full h-full min-h-[500px] bg-background border rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                    {viewImage.url.match(/\.(jpeg|jpg|gif|png|svg|webp)$/i) ? (
                                        <img src={viewImage.url} alt={viewImage.label} className="max-w-full max-h-full object-contain p-4" />
                                    ) : (
                                        <iframe
                                            src={viewImage.url}
                                            className="w-full h-full border-0"
                                            title={viewImage.label}
                                        />
                                    )}
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

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
