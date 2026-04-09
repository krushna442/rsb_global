"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/ProductsContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { QRScanner, QRScannerHandle } from "@/components/qr-scanner";
import { ScanLine, X, Search, CheckCircle2, Keyboard, Camera } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {parseScanText} from "./parseScanText.js";
const CUSTOMER_OPTIONS = ["ALL ALW", "ALL PNR", "ALL HUSUR", "TML", "VECV", "SWITCH MOBILITY", "IPLT"];
const PRODUCT_TYPE_OPTIONS = ["COMPONENT", "DUMB", "FRONT", "I/A", "INTEGRATED", "MIDDLE", "NA", "REAR"];
const TUBE_DIA_OPTIONS = ["0100X3.0", "100X4.5", "0101.577341", "0103.9X4.3", "ZEXP110", "0113.4X5.2", "0120X3", "120X4", "0120x6"];
const C_FLANGE_ORIENTATION_OPTIONS = ["0", "90 degree", "N/A"];
const COUPLING_FLANGE_OPTIONS = ["C/F 120 DIA 4 HOLES", "C/F 130 DIA & HOLES", "C/F 150 DIA 4 HOLES", "C/P 150 DIA ROUND 4 HOLES", "C/P 100 DIA 4 HOLES", "COUPLING YOKE", "NA", "21 SLEEVE YOKE"];
const JOINT_TYPE_OPTIONS = ["135IT", "14K", "225/7", "325HS", "3251T", "325M", "403 JT", "490 L TML", "7061", "490/A TML", "7064", "7062 TML", "585/T", "4901T TML", "450M 7066 TML", "590H 7065 TML", "5901T TML"];
const FLANGE_YOKE_OPTIONS = ["F/Y 120 DIA 4 HOLES", "F/Y 130 DIA BHOLES", "F/Y 150 DIA LES", "F/Y 180 DIA 4 HOLES", "F/Y IA 150 DIA & HOLES", "F/YIA 180 DIA 4 HOLES", "PYO120 LF SIDE & FYO150 SF SIDE SERRAT", "FYD120 REP SIDE BL FYRISO SP-SP", "FHD120 HER SIDEFYDT50 SF-SF", "PYO150 LF SIDE & FVØ160 SF SIDE SERRATED", "FY180LF SIDE & FYD150 SF SIDE SERRATED"];

export default function ProductionVerificationPage() {
    const { products, loading: productsLoading, dropdownOptions } = useProducts();
    const { scannedProducts, recordScan, loading: scanLoading, fetchScannedProducts, meta } = useScannedProducts();
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        fetchScannedProducts({ page: currentPage });
    }, [currentPage, fetchScannedProducts]);

    // ── Scanner ────────────────────────────────────────────────────────────────
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerKey, setScannerKey] = useState(0);
    const scannerRef = useRef<QRScannerHandle>(null);
    const isClosingRef = useRef(false);
// 1. Add state for scan mode (near your other state declarations)
const [scanMode, setScanMode] = useState<"camera" | "external">("camera");

