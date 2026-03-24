"use client";

import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useProducts } from "@/contexts/ProductsContext";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Eye, FileImage, FileSpreadsheet, FileText, TypeIcon, Upload, ScanLine } from "lucide-react";
import { QRScanner } from "@/components/qr-scanner";


const typeIcon: Record<string, React.ElementType> = {
    Drawing: FileImage,
    IQA: FileSpreadsheet,
    PO: FileText,
    TRSO: FileText,
    PSW: FileText,
    default: FileText
};

const typeBadge: Record<string, string> = {
    Drawing: "bg-purple-50 text-purple-700 border-purple-200",
    IQA: "bg-teal-50 text-teal-700 border-teal-200",
    PO: "bg-blue-50 text-blue-700 border-blue-200",
    TRSO: "bg-orange-50 text-orange-700 border-orange-200",
    PSW: "bg-green-50 text-green-700 border-green-200",
    default: "bg-gray-50 text-gray-700 border-gray-200"
};


const getFileUrl = (filePath: string) => {
    // If it's already an absolute URL, return it
    if (filePath.startsWith('http')) return filePath;
    // Otherwise replace backslashes (Windows) to forward slashes and prepend server base url
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `https://rsb-server-1.onrender.com/${normalizedPath}`;
};

export default function ProductSpecificationsPage() {
    const { products, loading } = useProducts();
    const [searchTerm, setSearchTerm] = useState("");
    const [partInfo, setPartInfo] = useState<any>(null);
    const [viewDoc, setViewDoc] = useState<{name: string, url: string} | null>(null);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isScannerOpen, setIsScannerOpen] = useState(false);
