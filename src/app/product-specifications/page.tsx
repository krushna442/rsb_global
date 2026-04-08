"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useProducts } from "@/contexts/ProductsContext";
import { useUser } from "@/contexts/UserContext";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { FileImage, ScanLine, FileText, Eye } from "lucide-react";
import { QRScanner } from "@/components/qr-scanner";

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

    // ── important fields: set of valueKey names that should blink ────────────
    const importantFieldNames = new Set<string>(dynamicFields?.important_fields ?? []);

    const handleSearch = (searchQuery?: string | any) => {
        const term = typeof searchQuery === "string" ? searchQuery : searchTerm;
        if (!term.trim()) return;
        const matched = products.find(
            (p) => p.part_number.toLowerCase() === term.toLowerCase()
        );
        if (!matched) {
            setPartInfo(null);
            toast.error("Product not found");
            return;
        }
        if (matched.status?.toLowerCase() === "pending") {
            toast.warning("The product is not verified yet");
            setPartInfo(null);
        } else {
            setPartInfo(matched);
        }
    };

    const handleScan = (decodedText: string) => {
        setIsScannerOpen(false);
        const revIndex = decodedText.toLowerCase().indexOf("rev");
        const partNo = revIndex > -1
            ? decodedText.substring(0, revIndex).trim()
            : decodedText.split(" ")[0].trim();
        setSearchTerm(partNo);
        handleSearch(partNo);
    };

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
        ["Drawing_Document", "drawing_DOCUMENT", "drawing", "Drawing"].includes(d)
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
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        placeholder="Enter Part Number"
                        style={{
                            flex: "0 0 260px",
                            height: "48px",
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
                            fontSize: "20px",
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

                    <button
                        onClick={() => setIsScannerOpen(true)}
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
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
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
                                            fontSize: "17px",
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
                                        background: "#ffff33",
                                        border: isImportant ? "3px solid #e53935" : "2px solid #c8b800",
                                        borderRadius: "5px",
                                        padding: "10px 16px",
                                        fontSize: "26px",
                                        fontWeight: "900",
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

                {/* Image dialog */}
                <Dialog open={!!selectedImage} onOpenChange={(o) => !o && setSelectedImage(null)}>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>Spec Image</DialogTitle>
                        </DialogHeader>
                        {selectedImage && (
                            <div className="flex justify-center rounded-md overflow-hidden bg-gray-100 mt-4 max-h-[70vh]">
                                <img src={selectedImage} alt="Spec Detail" className="object-contain max-h-full" />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                {/* QR Scanner dialog */}
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Scan Product Label</DialogTitle>
                        </DialogHeader>
                        {isScannerOpen && (
                            <div className="py-4">
                                <QRScanner onScan={handleScan} />
                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    Point camera at the product label QR code.
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
                                    {/* ── VIEW DRAWING BUTTON ── */}
                                    <div className=" w-full flex justify-center py-10">

                    {canViewDrawing && partInfo && (
                        (() => {
                            const docs = parseCategorizedDocs(partInfo.ppap_documents);
                            const drawingPath = findDrawingPath(docs);
                            if (!drawingPath) return null;
                            
                            return (
                                <button
                                    onClick={() => window.open(getFileUrl(drawingPath), "_blank")}
                                    style={{
                                        height: "44px", padding: "0 22px",
                                        background: "#f57c00", color: "#fff",
                                        border: "2px solid #fb8c00", borderRadius: "5px",
                                        fontSize: "16px", fontWeight: "800", cursor: "pointer",
                                        display: "flex", alignItems: "center", gap: "8px",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
                                    }}
                                >
                                    <FileText className="w-5 h-5" /> View Drawing
                                </button>
                            );
                        })()
                    )}
                                    </div>
            </div>
        </DashboardLayout>
    );
}