// 2. Add a helper to open scanner in a specific mode
const handleOpenScannerMode = useCallback((mode: "camera" | "external") => {
    setScanMode(mode);
    setScannerKey(prev => prev + 1);
    setIsScannerOpen(true);
}, []);
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

    // ── Verification state ─────────────────────────────────────────────────────
    // Fields that mismatched on the last scan (shown in the details box)
    const [mismatchedFields, setMismatchedFields] = useState<Set<string>>(new Set());
    // The DB spec values fetched for the last scanned part (for display in the details box)
    const [scannedSpec, setScannedSpec] = useState<Record<string, string>>({});
    // The user's form values at the moment of scanning (for display in the details box if mismatch)
    const [scannedUserValues, setScannedUserValues] = useState<Record<string, string>>({});

    const handleClearScan = useCallback(() => {
        setScannedLabel("");
        setPartSlNo("");
        setExtractedPartNo("");
        setMismatchedFields(new Set());
        setScannedSpec({});
        setScannedUserValues({});
    }, []);

    const dedupe = (arr: string[] | undefined) => arr?.length ? Array.from(new Set(arr)) : undefined;

    const activeCustomerOptions = dedupe(dropdownOptions?.CUSTOMER_OPTIONS) ?? CUSTOMER_OPTIONS;
    const activeProductTypeOptions = dedupe(dropdownOptions?.PRODUCT_TYPE_OPTIONS) ?? PRODUCT_TYPE_OPTIONS;
    const activeTubeDiaOptions = dedupe(dropdownOptions?.TUBE_DIA_OPTIONS) ?? TUBE_DIA_OPTIONS;
    const activeCFlangeOrientationOptions = dedupe(dropdownOptions?.C_FLANGE_ORIENTATION_OPTIONS) ?? C_FLANGE_ORIENTATION_OPTIONS;
    const activeCouplingFlangeOptions = dedupe(dropdownOptions?.COUPLING_FLANGE_OPTIONS) ?? COUPLING_FLANGE_OPTIONS;
    const activeJointTypeOptions = dedupe(dropdownOptions?.JOINT_TYPE_OPTIONS) ?? JOINT_TYPE_OPTIONS;
    const activeFlangeYokeOptions = dedupe(dropdownOptions?.FLANGE_YOKE_OPTIONS) ?? FLANGE_YOKE_OPTIONS;

    const isFlangeDisabled = formProductType !== "FRONT" && formProductType !== "MIDDLE";

    const handleOpenScanner = useCallback(() => {
        setScannerKey(prev => prev + 1);
        setIsScannerOpen(true);
    }, []);

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

    // ── Core scan handler: verify immediately, never overwrite form ────────────
    const handleScan = useCallback(async (decodedText: string) => {
        setScannedLabel(decodedText);
        setMismatchedFields(new Set());
        setScannedSpec({});

        // Extract part number
       // ── Parse barcode — supports F1, F2, F3 ─────────────────────────────
        const parsed = parseScanText(decodedText);

        let partNo = "";
        let extractedSlNo = "";

        if (parsed) {
            partNo        = parsed.partNo;
            extractedSlNo = parsed.partSlNo;
        } else {
    // Fallback for unknown formats
    const revIndex = decodedText.toLowerCase().indexOf("rev");
    partNo = revIndex > -1
        ? decodedText.substring(0, revIndex).trim()
        : decodedText.split(" ")[0].trim();
    extractedSlNo = decodedText.length >= 6 ? decodedText.slice(-6) : decodedText;
}
        console.log("🔍 Raw Scanned Text:", decodedText);
        console.log("📦 Extracted Part Number:", partNo);
        console.log("🔢 Extracted Serial Number:", extractedSlNo);

        const finalSlNo = (partSlNo && partSlNo.trim() !== "") ? partSlNo : extractedSlNo;
        console.log("✅ Using Serial Number:", finalSlNo);

        setExtractedPartNo(partNo);
        setPartSlNo(finalSlNo);
        // Look up DB record
        const matchedProduct = products.find(p => p.part_number === partNo);

        if (!matchedProduct) {
            toast.warning(`Part Number ${partNo} not found in database.`);
            return;
        }

        // Pull expected values from DB
        const spec = matchedProduct.specification || {};
        const dbCustomer       = matchedProduct.customer || "";
        const dbProductType    = spec.partType || "";
        const dbTubeDia        = spec.tubeDiameter || "";
        const dbTubeLength     = String(spec.tubeLength || "");
        const dbJointType      = spec.series || "";
        const dbCFlangeOrient  = spec.couplingFlangeOrientations || "";
        const dbFlangeYoke     = spec.mountingDetailsFlangeYoke || "";
        const dbCouplingFlange = spec.mountingDetailsCouplingFlange || "";

        // Store DB values for the Scanned Label Details box
        setScannedSpec({
            customer:       dbCustomer,
            productType:    dbProductType,
            tubeDia:        dbTubeDia,
            tubeLength:     dbTubeLength,
            jointType:      dbJointType,
            cFlangeOrient:  dbCFlangeOrient,
            flangeYoke:     dbFlangeYoke,
            couplingFlange: dbCouplingFlange,
        });

        // Store User form values for the Scanned Label Details box
        setScannedUserValues({
            customer:       formCustomer,
            productType:    formProductType,
            tubeDia:        formTubeDia,
            tubeLength:     formTubeLength,
            jointType:      formJointType,
            cFlangeOrient:  formCFlangeOrientation,
            flangeYoke:     formFlangeYoke,
            couplingFlange: formCouplingFlange,
        });

        // Compare user-filled form values vs DB expected values
        const mismatches = new Set<string>();
const compare = (formVal: string, dbVal: string, key: string) => {
    if (!dbVal) return;
    const dbValues = dbVal.trim().toLowerCase().split(',').map(v => v.trim());
    if (!dbValues.includes(formVal.trim().toLowerCase())) {
        mismatches.add(key);
        console.log(`   ❌ MISMATCH [${key}]: form="${formVal}" vs db="${dbVal}"`);
    } else {
        console.log(`   ✅ MATCH    [${key}]: "${formVal}"`);
    }
};

        compare(formCustomer,           dbCustomer,       "customer");
        compare(formProductType,        dbProductType,    "productType");
        compare(formTubeDia,            dbTubeDia,        "tubeDia");
        compare(formTubeLength,         dbTubeLength,     "tubeLength");
        compare(formJointType,          dbJointType,      "jointType");
        compare(formFlangeYoke,         dbFlangeYoke,     "flangeYoke");
        // Only verify flange-related fields for FRONT and MIDDLE product types
        if (formProductType === "FRONT" || formProductType === "MIDDLE") {
            compare(formCFlangeOrientation, dbCFlangeOrient,  "cFlangeOrient");
            compare(formCouplingFlange,     dbCouplingFlange, "couplingFlange");
        }

        setMismatchedFields(mismatches);

        const hasMismatch = mismatches.size > 0;

        // Determine shift
        let currentShift = "A";
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 14) currentShift = "A";
        else if (hour >= 14 && hour < 22) currentShift = "B";
        else currentShift = "C";

        // Auto-record scan with user's form values as the "claimed" spec
        await recordScan({
            part_no: partNo,
            dispatch_date: new Date().toISOString().split("T")[0],
            shift: currentShift,
            customer_name: formCustomer || "Unknown",
            product_type: formProductType || "Unknown",
            scanned_text: decodedText,
            part_sl_no: finalSlNo,
            plant_location: plant,
            vendorCode: matchedProduct.specification?.vendorCode || "N/A",
            scanned_specification: {
                tubeDiameter:   formTubeDia,
                tubeLength:     Number(formTubeLength) || 0,
                series:         formJointType,
                cFlangeOrient:  formCFlangeOrientation,
                flangeYoke:     formFlangeYoke,
                couplingFlange: formCouplingFlange,
            },
        });



        // NOTE: Form fields are intentionally NOT reset here.
        // The user can change only the fields that differ before the next scan.
    }, [
        products,
        partSlNo,
        formCustomer, formProductType, formTubeDia, formTubeLength,
        formJointType, formCFlangeOrientation, formFlangeYoke, formCouplingFlange,
        plant, recordScan,
    ]);

    // Helper: class for a detail-box row — red bg + bold if mismatched
    const detailCls = (key: string) =>
        mismatchedFields.has(key)
            ? "font-semibold text-red-600 bg-red-50 px-1 rounded"
            : "font-medium";

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
{/* TOP ROW — remove the inline Scan button from scanned label */}
<div className="grid grid-cols-1 md:grid-cols-[1fr_200px_minmax(300px,1fr)] gap-4 mb-4">
    <div className="flex items-center gap-2">
        <Label className="w-24 shrink-0">Plant</Label>
        <Input value={plant} onChange={e => setPlant(e.target.value)} className="h-9" />
    </div>
    <div className="flex items-center gap-2">
        <Label className="w-24 shrink-0">Part Sl NO.</Label>
        <Input value={partSlNo} onChange={e => setPartSlNo(e.target.value)}  className="h-9 bg-muted/50" />
    </div>
    <div className="flex items-center justify-end flex-col gap-2">
        <div className="flex  w-full">

        <Label className="w-24 shrink-0">Scanned Label</Label>
        <div className="relative flex-1">
            <Input
                value={scannedLabel}
                onChange={e => setScannedLabel(e.target.value)}
                onKeyDown={e => {
                    if (e.key === 'Enter') {
                        handleScan(scannedLabel);
                    }
                }}
                className="h-9 w-full pr-8"
                placeholder="Scan to populate"
            />
            {scannedLabel && (
                <button
                    onClick={handleClearScan}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Clear scan"
                >
                    <X className="w-4 h-4" />
                </button>
            )}
        </div>
        </div>
        <div className="flex items-center gap-3 mb-6">
            <Button
                size="sm"
                variant="outline"
                className="h-8 gap-2 text-xs"
                onClick={() => handleOpenScannerMode("camera")}
            >
                <Camera className="w-3.5 h-3.5" />
                Scan via Camera
            </Button>
        </div>
    </div>
