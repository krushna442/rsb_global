"use client";

import { useState, useCallback, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProducts } from "@/contexts/ProductsContext";
import { Product } from "@/types/api";
import {
    CheckCircle2,
    XCircle,
    Clock,
    Package,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; badge: string }> = {
    pending: { label: "Pending", color: "text-orange-600", icon: Clock, badge: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Approved", color: "text-emerald-600", icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", color: "text-red-600", icon: XCircle, badge: "bg-red-50 text-red-700 border-red-200" },
};

// Define fields outside component to avoid recreation
const FIELDS = [
    { key: "customer", label: "Customer Name" },
    { key: "vendorCode", label: "Vendor Code" },
    { key: "poNumber", label: "PO Number" },
    { key: "supplyDate", label: "Supply Date" },
    { key: "sampleStatus", label: "Sample Status" },
    { key: "sampleSupplyMode", label: "Sample Supply Mode" },
    { key: "acceptedMailDate", label: "Accepted Mail Date" },
    { key: "trsoDate", label: "TRSO Date" },
    { key: "trsoModel", label: "TRSO Model" },
    { key: "trsoRev", label: "TRSO Rev" },
    { key: "iqaDate", label: "IQA Date" },
    { key: "iqaModel", label: "IQA Model" },
    { key: "iqaVcNumber", label: "IQA VC Number" },
    { key: "ppapIntimateDate", label: "PPAP Intimate Date" },
    { key: "ppapClosingDate", label: "PPAP Closing Date" },
    { key: "ppapStatus", label: "PPAP Status" },
    { key: "revNo", label: "Rev No" },
    { key: "drawingNumber", label: "Drawing Number" },
    { key: "drawingModel", label: "Drawing Model" },
    { key: "vehicleType", label: "Vehicle Type" },
    { key: "partNumber", label: "Part No." },
    { key: "partDescription", label: "Part Description" },
    { key: "partWeightKg", label: "Part Weight in kg" },
];

export default function ApprovalsPage() {
    const { products, updateApproval, loading } = useProducts();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [reviewedFields, setReviewedFields] = useState<Set<string>>(new Set());

    const getStatus = useCallback((status?: string) => {
        const s = status?.toLowerCase() || "pending";
        return ["pending", "verified", "approved", "rejected"].includes(s) ? s : "pending";
    }, []);

    const handleAction = useCallback((product: Product, newStatus: string) => {
        updateApproval(product.id, newStatus.toLowerCase() as any);
        if (selectedProduct?.id === product.id) {
            setSelectedProduct(null);
            setReviewedFields(new Set());
        }
    }, [updateApproval, selectedProduct]);

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
    }, []);

    // Memoize stats to avoid recalculation on every render
    const stats = useMemo(() => {
        const pending = products.filter(p => getStatus(p.approved) === "pending").length;
        const approved = products.filter(p => getStatus(p.approved) === "approved").length;
        const rejected = products.filter(p => getStatus(p.approved) === "rejected").length;
        
        return [
            { label: "Pending", count: pending, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Approved", count: approved, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Rejected", count: rejected, color: "text-red-600", bg: "bg-red-50" },
        ];
    }, [products, getStatus]);

    if (loading) {
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
                    <h1 className="text-2xl font-bold tracking-tight">Approval Workflow</h1>
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
                                <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Tabs */}
                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="bg-muted/50 h-9">
                        <TabsTrigger value="pending" className="text-xs data-[state=active]:shadow-sm">Pending</TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs data-[state=active]:shadow-sm">Approved</TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs data-[state=active]:shadow-sm">Rejected</TabsTrigger>
                    </TabsList>

                    {(["pending", "approved", "rejected"] as const).map((status) => {
                        const filtered = products.filter(p => getStatus(p.approved) === status);
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
                                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                            <span>Added Recently</span>
                                                        </div>
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
                        <DialogTitle className="text-lg font-semibold">Product Details for Approval</DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Click each field to mark it as reviewed. All fields must be reviewed before approving.
                        </p>
                    </DialogHeader>

                    {selectedProduct && (() => {
                        const allReviewed = reviewedFields.size === FIELDS.length;
                        const reviewedCount = reviewedFields.size;
                        const currentStatus = getStatus(selectedProduct.approved);

                        return (
                            <div className="space-y-5 mt-4">
                                {/* Progress indicator */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-150"
                                            style={{ width: `${(reviewedCount / FIELDS.length) * 100}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {reviewedCount} / {FIELDS.length} reviewed
                                    </span>
                                </div>

                                {/* Field grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                                    {FIELDS.map(({ key, label }) => {
                                        const isReviewed = reviewedFields.has(key);
                                        const value = (selectedProduct as any)[key] || selectedProduct?.specification?.[key];
                                        
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
                                                <span className={`font-medium text-sm break-words ${isReviewed ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                                                    {value || "-"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer */}
                                <DialogFooter className="flex flex-col sm:flex-row items-center gap-2 mt-6 pt-4 border-t">
                                    {!allReviewed && (
                                        <p className="text-xs text-amber-600 mr-auto">
                                            ⚠ Review all {FIELDS.length - reviewedCount} remaining field(s) to enable approval.
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