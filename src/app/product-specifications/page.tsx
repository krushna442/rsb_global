"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts } from "@/lib/use-products";
import { Search, RotateCcw, ShieldCheck, ClipboardCheck } from "lucide-react";

export default function ProductSpecificationsPage() {
    const { products, isLoaded } = useProducts();
    const [searchTerm, setSearchTerm] = useState("");
    const [partInfo, setPartInfo] = useState<any>(null);

    const handleSearch = () => {
        if (!searchTerm.trim()) return;
        const matched = products.find(p => p.partNumber.toLowerCase() === searchTerm.toLowerCase());
        if (matched) {
            setPartInfo(matched);
        } else {
            setPartInfo(null);
            alert("Part Number not found");
        }
    };

    const handleReset = () => {
        setSearchTerm("");
        setPartInfo(null);
    };

    if (!isLoaded) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;

    const SpecItem = ({ label, value }: { label: string, value: string | undefined }) => (
        <div className="flex flex-col gap-1.5 p-3 rounded-lg border bg-card/50 hover:bg-accent/5 transition-colors">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className="text-sm font-semibold text-foreground break-words">{value || "-"}</span>
        </div>
    );

    return (
        <DashboardLayout>
            <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-10">
                
                {/* Header Section */}
                <Card className="border-t-4 border-t-primary shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <ClipboardCheck className="w-6 h-6 text-primary" />
                            Product Specifications
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Search Part Number</label>
                                <div className="flex gap-3">
                                    <div className="relative flex-1 max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                            placeholder="e.g. FC353600"
                                            className="pl-9 h-11 bg-background"
                                        />
                                    </div>
                                    <Button onClick={handleSearch} className="h-11 px-6 shadow-sm">
                                        Search
                                    </Button>
                                    <Button onClick={handleReset} variant="outline" className="h-11 px-4 text-muted-foreground">
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0">
                                <Button variant="secondary" className="flex-1 md:flex-none h-11 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none">
                                    <ShieldCheck className="w-4 h-4 mr-2" />
                                    Quality
                                </Button>
                                <Button variant="secondary" className="flex-1 md:flex-none h-11 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                                    <ClipboardCheck className="w-4 h-4 mr-2" />
                                    Production
                                </Button>
                            </div>
                        </div>

                        {/* Part Summary Box */}
                        <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row gap-2 sm:gap-6 sm:items-center">
                            <div className="flex flex-col">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Product Description</span>
                                <span className="text-lg font-bold text-foreground">
                                    {partInfo ? partInfo.partDescription || "ASSY PROP SHAFT" : "No Product Selected"}
                                </span>
                            </div>
                            {partInfo && (
                                <div className="flex flex-col sm:border-l sm:pl-6 sm:ml-2">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Part Number</span>
                                    <span className="text-lg font-mono font-semibold text-primary">
                                        {partInfo.partNumber}
                                    </span>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Data Grid Section */}
                <Card className="shadow-sm">
                    <CardHeader className="border-b bg-muted/20">
                        <CardTitle className="text-base font-semibold">Technical Specifications</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            <SpecItem label="Tube Length" value={partInfo?.tubeLength} />
                            <SpecItem label="Tube Dia & Thickness" value={partInfo?.tubeDiameter} />
                            <SpecItem label="Series" value={partInfo?.series} />
                            <SpecItem label="Part Type" value={partInfo?.partType} />
                            
                            <SpecItem label="Available Noise Deadener" value={partInfo?.availableNoiseDeadener} />
                            <SpecItem label="Fep Press H. Stock Positions" value={partInfo?.fepPressHStockPositions} />
                            <SpecItem label="Rear Housing length" value={partInfo?.rearHousingLength} />
                            <SpecItem label="Long Fork Length" value={partInfo?.longForkLength} />
                            
                            <SpecItem label="S.F Details" value={partInfo?.sfDetails} />
                            <SpecItem label="PDC Length" value={partInfo?.pdcLength} />
                            <SpecItem label="Front End Piece Details" value={partInfo?.frontEndPieceDetails} />
                            <SpecItem label="Flange yoke Details" value={partInfo?.mountingDetailsFlangeYoke} />
                            
                            <SpecItem label="Greaseable or Non Greasable" value={partInfo?.greaseableOrNonGreaseable} />
                            <SpecItem label="Coupling Flange Details" value={partInfo?.mountingDetailsCouplingFlange} />
                            <SpecItem label="Coupling Flange Orientation" value={partInfo?.couplingFlangeOrientations} />
                            <SpecItem label="CB Kit Details" value={partInfo?.cbKitDetails} />
                            
                            <SpecItem label="Loctite Grade Use" value={partInfo?.loctiteGradeUse} />
                            <SpecItem label="Hex bolt/Hex nut Tightening" value={partInfo?.hexBoltNutTighteningTorque} />
                            <SpecItem label="Balancing RPM" value={partInfo?.balancingRpm} />
                            <SpecItem label="Unbalance Value CMG" value={partInfo?.unbalanceInCmg} />
                            
                            <SpecItem label="Unbalance Value GM" value={partInfo?.unbalanceInGram} />
                            <SpecItem label="I/A Bellow Details" value={partInfo?.iaBellowDetails} />
                            <SpecItem label="Total Length" value={partInfo?.totalLength} />
                            <SpecItem label="RearSlip" value={partInfo?.slipDetails} />
                            
                            <SpecItem label="Mod No" value={partInfo?.drawingModel} />
                            <SpecItem label="Vendor code" value={partInfo?.vendorCode} />
                            <SpecItem label="Customer Name" value={partInfo?.customer} />
                            <SpecItem label="DWG Weight/Mod Date" value={partInfo?.partWeight} />
                        </div>
                    </CardContent>
                </Card>

            </div>
        </DashboardLayout>
    );
}