</div>

{/* ✅ NEW: Two separate scan buttons below the top row */}


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: form — user fills before scanning */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                                { label: "Customer Name",       value: formCustomer,       onChange: setFormCustomer,       options: activeCustomerOptions,       placeholder: "Select Customer",    span: true },
                                { label: "Product Type",        value: formProductType,    onChange: setFormProductType,    options: activeProductTypeOptions,    placeholder: "Select Product Type", span: true },
                                { label: "Tube Dia & Thickness",value: formTubeDia,        onChange: setFormTubeDia,        options: activeTubeDiaOptions,        placeholder: "Select Tube Dia",    span: true },
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
                                    <SelectContent className="">{activeCouplingFlangeOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>

                            {/* Helper text replacing the old Check button */}
                            <div className="col-span-2 mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                Fill the fields above, then scan the QR code — verification runs automatically.
                            </div>
                        </div>

                        {/* Right: Scanned Label Details — shows DB values, highlights mismatches */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-muted-foreground font-medium">Scanned Label Details</p>
                                {mismatchedFields.size > 0 && (
                                    <span className="text-[10px] font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                                        {mismatchedFields.size} mismatch{mismatchedFields.size > 1 ? "es" : ""}
                                    </span>
                                )}
                                {mismatchedFields.size === 0 && extractedPartNo && (
                                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">
                                        All matched ✓
                                    </span>
                                )}
                            </div>
                            <div className="border border-border/60 rounded-md p-4 bg-muted/20 min-h-[220px]">
                                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                                    {[
                                        { label: "Part No.",      val: extractedPartNo,            cls: "font-semibold text-primary", key: "" },
                                        { label: "Customer:",     val: mismatchedFields.has("customer") ? scannedUserValues.customer : scannedSpec.customer,       key: "customer" },
                                        { label: "JT:",           val: mismatchedFields.has("jointType") ? scannedUserValues.jointType : scannedSpec.jointType,      key: "jointType" },
                                        { label: "Stickers Count:", val: "1",                      key: "" },
                                        { label: "Length:",       val: mismatchedFields.has("tubeLength") ? scannedUserValues.tubeLength : scannedSpec.tubeLength,     key: "tubeLength" },
                                        { label: "Type:",         val: mismatchedFields.has("productType") ? scannedUserValues.productType : scannedSpec.productType,    key: "productType" },
                                        { label: "C_Flange:",     val: mismatchedFields.has("cFlangeOrient") ? scannedUserValues.cFlangeOrient : scannedSpec.cFlangeOrient,  key: "cFlangeOrient" },
                                        { label: "Flange Yoke:",  val: mismatchedFields.has("flangeYoke") ? scannedUserValues.flangeYoke : scannedSpec.flangeYoke,     key: "flangeYoke" },
                                        { label: "CB Kit:",       val: "-",                        key: "" },
                                        { label: "Coupling Flge:", val: mismatchedFields.has("couplingFlange") ? scannedUserValues.couplingFlange : scannedSpec.couplingFlange, key: "couplingFlange" },
                                    ].map(({ label, val, cls, key }) => (
                                        <div key={label}>
                                            <span className="text-muted-foreground inline-block w-24">{label}</span>
                                            <span className={cls || (key ? detailCls(key) : "font-medium")}>
                                                {val || "—"}
                                                {key && mismatchedFields.has(key) && (
                                                    <span className="ml-1 text-[9px] uppercase tracking-wide text-red-500">✗ mismatch</span>
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* History table */}
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
                                    <tr><td colSpan={14} className="py-8 text-center text-muted-foreground">No validation history found. Scan a product to add records.</td></tr>
                                ) : (
                                    scannedProducts.map((record) => (
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
                                            <td className="px-4 py-2 font-mono truncate max-w-[260px]" title={record.scanned_text}>{record.scanned_text}</td>
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
                    if (!open) await handleCloseScanner();
                }}
            >
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Scan Product Label</DialogTitle>
                    </DialogHeader>

                    {isScannerOpen && (
                        <div className="py-4">
                            <QRScanner
                                key={scannerKey}
                                ref={scannerRef}
                                onScan={handleScan}
                                onStopped={handleCloseScanner}
                                initialMode={scanMode} 
                            />
                            <p className="text-xs text-center text-muted-foreground mt-4">
                                Point camera at the product label QR code. The system will automatically capture and verify it.
                            </p>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}