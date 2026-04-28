"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useProducts } from "@/contexts/ProductsContext";
import { useUser } from "@/contexts/UserContext";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileImage, ScanLine, FileText, Eye, AlertTriangle, XCircle, CheckCircle2, Info } from "lucide-react";
import { QRScanner, QRScannerHandle } from "@/components/qr-scanner";
import { fetchFieldImages, getFieldImageUrl, FieldImageRecord } from "@/lib/fieldImageApi";
import { Card, CardContent } from "@/components/ui/card";
import { parseSpecScanText } from "./parseSpecScanText.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseCategorizedDocs = (raw: any) => {
    const empty = { individual: {} as Record<string, string>, ppap: {} as Record<string, string> };
    if (!raw) return empty;
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== "object") return empty;
        return {
            individual: (parsed.individual && typeof parsed.individual === "object") ? parsed.individual : {},
            ppap: (parsed.ppap && typeof parsed.ppap === "object") ? parsed.ppap : {},
        };
    } catch { return empty; }
};

const findDrawingPath = (docs: { individual: Record<string, string>; ppap: Record<string, string> }) => {
    const allDocs = { ...docs.individual, ...docs.ppap };
    const drawingKeys = ["DRAWING", "drawing", "Drawing", "Drawing_Document"];
    for (const key of drawingKeys) {
        if (allDocs[key]) return allDocs[key];
    }
    // Case-insensitive search if not found
    for (const [key, val] of Object.entries(allDocs)) {
        if (key.toLowerCase().includes("drawing")) return val;
    }
    return null;
};

/* ─── CSS keyframes injected once ─────────────────────────────────────────── */
const BLINK_STYLE = `
@keyframes importantBlink {
  0%,100% { border-color: #c8b800; box-shadow: 0 2px 6px rgba(0,0,0,0.15); }
  50%      { border-color: #e53935; box-shadow: 0 0 0 4px rgba(229,57,53,0.35); }
}
`;

const getFileUrl = (filePath: string) => {
    if (filePath.startsWith("http")) return filePath;
    return `${process.env.NEXT_PUBLIC_URL}/${filePath.replace(/\\/g, "/")}`;
};

const ALL_SPECS = [
    { id: "TubeLength",               label: "Tube Length",                    valueKey: "tubeLength"                   },
    { id: "Tube_Dia_Thickness",       label: "Tube Dia & Thickness",           valueKey: "tubeDiameter"                 },
    { id: "Series",                   label: "Series",                         valueKey: "series"                       },
    { id: "TypeOfPart",               label: "Part Type",                      valueKey: "partType"                     },
    { id: "Noise_Deadener",           label: "Available Noise Deadener",       valueKey: "availableNoiseDeadener"       },
    { id: "Fep_Press_H",              label: "Fep Press H. Stock Positions",   valueKey: "fepPressHStockPositions"      },
    { id: "Rear_Housing",             label: "Rear Housing length",            valueKey: "rearHousingLength"            },
    { id: "Long_Fork",                label: "Long Fork Length",               valueKey: "longForkLength"               },
    { id: "SF_Details",               label: "S.F Details",                    valueKey: "sfDetails"                    },
    { id: "PDC_Length",               label: "PDC Length",                     valueKey: "pdcLength"                    },
    { id: "Front_End_Piece",          label: "Front End Piece Details",        valueKey: "frontEndPieceDetails"         },
    { id: "Flange_Yoke",              label: "Flange yoke Details",            valueKey: "mountingDetailsFlangeYoke"    },
    { id: "Greaseable_NonGreaseable", label: "Greaseable or Non Greasable",   valueKey: "greaseableOrNonGreaseable"    },
    { id: "Coupling_Flange",          label: "Coupling Flange Details",        valueKey: "mountingDetailsCouplingFlange"},
    { id: "Coupling_Orientation",     label: "Coupling Flange Orientation",    valueKey: "couplingFlangeOrientations"   },
    { id: "CB_Kit",                   label: "CB Kit Details",                 valueKey: "cbKitDetails"                 },
    { id: "Loctite_Grade",            label: "Loctite Grade Use",              valueKey: "loctiteGradeUse"              },
    { id: "Tightening_Torque",        label: "Hex bolt/Hex nut Tightening",   valueKey: "hexBoltNutTighteningTorque"   },
    { id: "Balancing_RPM",            label: "Balancing RPM",                  valueKey: "balancingRpm"                 },
    { id: "Unbalance_CMG",            label: "Unbalance Value CMG",            valueKey: "unbalanceInCmg"               },
    { id: "Unbalance_GM",             label: "Unbalance Value GM",             valueKey: "unbalanceInGram"              },
    { id:"unbalanceInGram75Percent",   label:"unbalanceInGram75%",        valueKey:"unbalanceInGram75Percent"},
    { id: "IA_Bellow",                label: "I/A Bellow Details",             valueKey: "iaBellowDetails"              },
    { id: "Total_Length",             label: "Total Length",                   valueKey: "totalLength"                  },
    { id: "Rear_Slip",                label: "RearSlip",                       valueKey: "slipDetails"                  },
    { id: "Mod_No",                   label: "Mod No",                         valueKey: "revNo"                 },
    { id: "Vendor_Code",              label: "Vendor code",                    valueKey: "vendorCode"                   },
    { id: "Customer_Name",            label: "Customer Name",                  valueKey: "customer"                     },
    { id: "DWG_Weight",               label: "DWG Weight/Mod Date",            valueKey: "partWeight"                   },
];

