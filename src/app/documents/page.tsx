"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";
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
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Search,
    FileText,
    Eye,
    Download,
    ChevronLeft,
    ChevronRight,
    Pencil,
    Trash2,
    Upload,
    X,
    ChevronDown,
    ChevronUp,
    MinusCircle,
    AlertCircle,
    ImageIcon,
    Plus,
    Loader2,
} from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { useUser } from "@/contexts/UserContext";
import { Product } from "@/types/api";
import ExcelJS from "exceljs";
import {
    fetchFieldDefinitions,
    fetchFieldImages,
    uploadFieldImage as uploadFieldImageApi,
    deleteFieldImage,
    getFieldImageUrl,
    FieldImageRecord,
    FieldDefinition,
} from "@/lib/fieldImageApi";
import { toast } from "sonner";
// exceljs + file-saver are imported dynamically inside handleDownloadExcel

// ─── Constants ───────────────────────────────────────────────────────────────

const INDIVIDUAL_DOCS = [
    "PSW",
    "TRSO",
    "IQA",
    "PO OPY",
    "Drawing",
    "INSPECTION REPORT",
    "STICKER",
];

const PPAP_DOCS = [
    "DRAWING",
    "SAMPLE REPORT",
    "MR REPORT",
    "SPC",
    "MSA",
    "PIST",
    "PFMEA",
    "PFD",
    "CONTROL PLAN",
    "IQA",
    "WELDING REPORT",
];

// Map document_name_array keys → display labels (adjust to match your data)
const DOC_NAME_LABEL_MAP: Record<string, string> = {
    Drawing_Document: "DRAWING",
    IQA_Document: "IQA",
    Po_Document: "PO OPY",
    TRSO_Document: "TRSO",
    PSW_Document: "PSW",
    Inspection_Report: "INSPECTION REPORT",
    Sticker_Document: "STICKER",
};

interface CategorizedDocs {
    individual: Record<string, string>;
    ppap: Record<string, string>;
}

// Value saved in DB when a document is marked not required
const NOT_REQUIRED_VALUE = "not_required";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getFileUrl = (filePath: string) => {
    if (filePath.startsWith("http")) return filePath;
    const normalizedPath = filePath.replace(/\\/g, "/");
    return `${process.env.NEXT_PUBLIC_URL}/${normalizedPath}`;
};

const parseCategorizedDocs = (raw: any): CategorizedDocs => {
    const empty: CategorizedDocs = { individual: {}, ppap: {} };
    if (!raw) return empty;
    try {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!parsed || typeof parsed !== "object") return empty;
        if (parsed.individual || parsed.ppap) {
            return {
                individual:
                    parsed.individual && typeof parsed.individual === "object"
                        ? parsed.individual
                        : {},
                ppap:
                    parsed.ppap && typeof parsed.ppap === "object"
                        ? parsed.ppap
                        : {},
            };
        }
        return { individual: parsed, ppap: {} };
    } catch {
        return empty;
    }
};

const findDocPath = (
    docs: Record<string, string>,
    docName: string
): string | null => {
    if (docs[docName]) return docs[docName];
    const lowerName = docName.toLowerCase();
    for (const [key, val] of Object.entries(docs)) {
        if (key.toLowerCase() === lowerName) return val;
    }
    return null;
};

const isNotRequired = (path: string | null): boolean =>
    path === NOT_REQUIRED_VALUE;

const RECORDS_PER_PAGE = 60;

// ─── Vacancy Summary ──────────────────────────────────────────────────────────

interface VacancyItem {
    docName: string;
    category: string;
    missingParts: string[];
}

function useVacancySummary(
    products: Product[],
    allIndividualCols: string[],
    allPpapCols: string[]
): VacancyItem[] {
    return useMemo(() => {
        const indMap: Record<string, string[]> = {};
        const ppapMap: Record<string, string[]> = {};

        allIndividualCols.forEach((doc) => (indMap[doc] = []));
        allPpapCols.forEach((doc) => (ppapMap[doc] = []));

        products.forEach((p) => {
            const docs = parseCategorizedDocs(p.ppap_documents);
            allIndividualCols.forEach((doc) => {
                const path = findDocPath(docs.individual, doc);
                if (!path || isNotRequired(path)) return; // skip if present or not-required
                if (!path) indMap[doc].push(p.part_number || `#${p.id}`);
            });
            // Re-do: count only truly missing (no path at all)
            allIndividualCols.forEach((doc) => {
                const path = findDocPath(docs.individual, doc);
                if (!path) indMap[doc].push(p.part_number || `#${p.id}`);
            });
            allPpapCols.forEach((doc) => {
                const path = findDocPath(docs.ppap, doc);
                if (!path) ppapMap[doc].push(p.part_number || `#${p.id}`);
            });
        });

        // Deduplicate (we pushed twice above for individual – fix)
        allIndividualCols.forEach((doc) => {
            const seen = new Set<string>();
            indMap[doc] = indMap[doc].filter((v) => {
                if (seen.has(v)) return false;
                seen.add(v);
                return true;
            });
        });

        const result: VacancyItem[] = [];
        allIndividualCols.forEach((doc) => {
            if (indMap[doc].length > 0)
                result.push({
                    docName: doc,
                    category: "Individual",
                    missingParts: indMap[doc],
                });
        });
        allPpapCols.forEach((doc) => {
            if (ppapMap[doc].length > 0)
                result.push({
                    docName: doc,
                    category: "PPAP",
                    missingParts: ppapMap[doc],
                });
        });
        return result;
    }, [products, allIndividualCols, allPpapCols]);
}

// ─── Vacancy Banner Component ─────────────────────────────────────────────────

