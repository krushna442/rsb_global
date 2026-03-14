"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useProducts, Product } from "@/lib/use-products";
import {
    CheckCircle2,
    XCircle,
    Package,
    ShieldCheck,
    Clock,
    Calendar,
} from "lucide-react";

export default function QualityVerificationPage() {
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
                    <h1 className="text-2xl font-bold tracking-tight">Quality Verification</h1>
                    <p className="text-sm text-muted-foreground mt-1">Review and approve production quality reports</p>
                </div>

                <Tabs defaultValue="pending" className="space-y-4">
                    <TabsList className="bg-muted/50 h-9">
                        <TabsTrigger value="pending" className="text-xs data-[state=active]:shadow-sm">Pending</TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs data-[state=active]:shadow-sm">Approved</TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs data-[state=active]:shadow-sm">Rejected</TabsTrigger>
                    </TabsList>

                    {(["pending", "approved", "rejected"] as const).map((status) => {
                        const filtered = products.filter(p => getStatus(p.status) === status);
                        return (
                            <TabsContent key={status} value={status}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filtered.map((product) => {
                                        const s = getStatus(product.status);
                                        const isPending = s === "pending";
                                        const isApproved = s === "approved";
                                        const isRejected = s === "rejected";
                                        const isVerified = s === "verified";
                                        return (
                                            <Card key={product.id} className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer group" onClick={() => setSelectedProduct(product)}>
                                                <CardContent className="p-4">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                                                <Package className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-sm font-semibold font-mono">{product.partNumber}</h3>
                                                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{product.customer}</p>
                                                            </div>
                                                        </div>
                                                        {isPending && <Badge variant="outline" className="text-[10px] bg-orange-50 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1"/>Pending</Badge>}
                                                        {isApproved && <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="w-3 h-3 mr-1"/>Approved</Badge>}
                                                        {isRejected && <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200"><XCircle className="w-3 h-3 mr-1"/>Rejected</Badge>}
                                                        {isVerified && <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200"><ShieldCheck className="w-3 h-3 mr-1"/>Verified</Badge>}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border/30 text-xs text-muted-foreground">
                                                        <Calendar className="w-3 h-3" />
                                                        <span>Added Recently</span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </div>
                                {filtered.length === 0 && (
                                    <div className="py-12 text-center border-2 border-dashed rounded-xl">
                                        <p className="text-sm text-muted-foreground">No {status} products found.</p>
                                    </div>
                                )}
                            </TabsContent>
                        );
                    })}
                </Tabs>
            </div>

            {/* Quality Details Popup */}
            <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Quality Verification Details</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <div className="space-y-6 mt-4">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                <div><span className="text-muted-foreground block text-xs">Tube Dia</span><span className="font-medium">{selectedProduct.tubeDiameter || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Series</span><span className="font-medium">{selectedProduct.series || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Tube Length</span><span className="font-medium">{selectedProduct.tubeLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Part Type</span><span className="font-medium">{selectedProduct.partType || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Noise Deadener length</span><span className="font-medium">{selectedProduct.noiseDeadenerLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Available Noise Deadener</span><span className="font-medium">{selectedProduct.availableNoiseDeadener || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Fep Press H. Stock Positions</span><span className="font-medium">{selectedProduct.fepPressHStockPositions || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Front End Piece Details</span><span className="font-medium">{selectedProduct.frontEndPieceDetails || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Rear Housing length</span><span className="font-medium">{selectedProduct.rearHousingLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Long Fork Length</span><span className="font-medium">{selectedProduct.longForkLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">S.F Details</span><span className="font-medium">{selectedProduct.sfDetails || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">PDC Length</span><span className="font-medium">{selectedProduct.pdcLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Coupling Flange Orientations</span><span className="font-medium">{selectedProduct.couplingFlangeOrientations || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Hex bolt/Nut Tightening torque</span><span className="font-medium">{selectedProduct.hexBoltNutTighteningTorque || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Loctite Grade Use</span><span className="font-medium">{selectedProduct.loctiteGradeUse || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">CB KIT Details</span><span className="font-medium">{selectedProduct.cbKitDetails || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Slip Details</span><span className="font-medium">{selectedProduct.slipDetails || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Greaseable Or Non Greaseable</span><span className="font-medium">{selectedProduct.greaseableOrNonGreaseable || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Mounting Details flange yoke</span><span className="font-medium">{selectedProduct.mountingDetailsFlangeYoke || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Mounting Details coupling flange</span><span className="font-medium">{selectedProduct.mountingDetailsCouplingFlange || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">I/A Bellow Details</span><span className="font-medium">{selectedProduct.iaBellowDetails || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Total Length</span><span className="font-medium">{selectedProduct.totalLength || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Balancing RPM</span><span className="font-medium">{selectedProduct.balancingRpm || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Unbalance In Cmg</span><span className="font-medium">{selectedProduct.unbalanceInCmg || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Unbalance In Gram</span><span className="font-medium">{selectedProduct.unbalanceInGram || "-"}</span></div>
                                <div><span className="text-muted-foreground block text-xs">Unbalance In Gram 75%</span><span className="font-medium">{selectedProduct.unbalanceInGram75Percent || "-"}</span></div>
                            </div>
                            
                            <DialogFooter className="flex items-center gap-2 mt-6 pt-4 border-t">
                                <Button variant="outline" onClick={() => setSelectedProduct(null)}>Cancel</Button>
                                {getStatus(selectedProduct.status) !== "approved" && (
                                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => handleAction(selectedProduct, "Approved")}>
                                        <CheckCircle2 className="w-4 h-4 mr-2" /> Approve Quality
                                    </Button>
                                )}
                                {getStatus(selectedProduct.status) !== "rejected" && (
                                    <Button variant="destructive" onClick={() => handleAction(selectedProduct, "Rejected")}>
                                        <XCircle className="w-4 h-4 mr-2" /> Reject Quality
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