export default function ProductSpecificationsPage() {
    const { products, loading } = useProducts();
    const { user } = useUser();
    const { data: dynamicFields } = useDynamicFields();

    const [searchTerm, setSearchTerm]     = useState("");
    const [partInfo, setPartInfo]         = useState<any>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [viewDrawingUrl, setViewDrawingUrl] = useState<string | null>(null);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
    const [scannerKey, setScannerKey] = useState(0);
    const scannerRef = useRef<QRScannerHandle>(null);
    const isClosingRef = useRef(false);
    const [fieldImageRecords, setFieldImageRecords] = useState<FieldImageRecord[]>([]);
    const [alertPopup, setAlertPopup] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: "error" | "warning" | "success" | "info";
    }>({
        isOpen: false,
        title: "",
        message: "",
        type: "info"
    });

    useEffect(() => {
        const loadImages = async () => {
            try {
                const data = await fetchFieldImages();
                setFieldImageRecords(data);
            } catch (err) {
                console.error("Failed to fetch field images", err);
            }
        };
        loadImages();
    }, []);

    // ── important fields: set of valueKey names that should blink ────────────
    const importantFieldNames = new Set<string>(dynamicFields?.important_fields ?? []);

    const handleSearch = useCallback((searchQuery?: string | any) => {
        const term = typeof searchQuery === "string" ? searchQuery : searchTerm.trim();
        if (!term.trim()) return;
        const matched = products.find(
            (p) => p.part_number.toLowerCase() === term.toLowerCase()
        );
        if (!matched) {
            setPartInfo(null);
            setAlertPopup({
                isOpen: true,
                title: "Not Found",
                message: "Product not found in master data.",
                type: "error"
            });
            return;
        }
        if (matched.status?.toLowerCase() !== "active") {
            const prodStatus = (matched as any).approved || 'pending';
            const qualStatus = (matched as any).quality_verified || 'pending';

            let msg = "";
            let type: "error" | "warning" = "warning";
            let title = "Product Restricted";

            if (prodStatus === 'rejected') {
                msg = "Product is rejected by Production";
                type = "error";
            } else if (qualStatus === 'rejected') {
                msg = "Product is rejected by Quality";
                type = "error";
            } else if (prodStatus === 'pending' && qualStatus === 'pending') {
                msg = "Product is not verified by Production and Quality";
            } else if (prodStatus === 'pending') {
                msg = "Product is not approved by Production";
            } else if (qualStatus === 'pending') {
                msg = "Product is not verified by Quality";
            } else {
                msg = `Product status: ${matched.status || 'Pending'}`;
            }

            setAlertPopup({
                isOpen: true,
                title,
                message: msg,
                type
            });
            setPartInfo(null);
        } else {
            setPartInfo(matched);
        }
    }, [products, searchTerm]);

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

    const handleScan = useCallback((decodedText: string) => {
        console.log("DEBUG: Decoded Scan Text:", decodedText);
        const parsed = parseSpecScanText(decodedText);
        console.log("DEBUG: Parsed Result:", parsed);
        let partNo = "";

        if (parsed) {
            partNo = parsed.partNo;
            console.log("DEBUG: Extracted PartNo (from parsed):", partNo);
        } else {
            const revIndex = decodedText.toLowerCase().indexOf("rev");
            partNo = revIndex > -1
                ? decodedText.substring(0, revIndex).trim()
                : decodedText.split(" ")[0].trim();
            console.log("DEBUG: Extracted PartNo (fallback):", partNo);
        }

        setSearchTerm(partNo);
        handleSearch(partNo);
        handleCloseScanner();
    }, [handleCloseScanner, handleSearch]);

    const handleReset = () => {
        setSearchTerm("");
        setPartInfo(null);
    };

    if (loading)
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
            </DashboardLayout>
        );

    const userColumns = user?.column_array || [];
    const showImage   = user?.show_image === "true";
    const canViewDrawing = user?.document_name_array?.some(d => 
        ["Drawing_Document", "drawing_DOCUMENT", "drawing", "Drawing","Drawings"].includes(d)
    );
    const filteredSpecs = ALL_SPECS.filter((s) => userColumns.includes(s.id));

    let productImages: Record<string, string> = {};
    if (partInfo?.product_images) {
        try {
            productImages = typeof partInfo.product_images === "string"
                ? JSON.parse(partInfo.product_images)
                : partInfo.product_images;
        } catch { /* ignore */ }
    }

    return (
        <DashboardLayout>
            {/* Inject blink keyframes once */}
            <style>{BLINK_STYLE}</style>

            <div
                style={{
                    fontFamily: "'Arial Black', Arial, sans-serif",
                    backgroundColor: "#d0ece7",
                    minHeight: "100vh",
                }}
            >
                {/* ── TOP BAR ── */}
                <div
                    style={{
                        backgroundColor: "#007a6e",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 14px",
                        flexWrap: "wrap",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                    }}
                >
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleScan(searchTerm)}
                        placeholder="Enter Part Number"
                        style={{
                            flex: "0 0 260px",
                            height: "48px",
                            width:"180px",
                            border: "3px solid #e53935",
                            borderRadius: "5px",
                            padding: "0 14px",
                            fontSize: "20px",
                            fontWeight: "900",
                            color: "#c62828",
                            background: "#fffde7",
                            outline: "none",
                            letterSpacing: "1px",
                        }}
                    />

                    <div
                        style={{
                            flex: "1",
                            height: "48px",
                            border: "3px solid #e53935",
                            borderRadius: "5px",
                            padding: "0 16px",
                            fontSize: "17px",
                            fontWeight: "900",
                            color: "#c62828",
                            background: "#fffde7",
                            display: "flex",
                            alignItems: "center",
                            minWidth: "240px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        {partInfo?.specification?.partDescription || ""}
                    </div>
                                                        <div className="  flex justify-center">

                    {canViewDrawing && partInfo && (
                        (() => {
                            const docs = parseCategorizedDocs(partInfo.ppap_documents);
                            const drawingPath = findDrawingPath(docs);
                            if (!drawingPath) return null;
                            
                            return (
                                <button
                                    onClick={() => window.open(`${getFileUrl(drawingPath)}#toolbar=0`, "_blank")}
                                    style={{
                                        height: "44px", padding: "0 22px",
                                        background: "#f57c00", color: "#fff",
                                        border: "2px solid #fb8c00", borderRadius: "5px",
                                        fontSize: "14px", fontWeight: "800", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: "8px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                    }}
                                >
                                    <FileText className="w-5 h-5" /> Drawing
                                </button>
                            );
                        })()
                    )}
                                    </div>

                    <button
                        onClick={() => {
                            setScannerKey(prev => prev + 1);
                            setIsScannerOpen(true);
                        }}
                        style={{
                            height: "44px", padding: "0 22px",
                            background: "#ab47bc", color: "#fff",
                            border: "2px solid #ce93d8", borderRadius: "5px",
                            fontSize: "16px", fontWeight: "800", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "6px",
                        }}
                    >
                        <ScanLine className="w-5 h-5" /> Scan
                    </button>

                    <button
                        onClick={handleSearch}
                        style={{
                            height: "44px", padding: "0 22px",
                            background: "#26a69a", color: "#fff",
                            border: "2px solid #80cbc4", borderRadius: "5px",
                            fontSize: "16px", fontWeight: "800", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: "6px",
                        }}
                    >
                        🔍 Show
                    </button>

                    <button
                        onClick={handleReset}
                        style={{
                            height: "44px", padding: "0 22px",
                            background: "#b2dfdb", color: "#004d40",
                            border: "2px solid #80cbc4", borderRadius: "5px",
                            fontSize: "16px", fontWeight: "800", cursor: "pointer",
                        }}
                    >
                        Reset
                    </button>

                    {partInfo?.specification?.approved === "approved" && (
                        <button
                            style={{
                                height: "44px", padding: "0 22px",
                                background: "#2e7d32", color: "#fff",
                                border: "none", borderRadius: "5px",
                                fontSize: "16px", fontWeight: "800", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                            }}
                        >
                            ✔ Quality
                        </button>
                    )}

                    {partInfo?.specification?.quality_verified === "approved" && (
                        <button
                            style={{
                                height: "44px", padding: "0 22px",
                                background: "#1565c0", color: "#fff",
                                border: "none", borderRadius: "5px",
                                fontSize: "16px", fontWeight: "800", cursor: "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                            }}
                        >
                            ✔ Production
                        </button>
                    )}


                </div>

                {/* ── SPEC GRID ── */}
                <div style={{ padding: "12px 14px 24px" }}>
                    <div className="grid grid-cols-4 gap-y-4 gap-x-2">
                        {filteredSpecs.map((spec) => {
                            const val = partInfo?.[spec.valueKey]
                                     ?? partInfo?.specification?.[spec.valueKey];
                            const hasImage = showImage && productImages?.[spec.valueKey];
                            const isImportant = importantFieldNames.has(spec.valueKey);

                            return (
                                <div
                                    key={spec.id}
                                    style={{ flex: "1 1 240px", display: "flex", flexDirection: "column" }}
                                >
                                    {/* Label row */}
                                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                                        <span style={{
                                            fontSize: "16px",
                                            fontWeight: "700",
                                            color: isImportant ? "#b71c1c" : "#111",
                                            paddingLeft: "4px",
                                            letterSpacing: "0.2px",
                                        }}>
                                            {spec.label}
                                            {/* small star badge for important fields */}
                                            {isImportant && (
                                                <span style={{
                                                    marginLeft: "6px",
                                                    fontSize: "13px",
                                                    color: "#e53935",
                                                    verticalAlign: "middle",
                                                }}>★</span>
                                            )}
                                        </span>

                                        {hasImage && (
                                            <button
                                                onClick={() => setSelectedImage(getFileUrl(productImages[spec.valueKey]))}
                                                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex" }}
                                                title="View Image"
                                            >
                                                <FileImage className="w-5 h-5 text-blue-600 hover:text-blue-800 transition-colors" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Value shell — blinks when important */}
                                    <div style={{
                                        background: isImportant ? "#e53935" : "#ffff33",
                                        border: isImportant ? "3px solid #fdeceb" : "2px solid #c8b800",
                                        borderRadius: "5px",
                                        padding: "10px 16px",
                                        fontSize: "21px",
                                        fontWeight: "900",
                                        font: "#0d1b8e",
                                        color: "#0d1b8e",
                                        minHeight: "52px",
                                        display: "flex",
                                        alignItems: "center",
                                        letterSpacing: "0.5px",
                                        textShadow: "0 1px 0 rgba(255,255,255,0.4)",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                                        lineHeight: 1.1,
                                        width: "100%",
                                        // blink only when flagged as important
                                        animation: isImportant
                                            ? "importantBlink 1.1s ease-in-out infinite"
                                            : "none",
                                    }}>
                                        {val ?? "NA"}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* ── REFERENCE IMAGES (DYNAMIC) ── */}
                {partInfo && (
                    <div style={{ padding: "0 14px 40px" }}>
                        {(() => {
                            // Find matching images: 
                            // record.field_name could be valueKey, label, or id from ALL_SPECS
                            // record.option_value must match partInfo[key]
                            const matchingImages = fieldImageRecords.filter(rec => {
                                const spec = ALL_SPECS.find(s => 
                                    s.valueKey.toLowerCase() === rec.field_name.toLowerCase() ||
                                    s.label.toLowerCase() === rec.field_name.toLowerCase() ||
                                    s.id.toLowerCase() === rec.field_name.toLowerCase()
                                );
                                
                                if (!spec) return false;

                                const val = partInfo[spec.valueKey] ?? partInfo.specification?.[spec.valueKey] ?? partInfo[spec.id];
                                if (val === undefined || val === null || val === "") return false;

                                return String(val).trim().toLowerCase() === rec.option_value.trim().toLowerCase();
                            });

                            if (matchingImages.length === 0) return null;

                            return (
                                <>
                                    <div className="flex items-center gap-3 mb-6 mt-4">
                                        <div className="h-8 w-1.5 bg-[#007a6e] rounded-full" />
                                        <h2 style={{ 
                                            fontSize: "24px", 
                                            fontWeight: "900", 
                                            color: "#007a6e", 
                                            letterSpacing: "0.5px",
                                            textTransform: "uppercase"
                                        }}>
                                            Reference  Images
                                        </h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        {matchingImages.map((img) => {
                                            const specLabel = ALL_SPECS.find(s => 
                                                s.valueKey.toLowerCase() === img.field_name.toLowerCase() ||
                                                s.label.toLowerCase() === img.field_name.toLowerCase() ||
                                                s.id.toLowerCase() === img.field_name.toLowerCase()
                                            )?.label || img.field_name;

                                            return (
                                                <Card key={img.id} className="border-0 shadow-lg pb-4 overflow-hidden bg-white ring-1 ring-black/5 hover:ring-black/10 transition-all duration-300 p-0">
                                                    <CardContent className="p-0 w-full">
                                                        <div className=" bg-gradient-to-r from-[#007a6e] to-[#00897b] text-white px-2 py-1 flex justify-between items-center">
                                                            <div className="flex flex-col">
                                                                <span className="text-[10px] font-bold uppercase opacity-80 tracking-widest"></span>
                                                                <span className="text-xs font-black">{specLabel}</span>
                                                            </div>
                                                            <div className="bg-white/20 backdrop-blur-sm px-1 py-1 rounded-md border border-white/30">
                                                                <span className="text-xs font-bold">{img.option_value}</span>
                                                            </div>
                                                        </div>
                                                        <div 
                                                            className="aspect-video relative overflow-hidden bg-[#f0f4f3] flex items-center justify-center cursor-zoom-in group"
                                                            onClick={() => setSelectedImage(getFieldImageUrl(img.file_path))}
                                                        >
                                                            <div className="absolute inset-0 bg-grid-slate-200/50 [mask-image:linear-gradient(0deg,#fff,rgba(255,255,255,0.6))] -z-0" />
                                                            <img 
                                                                src={getFieldImageUrl(img.file_path)} 
                                                                alt={`${specLabel}: ${img.option_value}`}
                                                                className="w-full h-full  object-contain relative z-10 drop-shadow-md transition-transform duration-500 "
                                                            />

                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                )}

                {/* Image dialog */}
                <Dialog open={!!selectedImage} onOpenChange={(o) => !o && setSelectedImage(null)}>
                    <DialogContent className="w-3xl bg-slate-300">

                        {selectedImage && (
                            <div className="flex justify-center rounded-md overflow-hidden bg-gray-100 mt-4 max-h-[80vh]">
                                <img src={selectedImage} alt="Spec Detail" className="object-contain w-full" />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* QR Scanner dialog */}
                <Dialog open={isScannerOpen} onOpenChange={async (o) => { if (!o) await handleCloseScanner(); }}>
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
                                />
                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    Point camera at the product label QR code. The system will automatically capture and search it.
                                </p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Technical Drawing Viewer dialog */}
                <Dialog open={!!viewDrawingUrl} onOpenChange={(o) => !o && setViewDrawingUrl(null)}>
                    <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-4">
                        <DialogHeader className="pb-2 border-b">
                            <div className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                <DialogTitle>Technical Drawing — {partInfo?.part_number}</DialogTitle>
                            </div>
                        </DialogHeader>
                        {viewDrawingUrl && (
                            <div className="flex-1 mt-4 rounded-lg overflow-hidden bg-muted/20 border flex items-center justify-center">
                                {viewDrawingUrl.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img 
                                        src={viewDrawingUrl} 
                                        alt="Technical Drawing" 
                                        className="object-contain max-w-full max-h-full p-4" 
                                    />
                                ) : (
                                    <iframe 
                                        src={viewDrawingUrl} 
                                        className="w-full h-full border-0" 
                                        title="Technical Drawing PDF"
                                    />
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* Alert Popup Dialog */}
                <Dialog open={alertPopup.isOpen} onOpenChange={(o) => setAlertPopup(prev => ({ ...prev, isOpen: o }))}>
                    <DialogContent className="max-w-md p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                        <div className={`p-6 flex flex-col items-center text-center space-y-4 ${
                            alertPopup.type === 'error' ? 'bg-red-50' : 
                            alertPopup.type === 'warning' ? 'bg-amber-50' : 
                            alertPopup.type === 'success' ? 'bg-emerald-50' : 'bg-blue-50'
                        }`}>
                            <div className={`p-4 rounded-full ${
                                alertPopup.type === 'error' ? 'bg-red-100 text-red-600' : 
                                alertPopup.type === 'warning' ? 'bg-amber-100 text-amber-600' : 
                                alertPopup.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                {alertPopup.type === 'error' && <XCircle className="w-10 h-10" />}
                                {alertPopup.type === 'warning' && <AlertTriangle className="w-10 h-10" />}
                                {alertPopup.type === 'success' && <CheckCircle2 className="w-10 h-10" />}
                                {alertPopup.type === 'info' && <Info className="w-10 h-10" />}
                            </div>
                            
                            <div className="space-y-2">
                                <h3 className={`text-xl font-black uppercase tracking-tight ${
                                    alertPopup.type === 'error' ? 'text-red-700' : 
                                    alertPopup.type === 'warning' ? 'text-amber-700' : 
                                    alertPopup.type === 'success' ? 'text-emerald-700' : 'text-blue-700'
                                }`}>
                                    {alertPopup.title}
                                </h3>
                                <p className="text-slate-600 font-bold leading-relaxed px-4">
                                    {alertPopup.message}
                                </p>
                            </div>

                            <button
                                onClick={() => setAlertPopup(prev => ({ ...prev, isOpen: false }))}
                                className={`w-full py-3 rounded-xl font-black text-white shadow-lg transition-all active:scale-95 ${
                                    alertPopup.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200' : 
                                    alertPopup.type === 'warning' ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-200' : 
                                    alertPopup.type === 'success' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
                                }`}
                            >
                                GOT IT
                            </button>
                        </div>
                    </DialogContent>
                </Dialog>
                                    {/* ── VIEW DRAWING BUTTON ── */}

            </div>
        </DashboardLayout>
    );
}