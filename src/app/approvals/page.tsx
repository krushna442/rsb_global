"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProducts } from "@/contexts/ProductsContext";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
import { Product } from "@/types/api";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Package,
    FileImage,
    Search,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; badge: string }> = {
    pending: { label: "Pending", color: "text-orange-600", icon: Clock, badge: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Approved", color: "text-emerald-600", icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", color: "text-red-600", icon: XCircle, badge: "bg-red-50 text-red-700 border-red-200" },
};

// Map for known labels
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

// Helper to get the drawing URL from ppap_documents
const getDrawingUrl = (product: Product): string | null => {
    const raw = product.ppap_documents;
    if (!raw) return null;
    try {
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== 'object') return null;
        
        // Check for "drawing" or "Drawing" in both individual and ppap categories
        const path = parsed?.individual?.drawing || 
                     parsed?.individual?.Drawing || 
                     parsed?.ppap?.drawing || 
                     parsed?.ppap?.Drawing;
                     
        if (!path || path === "not_required") return null;
        if (path.startsWith('http')) return path;
        const normalizedPath = path.replace(/\\/g, '/');
        return `${process.env.NEXT_PUBLIC_URL}/${normalizedPath}`;
    } catch {
        return null;
    }
};

export default function ProductionApprovalPage() {
    const { products, updateApproval, loading } = useProducts();
    const { data: dynamicData, loading: dynamicLoading } = useDynamicFields();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [reviewedFields, setReviewedFields] = useState<Set<string>>(new Set());
    const [remark, setRemark] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

const allFields = [
  { key: "partNumber", label: formatLabel("partNumber") },
  { key: "customer", label: formatLabel("customer") },
  { key: "vendorCode", label: formatLabel("vendorCode") },
  { key: "partType", label: formatLabel("partType") },
  { key: "partDescription", label: formatLabel("partDescription") },
  { key: "series", label: formatLabel("series") },
  { key: "revNo", label: formatLabel("revNo") },
  { key: "tubeLength", label: formatLabel("tubeLength") },
  { key: "tubeDiameter", label: formatLabel("tubeDiameter") },
  { key: "partWeightKg", label: formatLabel("partWeightKg") },
  { key: "totalLength", label: formatLabel("totalLength") },
  { key: "noiseDeadenerLength", label: formatLabel("noiseDeadenerLength") },
  { key: "availableNoiseDeadener", label: formatLabel("availableNoiseDeadener") },
  { key: "rearHousingLength", label: formatLabel("rearHousingLength") },
  { key: "longForkLength", label: formatLabel("longForkLength") },
  { key: "pdcLength", label: formatLabel("pdcLength") },
  { key: "drawingNumber", label: formatLabel("drawingNumber") },
  { key: "drawingModel", label: formatLabel("drawingModel") },
  { key: "fepPressHStockPositions", label: formatLabel("fepPressHStockPositions") },
  { key: "frontEndPieceDetails", label: formatLabel("frontEndPieceDetails") },
  { key: "sfDetails", label: formatLabel("sfDetails") },
  { key: "couplingFlangeOrientations", label: formatLabel("couplingFlangeOrientations") },
  { key: "hexBoltNutTighteningTorque", label: formatLabel("hexBoltNutTighteningTorque") },
  { key: "loctiteGradeUse", label: formatLabel("loctiteGradeUse") },
  { key: "cbKitDetails", label: formatLabel("cbKitDetails") },
  { key: "slipDetails", label: formatLabel("slipDetails") },
  { key: "greaseableOrNonGreaseable", label: formatLabel("greaseableOrNonGreaseable") },
  { key: "mountingDetailsFlangeYoke", label: formatLabel("mountingDetailsFlangeYoke") },
  { key: "mountingDetailsCouplingFlange", label: formatLabel("mountingDetailsCouplingFlange") },
  { key: "iaBellowDetails", label: formatLabel("iaBellowDetails") },
  { key: "balancingRpm", label: formatLabel("balancingRpm") },
  { key: "unbalanceInCmg", label: formatLabel("unbalanceInCmg") },
  { key: "unbalanceInGram", label: formatLabel("unbalanceInGram") },
  { key: "unbalanceInGram75Percent", label: formatLabel("unbalanceInGram75Percent") }
];

    const getStatus = useCallback((status?: string) => {
        const s = status?.toLowerCase() || "pending";
        return ["pending", "verified", "approved", "rejected"].includes(s) ? s : "pending";
    }, []);

    const handleAction = useCallback((product: Product, newStatus: string) => {
        updateApproval(product.id, newStatus.toLowerCase() as any, remark);
        if (selectedProduct?.id === product.id) {
            setSelectedProduct(null);
            setReviewedFields(new Set());
            setRemark("");
        }
    }, [updateApproval, selectedProduct, remark]);

    const handleFieldClick = useCallback((key: string) => {
        setReviewedFields(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    }, []);

    const handleCloseDialog = useCallback(() => {
        setSelectedProduct(null);
        setReviewedFields(new Set());
        setRemark("");
    }, []);

    // Filter products that have drawings
    const productsWithDrawing = useMemo(() => {
        return products.filter(p => !!getDrawingUrl(p));
    }, [products]);

    // Memoize stats to avoid recalculation on every render
    const stats = useMemo(() => {
        const pending = productsWithDrawing.filter(p => getStatus(p.approved) === "pending").length;
        const approved = productsWithDrawing.filter(p => getStatus(p.approved) === "approved").length;
        const rejected = productsWithDrawing.filter(p => getStatus(p.approved) === "rejected").length;
        
        return [
            { label: "Pending", count: pending, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Approved", count: approved, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Rejected", count: rejected, color: "text-red-600", bg: "bg-red-50" },
        ];
    }, [productsWithDrawing, getStatus]);

    if (loading || dynamicLoading) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Production Approval</h1>
                    <p className="text-sm text-muted-foreground mt-1">Review and manage product approval queue</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat) => (
                        <Card key={stat.label} className="border-0 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <span className={`text-lg font-bold ${stat.color}`}>{stat.count}</span>
                                </div>
                                <span className="text-[18px] font-medium text-muted-foreground">{stat.label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Search */}
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by part number or customer..."
                        className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Tabs */}
                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="bg-muted/50 h-9">
                        <TabsTrigger value="pending" className="text-xs data-[state=active]:shadow-sm">Pending</TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs data-[state=active]:shadow-sm">Approved</TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs data-[state=active]:shadow-sm">Rejected</TabsTrigger>
                    </TabsList>

                    {(["pending", "approved", "rejected"] as const).map((status) => {
                        const filtered = productsWithDrawing.filter(p => {
                            if (getStatus(p.approved) !== status) return false;
                            if (!searchQuery.trim()) return true;
                            const q = searchQuery.toLowerCase();
                            return (p.part_number || '').toLowerCase().includes(q) ||
                                   (p.customer || '').toLowerCase().includes(q);
                        });
                        const config = statusConfig[status];
                        
                        return (
                            <TabsContent key={status} value={status}>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filtered.map((product) => {
                                        const Icon = config.icon;
                                        return (
                                            <Card 
                                                key={product.id} 
                                                className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden cursor-pointer"
                                                onClick={() => {
                                                    setSelectedProduct(product);
                                                    setReviewedFields(new Set());
                                                    setRemark("");
                                                }}
                                            >
                                                <CardContent className="p-5">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                                <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-semibold font-mono">{product.part_number}</h3>
                                                                <p className="text-xs text-muted-foreground">{product.customer}</p>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className={`text-[10px] ${config.badge}`}>
                                                            <Icon className="w-3 h-3 mr-1" />
                                                            {config.label}
                                                        </Badge>
                                                    </div>

                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                                {filtered.length === 0 && (
                                    <Card className="border-0 shadow-sm">
                                        <CardContent className="py-16 text-center">
                                            <p className="text-sm text-muted-foreground">No {status} items</p>
                                        </CardContent>
                                    </Card>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>

            {/* Approval Details Popup */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && handleCloseDialog()}>
                <DialogContent className="w-[95vw] !max-w-6xl h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-semibold">Product Details for Production Approval</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Click each field to mark it as reviewed. All fields must be reviewed before approving.
                        </p>
                    </DialogHeader>

                    {selectedProduct && (() => {
                        const allReviewed = allFields.length === 0 || reviewedFields.size === allFields.length;
                        const reviewedCount = reviewedFields.size;
                        const totalCount = allFields.length;
                        const currentStatus = getStatus(selectedProduct.approved);

                        return (
                            <div className="space-y-5 mt-4">
                                {/* Progress indicator */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                                            style={{ width: `${totalCount > 0 ? (reviewedCount / totalCount) * 100 : 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {reviewedCount} / {totalCount} reviewed
                                    </span>
                                </div>

                                {/* View Drawing Button */}
                                {(() => {
                                    const drawingUrl = getDrawingUrl(selectedProduct);
                                    return drawingUrl ? (
                                        <div className="flex items-center gap-3 p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
                                            <div className="w-9 h-9 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                                                <FileImage className="w-4.5 h-4.5 text-purple-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-purple-900 dark:text-purple-200">Product Drawing Available</p>
                                                <p className="text-xs text-purple-600 dark:text-purple-400">Click to view the drawing document</p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-purple-300 text-purple-700 hover:bg-purple-100 hover:text-purple-800 gap-1.5"
                                                onClick={() => window.open(drawingUrl, '_blank')}
                                            >
                                                <FileImage className="w-3.5 h-3.5" />
                                                View Drawing
                                            </Button>
                                        </div>
                                    ) : null;
                                })()}

                                {/* Field grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                                    {allFields.map(({ key, label }) => {
                                        const isReviewed = reviewedFields.has(key);
                                        const topLevelMap: Record<string, string> = {
                                            partNumber: 'part_number',
                                            customer: 'customer',
                                        };
                                        const checkKey = topLevelMap[key] || key;
                                        let value = (selectedProduct as any)[checkKey];
                                        if (value === undefined) {
                                            value = selectedProduct?.specification?.[key];
                                        }
                                        
                                        return (
                                            <div
                                                key={key}
                                                onClick={() => handleFieldClick(key)}
                                                className={`relative cursor-pointer rounded-lg border-2 p-3 transition-all duration-100 select-none
                                                    ${isReviewed
                                                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                                        : "border-border bg-card hover:border-muted-foreground/40 hover:bg-muted/40"
                                                    }`}
                                            >
                                                {/* Checkmark badge */}
                                                {isReviewed && (
                                                    <span className="absolute top-2 right-2 text-emerald-600">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </span>
                                                )}
                                                <span className="text-muted-foreground block text-xs mb-1 pr-5">{label}</span>
                                                <span className={`font-bold text-sm break-words ${isReviewed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                                    {value || "-"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Remark field */}
                                <div className="space-y-2 pt-2">
                                    <Label htmlFor="approval-remark" className="text-sm font-medium">
                                        Remark 
                                    </Label>
                                    <Textarea
                                        id="approval-remark"
                                        placeholder="Add a remark for this approval or rejection..."
                                        value={remark}
                                        onChange={(e) => setRemark(e.target.value)}
                                        className="min-h-[80px] resize-none"
                                        required
                                    />
                                </div>

                                {/* Footer */}
                                <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 mt-6 pt-4 border-t">
                                    {!allReviewed && (
                                        <p className="text-xs text-amber-600 mr-auto">
                                            ⚠ Review all {totalCount - reviewedCount} remaining field(s) to enable approval.
                                        </p>
                                    )}
                                    <Button variant="outline" onClick={handleCloseDialog}>
                                        Cancel
                                    </Button>
                                    {currentStatus !== "approved" && (
                                        <Button
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            disabled={!allReviewed}
                                            onClick={() => handleAction(selectedProduct, "Approved")}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                        </Button>
                                    )}
                                    {currentStatus !== "rejected" && (
                                        <Button
                                            variant="destructive"
                                            onClick={() => handleAction(selectedProduct, "Rejected")}
                                        >
                                            <XCircle className="w-4 h-4 mr-2" /> Reject
                                        </Button>
                                    )}
                                </DialogFooter>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}