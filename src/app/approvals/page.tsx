"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useProducts, Product } from "@/lib/use-products";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ShieldCheck,
    Calendar,
    User,
    Package,
} from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; badge: string }> = {
    pending: { label: "Pending", color: "text-orange-600", icon: Clock, badge: "bg-orange-50 text-orange-700 border-orange-200" },
    approved: { label: "Approved", color: "text-emerald-600", icon: CheckCircle2, badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    rejected: { label: "Rejected", color: "text-red-600", icon: XCircle, badge: "bg-red-50 text-red-700 border-red-200" },
};

export default function ApprovalsPage() {
    const { products, updateProduct, isLoaded } = useProducts();
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const getStatus = (status?: string) => {
        const s = status?.toLowerCase() || "pending";
        return ["pending", "verified", "approved", "rejected"].includes(s) ? s : "pending";
    };

    const handleAction = (product: Product, newStatus: string) => {
        updateProduct(product.id, { status: newStatus });
        if (selectedProduct?.id === product.id) {
            setSelectedProduct(null); // Close modal on action
        }
    };

    if (!isLoaded) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Approval Workflow</h1>
                    <p className="text-sm text-muted-foreground mt-1">Review and manage product approval queue</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: "Pending", count: products.filter(p => getStatus(p.status) === "pending").length, color: "text-orange-600", bg: "bg-orange-50" },
                        { label: "Approved", count: products.filter(p => getStatus(p.status) === "approved").length, color: "text-emerald-600", bg: "bg-emerald-50" },
                        { label: "Rejected", count: products.filter(p => getStatus(p.status) === "rejected").length, color: "text-red-600", bg: "bg-red-50" },
                    ].map((stat) => (
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

                    {(["pending", "verified", "approved", "rejected"] as const).map((status) => {
                        const filtered = products.filter(p => getStatus(p.status) === status);
                        return (
                            <TabsContent key={status} value={status}>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                    {filtered.map((product) => {
                                        const config = statusConfig[status];
                                        const Icon = config.icon;
                                        return (
                                            <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden cursor-pointer" onClick={() => setSelectedProduct(product)}>
                                                <CardContent className="p-5">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                                <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-semibold font-mono">{product.partNumber}</h3>
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
                                                            <Calendar className="w-3 h-3" />
                                                            Added Recently
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
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Product Details for Approval</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div><span className="text-muted-foreground block text-xs">Customer Name</span><span className="font-medium">{selectedProduct.customer || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Vendor Code</span><span className="font-medium">{selectedProduct.vendorCode || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">PO Number</span><span className="font-medium">{selectedProduct.poNumber || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Supply Date</span><span className="font-medium">{selectedProduct.supplyDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Sample Status</span><span className="font-medium">{selectedProduct.sampleStatus || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Sample Supply Mode</span><span className="font-medium">{selectedProduct.sampleSupplyMode || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Accepted Mail Date</span><span className="font-medium">{selectedProduct.acceptedMailDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">TRSO Date</span><span className="font-medium">{selectedProduct.trsoDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">TRSO Model</span><span className="font-medium">{selectedProduct.trsoModel || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">TRSO Rev</span><span className="font-medium">{selectedProduct.trsoRev || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">IQA Date</span><span className="font-medium">{selectedProduct.iqaDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">IQA Model</span><span className="font-medium">{selectedProduct.iqaModel || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">IQA VC Number</span><span className="font-medium">{selectedProduct.iqaVcNumber || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">PPAP Intimate Date</span><span className="font-medium">{selectedProduct.ppapIntimateDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">PPAP Closing Date</span><span className="font-medium">{selectedProduct.ppapClosingDate || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">PPAP Status</span><span className="font-medium">{selectedProduct.ppapStatus || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Rev No</span><span className="font-medium">{selectedProduct.revNo || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Drawing Number</span><span className="font-medium">{selectedProduct.drawingNumber || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Drawing Model</span><span className="font-medium">{selectedProduct.drawingModel || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Vehicle Type</span><span className="font-medium">{selectedProduct.vehicleType || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Part No.</span><span className="font-medium">{selectedProduct.partNumber || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Part Description</span><span className="font-medium">{selectedProduct.partDescription || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Part Weight in kg</span><span className="font-medium">{selectedProduct.partWeightKg || "-"}</span></div>
                            </div>
                            
                            <DialogFooter className="flex items-center gap-2 mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                                {getStatus(selectedProduct.status) !== "approved" && (
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(selectedProduct, "Approved")}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve
                                    </Button>
                                )}
                                {getStatus(selectedProduct.status) !== "rejected" && (
                                    <Button variant="destructive" onClick={() => handleAction(selectedProduct, "Rejected")}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