const [open, setOpen] = useState(false);
    const handleSearch = (searchQuery?: string | any) => {
        const termToSearch = typeof searchQuery === 'string' ? searchQuery : searchTerm;
        if (!termToSearch.trim()) return;
        const matched = products.find(
            (p) => p.part_number.toLowerCase() === termToSearch.toLowerCase()
        );
        if (matched) {
            if (matched.status?.toLowerCase() === "pending") {
                toast.warning("The product is not verified yet");
                setPartInfo(null);
            } else {
                setPartInfo(matched);
            }
        } else {
            setPartInfo(null);
            toast.error("Product not found");
        }
    };

    const handleScan = (decodedText: string) => {
        setIsScannerOpen(false);
        let partNo = "";
        const revIndex = decodedText.toLowerCase().indexOf("rev");
        if (revIndex > -1) {
            partNo = decodedText.substring(0, revIndex).trim();
        } else {
            partNo = decodedText.split(" ")[0].trim();
        }
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

    const specs = [
        [
            { label: "Tube Length", value: (partInfo?.tubeLength || partInfo?.specification?.tubeLength) },
            { label: "Tube Dia & Thickness", value: (partInfo?.tubeDiameter || partInfo?.specification?.tubeDiameter) },
            { label: "Series", value: (partInfo?.series || partInfo?.specification?.series) },
            { label: "Part Type", value: (partInfo?.partType || partInfo?.specification?.partType) },
        ],
        [
            { label: "Available Noise Deadener", value: (partInfo?.availableNoiseDeadener || partInfo?.specification?.availableNoiseDeadener) },
            { label: "Fep Press H. Stock Positions", value: (partInfo?.fepPressHStockPositions || partInfo?.specification?.fepPressHStockPositions) },
            { label: "Rear Housing length", value: (partInfo?.rearHousingLength || partInfo?.specification?.rearHousingLength) },
            { label: "Long Fork Length", value: (partInfo?.longForkLength || partInfo?.specification?.longForkLength) },
        ],
        [
            { label: "S.F Details", value: (partInfo?.sfDetails || partInfo?.specification?.sfDetails) },
            { label: "PDC Length", value: (partInfo?.pdcLength || partInfo?.specification?.pdcLength) },
            { label: "Front End Piece Details", value: (partInfo?.frontEndPieceDetails || partInfo?.specification?.frontEndPieceDetails) },
            { label: "Flange yoke Details", value: (partInfo?.mountingDetailsFlangeYoke || partInfo?.specification?.mountingDetailsFlangeYoke) },
        ],
        [
            { label: "Greaseable or Non Greasable", value: (partInfo?.greaseableOrNonGreaseable || partInfo?.specification?.greaseableOrNonGreaseable) },
            { label: "Coupling Flange Details", value: (partInfo?.mountingDetailsCouplingFlange || partInfo?.specification?.mountingDetailsCouplingFlange) },
            { label: "Coupling Flange Orientation", value: (partInfo?.couplingFlangeOrientations || partInfo?.specification?.couplingFlangeOrientations) },
            { label: "CB Kit Details", value: (partInfo?.cbKitDetails || partInfo?.specification?.cbKitDetails) },
        ],
        [
            { label: "Loctite Grade Use", value: (partInfo?.loctiteGradeUse || partInfo?.specification?.loctiteGradeUse) },
            { label: "Hex bolt/Hex nut Tightening", value: (partInfo?.hexBoltNutTighteningTorque || partInfo?.specification?.hexBoltNutTighteningTorque) },
            { label: "Balancing RPM", value: (partInfo?.balancingRpm || partInfo?.specification?.balancingRpm) },
            { label: "Unbalance Value CMG", value: (partInfo?.unbalanceInCmg || partInfo?.specification?.unbalanceInCmg) },
        ],
        [
            { label: "Unbalance Value GM", value: (partInfo?.unbalanceInGram || partInfo?.specification?.unbalanceInGram) },
            { label: "I/A Bellow Details", value: (partInfo?.iaBellowDetails || partInfo?.specification?.iaBellowDetails) },
            { label: "Total Length", value: (partInfo?.totalLength || partInfo?.specification?.totalLength) },
            { label: "RearSlip", value: (partInfo?.slipDetails || partInfo?.specification?.slipDetails) },
        ],
        [
            { label: "Mod No", value: (partInfo?.drawingModel || partInfo?.specification?.drawingModel) },
            { label: "Vendor code", value: (partInfo?.vendorCode || partInfo?.specification?.vendorCode) },
            { label: "Customer Name", value: (partInfo?.customer || partInfo?.specification?.customer) },
            { label: "DWG Weight/Mod Date", value: (partInfo?.partWeight || partInfo?.specification?.partWeight) },
        ],
    ];


        let parsedDocuments: Record<string, string> = {};
    if (partInfo?.ppap_documents) {
        try {
            parsedDocuments = typeof partInfo.ppap_documents === 'string' ? JSON.parse(partInfo.ppap_documents) : partInfo.ppap_documents;
        } catch (e) {
            console.error("Failed to parse ppap_documents", e);
        }
    }
    
    const documentEntries = Object.entries(parsedDocuments);

    return (
        <DashboardLayout>
            <div
                style={{
                    fontFamily: "'Arial Black', 'Arial', sans-serif",
                    backgroundColor: "#d0ece7",
                    minHeight: "100vh",
                    padding: "0",
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
                    {/* Part Number Input */}
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

                    {/* Description Box */}
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

                    {/* Scan Button */}
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#ab47bc",
                            color: "#fff",
                            border: "2px solid #ce93d8",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        <ScanLine className="w-5 h-5" />
                        Scan
                    </button>

                    {/* Show Button */}
                    <button
                        onClick={handleSearch}
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#26a69a",
                            color: "#fff",
                            border: "2px solid #80cbc4",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        🔍 Show
                    </button>

                    {/* Reset Button */}
                    <button
                        onClick={handleReset}
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#b2dfdb",
                            color: "#004d40",
                            border: "2px solid #80cbc4",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                        }}
                    >
                        Reset
                    </button>

                    {/* Quality Button */}
                    {partInfo?.specification?.approved === "approved" && (
                    <button
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#2e7d32",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        ✔ Quality
                    </button>
                    )}

                    {/* Production Button */}
                    {partInfo?.specification?.quality_verified === "approved" && (
                    <button
                        style={{
                            height: "44px",
                            padding: "0 22px",
                            background: "#1565c0",
                            color: "#fff",
                            border: "none",
                            borderRadius: "5px",
                            fontSize: "16px",
                            fontWeight: "800",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            letterSpacing: "0.5px",
                        }}
                    >
                        ✔ Production
                    </button>
                    )}
                </div>

                {/* ── SPEC GRID ── */}
                <div style={{ padding: "12px 14px 24px" }}>

                    {/* First label row manually */}
                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: "8px",
                            marginBottom: "4px",
                        }}
                    >
                        {specs[0].map((cell, colIdx) => (
                            <div
                                key={colIdx}
                                style={{
                                    fontSize: "17px",
                                    fontWeight: "700",
                                    color: "#111",
                                    paddingLeft: "4px",
                                    letterSpacing: "0.2px",
                                }}
                            >
                                {cell.label}
                            </div>
                        ))}
                    </div>

                    {/* All rows */}
                    {specs.map((row, rowIdx) => (
                        <div key={rowIdx}>
                            {/* Value row */}
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(4, 1fr)",
                                    gap: "8px",
                                    marginBottom: "4px",
                                }}
                            >
                                {row.map((cell, colIdx) => (
                                    <div
                                        key={colIdx}
                                        style={{
                                            background: "#ffff33",
                                            border: "2px solid #c8b800",
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
                                        }}
                                    >
                                        {cell.value || "NA"}
                                    </div>
                                ))}
                            </div>

                            {/* Label row for NEXT row */}
                            {rowIdx < specs.length - 1 && (
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(4, 1fr)",
                                        gap: "8px",
                                        marginBottom: "4px",
                                        marginTop: "2px",
                                    }}
                                >
                                    {specs[rowIdx + 1].map((cell, colIdx) => (
                                        <div
                                            key={colIdx}
                                            style={{
                                                fontSize: "17px",
                                                fontWeight: "700",
                                                color: "#111",
                                                paddingLeft: "4px",
                                                letterSpacing: "0.2px",
                                            }}
                                        >
                                            {cell.label}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
                                    <Card className="border-0  shadow-sm overflow-hidden">
                                        <CardHeader className="pb-0 px-6 pt-5">
                                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                Attached Documents
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="p-0 mt-4">
                                            {documentEntries.length === 0 ? (
                                                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
                                                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                                                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                                                    </div>
                                                    <p className="font-medium text-foreground">No documents found</p>
                                                    <p className="text-sm mt-1">Upload PPAP documents for this product to see them here.</p>
                                                    <Button variant="outline" className="mt-4 gap-2" onClick={() => setIsUploadOpen(true)}>
                                                        <Upload className="w-4 h-4" /> Upload First Document
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <Table>
                                                        <TableHeader>
                                                            <TableRow className="bg-muted/30 hover:bg-muted/30">
                                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11 pl-6">Document Name</TableHead>
                                                                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-11 pr-6 text-right">Actions</TableHead>
                                                            </TableRow>
                                                        </TableHeader>
                                                        <TableBody>
                                                            {documentEntries.map(([name, url]) => {
                                                                const iconKey = Object.keys(TypeIcon).find(key => name.includes(key)) || 'default';
                                                                const Icon = typeIcon[iconKey];
                                                                const badgeClass = typeBadge[iconKey] || typeBadge.default;
                                                                
                                                                return (
                                                                    <TableRow key={name} className="group hover:bg-muted/20 transition-colors">
                                                                        <TableCell className="pl-6 py-4">
                                                                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setViewDoc({name, url: getFileUrl(url)})}>
                                                                                <div className="w-10 h-10 rounded-xl bg-background border shadow-sm flex items-center justify-center flex-shrink-0 group-hover:border-primary/30 transition-colors">
                                                                                    <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-sm font-semibold group-hover:text-primary transition-colors">{name}</span>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <Badge variant="outline" className={`text-[9px] px-1.5 py-0 rounded ${badgeClass}`}>
                                                                                            {name.split(" ")[0]}
                                                                                        </Badge>
                                                                                        <span className="text-xs text-muted-foreground">Click to view</span>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })}
                                                        </TableBody>
                                                    </Table>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>

                                                <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                                                    <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden ">
                                                        <div className="flex-1 bg-muted/10 p-4 relative overflow-auto mt-10">
                                                            {viewDoc && (
                                                                <div className="w-full h-full min-h-[500px] bg-background border rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                                                    {viewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                                                        <img src={viewDoc.url} alt={viewDoc.name} className="max-w-full max-h-full object-contain p-4" />
                                                                    ) : (
                                                                        <iframe 
                                                                            src={viewDoc.url} 
                                                                            className="w-full h-full border-0"
                                                                            title={viewDoc.name}
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </DialogContent>
                                                </Dialog>

                {/* QR Scanner Dialog */}
                <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
                    <DialogContent className="max-w-xl">
                        <DialogHeader>
                            <DialogTitle>Scan Product Label</DialogTitle>
                        </DialogHeader>
                        {isScannerOpen && (
                            <div className="py-4">
                                <QRScanner onScan={handleScan}    />
                                <p className="text-xs text-center text-muted-foreground mt-4">
                                    Point camera at the product label QR code. The system will automatically capture it.
                                </p>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </DashboardLayout>
    );
}