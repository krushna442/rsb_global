"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Upload,
    Search,
    FileText,
    FileImage,
    FileSpreadsheet,
    Trash2,
    Plus,
    Filter,
    Eye,
    X,
    Loader2
} from "lucide-react";
import { useProducts } from "@/contexts/ProductsContext";
import { Product } from "@/types/api";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";

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

const DOCUMENT_TYPES = [
    "PSW",
    "Control Plan",
    "FMEA",
    "Process Flow",
    "Drawing",
    "Material Cert",
    "Dimensional Results",
    "Test Results",
    "Initial Process Studies",
    "MSA",
    "Part Submission Warrant",
    "Other"
];

// Helper to convert backend file path into accessible URL
const getFileUrl = (filePath: string) => {
    // If it's already an absolute URL, return it
    if (filePath.startsWith('http')) return filePath;
    // Otherwise replace backslashes (Windows) to forward slashes and prepend server base url
    const normalizedPath = filePath.replace(/\\/g, '/');
    return `https://rsb-server.onrender.com/${normalizedPath}`;
};

export default function DocumentsPage() {
    const { getProductByPart, uploadPpapDocument, deletePpapDocument } = useProducts();
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [product, setProduct] = useState<Product | null>(null);
    const [searchMessage, setSearchMessage] = useState("");
    
    // Upload Modal State
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [uploadDocName, setUploadDocName] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    // View Modal State
    const [viewDoc, setViewDoc] = useState<{name: string, url: string} | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        setSearchMessage("");
        setProduct(null);
        
        try {
            const foundProduct = await getProductByPart(searchQuery.trim());
            if (foundProduct) {
                if (foundProduct.status !== 'active') {
                    setSearchMessage("This product is not active.");
                } else {
                    setProduct(foundProduct);
                }
            } else {
                setSearchMessage("No product found with this part number.");
            }
        } catch (error) {
            setSearchMessage("Error retrieving product details.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleUploadSubmit = async () => {
        if (!product || !uploadDocName || !selectedFile) {
            toast.error("Please provide both a document name and a file.");
            return;
        }

        setIsUploading(true);
        const success = await uploadPpapDocument(product.id, uploadDocName, selectedFile);
        if (success) {
            // refresh product details
            const updatedProduct = await getProductByPart(product.part_number);
            setProduct(updatedProduct);
            setIsUploadOpen(false);
            setUploadDocName("");
            setSelectedFile(null);
        }
        setIsUploading(false);
    };

    const handleDeleteDoc = async (fileName: string) => {
        if (!product) return;
        setIsDeleting(true);
        const success = await deletePpapDocument(product.id, fileName);
        if (success) {
            toast.success("Document deleted successfully");
            setViewDoc(null); // close view modal if open
            // refresh product details
            const updatedProduct = await getProductByPart(product.part_number);
            setProduct(updatedProduct);
        }
        setIsDeleting(false);
    };

    // Parse documents from JSON
    let parsedDocuments: Record<string, string> = {};
    if (product?.ppap_documents) {
        try {
            parsedDocuments = typeof product.ppap_documents === 'string' ? JSON.parse(product.ppap_documents) : product.ppap_documents;
        } catch (e) {
            console.error("Failed to parse ppap_documents", e);
        }
    }
    
    const documentEntries = Object.entries(parsedDocuments);

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">PPAP Documents</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage process and product documentation</p>
                    </div>
                </div>

                {/* Search Header */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardContent className="p-6 bg-gradient-to-r from-muted/50 to-transparent">
                        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Enter Part Number to search..."
                                    className="pl-9 h-11 bg-background"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                />
                            </div>
                            <Button className="h-11 px-8" onClick={handleSearch} disabled={isSearching}>
                                {isSearching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {isSearching ? "Searching..." : "Search"}
                            </Button>
                        </div>
                        {searchMessage && (
                            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                {searchMessage}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Product & Document Content */}
                {product && product.status === 'active' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Product Info Header */}
                        <div className="flex items-center justify-between bg-primary/5 border border-primary/10 rounded-xl p-4 px-6">
                            <div className="flex items-center gap-6">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Part Number</p>
                                    <p className="text-lg font-bold text-foreground">{product.part_number}</p>
                                </div>
                                <div className="h-8 w-px bg-border/50"></div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Customer</p>
                                    <p className="text-sm font-medium text-foreground">{product.customer}</p>
                                </div>
                            </div>
                            <Button onClick={() => setIsUploadOpen(true)} className="gap-2 shadow-sm">
                                <Plus className="w-4 h-4" />
                                Add Document
                            </Button>
                        </div>

                        {/* Documents Table */}
                        <Card className="border-0 shadow-sm overflow-hidden">
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
                                                    const iconKey = Object.keys(typeIcon).find(key => name.includes(key)) || 'default';
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
                                                            <TableCell className="pr-6 text-right">
                                                                <Button 
                                                                    variant="ghost" 
                                                                    size="icon" 
                                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                                    disabled={isDeleting}
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteDoc(name); }}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
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
                    </div>
                )}
            </div>

            {/* Upload Document Modal */}
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                            Add a new document for {product?.part_number}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="docType">Document Type</Label>
                            <Select value={uploadDocName} onValueChange={(val) => setUploadDocName(val || "")}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type or type custom" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DOCUMENT_TYPES.map(type => (
                                        <SelectItem key={type} value={type}>{type}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {/* Fallback for custom names if they want it */}
                            <Input 
                                placeholder="Or enter custom name..." 
                                value={uploadDocName} 
                                onChange={(e) => setUploadDocName(e.target.value)}
                                className="mt-1"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>File</Label>
                            <div className="border-2 border-dashed rounded-xl p-6 text-center hover:bg-muted/40 transition-colors relative">
                                <Input 
                                    type="file" 
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files.length > 0) {
                                            setSelectedFile(e.target.files[0]);
                                        }
                                    }}
                                />
                                {selectedFile ? (
                                    <div className="flex items-center justify-between bg-background border rounded-lg p-3 relative z-10 pointer-events-none">
                                        <div className="flex items-center gap-2 truncate">
                                            <FileText className="w-4 h-4 text-primary" />
                                            <span className="text-sm font-medium truncate max-w-[200px]">{selectedFile.name}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                                        <p className="text-sm text-foreground font-medium">Click or drag file to upload</p>
                                        <p className="text-xs text-muted-foreground mt-1">PDF, Excel, Images (Max 10MB)</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsUploadOpen(false)} disabled={isUploading}>
                            Cancel
                        </Button>
                        <Button onClick={handleUploadSubmit} disabled={isUploading || !uploadDocName || !selectedFile}>
                            {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            Upload Document
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Document Modal */}
            <Dialog open={!!viewDoc} onOpenChange={(open) => !open && setViewDoc(null)}>
                <DialogContent className="!max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/20">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Eye className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">{viewDoc?.name}</DialogTitle>
                                <p className="text-sm text-muted-foreground">{product?.part_number}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 mx-4">
                            <Button 
                                variant="destructive" 
                                size="sm" 
                                className="gap-2"
                                disabled={isDeleting}
                                onClick={() => viewDoc && handleDeleteDoc(viewDoc.name)}
                            >
                                {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                Delete
                            </Button>

                        </div>
                    </div>
                    <div className="flex-1 bg-muted/10 p-4 relative overflow-auto">
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
        </DashboardLayout>
    );
}