function VacancyBanner({ items }: { items: VacancyItem[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);

    if (items.length === 0) return null;

    return (
        <Card className="border-0 shadow-sm bg-amber-50/60">
            <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800">
                        Document Vacancies — {items.reduce((a, b) => a + b.missingParts.length, 0)} missing across {items.length} types
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => {
                        const key = `${item.category}-${item.docName}`;
                        const isOpen = expanded === key;
                        return (
                            <div key={key} className="relative">
                                <button
                                    onClick={() => setExpanded(isOpen ? null : key)}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                        item.category === "Individual"
                                            ? "bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                                            : "bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-200"
                                    }`}
                                >
                                    <span>{item.docName}</span>
                                    <span className="bg-white/70 rounded px-1 text-[10px] font-bold">
                                        {item.missingParts.length} missing
                                    </span>
                                    {isOpen ? (
                                        <ChevronUp className="w-3 h-3" />
                                    ) : (
                                        <ChevronDown className="w-3 h-3" />
                                    )}
                                </button>
                                {isOpen && (
                                    <div className="absolute top-full left-0 mt-1 z-30 bg-white border rounded-xl shadow-xl p-3 min-w-[200px] max-w-[280px] max-h-[200px] overflow-y-auto">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
                                            Missing in:
                                        </p>
                                        <div className="flex flex-wrap gap-1">
                                            {item.missingParts.map((pn) => (
                                                <span
                                                    key={pn}
                                                    className="text-[10px] font-mono bg-muted px-1.5 py-0.5 rounded"
                                                >
                                                    {pn}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}

// ─── Edit Document Popup ──────────────────────────────────────────────────────

interface EditDocPopupProps {
    product: Product | null;
    allIndividualCols: string[];
    allPpapCols: string[];
    onClose: () => void;
    onUpload: (id: number, category: string, name: string, file: File) => Promise<Product | false>;
    onDelete: (id: number, category: string, name: string) => Promise<Product | false>;
    onMarkNotRequired: (id: number, category: string, name: string) => Promise<Product | false>;
    onUnmarkNotRequired: (id: number, category: string, name: string) => Promise<Product | false>;
}

function EditDocPopup({
    product,
    allIndividualCols,
    allPpapCols,
    onClose,
    onUpload,
    onDelete,
    onMarkNotRequired,
    onUnmarkNotRequired,

}: EditDocPopupProps) {
    const [viewDoc, setViewDoc] = useState<{ name: string; url: string } | null>(null);
    const [uploading, setUploading] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [pendingUpload, setPendingUpload] = useState<{ category: string; name: string } | null>(null);

    if (!product) return null;
    const docs = parseCategorizedDocs(product.ppap_documents);

    const handleUploadClick = (category: string, name: string) => {
        setPendingUpload({ category, name });
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !pendingUpload) return;
        setUploading(`${pendingUpload.category}-${pendingUpload.name}`);
        await onUpload(product.id, pendingUpload.category, pendingUpload.name, file);
        setUploading(null);
        setPendingUpload(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleDelete = async (category: string, name: string) => {
        const key = `${category}-${name}`;
        setDeleting(key);
        await onDelete(product.id, category, name);
        setDeleting(null);
    };

    const handleNotRequired = async (category: string, name: string) => {
        await onMarkNotRequired(product.id, category, name);
    };

    const renderDocRow = (doc: string, category: string, categoryLabel: string, docsMap: Record<string, string>) => {
        const path = findDocPath(docsMap, doc);
        const notRequired = isNotRequired(path);
        const hasDoc = path && !notRequired;
        const key = `${category}-${doc}`;
        const isUploading = uploading === key;
        const isDeleting = deleting === key;

        return (
            <div
                key={key}
                className={`flex items-center justify-between px-4 py-3 rounded-xl mb-2 border transition-all ${
                    notRequired
                        ? "bg-muted/20 border-dashed border-muted-foreground/20 opacity-60"
                        : hasDoc
                        ? "bg-emerald-50/60 border-emerald-100"
                        : "bg-muted/10 border-muted/30"
                }`}
            >
                <div className="flex items-center gap-3 min-w-0">
                    <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 h-4 shrink-0 ${
                            categoryLabel === "Individual"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}
                    >
                        {categoryLabel}
                    </Badge>
                    <span className="text-sm font-semibold truncate">{doc}</span>
                    {notRequired && (
                        <span className="text-[10px] text-muted-foreground italic">Not Required</span>
                    )}
                    {hasDoc && (
                        <span className="text-[10px] text-emerald-600 font-medium">✓ Uploaded</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                    {hasDoc && (
                        <button
                            onClick={() => setViewDoc({ name: doc, url: getFileUrl(path!) })}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
                            title="View"
                        >
                            <Eye className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {hasDoc && (
                        <button
                            onClick={() => handleDelete(category, doc)}
                            disabled={isDeleting}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all disabled:opacity-40"
                            title="Delete"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                    {!notRequired && (
                        <button
                            onClick={() => handleUploadClick(category, doc)}
                            disabled={isUploading}
                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-all disabled:opacity-40"
                            title={hasDoc ? "Re-upload" : "Upload"}
                        >
                            <Upload className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() =>
                            notRequired
                                ? onUnmarkNotRequired(product.id, category, doc)
                                : onMarkNotRequired(product.id, category, doc)
                        }
                        className={`inline-flex items-center justify-center w-7 h-7 rounded-lg transition-all ${
                            notRequired
                                ? "bg-amber-50 hover:bg-amber-100 text-amber-600"
                                : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        title={notRequired ? "Mark as Required" : "Mark as Not Required"}
                    >
                        <MinusCircle className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="!max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/10">
                        <div>
                            <DialogTitle className="text-base font-bold">
                                Edit Documents —{" "}
                                <span className="font-mono text-primary">{product.part_number}</span>
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {product.customer}
                            </p>
                        </div>

                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                            Individual Documents
                        </p>
                        {allIndividualCols.map((doc) =>
                            renderDocRow(doc, "individual", "Individual", docs.individual)
                        )}
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mt-5 mb-3">
                            PPAP Documents
                        </p>
                        {allPpapCols.map((doc) =>
                            renderDocRow(doc, "ppap", "PPAP", docs.ppap)
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                    />
                </DialogContent>
            </Dialog>

            {/* Nested doc viewer */}
            <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/10">
                        <Eye className="w-5 h-5 text-primary" />
                        <DialogTitle>{viewDoc?.name}</DialogTitle>
                    </div>
                    <div className="flex-1 p-4 bg-muted/10">
                        {viewDoc && (
                            <div className="w-full h-full min-h-[500px] bg-background border rounded-xl overflow-hidden flex items-center justify-center">
                                {viewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img
                                        src={viewDoc.url}
                                        alt={viewDoc.name}
                                        className="max-w-full max-h-full object-contain p-4"
                                    />
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
        </>
    );
}

// ─── Non-Admin Search View ────────────────────────────────────────────────────

function NonAdminView({
    products,
    allowedDocNames,
}: {
    products: Product[];
    allowedDocNames: string[];
}) {
    const [query, setQuery] = useState("");
    const [viewDoc, setViewDoc] = useState<{ name: string; url: string } | null>(null);

    // Map allowed doc names to display labels
    const allowedLabels = useMemo(
        () => allowedDocNames.map((k) => DOC_NAME_LABEL_MAP[k] || k),
        [allowedDocNames]
    );

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return products.filter((p) =>
            (p.part_number || "").toLowerCase().includes(q)
        );
    }, [products, query]);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Search for a part number to view available documents
                </p>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search by part number..."
                    className="pl-9 h-10 text-sm"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
            </div>

            {results.length > 0 && (
                <div className="space-y-3">
                    {results.map((product) => {
                        const docs = parseCategorizedDocs(product.ppap_documents);
                        const allDocs = { ...docs.individual, ...docs.ppap };

                        return (
                            <Card key={product.id} className="border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="font-mono font-bold text-sm">
                                                {product.part_number}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {product.customer}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {allowedLabels.map((label) => {
                                            const path = findDocPath(allDocs, label);
                                            if (!path || isNotRequired(path)) return null;
                                            return (
                                                <button
                                                    key={label}
                                                    onClick={() =>
                                                        setViewDoc({
                                                            name: label,
                                                            url: getFileUrl(path),
                                                        })
                                                    }
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-all border border-blue-100"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {label}
                                                </button>
                                            );
                                        })}
                                        {allowedLabels.every((label) => {
                                            const path = findDocPath(allDocs, label);
                                            return !path || isNotRequired(path);
                                        }) && (
                                            <p className="text-xs text-muted-foreground italic">
                                                No documents available for your access level.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {query.trim() && results.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-8">
                    No products found for "{query}".
                </div>
            )}

            {/* Viewer */}
            <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/10">
                        <Eye className="w-5 h-5 text-primary" />
                        <DialogTitle>{viewDoc?.name}</DialogTitle>
                    </div>
                    <div className="flex-1 p-4 bg-muted/10">
                        {viewDoc && (
                            <div className="w-full h-full min-h-[500px] bg-background border rounded-xl overflow-hidden flex items-center justify-center">
                                {viewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img
                                        src={viewDoc.url}
                                        alt={viewDoc.name}
                                        className="max-w-full max-h-full object-contain p-4"
                                    />
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
        </div>
    );
}

// ─── Field Images Section ─────────────────────────────────────────────────────

function FieldImagesSection({ isAdmin }: { isAdmin: boolean }) {
    const [fields, setFields] = useState<FieldDefinition[]>([]);
    const [records, setRecords] = useState<FieldImageRecord[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    const [selectedField, setSelectedField] = useState<string>("all");
    const [viewImage, setViewImage] = useState<{ url: string; label: string } | null>(null);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [uploadForm, setUploadForm] = useState<{ fieldName: string; optionValue: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const loadData = useCallback(async () => {
        setLoadingData(true);
        try {
            const [fieldDefs, imgs] = await Promise.all([
                fetchFieldDefinitions(),
                fetchFieldImages(),
            ]);
            setFields(fieldDefs);
            setRecords(imgs);
        } catch (err) {
            console.error("Failed to load field images:", err);
            toast.error("Failed to load field images");
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const filteredRecords = useMemo(() => {
        let list = records;
        if (selectedField !== "all") list = list.filter(r => r.field_name === selectedField);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                r => r.field_name.toLowerCase().includes(q) || r.option_value.toLowerCase().includes(q)
            );
        }
        return list;
    }, [records, selectedField, searchQuery]);

    const handleUploadClick = (fieldName: string, optionValue: string) => {
        setUploadForm({ fieldName, optionValue });
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uploadForm) return;
        setUploading(true);
        try {
            await uploadFieldImageApi(uploadForm.fieldName, uploadForm.optionValue, file);
            toast.success("Field image uploaded successfully");
            await loadData();
        } catch (err: any) {
            toast.error(err?.message ?? "Upload failed");
        } finally {
            setUploading(false);
            setUploadForm(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: number) => {
        setDeletingId(id);
        try {
            await deleteFieldImage(id);
            toast.success("Field image deleted");
            setRecords(prev => prev.filter(r => r.id !== id));
        } catch {
            toast.error("Failed to delete field image");
        } finally {
            setDeletingId(null);
        }
    };

    // Group all field+option combos from definitions
    const allFieldOptions = useMemo(() => {
        const result: { fieldName: string; optionValue: string }[] = [];
        fields.forEach(f => {
            f.options.forEach(opt => result.push({ fieldName: f.field_name, optionValue: opt }));
        });
        return result;
    }, [fields]);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold tracking-tight flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-violet-500" />
                        Field Images
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Reference images linked to specific field option values
                    </p>
                </div>

            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search field or value..."
                        className="pl-9 h-9 text-sm w-56"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setSelectedField("all")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                            selectedField === "all"
                                ? "bg-violet-600 text-white border-violet-600"
                                : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                        }`}
                    >
                        All Fields
                    </button>
                    {fields.map(f => (
                        <button
                            key={f.field_name}
                            onClick={() => setSelectedField(f.field_name)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                                selectedField === f.field_name
                                    ? "bg-violet-600 text-white border-violet-600"
                                    : "bg-muted/40 text-muted-foreground border-transparent hover:bg-muted"
                            }`}
                        >
                            {f.field_name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            {loadingData ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> Loading field images...
                </div>
            ) : (
                <>
                    {/* Upload Grid for admins — shows all field/option combos with upload status */}
                    {isAdmin && allFieldOptions.length > 0 && (
                        <Card className="border-0 shadow-sm">
                            <CardContent className="p-4">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Upload by Field &amp; Option</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {allFieldOptions
                                        .filter(fo =>
                                            selectedField === "all" || fo.fieldName === selectedField
                                        )
                                        .map(fo => {
                                            const existing = records.find(
                                                r => r.field_name === fo.fieldName && r.option_value === fo.optionValue
                                            );
                                            return (
                                                <div
                                                    key={`${fo.fieldName}::${fo.optionValue}`}
                                                    className={`relative rounded-xl border-2 overflow-hidden transition-all ${
                                                        existing
                                                            ? "border-emerald-200 bg-emerald-50/50"
                                                            : "border-dashed border-muted-foreground/25 bg-muted/20"
                                                    }`}
                                                >
                                                    {/* Image preview */}
                                                    {existing ? (
                                                        <div
                                                            className="relative w-full h-28 cursor-pointer group"
                                                            onClick={() => setViewImage({ url: getFieldImageUrl(existing.file_path), label: `${fo.fieldName} — ${fo.optionValue}` })}
                                                        >
                                                            {existing.file_path.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                                <img
                                                                    src={getFieldImageUrl(existing.file_path)}
                                                                    alt={fo.optionValue}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full flex items-center justify-center">
                                                                    <FileText className="w-10 h-10 text-emerald-500" />
                                                                </div>
                                                            )}
                                                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                                <Eye className="w-6 h-6 text-white" />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="w-full h-28 flex items-center justify-center text-muted-foreground/40">
                                                            <ImageIcon className="w-10 h-10" />
                                                        </div>
                                                    )}

                                                    {/* Info + actions */}
                                                    <div className="px-3 pb-2 pt-1">
                                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate" title={fo.fieldName}>{fo.fieldName}</p>
                                                        <p className="text-xs font-semibold truncate" title={fo.optionValue}>{fo.optionValue}</p>
                                                        <div className="flex items-center gap-1 mt-2">
                                                            <button
                                                                onClick={() => handleUploadClick(fo.fieldName, fo.optionValue)}
                                                                disabled={uploading}
                                                                className="flex-1 inline-flex items-center justify-center gap-1 py-1 rounded-md bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-semibold transition-all disabled:opacity-40"
                                                                title={existing ? "Re-upload" : "Upload"}
                                                            >
                                                                <Upload className="w-3 h-3" />
                                                                {existing ? "Replace" : "Upload"}
                                                            </button>
                                                            {existing && (
                                                                <button
                                                                    onClick={() => handleDelete(existing.id)}
                                                                    disabled={deletingId === existing.id}
                                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-all disabled:opacity-40"
                                                                    title="Delete"
                                                                >
                                                                    {deletingId === existing.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3 h-3" />
                                                                    }
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Records table */}
                    {filteredRecords.length > 0 ? (
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground pl-4">Field Name</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Option Value</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Preview</TableHead>
                                            <TableHead className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredRecords.map(record => (
                                            <TableRow key={record.id} className="group hover:bg-muted/10 transition-colors">
                                                <TableCell className="pl-4 font-mono text-xs font-semibold">{record.field_name}</TableCell>
                                                <TableCell className="text-sm font-medium">{record.option_value}</TableCell>
                                                <TableCell className="text-center">
                                                    {record.file_path.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                                        <img
                                                            src={getFieldImageUrl(record.file_path)}
                                                            alt={record.option_value}
                                                            className="w-12 h-10 object-cover rounded-lg mx-auto cursor-pointer hover:scale-105 transition-transform"
                                                            onClick={() => setViewImage({ url: getFieldImageUrl(record.file_path), label: `${record.field_name} — ${record.option_value}` })}
                                                        />
                                                    ) : (
                                                        <button
                                                            className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 mx-auto"
                                                            onClick={() => setViewImage({ url: getFieldImageUrl(record.file_path), label: `${record.field_name} — ${record.option_value}` })}
                                                        >
                                                            <FileText className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        <button
                                                            onClick={() => setViewImage({ url: getFieldImageUrl(record.file_path), label: `${record.field_name} — ${record.option_value}` })}
                                                            className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-all"
                                                            title="View"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        {isAdmin && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleUploadClick(record.field_name, record.option_value)}
                                                                    disabled={uploading}
                                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-600 transition-all disabled:opacity-40"
                                                                    title="Re-upload"
                                                                >
                                                                    <Upload className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(record.id)}
                                                                    disabled={deletingId === record.id}
                                                                    className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-all disabled:opacity-40"
                                                                    title="Delete"
                                                                >
                                                                    {deletingId === record.id
                                                                        ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                        : <Trash2 className="w-3.5 h-3.5" />
                                                                    }
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ) : (
                        !isAdmin && (
                            <div className="text-center py-16 text-muted-foreground">
                                <ImageIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                                <p className="text-sm">No field images found.</p>
                            </div>
                        )
                    )}
                </>
            )}

            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".jpg,.jpeg,.png,.gif,.webp,.pdf"
                onChange={handleFileChange}
            />

            {/* Image / File viewer */}
            <Dialog open={!!viewImage} onOpenChange={o => !o && setViewImage(null)}>
                <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center gap-3 px-6 py-4 border-b bg-muted/10">
                        <ImageIcon className="w-5 h-5 text-violet-500" />
                        <DialogTitle>{viewImage?.label}</DialogTitle>
                    </div>
                    <div className="flex-1 p-4 bg-muted/10 flex items-center justify-center">
                        {viewImage && (
                            <div className="w-full h-full min-h-[500px] bg-background border rounded-xl overflow-hidden flex items-center justify-center">
                                {viewImage.url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                                    <img
                                        src={viewImage.url}
                                        alt={viewImage.label}
                                        className="max-w-full max-h-full object-contain p-4"
                                    />
                                ) : (
                                    <iframe
                                        src={viewImage.url}
                                        className="w-full h-full border-0"
                                        title={viewImage.label}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
    const { products, loading, uploadDocument, deleteDocument, markDocumentNotRequired } = useProducts();
    const { user } = useUser();

    const isAdminOrSuper =
        user?.role === "admin" || user?.role === "super admin";

    const [activeTab, setActiveTab] = useState<"documents" | "field-images">("documents");

    const [searchQuery, setSearchQuery] = useState("");
    const [viewDoc, setViewDoc] = useState<{
        name: string;
        url: string;
        category: string;
    } | null>(null);
    const [editProductId, setEditProductId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const editProduct = useMemo(() => 
        editProductId ? products.find(p => p.id === editProductId) || null : null
    , [editProductId, products]);

    // Extra columns from data
    const { extraIndividual, extraPpap } = useMemo(() => {
        const indSet = new Set<string>();
        const ppapSet = new Set<string>();
        const indPredefined = new Set(INDIVIDUAL_DOCS.map((d) => d.toLowerCase()));
        const ppapPredefined = new Set(PPAP_DOCS.map((d) => d.toLowerCase()));

        products.forEach((p) => {
            const docs = parseCategorizedDocs(p.ppap_documents);
            Object.keys(docs.individual).forEach((key) => {
                if (!indPredefined.has(key.toLowerCase())) indSet.add(key);
            });
            Object.keys(docs.ppap).forEach((key) => {
                if (!ppapPredefined.has(key.toLowerCase())) ppapSet.add(key);
            });
        });

        return {
            extraIndividual: Array.from(indSet).sort(),
            extraPpap: Array.from(ppapSet).sort(),
        };
    }, [products]);

    const allIndividualCols = useMemo(
        () => [...INDIVIDUAL_DOCS, ...extraIndividual],
        [extraIndividual]
    );
    const allPpapCols = useMemo(
        () => [...PPAP_DOCS, ...extraPpap],
        [extraPpap]
    );

    const vacancyItems = useVacancySummary(products, allIndividualCols, allPpapCols);

    const filteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return products;
        const q = searchQuery.toLowerCase();
        return products.filter(
            (p) =>
                (p.part_number || "").toLowerCase().includes(q) ||
                (p.customer || "").toLowerCase().includes(q)
        );
    }, [products, searchQuery]);

    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / RECORDS_PER_PAGE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = useMemo(() => {
        const start = (safeCurrentPage - 1) * RECORDS_PER_PAGE;
        return filteredProducts.slice(start, start + RECORDS_PER_PAGE);
    }, [filteredProducts, safeCurrentPage]);

    const handleSearchChange = useCallback((val: string) => {
        setSearchQuery(val);
        setCurrentPage(1);
    }, []);

    const totalDocCount = useMemo(() => {
        let count = 0;
        products.forEach((p) => {
            const docs = parseCategorizedDocs(p.ppap_documents);
            count +=
                Object.keys(docs.individual).length +
                Object.keys(docs.ppap).length;
        });
        return count;
    }, [products]);

    const productsWithDocsCount = useMemo(
        () =>
            products.filter((p) => {
                const docs = parseCategorizedDocs(p.ppap_documents);
                return (
                    Object.keys(docs.individual).length +
                        Object.keys(docs.ppap).length >
                    0
                );
            }).length,
        [products]
    );

    const handleDownloadExcel = useCallback(async () => {
        const ExcelJS = (await import("exceljs")).default;
        const { saveAs } = await import("file-saver");

        const wb = new ExcelJS.Workbook();
        wb.creator = "Documents System";
        wb.created = new Date();

        const ws = wb.addWorksheet("Documents", {
            views: [{ state: "frozen", xSplit: 2, ySplit: 3 }],
        });

        // ── Palette ────────────────────────────────────────────────────────
        const C = {
            // Header rows
            titleBg:     "FF1E293B", // slate-900
            titleFg:     "FFFFFFFF",
            indBg:       "FF1D4ED8", // blue-700
            indFg:       "FFFFFFFF",
            ppapBg:      "FF6D28D9", // violet-700
            ppapFg:      "FFFFFFFF",
            subIndBg:    "FFBFDBFE", // blue-100
            subIndFg:    "FF1E40AF",
            subPpapBg:   "FFEDE9FE", // violet-100
            subPpapFg:   "FF4C1D95",
            // Data rows
            rowEven:     "FFFAFAFA",
            rowOdd:      "FFFFFFFF",
            partFg:      "FF0F172A",
            customerFg:  "FF64748B",
            // Cell states
            uploaded:    "FFD1FAE5", // emerald-100
            uploadedFg:  "FF065F46",
            missing:     "FFFEF2F2", // red-50  ← eye-catching vacant
            missingFg:   "FFB91C1C",
            missingBdr:  "FFFCA5A5", // red-300
            notReq:      "FFF1F5F9", // slate-100
            notReqFg:    "FF94A3B8",
        };

        const font = (bold = false, color = "FF0F172A", size = 9) =>
            ({ name: "Calibri", bold, color: { argb: color }, size }) as ExcelJS.Font;

        const fill = (argb: string): ExcelJS.Fill =>
            ({ type: "pattern", pattern: "solid", fgColor: { argb } }) as ExcelJS.Fill;

        const border = (color = "FFE2E8F0"): Partial<ExcelJS.Borders> => ({
            top:    { style: "thin", color: { argb: color } },
            bottom: { style: "thin", color: { argb: color } },
            left:   { style: "thin", color: { argb: color } },
            right:  { style: "thin", color: { argb: color } },
        });

        const totalCols = 2 + allIndividualCols.length + allPpapCols.length;

        // ── Row 1 — main title spanning full width ─────────────────────────
        ws.addRow([]);
        const titleRow = ws.getRow(1);
        titleRow.getCell(1).value = "Product Documents Report";
        titleRow.getCell(1).font = { ...font(true, C.titleFg, 13) };
        titleRow.getCell(1).fill = fill(C.titleBg);
        titleRow.getCell(1).alignment = { vertical: "middle", horizontal: "center" };
        ws.mergeCells(1, 1, 1, totalCols);
        titleRow.height = 28;

        // ── Row 2 — category header (Individual | PPAP) ────────────────────
        ws.addRow([]);
        const catRow = ws.getRow(2);
        catRow.height = 20;

        // Part Number + Customer merge placeholder
        catRow.getCell(1).value = "";
        catRow.getCell(1).fill = fill(C.titleBg);
        catRow.getCell(2).fill = fill(C.titleBg);
        ws.mergeCells(2, 1, 2, 2);

        // Individual header
        const indStart = 3;
        const indEnd   = 2 + allIndividualCols.length;
        catRow.getCell(indStart).value = "INDIVIDUAL DOCUMENTS";
        catRow.getCell(indStart).font  = font(true, C.indFg, 9);
        catRow.getCell(indStart).fill  = fill(C.indBg);
        catRow.getCell(indStart).alignment = { horizontal: "center", vertical: "middle" };
        if (indEnd > indStart) ws.mergeCells(2, indStart, 2, indEnd);

        // PPAP header
        const ppapStart = indEnd + 1;
        const ppapEnd   = totalCols;
        catRow.getCell(ppapStart).value = "PPAP DOCUMENTS";
        catRow.getCell(ppapStart).font  = font(true, C.ppapFg, 9);
        catRow.getCell(ppapStart).fill  = fill(C.ppapBg);
        catRow.getCell(ppapStart).alignment = { horizontal: "center", vertical: "middle" };
        if (ppapEnd > ppapStart) ws.mergeCells(2, ppapStart, 2, ppapEnd);

        // ── Row 3 — column name headers ────────────────────────────────────
        const headerValues = [
            "Part Number",
            "Customer",
            ...allIndividualCols,
            ...allPpapCols,
        ];
        ws.addRow(headerValues);
        const hdrRow = ws.getRow(3);
        hdrRow.height = 32;
        hdrRow.eachCell((cell, col) => {
            const isInd  = col >= indStart && col <= indEnd;
            const isPpap = col >= ppapStart;
            const isMeta = col <= 2;
            cell.font = font(
                true,
                isMeta ? C.titleFg : isInd ? C.subIndFg : C.subPpapFg,
                9
            );
            cell.fill = fill(
                isMeta ? C.titleBg : isInd ? C.subIndBg : C.subPpapBg
            );
            cell.alignment = {
                horizontal: "center",
                vertical: "middle",
                wrapText: true,
            };
            cell.border = border(isMeta ? "FF334155" : isInd ? "FF93C5FD" : "FFC4B5FD");
        });

        // ── Data rows ──────────────────────────────────────────────────────
        filteredProducts.forEach((product, rowIdx) => {
            const docs   = parseCategorizedDocs(product.ppap_documents);
            const isEven = rowIdx % 2 === 0;
            const rowBg  = isEven ? C.rowEven : C.rowOdd;

            const values: string[] = [
                product.part_number || "",
                product.customer    || "",
            ];

            // Build status arrays for styling after adding the row
            const statuses: Array<"uploaded" | "missing" | "notreq"> = [];

            allIndividualCols.forEach((doc) => {
                const path = findDocPath(docs.individual, doc);
                if (!path) {
                    values.push("MISSING");
                    statuses.push("missing");
                } else if (isNotRequired(path)) {
                    values.push("N/R");
                    statuses.push("notreq");
                } else {
                    values.push("✓");
                    statuses.push("uploaded");
                }
            });

            allPpapCols.forEach((doc) => {
                const path = findDocPath(docs.ppap, doc);
                if (!path) {
                    values.push("MISSING");
                    statuses.push("missing");
                } else if (isNotRequired(path)) {
                    values.push("N/R");
                    statuses.push("notreq");
                } else {
                    values.push("✓");
                    statuses.push("uploaded");
                }
            });

            ws.addRow(values);
            const dataRow = ws.getRow(3 + rowIdx + 1); // +1 because rows are 1-indexed and we added 3 header rows
            dataRow.height = 18;

            // Part Number cell
            const pnCell = dataRow.getCell(1);
            pnCell.font = font(true, C.partFg, 9);
            pnCell.fill = fill(rowBg);
            pnCell.alignment = { vertical: "middle" };
            pnCell.border = border("FFE2E8F0");

            // Customer cell
            const custCell = dataRow.getCell(2);
            custCell.font = font(false, C.customerFg, 8);
            custCell.fill = fill(rowBg);
            custCell.alignment = { vertical: "middle" };
            custCell.border = border("FFE2E8F0");

            // Document cells
            statuses.forEach((status, i) => {
                const cell = dataRow.getCell(3 + i);
                cell.alignment = { horizontal: "center", vertical: "middle" };

                if (status === "uploaded") {
                    cell.font   = font(true,  C.uploadedFg, 9);
                    cell.fill   = fill(C.uploaded);
                    cell.border = border("FF6EE7B7");
                } else if (status === "missing") {
                    cell.font   = font(true,  C.missingFg, 9);
                    cell.fill   = fill(C.missing);
                    cell.border = {
                        top:    { style: "medium", color: { argb: C.missingBdr } },
                        bottom: { style: "medium", color: { argb: C.missingBdr } },
                        left:   { style: "medium", color: { argb: C.missingBdr } },
                        right:  { style: "medium", color: { argb: C.missingBdr } },
                    };
                } else {
                    cell.font   = font(false, C.notReqFg, 8);
                    cell.fill   = fill(C.notReq);
                    cell.border = border("FFCBD5E1");
                }
            });
        });

        // ── Column widths ──────────────────────────────────────────────────
        ws.getColumn(1).width = 18; // Part Number
        ws.getColumn(2).width = 20; // Customer
        for (let i = 3; i <= totalCols; i++) {
            ws.getColumn(i).width = 12;
        }

        // ── Legend sheet ───────────────────────────────────────────────────
        const legend = wb.addWorksheet("Legend");
        legend.getColumn(1).width = 20;
        legend.getColumn(2).width = 40;

        const addLegendRow = (
            label: string,
            desc: string,
            bgArgb: string,
            fgArgb: string
        ) => {
            legend.addRow([label, desc]);
            const r = legend.lastRow!;
            r.height = 18;
            [1, 2].forEach((c) => {
                r.getCell(c).fill = fill(bgArgb);
                r.getCell(c).font = font(c === 1, fgArgb, 10);
                r.getCell(c).alignment = { vertical: "middle" };
                r.getCell(c).border = border("FFE2E8F0");
            });
        };

        legend.addRow(["Legend", ""]);
        const legendTitle = legend.getRow(1);
        legendTitle.getCell(1).value = "Colour Legend";
        legendTitle.getCell(1).font  = font(true, C.titleFg, 12);
        legendTitle.getCell(1).fill  = fill(C.titleBg);
        legendTitle.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
        legendTitle.height = 24;
        legend.mergeCells(1, 1, 1, 2);

        addLegendRow("✓  Uploaded",  "Document has been uploaded successfully", C.uploaded, C.uploadedFg);
        addLegendRow("MISSING",      "Document is required but not yet uploaded", C.missing,  C.missingFg);
        addLegendRow("N/R",          "Document marked as Not Required",          C.notReq,   C.notReqFg);

        // ── Save ───────────────────────────────────────────────────────────
        const buf = await wb.xlsx.writeBuffer();
        saveAs(new Blob([buf], { type: "application/octet-stream" }), "product_documents.xlsx");
    }, [filteredProducts, allIndividualCols, allPpapCols]);

    // Mark a document as not required — calls PATCH /products/:id/documents/:category/:name/not-required
    const handleMarkNotRequired = useCallback(
        async (id: number, category: string, name: string) => {
            return markDocumentNotRequired(id, category, name);
        },
        [markDocumentNotRequired]
    );

    // Unmark not-required by deleting the sentinel entry (no file on disk to remove)
    const handleUnmarkNotRequired = useCallback(
        async (id: number, category: string, name: string) => {
            return deleteDocument(id, category, name);
        },
        [deleteDocument]
    );

    if (loading && products.length === 0) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">Loading...</div>
            </DashboardLayout>
        );
    }

    // ── Non-admin view ──────────────────────────────────────────────────────
    if (!isAdminOrSuper) {
        return (
            <DashboardLayout>
                <NonAdminView
                    products={products}
                    allowedDocNames={user?.document_name_array || []}
                />
            </DashboardLayout>
        );
    }

    // ── Admin / Super Admin view ────────────────────────────────────────────
    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            View and manage product documentation across all products
                        </p>
                    </div>
                </div>

                {/* Tab switcher */}
                <div className="flex gap-1 p-1 bg-muted/40 rounded-xl w-fit border">
                    <button
                        onClick={() => setActiveTab("documents")}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            activeTab === "documents"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <FileText className="w-4 h-4" /> Product Documents
                    </button>
                    <button
                        onClick={() => setActiveTab("field-images")}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            activeTab === "field-images"
                                ? "bg-background shadow-sm text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        }`}
                    >
                        <ImageIcon className="w-4 h-4" /> Field Images
                    </button>
                </div>

                {/* ── FIELD IMAGES TAB ── */}
                {activeTab === "field-images" && (
                    <FieldImagesSection isAdmin={isAdminOrSuper} />
                )}

                {/* ── DOCUMENTS TAB ── */}
                {activeTab === "documents" && (
                <>

                {/* Vacancy banner */}
                <VacancyBanner items={vacancyItems} />

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <span className="text-lg font-bold text-blue-600">
                                    {products.length}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Products
                            </span>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <span className="text-lg font-bold text-emerald-600">
                                    {productsWithDocsCount}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Products with Docs
                            </span>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                                <span className="text-lg font-bold text-purple-600">
                                    {totalDocCount}
                                </span>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground">
                                Total Documents
                            </span>
                        </CardContent>
                    </Card>
                </div>

                {/* Search + Download */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by part number or customer..."
                            className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                        />
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 shadow-sm h-9"
                        onClick={handleDownloadExcel}
                    >
                        <Download className="w-4 h-4" />
                        Download Excel
                    </Button>
                </div>

                {/* Documents Table */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/20 hover:bg-muted/20 border-b-0">
                                        <TableHead
                                            rowSpan={2}
                                            className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 pl-4 sticky left-0 z-20 bg-muted/20 border-r min-w-[160px] align-bottom pb-3"
                                        >
                                            Part Number
                                        </TableHead>
                                        {/* Edit column header */}
                                        <TableHead
                                            rowSpan={2}
                                            className="text-xs font-bold uppercase tracking-wider text-muted-foreground h-10 sticky left-[160px] z-20 bg-muted/20 border-r min-w-[60px] align-bottom pb-3 text-center"
                                        >
                                            Edit
                                        </TableHead>
                                        <TableHead
                                            colSpan={allIndividualCols.length}
                                            className="text-center text-xs font-bold uppercase tracking-wider h-8 border-b-0 border-r"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-blue-100 text-blue-800 text-[10px] font-semibold px-2"
                                                >
                                                    Individual
                                                </Badge>
                                            </div>
                                        </TableHead>
                                        <TableHead
                                            colSpan={allPpapCols.length}
                                            className="text-center text-xs font-bold uppercase tracking-wider h-8 border-b-0"
                                        >
                                            <div className="flex items-center justify-center gap-1.5">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-purple-100 text-purple-800 text-[10px] font-semibold px-2"
                                                >
                                                    PPAP
                                                </Badge>
                                            </div>
                                        </TableHead>
                                    </TableRow>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        {allIndividualCols.map((doc, i) => (
                                            <TableHead
                                                key={`ind-${doc}`}
                                                className={`text-[10px] font-semibold uppercase tracking-wider text-blue-800/70 h-10 text-center min-w-[80px] px-2 whitespace-nowrap ${
                                                    i === allIndividualCols.length - 1
                                                        ? "border-r"
                                                        : ""
                                                }`}
                                            >
                                                {doc}
                                            </TableHead>
                                        ))}
                                        {allPpapCols.map((doc) => (
                                            <TableHead
                                                key={`ppap-${doc}`}
                                                className="text-[10px] font-semibold uppercase tracking-wider text-purple-800/70 h-10 text-center min-w-[80px] px-2 whitespace-nowrap"
                                            >
                                                {doc}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProducts.map((product) => {
                                        const docs = parseCategorizedDocs(
                                            product.ppap_documents
                                        );

                                        return (
                                            <TableRow
                                                key={product.id}
                                                className="group hover:bg-muted/10 transition-colors"
                                            >
                                                {/* Part number sticky cell */}
                                                <TableCell className="pl-4 font-mono font-semibold text-sm sticky left-0 z-10 bg-background group-hover:bg-muted/10 transition-colors border-r whitespace-nowrap min-w-[160px]">
                                                    <div>
                                                        <span>{product.part_number}</span>
                                                        <p className="text-[10px] text-muted-foreground font-normal font-sans truncate max-w-[130px]">
                                                            {product.customer}
                                                        </p>
                                                    </div>
                                                </TableCell>
                                                {/* Edit button sticky cell */}
                                                <TableCell className="text-center sticky left-[160px] z-10 bg-background group-hover:bg-muted/10 transition-colors border-r px-2">
                                                    <button
                                                        onClick={() => setEditProductId(product.id)}
                                                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-muted/60 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all"
                                                        title="Edit documents"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </button>
                                                </TableCell>
                                                {/* Individual doc cells */}
                                                {allIndividualCols.map((doc, i) => {
                                                    const path = findDocPath(docs.individual, doc);
                                                    const notReq = isNotRequired(path);
                                                    return (
                                                        <TableCell
                                                            key={`ind-${doc}`}
                                                            className={`text-center px-2 ${
                                                                i === allIndividualCols.length - 1
                                                                    ? "border-r"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {notReq ? (
                                                                <span
                                                                    className=" text-gray-600 text-xs"
                                                                    title="Not Required"
                                                                >
                                                                    N/R
                                                                </span>
                                                            ) : path ? (
                                                                <button
                                                                    onClick={() =>
                                                                        setViewDoc({
                                                                            name: doc,
                                                                            url: getFileUrl(path),
                                                                            category: "Individual",
                                                                        })
                                                                    }
                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-800 transition-all hover:scale-110 cursor-pointer"
                                                                    title={`View ${doc}`}
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-muted-foreground/30 text-xs">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                                {/* PPAP doc cells */}
                                                {allPpapCols.map((doc) => {
                                                    const path = findDocPath(docs.ppap, doc);
                                                    const notReq = isNotRequired(path);
                                                    return (
                                                        <TableCell
                                                            key={`ppap-${doc}`}
                                                            className="text-center px-2"
                                                        >
                                                            {notReq ? (
                                                                <span
                                                                    className="text-muted-foreground/40 text-xs"
                                                                    title="Not Required"
                                                                >
                                                                    N/R
                                                                </span>
                                                            ) : path ? (
                                                                <button
                                                                    onClick={() =>
                                                                        setViewDoc({
                                                                            name: doc,
                                                                            url: getFileUrl(path),
                                                                            category: "PPAP",
                                                                        })
                                                                    }
                                                                    className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-600 hover:text-purple-800 transition-all hover:scale-110 cursor-pointer"
                                                                    title={`View ${doc}`}
                                                                >
                                                                    <FileText className="w-4 h-4" />
                                                                </button>
                                                            ) : (
                                                                <span className="text-muted-foreground/30 text-xs">
                                                                    —
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        );
                                    })}
                                    {paginatedProducts.length === 0 && (
                                        <TableRow>
                                            <TableCell
                                                colSpan={
                                                    2 +
                                                    allIndividualCols.length +
                                                    allPpapCols.length
                                                }
                                                className="h-32 text-center text-muted-foreground"
                                            >
                                                No products found.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        {/* Pagination */}
                        <div className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">
                                Showing{" "}
                                {(safeCurrentPage - 1) * RECORDS_PER_PAGE + 1}–
                                {Math.min(
                                    safeCurrentPage * RECORDS_PER_PAGE,
                                    filteredProducts.length
                                )}{" "}
                                of {filteredProducts.length} products
                            </span>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={safeCurrentPage <= 1}
                                    onClick={() =>
                                        setCurrentPage((p) => Math.max(1, p - 1))
                                    }
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter((page) => {
                                        if (page === 1 || page === totalPages) return true;
                                        if (Math.abs(page - safeCurrentPage) <= 1) return true;
                                        return false;
                                    })
                                    .reduce<(number | "ellipsis")[]>(
                                        (acc, page, idx, arr) => {
                                            if (
                                                idx > 0 &&
                                                page - (arr[idx - 1] as number) > 1
                                            ) {
                                                acc.push("ellipsis");
                                            }
                                            acc.push(page);
                                            return acc;
                                        },
                                        []
                                    )
                                    .map((item, idx) =>
                                        item === "ellipsis" ? (
                                            <span
                                                key={`e-${idx}`}
                                                className="px-1 text-xs text-muted-foreground"
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <Button
                                                key={item}
                                                variant={
                                                    safeCurrentPage === item
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="icon"
                                                className="h-8 w-8 text-xs"
                                                onClick={() =>
                                                    setCurrentPage(item as number)
                                                }
                                            >
                                                {item}
                                            </Button>
                                        )
                                    )}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8"
                                    disabled={safeCurrentPage >= totalPages}
                                    onClick={() =>
                                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                                    }
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

            </>
            )}

            {/* Document Viewer */}
            <Dialog
                open={!!viewDoc}
                onOpenChange={(open) => !open && setViewDoc(null)}
            >
                <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">
                                    {viewDoc?.name}
                                </DialogTitle>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <Badge
                                        variant="outline"
                                        className="text-[9px] px-1.5 h-4"
                                    >
                                        {viewDoc?.category}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 bg-muted/10 p-4 relative overflow-auto">
                        {viewDoc && (
                            <div className="w-full h-full min-h-[500px] bg-background border rounded-xl shadow-sm overflow-hidden flex items-center justify-center">
                                {viewDoc.url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                                    <img
                                        src={viewDoc.url}
                                        alt={viewDoc.name}
                                        className="max-w-full max-h-full object-contain p-4"
                                    />
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

            {/* Edit Document Popup */}
            <EditDocPopup
                product={editProduct}
                allIndividualCols={allIndividualCols}
                allPpapCols={allPpapCols}
                onClose={() => setEditProductId(null)}
                onUpload={uploadDocument}
                onDelete={deleteDocument}
                onMarkNotRequired={handleMarkNotRequired}
                onUnmarkNotRequired={handleUnmarkNotRequired}
            />

            </div>
        </DashboardLayout>
    );
}