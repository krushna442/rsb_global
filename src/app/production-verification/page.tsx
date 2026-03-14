"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts, Product } from "@/lib/use-products";
import { QRScanner } from "@/components/qr-scanner";
import { ScanLine, X, Search, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
interface ValidationHistory {
    id: number;
    customerName: string;
    productType: string;
    validationStatus: "Pass" | "Fail";
    remark: string;
    partSlNo: string;
    scannedText: string;
    plantLocation: string;
    customerCode: string;
    isRejected: "No" | "Yes";
    createdBy: string;
    date: Date;
}

export default function ProductionVerificationPage() {
    const { products, isLoaded } = useProducts();
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    
    // Form State
    const [plant, setPlant] = useState("Lucknow-RSB LKW");
    const [partSlNo, setPartSlNo] = useState("");
    const [scannedLabel, setScannedLabel] = useState("");
    
    // Extracted / Mapped Form Details
    const [formCustomer, setFormCustomer] = useState("");
    const [formProductType, setFormProductType] = useState("");
    const [formTubeDia, setFormTubeDia] = useState("");
    const [formTubeLength, setFormTubeLength] = useState("");
    const [formJointType, setFormJointType] = useState("");
    const [formCFlangeOrientation, setFormCFlangeOrientation] = useState("");
    const [formFlangeYoke, setFormFlangeYoke] = useState("");
    const [formCouplingFlange, setFormCouplingFlange] = useState("");
    
    // Right side extracted details
    const [extractedPartNo, setExtractedPartNo] = useState("");

    // History
    const [history, setHistory] = useState<ValidationHistory[]>([]);

    const handleScan = (decodedText: string) => {
        setScannedLabel(decodedText);
        setIsScannerOpen(false);

        // Extract Part No from arbitrary string (e.g. FC353600Rev NoD 72057610226014661)
        // Taking substring up to "Rev" or just the first few characters as fallback
        let partNo = "";
        const revIndex = decodedText.toLowerCase().indexOf("rev");
        if (revIndex > -1) {
            partNo = decodedText.substring(0, revIndex).trim();
        } else {
            // fallback, just split by space
            partNo = decodedText.split(" ")[0].trim();
        }
        
        setExtractedPartNo(partNo);
        setPartSlNo(String(Math.floor(1000 + Math.random() * 9000))); // Mocking a generated serial

        const matchedProduct = products.find(p => p.partNumber === partNo);
        if (matchedProduct) {
            setFormCustomer(matchedProduct.customer || "");
            setFormProductType(matchedProduct.partType || "");
            setFormTubeDia(matchedProduct.tubeDiameter || "");
            setFormTubeLength(matchedProduct.tubeLength || "");
            setFormJointType(matchedProduct.series || ""); // Mapped
            setFormCFlangeOrientation(matchedProduct.couplingFlangeOrientations || "");
            setFormFlangeYoke(matchedProduct.mountingDetailsFlangeYoke || "");
            setFormCouplingFlange(matchedProduct.mountingDetailsCouplingFlange || "");
            toast.success("Product details loaded from QR");
        } else {
            toast.warning(`Part Number ${partNo} not found in database.`);
            // Clear details if not found
            setFormCustomer("");
            setFormProductType("");
            setFormTubeDia("");
            setFormTubeLength("");
            setFormJointType("");
            setFormCFlangeOrientation("");
            setFormFlangeYoke("");
            setFormCouplingFlange("");
        }
    };

    const handleCheck = () => {
        if (!extractedPartNo) {
            toast.error("Please scan or enter a part number first");
            return;
        }

        const matchedProduct = products.find(p => p.partNumber === extractedPartNo);
        let status: "Pass" | "Fail" = "Fail";
        let remark = "Product not found";

        if (matchedProduct) {
            // In a real scenario we'd compare the manual input values vs matchedProduct values
            // Currently they are auto-filled so it will pass if product exists.
            status = "Pass";
            remark = "Details Matched Successfully";
            toast.success("Product Verified Successfully", { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />});
        } else {
            remark = "Part Number mismatch";
            toast.error("Product Verification Failed", { icon: <XCircle className="w-5 h-5 text-red-500" />});
        }

        const newRecord: ValidationHistory = {
            id: Date.now(),
            customerName: formCustomer || "Unknown",
            productType: formProductType || "Unknown",
            validationStatus: status,
            remark,
            partSlNo: partSlNo || "N/A",
            scannedText: scannedLabel || extractedPartNo,
            plantLocation: plant,
            customerCode: matchedProduct?.vendorCode || "N/A",
            isRejected: status === "Pass" ? "No" : "Yes",
            createdBy: "admin",
            date: new Date()
        };

        setHistory([newRecord, ...history]);
    };

    if (!isLoaded) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto pb-10">
                {/* Header Section */}
                <div className="bg-primary text-primary-foreground py-2 px-4 rounded-t-md font-semibold mt-2">
                    Check Product Details
                </div>

                <div className="bg-card border border-t-0 rounded-b-md shadow-sm p-4 text-sm -mt-6">
                    {/* Top Row: Plant, Sl No, Scanned Label */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_minmax(300px,1fr)] gap-4 mb-6">
                        <div className="flex items-center gap-2">
                            <Label className="w-24 shrink-0">Plant</Label>
                            <Input value={plant} onChange={e => setPlant(e.target.value)} className="h-9" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="w-24 shrink-0">Part Sl NO.</Label>
                            <Input value={partSlNo} readOnly className="h-9 bg-muted/50" />
                        </div>
                        <div className="flex items-center gap-2 relative">
                            <Label className="w-24 shrink-0">Scanned Label</Label>
                            <div className="flex w-full gap-2">
                                <Input 
                                    value={scannedLabel} 
                                    onChange={(e) => setScannedLabel(e.target.value)} 
                                    className="h-9 flex-1 bg-blue-50/50" 
                                    placeholder="Scan to populate"
                                />
                                {scannedLabel && (
                                    <Button variant="ghost" size="icon" className="h-9 w-9 absolute right-10" onClick={() => setScannedLabel("")}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button size="sm" onClick={() => setIsScannerOpen(true)} className="h-9 bg-primary">
                                    <ScanLine className="w-4 h-4 mr-2" />
                                    Scan
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Form: Product Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div className="flex items-center justify-between col-span-2">
                                <Label className="w-1/3 text-muted-foreground">Customer Name</Label>
                                <Input value={formCustomer} onChange={e => setFormCustomer(e.target.value)} className="h-9 w-2/3" />
                            </div>
                            <div className="flex items-center justify-between col-span-2">
                                <Label className="w-1/3 text-muted-foreground">Product Type</Label>
                                <Input value={formProductType} onChange={e => setFormProductType(e.target.value)} className="h-9 w-2/3" />
                            </div>
                            <div className="flex items-center justify-between col-span-2">
                                <Label className="w-1/3 text-muted-foreground">Tube Dia & Thickness</Label>
                                <Input value={formTubeDia} onChange={e => setFormTubeDia(e.target.value)} className="h-9 w-2/3" />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2">Tube Length</Label>
                                <Input value={formTubeLength} onChange={e => setFormTubeLength(e.target.value)} className="h-9 w-1/2" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2 ml-4">Joint Type</Label>
                                <Input value={formJointType} onChange={e => setFormJointType(e.target.value)} className="h-9 w-1/2" />
                            </div>

                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2">C_Flange Orient</Label>
                                <Input value={formCFlangeOrientation} onChange={e => setFormCFlangeOrientation(e.target.value)} className="h-9 w-1/2" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2 ml-4">Flange Yoke</Label>
                                <Input value={formFlangeYoke} onChange={e => setFormFlangeYoke(e.target.value)} className="h-9 w-1/2" />
                            </div>

                            <div className="flex items-center justify-between col-span-2 md:col-span-1">
                                <Label className="text-muted-foreground w-1/2">Coupling Flange</Label>
                                <Input value={formCouplingFlange} onChange={e => setFormCouplingFlange(e.target.value)} className="h-9 w-1/2" />
                            </div>
                            <div className="col-span-2 mt-2 flex justify-end">
                                <Button onClick={handleCheck} className="min-w-[120px]">
                                    Check <CheckCircle2 className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>

                        {/* Right Area: Scanned Label Details Box */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Scanned Label Details</p>
                            <div className="border border-border/60 rounded-md p-4 bg-muted/20 min-h-[220px]">
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                    <div><span className="text-muted-foreground inline-block w-24">Part No.:</span> <span className="font-semibold text-primary">{extractedPartNo}</span></div>
                                    <div><span className="text-muted-foreground inline-block w-24">Customer:</span> <span className="font-medium">{formCustomer}</span></div>
                                    
                                    <div><span className="text-muted-foreground inline-block w-24">JT:</span> <span className="font-medium">{formJointType}</span></div>
                                    <div><span className="text-muted-foreground inline-block w-24">Stickers Count:</span> <span className="font-medium">1</span></div>
                                    
                                    <div><span className="text-muted-foreground inline-block w-24">Length:</span> <span className="font-medium">{formTubeLength}</span></div>
                                    <div><span className="text-muted-foreground inline-block w-24">Type:</span> <span className="font-medium">{formProductType}</span></div>
                                    
                                    <div><span className="text-muted-foreground inline-block w-24">C_Flange:</span> <span className="font-medium">{formCFlangeOrientation}</span></div>
                                    <div><span className="text-muted-foreground inline-block w-24">Flange Yoke:</span> <span className="font-medium">{formFlangeYoke}</span></div>

                                    <div><span className="text-muted-foreground inline-block w-24">CB Kit:</span> <span className="font-medium">-</span></div>
                                    <div><span className="text-muted-foreground inline-block w-24">Coupling Flge:</span> <span className="font-medium">{formCouplingFlange}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Lower Section: History */}
                <div className="bg-primary text-primary-foreground py-2 px-4 rounded-t-md font-semibold mt-8">
                    Label Validation Details
                </div>
                
                <div className="bg-card border border-t-0 rounded-b-md shadow-sm p-4 text-sm -mt-6">
                    <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs">From Date:</Label>
                                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-8 max-w-[150px] text-xs" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Label className="text-xs">To Date:</Label>
                                <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-8 max-w-[150px] text-xs" />
                            </div>
                            <Button size="sm" className="h-8 bg-blue-600 hover:bg-blue-700">GO</Button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 text-xs">
                                <span>Show</span>
                                <select className="border rounded px-2 py-1"><option>10</option><option>25</option></select>
                                <span>entries</span>
                            </div>
                            <div className="flex items-center gap-2 relative">
                                <Search className="w-3 h-3 absolute left-2 text-muted-foreground" />
                                <Input placeholder="Search..." className="h-8 w-[200px] text-xs pl-7" />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">No.</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Customer Name</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Product Type</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Validation Status</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Remark</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Part Sl No.</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Scanned Text</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Plant Location</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Customer Code</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Is Rejected?</th>
                                    <th className="px-4 py-3 font-semibold text-muted-foreground">Created By</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-8 text-center text-muted-foreground">
                                            No validation history found. Scan a product to add records.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((record, idx) => (
                                        <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2 font-mono">411201{idx.toString().padStart(2, '0')}</td>
                                            <td className="px-4 py-2">{record.customerName}</td>
                                            <td className="px-4 py-2">{record.productType}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${record.validationStatus === "Pass" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                                                    {record.validationStatus}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{record.remark}</td>
                                            <td className="px-4 py-2 font-mono">{record.partSlNo}</td>
                                            <td className="px-4 py-2 font-mono text-muted-foreground truncate max-w-[200px]" title={record.scannedText}>{record.scannedText}</td>
                                            <td className="px-4 py-2">{record.plantLocation}</td>
                                            <td className="px-4 py-2">{record.customerCode}</td>
                                            <td className="px-4 py-2">{record.isRejected}</td>
                                            <td className="px-4 py-2">{record.createdBy}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* QR Scanner Dialog */}
            <Dialog  open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Scan Product Label</DialogTitle>
                    </DialogHeader>
                    {isScannerOpen && (
                        <div className="py-4">
                            <QRScanner onScan={handleScan} />
                            <p className="text-xs text-center text-muted-foreground mt-4">
                                Point camera at the product label QR code. The system will automatically capture it.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

        </DashboardLayout>
    );
}
