"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/ProductsContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { QRScanner, QRScannerHandle } from "@/components/qr-scanner";
import { ScanLine, X, Search, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CUSTOMER_OPTIONS = ["ALL ALW", "ALL PNR", "ALL HUSUR", "TML", "VECV", "SWITCH MOBILITY", "IPLT"];
const PRODUCT_TYPE_OPTIONS = ["COMPONENT", "DUMB", "FRONT", "I/A", "INTEGRATED", "MIDDLE", "NA", "REAR"];
const TUBE_DIA_OPTIONS = ["0100X3.0", "100X4.5", "0101.577341", "0103.9X4.3", "ZEXP110", "0113.4X5.2", "0120X3", "120X4", "0120x6"];
const C_FLANGE_ORIENTATION_OPTIONS = ["0", "90 degree", "N/A"];
const COUPLING_FLANGE_OPTIONS = ["C/F 120 DIA 4 HOLES", "C/F 130 DIA & HOLES", "C/F 150 DIA 4 HOLES", "C/P 150 DIA ROUND 4 HOLES", "C/P 100 DIA 4 HOLES", "COUPLING YOKE", "NA", "21 SLEEVE YOKE"];
const JOINT_TYPE_OPTIONS = ["135IT", "14K", "225/7", "325HS", "3251T", "325M", "403 JT", "490 L TML", "7061", "490/A TML", "7064", "7062 TML", "585/T", "4901T TML", "450M 7066 TML", "590H 7065 TML", "5901T TML"];
const FLANGE_YOKE_OPTIONS = ["F/Y 120 DIA 4 HOLES", "F/Y 130 DIA BHOLES", "F/Y 150 DIA 4 LES", "F/Y 180 DIA 4 HOLES", "F/Y IA 150 DIA & HOLES", "F/YIA 180 DIA 4 HOLES", "PYO120 LF SIDE & FYO150 SF SIDE SERRAT", "FYD120 REP SIDE BL FYRISO SP-SP", "FHD120 HER SIDEFYDT50 SF-SF", "PYO150 LF SIDE & FVØ160 SF SIDE SERRATED", "FY180LF SIDE & FYD150 SF SIDE SERRATED"];

export default function ProductionVerificationPage() {
    const { products, loading: productsLoading, dropdownOptions } = useProducts();
    const { scannedProducts, recordScan, loading: scanLoading, fetchScannedProducts, meta } = useScannedProducts();
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchScannedProducts({ page: currentPage });
    }, [currentPage, fetchScannedProducts]);

    // ── Scanner ────────────────────────────────────────────────────────────────
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerKey, setScannerKey] = useState(0);       // bump → fresh mount
    const scannerRef = useRef<QRScannerHandle>(null);
    const isClosingRef = useRef(false);                    // prevent double-close

    // ── Form ───────────────────────────────────────────────────────────────────
    const [plant, setPlant] = useState("Lucknow-RSB LKW");
    const [partSlNo, setPartSlNo] = useState("");
    const [scannedLabel, setScannedLabel] = useState("");
    const [formCustomer, setFormCustomer] = useState("");
    const [formProductType, setFormProductType] = useState("");
    const [formTubeDia, setFormTubeDia] = useState("");
    const [formTubeLength, setFormTubeLength] = useState("");
    const [formJointType, setFormJointType] = useState("");
    const [formCFlangeOrientation, setFormCFlangeOrientation] = useState("");
    const [formFlangeYoke, setFormFlangeYoke] = useState("");
    const [formCouplingFlange, setFormCouplingFlange] = useState("");
    const [extractedPartNo, setExtractedPartNo] = useState("");

    const dedupe = (arr: string[] | undefined) => arr?.length ? Array.from(new Set(arr)) : undefined;

    const activeCustomerOptions = dedupe(dropdownOptions?.CUSTOMER_OPTIONS) ?? CUSTOMER_OPTIONS;
    const activeProductTypeOptions = dedupe(dropdownOptions?.PRODUCT_TYPE_OPTIONS) ?? PRODUCT_TYPE_OPTIONS;
    const activeTubeDiaOptions = dedupe(dropdownOptions?.TUBE_DIA_OPTIONS) ?? TUBE_DIA_OPTIONS;
    const activeCFlangeOrientationOptions = dedupe(dropdownOptions?.C_FLANGE_ORIENTATION_OPTIONS) ?? C_FLANGE_ORIENTATION_OPTIONS;
    const activeCouplingFlangeOptions = dedupe(dropdownOptions?.COUPLING_FLANGE_OPTIONS) ?? COUPLING_FLANGE_OPTIONS;
    const activeJointTypeOptions = dedupe(dropdownOptions?.JOINT_TYPE_OPTIONS) ?? JOINT_TYPE_OPTIONS;
    const activeFlangeYokeOptions = dedupe(dropdownOptions?.FLANGE_YOKE_OPTIONS) ?? FLANGE_YOKE_OPTIONS;

    const isFlangeDisabled = formProductType !== "FRONT" && formProductType !== "MIDDLE";

    // Open: bump key so QRScanner always gets a completely fresh mount
    const handleOpenScanner = useCallback(() => {
        setScannerKey(prev => prev + 1);
        setIsScannerOpen(true);
    }, []);

    // Close: kill camera FIRST, then hide dialog — single source of truth
    const handleCloseScanner = useCallback(async () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;
        try {
            await scannerRef.current?.forceStop();
        } finally {
            setIsScannerOpen(false);
            isClosingRef.current = false;
        }
    }, []);

    // Called by QRScanner after it has already stopped its own stream
    const handleScan = useCallback((decodedText: string) => {
        setScannedLabel(decodedText);

        let partNo = "";
        const revIndex = decodedText.toLowerCase().indexOf("rev");
        partNo = revIndex > -1
            ? decodedText.substring(0, revIndex).trim()
            : decodedText.split(" ")[0].trim();

        setExtractedPartNo(partNo);
        // Extract the last 6 digits for the Part SL No
        const extractedSlNo = decodedText.length >= 6 ? decodedText.slice(-6) : decodedText;
        setPartSlNo(extractedSlNo);

        const matchedProduct = products.find(p => p.part_number === partNo);
        if (matchedProduct) {
            const spec = matchedProduct.specification || {};
            setFormCustomer(matchedProduct.customer || "");
            setFormProductType(spec.partType || "");
            setFormTubeDia(spec.tubeDiameter || "");
            setFormTubeLength(spec.tubeLength || "");
            setFormJointType(spec.series || "");
            setFormCFlangeOrientation(spec.couplingFlangeOrientations || "");
            setFormFlangeYoke(spec.mountingDetailsFlangeYoke || "");
            setFormCouplingFlange(spec.mountingDetailsCouplingFlange || "");
            toast.success("Product details loaded from QR");
        } else {
            toast.warning(`Part Number ${partNo} not found in database.`);
            setFormCustomer(""); setFormProductType(""); setFormTubeDia("");
            setFormTubeLength(""); setFormJointType(""); setFormCFlangeOrientation("");
            setFormFlangeYoke(""); setFormCouplingFlange("");
        }
    }, [products]);

    const handleCheck = async () => {
        if (!extractedPartNo) { toast.error("Please scan or enter a part number first"); return; }
        const matched = products.find(p => p.part_number === extractedPartNo);

        let currentShift = "A";
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) currentShift = "A";
        else if (hour >= 14 && hour < 22) currentShift = "B";
        else currentShift = "C";

        await recordScan({
            part_no: extractedPartNo,
            dispatch_date: new Date().toISOString().split("T")[0],
            shift: currentShift,
            customer_name: formCustomer || "Unknown",
            product_type: formProductType || "Unknown",
            scanned_text: scannedLabel || extractedPartNo,
            part_sl_no: partSlNo,
            plant_location: plant,
            vendorCode: matched?.specification?.vendorCode || "N/A",
            scanned_specification: {
                tubeDiameter: formTubeDia,
                tubeLength: Number(formTubeLength) || 0,
                series: formJointType,
                cFlangeOrient: formCFlangeOrientation,
                flangeYoke: formFlangeYoke,
                couplingFlange: formCouplingFlange,
            },
        });
    };

    if (productsLoading || scanLoading) {
        return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto pb-10">

                <div className="bg-primary text-primary-foreground py-2 px-4 rounded-t-md font-semibold mt-2">
                    Check Product Details
                </div>

                <div className="bg-card border border-t-0 rounded-b-md shadow-sm p-4 text-sm -mt-6">
                    {/* Top row */}
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
                                <Input value={scannedLabel} onChange={e => setScannedLabel(e.target.value)} className="h-9 flex-1 bg-blue-50/50" placeholder="Scan to populate" />
                                {scannedLabel && (
                                    <Button variant="ghost" size="icon" className="h-9 w-9 absolute right-10" onClick={() => setScannedLabel("")}>
                                        <X className="w-4 h-4" />
                                    </Button>
                                )}
                                <Button size="sm" onClick={handleOpenScanner} className="h-9 bg-primary">
                                    <ScanLine className="w-4 h-4 mr-2" /> Scan
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left selects */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                                { label: "Customer Name", value: formCustomer, onChange: setFormCustomer, options: activeCustomerOptions, placeholder: "Select Customer", span: true },
                                { label: "Product Type", value: formProductType, onChange: setFormProductType, options: activeProductTypeOptions, placeholder: "Select Product Type", span: true },
                                { label: "Tube Dia & Thickness", value: formTubeDia, onChange: setFormTubeDia, options: activeTubeDiaOptions, placeholder: "Select Tube Dia", span: true },
                            ].map(({ label, value, onChange, options, placeholder, span }) => (
                                <div key={label} className={`flex items-center justify-between ${span ? "col-span-2" : ""}`}>
                                    <Label className="w-1/3 text-muted-foreground">{label}</Label>
                                    <Select value={value} onValueChange={val => val && onChange(val)}>
                                        <SelectTrigger className="h-9 w-2/3"><SelectValue placeholder={placeholder} /></SelectTrigger>
                                        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                            ))}

                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2">Tube Length</Label>
                                <Input value={formTubeLength} onChange={e => setFormTubeLength(e.target.value)} className="h-9 w-1/2" />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2 ml-4">Joint Type</Label>
                                <Select value={formJointType} onValueChange={val => val && setFormJointType(val)}>
                                    <SelectTrigger className="h-9 w-1/2"><SelectValue placeholder="Select Joint Type" /></SelectTrigger>
                                    <SelectContent>{activeJointTypeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2">C_Flange Orient</Label>
                                <Select value={formCFlangeOrientation} onValueChange={val => val && setFormCFlangeOrientation(val)} disabled={isFlangeDisabled}>
                                    <SelectTrigger className="h-9 w-1/2"><SelectValue placeholder="Select Orientation" /></SelectTrigger>
                                    <SelectContent>{activeCFlangeOrientationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between">
                                <Label className="text-muted-foreground w-1/2 ml-4">Flange Yoke</Label>
                                <Select value={formFlangeYoke} onValueChange={val => val && setFormFlangeYoke(val)}>
                                    <SelectTrigger className="h-9 w-1/2"><SelectValue placeholder="Select F/Yoke" /></SelectTrigger>
                                    <SelectContent>{activeFlangeYokeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="flex items-center justify-between col-span-2 md:col-span-1">
                                <Label className="text-muted-foreground w-1/2">Coupling Flange</Label>
                                <Select value={formCouplingFlange} onValueChange={val => val && setFormCouplingFlange(val)} disabled={isFlangeDisabled}>
                                    <SelectTrigger className="h-9 w-1/2"><SelectValue placeholder="Select Coupling" /></SelectTrigger>
                                    <SelectContent>{activeCouplingFlangeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div className="col-span-2 mt-2 flex justify-end">
                                <Button onClick={handleCheck} className="min-w-[120px]">
                                    Check <CheckCircle2 className="w-4 h-4 ml-2" />
                                </Button>
                            </div>
                        </div>

                        {/* Right: details */}
                        <div>
                            <p className="text-xs text-muted-foreground mb-2 font-medium">Scanned Label Details</p>
                            <div className="border border-border/60 rounded-md p-4 bg-muted/20 min-h-[220px]">
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                    {[
                                        ["Part No.", extractedPartNo, "font-semibold text-primary"],
                                        ["Customer:", formCustomer],
                                        ["JT:", formJointType],
                                        ["Stickers Count:", "1"],
                                        ["Length:", formTubeLength],
                                        ["Type:", formProductType],
                                        ["C_Flange:", formCFlangeOrientation],
                                        ["Flange Yoke:", formFlangeYoke],
                                        ["CB Kit:", "-"],
                                        ["Coupling Flge:", formCouplingFlange],
                                    ].map(([label, val, cls]) => (
                                        <div key={label as string}>
                                            <span className="text-muted-foreground inline-block w-24">{label}</span>
                                            <span className={`font-medium ${cls || ""}`}>{val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History */}
                <div className="bg-primary text-primary-foreground py-2 px-4 rounded-t-md font-semibold mt-8">
                    Label Validation Details
                </div>
                <div className="bg-card border border-t-0 rounded-b-md shadow-sm p-4 text-sm -mt-6">
                    <div className="flex flex-wrap items-center justify-end mb-4 gap-4">
                        <div className="flex items-center gap-4">
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
                                    {["Dispatch Date", "Shift", "Part No.", "Customer Name", "Product Type", "Validation Status", "Remarks", "Part Sl No.", "Scanned Text", "Plant Location", "Customer Code", "Is Rejected?", "Created By", "Modified By"].map(h => (
                                        <th key={h} className="px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {scannedProducts.length === 0 ? (
                                    <tr><td colSpan={11} className="py-8 text-center text-muted-foreground">No validation history found. Scan a product to add records.</td></tr>
                                ) : (
                                    scannedProducts.map((record, idx) => (
                                        <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2">{new Date(record.dispatch_date).toLocaleDateString()}</td>
                                            <td className="px-4 py-2">{record.shift}</td>
                                            <td className="px-4 py-2">{record.part_no}</td>
                                            <td className="px-4 py-2">{record.customer_name}</td>
                                            <td className="px-4 py-2">{record.product_type}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${record.validation_status === "pass" ? "bg-emerald-100 text-emerald-700" : record.validation_status === "fail" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}`}>
                                                    {record.validation_status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2 text-muted-foreground">{record.remarks}</td>
                                            <td className="px-4 py-2 font-mono">{record.part_sl_no || "N/A"}</td>
                                            <td className="px-4 py-2 font-mono  truncate max-w-[260px]" title={record.scanned_text}>{record.scanned_text}</td>
                                            <td className="px-4 py-2">{record.plant_location}</td>
                                            <td className="px-4 py-2">{record.vendorCode || "N/A"}</td>
                                            <td className="px-4 py-2">{record.is_rejected ? "Yes" : "No"}</td>
                                            <td className="px-4 py-2">{record.created_by || "System"}</td>
                                            <td className="px-4 py-2">{record.modified_by || "System"}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <div className="text-xs text-muted-foreground">
                            {meta ? `Showing page ${meta.page} of ${Math.ceil(meta.total / meta.limit)} (${meta.total} total records)` : ''}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={!meta || currentPage * meta.limit >= meta.total}
                                onClick={() => setCurrentPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── QR Scanner Dialog ─────────────────────────────────────────── */}
            <Dialog
                open={isScannerOpen}
                onOpenChange={async (open) => {
                    // ALL close paths (Escape / backdrop / X) come here.
                    // Always kill camera before unmounting.
                    if (!open) await handleCloseScanner();
                }}
            >
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Scan Product Label</DialogTitle>
                    </DialogHeader>

                    {isScannerOpen && (
                        <div className="py-4">
                            {/*
                             * key=scannerKey → brand-new DOM node + camera stream every open.
                             * ref=scannerRef → parent can call forceStop() imperatively.
                             * onStopped=handleCloseScanner → scanner closes dialog after scan.
                             */}
                            <QRScanner
                                key={scannerKey}
                                ref={scannerRef}
                                onScan={handleScan}
                                onStopped={handleCloseScanner}
                            />
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