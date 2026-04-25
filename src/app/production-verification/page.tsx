"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProducts } from "@/contexts/ProductsContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { QRScanner, QRScannerHandle } from "@/components/qr-scanner";
import { ScanLine, X, Search, CheckCircle2, Keyboard, Camera, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { parseScanText } from "./parseScanText.js";

const CUSTOMER_OPTIONS          = ["ALL ALW", "ALL PNR", "ALL HUSUR", "TML", "VECV", "SWITCH MOBILITY", "IPLT"];
const PRODUCT_TYPE_OPTIONS      = ["COMPONENT", "DUMB", "FRONT", "I/A", "INTEGRATED", "MIDDLE", "NA", "REAR"];
const TUBE_DIA_OPTIONS          = ["0100X3.0", "100X4.5", "0101.577341", "0103.9X4.3", "ZEXP110", "0113.4X5.2", "0120X3", "120X4", "0120x6"];
const C_FLANGE_ORIENTATION_OPTIONS = ["0", "90 degree", "N/A"];
const COUPLING_FLANGE_OPTIONS   = ["C/F 120 DIA 4 HOLES", "C/F 130 DIA & HOLES", "C/F 150 DIA 4 HOLES", "C/P 150 DIA ROUND 4 HOLES", "C/P 100 DIA 4 HOLES", "COUPLING YOKE", "NA", "21 SLEEVE YOKE"];
const JOINT_TYPE_OPTIONS        = ["135IT", "14K", "225/7", "325HS", "3251T", "325M", "403 JT", "490 L TML", "7061", "490/A TML", "7064", "7062 TML", "585/T", "4901T TML", "450M 7066 TML", "590H 7065 TML", "5901T TML"];
const FLANGE_YOKE_OPTIONS       = ["F/Y 120 DIA 4 HOLES", "F/Y 130 DIA BHOLES", "F/Y 150 DIA LES", "F/Y 180 DIA 4 HOLES", "F/Y IA 150 DIA & HOLES", "F/YIA 180 DIA 4 HOLES", "PYO120 LF SIDE & FYO150 SF SIDE SERRAT", "FYD120 REP SIDE BL FYRISO SP-SP", "FHD120 HER SIDEFYDT50 SF-SF", "PYO150 LF SIDE & FVØ160 SF SIDE SERRATED", "FY180LF SIDE & FYD150 SF SIDE SERRATED"];

// ─── Client-side page size ────────────────────────────────────────────────────
const PAGE_SIZE = 20;

export default function ProductionVerificationPage() {
    const { products, loading: productsLoading, dropdownOptions } = useProducts();
    const { scannedProducts,dailySummary,fetchDailySummary, recordScan, loading: scanLoading, fetchScannedProducts } = useScannedProducts();
const scannedInputRef = useRef<HTMLInputElement>(null);

    // ── Fetch ALL records once on mount (no pagination params) ───────────────
    useEffect(() => {
const today = new Date().toISOString().split("T")[0];
fetchDailySummary(today);    // fetchScannedProducts is stable (useCallback), runs only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Client-side pagination ───────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(dailySummary.length / PAGE_SIZE));

    const pagedRecords = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return dailySummary.slice(start, start + PAGE_SIZE);
    }, [dailySummary, currentPage]);

    const rangeStart = dailySummary.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
    const rangeEnd   = Math.min(currentPage * PAGE_SIZE, dailySummary.length);

    // ── Scanner ───────────────────────────────────────────────────────────────
    const [isScannerOpen, setIsScannerOpen]   = useState(false);
    const [scannerKey, setScannerKey]         = useState(0);
    const [scanMode, setScanMode]             = useState<"camera" | "external">("camera");
    const scannerRef   = useRef<QRScannerHandle>(null);
    const isClosingRef = useRef(false);

    const handleOpenScannerMode = useCallback((mode: "camera" | "external") => {
        setScanMode(mode);
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

const formatDateTime = (dateString?: string, onlyDate = false) => {
    if (!dateString) return "-";
    const cleanDate = dateString.endsWith("Z") ? dateString.slice(0, -1) : dateString;
    const d = new Date(cleanDate);
    if (isNaN(d.getTime())) return dateString;

    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();

    if (onlyDate) return `${day} ${month} ${year}`;

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

    // ── Form ──────────────────────────────────────────────────────────────────
    const [plant, setPlant]                         = useState("Lucknow-RSB LKW");
    const [partSlNo, setPartSlNo]                   = useState("");
    const [scannedLabel, setScannedLabel]           = useState("");
    const [formCustomer, setFormCustomer]           = useState("");
    const [formProductType, setFormProductType]     = useState("");
    const [formTubeDia, setFormTubeDia]             = useState("");
    const [formTubeLength, setFormTubeLength]       = useState("");
    const [formJointType, setFormJointType]         = useState("");
    const [formCFlangeOrientation, setFormCFlangeOrientation] = useState("");
    const [formFlangeYoke, setFormFlangeYoke]       = useState("");
    const [formCouplingFlange, setFormCouplingFlange] = useState("");
    const [extractedPartNo, setExtractedPartNo]     = useState("");

    // ── Verification state ────────────────────────────────────────────────────
    const [mismatchedFields, setMismatchedFields]   = useState<Set<string>>(new Set());
    const [scannedSpec, setScannedSpec]             = useState<Record<string, string>>({});
    const [scannedUserValues, setScannedUserValues] = useState<Record<string, string>>({});

    const handleClearScan = useCallback(() => {
        setScannedLabel("");
        setPartSlNo("");
        setExtractedPartNo("");
        setMismatchedFields(new Set());
        setScannedSpec({});
        setScannedUserValues({});
    }, []);
    const handleClearlabeltext = useCallback(() => {
        setScannedLabel("");
        setPartSlNo("");
        setExtractedPartNo("");
    }, []);

    const dedupe = (arr: string[] | undefined) => arr?.length ? Array.from(new Set(arr)) : undefined;

    const activeCustomerOptions          = dedupe(dropdownOptions?.CUSTOMER_OPTIONS)          ?? CUSTOMER_OPTIONS;
    const activeProductTypeOptions       = dedupe(dropdownOptions?.PRODUCT_TYPE_OPTIONS)       ?? PRODUCT_TYPE_OPTIONS;
    const activeTubeDiaOptions           = dedupe(dropdownOptions?.TUBE_DIA_OPTIONS)           ?? TUBE_DIA_OPTIONS;
    const activeCFlangeOrientationOptions= dedupe(dropdownOptions?.C_FLANGE_ORIENTATION_OPTIONS)?? C_FLANGE_ORIENTATION_OPTIONS;
    const activeCouplingFlangeOptions    = dedupe(dropdownOptions?.COUPLING_FLANGE_OPTIONS)    ?? COUPLING_FLANGE_OPTIONS;
    const activeJointTypeOptions         = dedupe(dropdownOptions?.JOINT_TYPE_OPTIONS)         ?? JOINT_TYPE_OPTIONS;
    const activeFlangeYokeOptions        = dedupe(dropdownOptions?.FLANGE_YOKE_OPTIONS)        ?? FLANGE_YOKE_OPTIONS;

    const isFlangeDisabled = formProductType !== "FRONT" && formProductType !== "MIDDLE" && formProductType !== "INTEGRATED";
const focusScanInput = useCallback(() => {
    setTimeout(() => {
        scannedInputRef.current?.focus();
    }, 50); // small delay ensures DOM is ready
}, []);

    // ── Core scan handler ─────────────────────────────────────────────────────
    const handleScan = useCallback(async (decodedText: string) => {
        setScannedLabel(decodedText);
        setMismatchedFields(new Set());
        setScannedSpec({});

        const parsed = parseScanText(decodedText);
        let partNo = "";
        let extractedSlNo = "";

        if (parsed) {
            partNo        = parsed.partNo;
            extractedSlNo = parsed.partSlNo;
        } else {
            const revIndex = decodedText.toLowerCase().indexOf("rev");
            partNo = revIndex > -1
                ? decodedText.substring(0, revIndex).trim()
                : decodedText.split(" ")[0].trim();
            extractedSlNo = decodedText.length >= 6 ? decodedText.slice(-6) : decodedText;
        }

        const finalSlNo = (partSlNo && partSlNo.trim() !== "") ? partSlNo : extractedSlNo;

        setExtractedPartNo(partNo);
        setPartSlNo(finalSlNo);

        const matchedProduct = products.find(p => p.part_number === partNo);

        if (!matchedProduct) {
            toast.warning(`Part Number ${partNo} not found in database.`);
            return;
        }

        const spec = matchedProduct.specification || {};
        const dbCustomer       = matchedProduct.customer || "";
        const dbProductType    = spec.partType || "";
        const dbTubeDia        = spec.tubeDiameter || "";
        const dbTubeLength     = String(spec.tubeLength || "");
        const dbJointType      = spec.series || "";
        const dbCFlangeOrient  = spec.couplingFlangeOrientations || "";
        const dbFlangeYoke     = spec.mountingDetailsFlangeYoke || "";
        const dbCouplingFlange = spec.mountingDetailsCouplingFlange || "";

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

        const hour = new Date().getHours();
        const currentShift = hour >= 6 && hour < 14 ? "A" : hour >= 14 && hour < 22 ? "B" : "C";

        const result = await recordScan({
            part_no:        partNo,
            dispatch_date:  new Date().toISOString().split("T")[0],
            shift:          currentShift,
            customer_name:  formCustomer || "Unknown",
            product_type:   formProductType || "Unknown",
            scanned_text:   decodedText,
            part_sl_no:     finalSlNo,
            plant_location: plant,
            vendorCode:     matchedProduct.specification?.vendorCode || "N/A",
            scanned_specification: {
                tubeDiameter:   formTubeDia,
                tubeLength:     Number(formTubeLength) || 0,
                series:         formJointType,
                cFlangeOrient:  formCFlangeOrientation,
                flangeYoke:     formFlangeYoke,
                couplingFlange: formCouplingFlange,
            },
        });

        if (result) {
            // Map backend labels to frontend keys
            const labelMap: Record<string, string> = {
                "Tube Diameter":   "tubeDia",
                "Tube Length":     "tubeLength",
                "Series":          "jointType",
                "C-Flange Orient": "cFlangeOrient",
                "Flange Yoke":     "flangeYoke",
                "Coupling Flange": "couplingFlange",
                "Customer":        "customer",
                "Product Type":    "productType",
                "Rev No":          "revNo"
            };

            const mismatches = new Set<string>();
            if (Array.isArray(result.mismatched_fields)) {
                result.mismatched_fields.forEach(label => {
                    const key = labelMap[label];
                    if (key) mismatches.add(key);
                });
            }
            setMismatchedFields(mismatches);
            handleClearlabeltext();
        }
        focusScanInput();


        // After a new scan is recorded, jump back to page 1 so the user sees it immediately
        setCurrentPage(1);
    }, [
        products, partSlNo, plant, recordScan,
        formCustomer, formProductType, formTubeDia, formTubeLength,
        formJointType, formCFlangeOrientation, formFlangeYoke, formCouplingFlange,
    ]);

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
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_minmax(300px,1fr)] gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Label className="w-24 shrink-0">Plant</Label>
                            <Input value={plant} onChange={e => setPlant(e.target.value)} className="h-9" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Label className="w-24 shrink-0">Part Sl NO.</Label>
                            <Input value={partSlNo} onChange={e => setPartSlNo(e.target.value)} className="h-9 bg-muted/50" />
                        </div>
                        <div className="flex items-center justify-end flex-col gap-2">
                            <div className="flex w-full">
                                <Label className="w-24 shrink-0">Scanned Label</Label>
                                <div className="relative flex-1">
                                    <Input
                                        ref={scannedInputRef}
                                        value={scannedLabel}
                                        onChange={e => setScannedLabel(e.target.value)}
                                        onKeyDown={e => { if (e.key === "Enter") handleScan(scannedLabel); }}
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

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left: form */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            {[
                                { label: "Customer Name",        value: formCustomer,    onChange: setFormCustomer,    options: activeCustomerOptions,     placeholder: "Select Customer",     span: true },
                                { label: "Product Type",         value: formProductType, onChange: setFormProductType, options: activeProductTypeOptions,   placeholder: "Select Product Type", span: true },
                                { label: "Tube Dia & Thickness", value: formTubeDia,     onChange: setFormTubeDia,     options: activeTubeDiaOptions,       placeholder: "Select Tube Dia",     span: true },
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

                            <div className="col-span-2 mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                Fill the fields above, then scan the QR code — verification runs automatically.
                            </div>
                        </div>

                        {/* Right: Scanned Label Details */}
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
                                        { label: "Part No.",       val: extractedPartNo,                                                                                                    cls: "font-semibold text-primary", key: "" },
                                        { label: "Customer:",      val: mismatchedFields.has("customer")      ? scannedUserValues.customer      : scannedSpec.customer,       key: "customer" },
                                        { label: "JT:",            val: mismatchedFields.has("jointType")     ? scannedUserValues.jointType      : (scannedSpec.jointType || "—"),      key: "jointType" },
                                        { label: "Stickers Count:",val: "1",                                                                                                                cls: "font-medium",                key: "" },
                                        { label: "Length:",        val: mismatchedFields.has("tubeLength")    ? scannedUserValues.tubeLength     : (scannedSpec.tubeLength || "—"),     key: "tubeLength" },
                                        { label: "Type:",          val: mismatchedFields.has("productType")   ? scannedUserValues.productType    : (scannedSpec.productType || "—"),    key: "productType" },
                                        { label: "C_Flange:",      val: mismatchedFields.has("cFlangeOrient") ? scannedUserValues.cFlangeOrient  : (scannedSpec.cFlangeOrient || "—"),  key: "cFlangeOrient" },
                                        { label: "Flange Yoke:",   val: mismatchedFields.has("flangeYoke")    ? scannedUserValues.flangeYoke     : (scannedSpec.flangeYoke || "—"),     key: "flangeYoke" },
                                        { label: "CB Kit:",        val: "-",                                                                                                                cls: "font-medium",                key: "" },
                                        { label: "Coupling Flge:", val: mismatchedFields.has("couplingFlange")? scannedUserValues.couplingFlange : (scannedSpec.couplingFlange || "—"), key: "couplingFlange" },
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

                {/* ── History table ── */}
                <div className="bg-primary text-primary-foreground py-2 px-4 rounded-t-md font-semibold mt-8">
                    Label Validation Details
                </div>
                <div className="bg-card border border-t-0 rounded-b-md shadow-sm p-4 text-sm -mt-6">
                    <div className="flex flex-wrap items-center justify-end mb-4 gap-4">
                        <div className="flex items-center gap-2 relative">
                            <Search className="w-3 h-3 absolute left-2 text-muted-foreground" />
                            <Input placeholder="Search..." className="h-8 w-[200px] text-xs pl-7" />
                        </div>
                    </div>

                    <div className="rounded-md border overflow-x-auto">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    {["Dispatch Date","Shift","Part No.","Customer Name","Product Type","Validation Status","Remarks","Part Sl No.","Scanned Text","Plant Location","Customer Code","Is Rejected?","Created By","Modified By"].map(h => (
                                        <th key={h} className="px-4 py-3 font-semibold text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {pagedRecords.length === 0 ? (
                                    <tr>
                                        <td colSpan={14} className="py-8 text-center text-muted-foreground">
                                            No validation history found. Scan a product to add records.
                                        </td>
                                    </tr>
                                ) : (
                                    pagedRecords?.map((record) => (
                                        <tr key={record.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2">{formatDateTime(record.created_at)}</td>
                                            <td className="px-4 py-2">{record.shift}</td>
                                            <td className="px-4 py-2">{record.part_no}</td>
                                            <td className="px-4 py-2">{record.customer_name}</td>
                                            <td className="px-4 py-2">{record.product_type}</td>
                                            <td className="px-4 py-2">
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                                    record.validation_status === "pass"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : record.validation_status === "fail"
                                                        ? "bg-red-100 text-red-700"
                                                        : "bg-yellow-100 text-yellow-700"
                                                }`}>
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

                    {/* ── Pagination (client-side — zero API calls on page change) ── */}
                    {dailySummary.length > PAGE_SIZE && (
                        <div className="flex items-center justify-between mt-4">
                            <p className="text-xs text-muted-foreground">
                                Showing {rangeStart}–{rangeEnd} of {dailySummary.length} records
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline" size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                >
                                    <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                                </Button>

                                {/* Page number pills */}
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum: number;
                                    if (totalPages <= 5)           pageNum = i + 1;
                                    else if (currentPage <= 3)     pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else                           pageNum = currentPage - 2 + i;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"}
                                            size="sm"
                                            className="h-8 w-8 p-0 text-xs"
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}

                                <Button
                                    variant="outline" size="sm"
                                    disabled={currentPage === totalPages}
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                >
                                    Next <ChevronRight className="w-4 h-4 ml-1" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── QR Scanner Dialog ── */}
            <Dialog open={isScannerOpen} onOpenChange={async (open) => { if (!open) await handleCloseScanner(); }}>
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