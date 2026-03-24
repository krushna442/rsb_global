"use client";

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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Plus,
    Upload,
    Download,
    Search,
    MoreHorizontal,
    Eye,
    Pencil,
    Trash2,
    CheckCircle2,
    Filter,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useMemo, useEffect } from "react";
import * as XLSX from "xlsx";
import { useProducts } from "@/contexts/ProductsContext";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
import { Product } from "@/types/api";
import { toast } from "sonner";
import { ProductForm } from "@/components/product-master/product-form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

const statusStyles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700 border-emerald-200",
    pending: "bg-orange-50 text-orange-700 border-orange-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function ProductMasterPage() {
    const router = useRouter();
    const { products, counts, loading: productsLoading, deleteProduct, importProducts } = useProducts();
    const { data: dynamicFieldsData, loading: fieldsLoading } = useDynamicFields();
    
    const loading = productsLoading || fieldsLoading;
    const fileRef = useRef<HTMLInputElement>(null);

    const [importData, setImportData] = useState<any[]>([]);
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 60;
    const [showImportModal, setShowImportModal] = useState(false);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, statusFilter]);
    const [isImporting, setIsImporting] = useState(false);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    const handleEditClick = (product: Product) => {
        setSelectedProduct(product);
        setShowEditModal(true);
    };

    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesStatus = statusFilter === "all" || ((p as any).status || p.status || "pending").toLowerCase() === statusFilter.toLowerCase();
            if (!matchesStatus) return false;
            
            if (!searchQuery.trim()) return true;
            
            const lowerQuery = searchQuery.toLowerCase();
            const partNum = (p.part_number || "").toLowerCase();
            const customer = ((p as any).customer || p.specification?.customer || "").toLowerCase();
            const vendor = ((p as any).vendorCode || p.specification?.vendorCode || "").toLowerCase();
            
            return partNum.includes(lowerQuery) || customer.includes(lowerQuery) || vendor.includes(lowerQuery);
        });
    }, [products, statusFilter, searchQuery]);

    const duplicatePartNumbers = useMemo(() => {
        const counts: Record<string, number> = {};
        importData.forEach(row => {
            if (row.partNumber) {
                counts[row.partNumber] = (counts[row.partNumber] || 0) + 1;
            }
        });
        const duplicates = new Set<string>();
        for (const [part, count] of Object.entries(counts)) {
            if (count > 1) duplicates.add(part);
        }
        return duplicates;
    }, [importData]);

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage) || 1;
    const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                // using any to temporarily map rows from the variable spreadsheet
                const data = XLSX.utils.sheet_to_json<any>(ws);
                
const imported = data.map((row: any, index: number) => ({
    _id: index,

    partNumber:
        row["Part No."] ||
        row["Part Number"] ||
        row["partNumber"] ||
        `IMP-${Math.floor(Math.random() * 10000)}`,

    customer:
        row["Customer Name"] ||
        row["Customer"] ||
        row["customer"] ||
        "Unknown",

    vendorCode:
        row["Vendor Code"] ||
        row["vendorCode"] ||
        "",

    tubeLength:
        row["Tube Length"] ||
        row["tubeLength"] ||
        "",

    tubeDiameter:
        row["Tube Dia & Thickness"] ||
        row["Tube Diameter"] ||
        row["tubeDiameter"] ||
        "",

    partType:
        row["Part Type"] ||
        row["partType"] ||
        "",

    status:
        row["Status"] ||
        row["status"] ||
        "Pending",

    partWeightKg:
        row["Part Weight in kg/Rev No"] ||
        row["Part Weight (kg)"] ||
        row["partWeightKg"] ||
        "",

    revNo:
        row["Rev No"] ||
        row["revNo"] ||
        "",

    poNumber:
        row["PO Number"] ||
        row["poNumber"] ||
        "",

    supplyDate:
        row["Supply date"] ||
        row["Supply Date"] ||
        row["supplyDate"] ||
        "",

    sampleStatus:
        row["Sample Status"] ||
        row["sampleStatus"] ||
        "Pending",

    sampleSupplyMode:
        row["Sample Supply Mode"] ||
        row["sampleSupplyMode"] ||
        "",

    acceptedMailDate:
        row["Accepted Mail Date"] ||
        row["acceptedMailDate"] ||
        "",

    trsoDate:
        row["TRSO Date"] ||
        row["trsoDate"] ||
        "",

    trsoModel:
        row["TRSO MODEL"] ||
        row["trsoModel"] ||
        "",

    trsoRev:
        row["TRSO_Rev"] ||
        row["trsoRev"] ||
        "",

    iqaDate:
        row["IQA Date"] ||
        row["iqaDate"] ||
        "",

    iqaModel:
        row["IQA Model"] ||
        row["iqaModel"] ||
        "",

    iqaVcNumber:
        row["IQA VC Number"] ||
        row["iqaVcNumber"] ||
        "",

    ppapIntimateDate:
        row["PPAP Intimate Date"] ||
        row["ppapIntimateDate"] ||
        "",

    ppapClosingDate:
        row["PPAP closing Date"] ||
        row["PPAP Closing Date"] ||
        row["ppapClosingDate"] ||
        "",

    ppapStatus:
        row["PPAP Status"] ||
        row["ppapStatus"] ||
        "Initiated",

    drawingNumber:
        row["Drawing Number."] ||
        row["Drawing Number"] ||
        row["drawingNumber"] ||
        "",

    drawingModel:
        row["Drawing Model"] ||
        row["drawingModel"] ||
        "",

    vehicleType:
        row["Vehicle Type"] ||
        row["vehicleType"] ||
        "",

    partDescription:
        row["Part Description"] ||
        row["partDescription"] ||
        "",

    series:
        row["Series"] ||
        row["series"] ||
        "",

    noiseDeadenerLength:
        row["Noise Deadener length"] ||
        row["Noise Deadener Length"] ||
        row["noiseDeadenerLength"] ||
        "",

    availableNoiseDeadener:
        row["Available Noise Deadener"] ||
        row["availableNoiseDeadener"] ||
        "",

    fepPressHStockPositions:
        row["Fep Press H. Stock Positions"] ||
        row["fepPressHStockPositions"] ||
        "",

    frontEndPieceDetails:
        row["Front End Piece Details"] ||
        row["frontEndPieceDetails"] ||
        "",

    rearHousingLength:
        row["Rear Housing length"] ||
        row["Rear Housing Length"] ||
        row["rearHousingLength"] ||
        "",

    longForkLength:
        row["Long Fork Length"] ||
        row["longForkLength"] ||
        "",

    sfDetails:
        row["S.F Details"] ||
        row["sfDetails"] ||
        "",

    pdcLength:
        row["PDC Length"] ||
        row["pdcLength"] ||
        "",

    couplingFlangeOrientations:
        row["Coupling Flange Orientations"] ||
        row["couplingFlangeOrientations"] ||
        "",

    hexBoltNutTighteningTorque:
        row["Hex bolt/Hex Nut Tightening torque"] ||
        row["Hex Bolt/Hex Nut Tightening Torque"] ||
        row["hexBoltNutTighteningTorque"] ||
        "",

    loctiteGradeUse:
        row["Loctite Grade Use"] ||
        row["loctiteGradeUse"] ||
        "",

    cbKitDetails:
        row["CB KIT Details"] ||
        row["CB Kit Details"] ||
        row["cbKitDetails"] ||
        "",

    slipDetails:
        row["Slip Details"] ||
        row["slipDetails"] ||
        "",

    greaseableOrNonGreaseable:
        row["Greaseable Or Non Greaseable"] ||
        row["greaseableOrNonGreaseable"] ||
        "",

    mountingDetailsFlangeYoke:
        row["Mounting Details flange yoke."] ||
        row["Mounting Details flange yoke"] ||
        row["mountingDetailsFlangeYoke"] ||
        "",

    mountingDetailsCouplingFlange:
        row["Mounting Details coupling flange."] ||
        row["Mounting Details coupling flange"] ||
        row["mountingDetailsCouplingFlange"] ||
        "",

    iaBellowDetails:
        row["I/A Bellow Details"] ||
        row["iaBellowDetails"] ||
        "",

    totalLength:
        row["Total Length"] ||
        row["totalLength"] ||
        "",

    balancingRpm:
        row["Balancing RPM"] ||
        row["balancingRpm"] ||
        "",

    unbalanceInCmg:
        row["Unbalance In Cmg."] ||
        row["Unbalance In Cmg"] ||
        row["unbalanceInCmg"] ||
        "",

    unbalanceInGram:
        row["Unbalance In Gram"] ||
        row["unbalanceInGram"] ||
        "",

    unbalanceInGram75Percent:
        row["Unbalance In Gram 75%"] ||
        row["unbalanceInGram75Percent"] ||
        "",
}));

                setImportData(imported);
                setShowImportModal(true);
            } catch {
                toast.error("Failed to parse Excel file");
            }
            if (fileRef.current) fileRef.current.value = "";
        };
        reader.readAsBinaryString(file);
    };

    const handleUpdateImportRow = (index: number, field: string, value: string) => {
        const newData = [...importData];
        newData[index] = { ...newData[index], [field]: value };
        setImportData(newData);
    };

    const handleDeleteImportRow = (index: number) => {
        const newData = [...importData];
        newData.splice(index, 1);
        setImportData(newData);
    };

    const confirmImport = async () => {
        if (duplicatePartNumbers.size > 0) {
            toast.error("Please resolve duplicate part numbers before submitting");
            return;
        }

        setIsImporting(true);
        try {
            const payload = importData.map(row => {
                const { _id, partNumber, customer, status, ...specification } = row;
                return {
                    part_number: partNumber,
                    customer: customer,
                    status: status,
                    specification: specification
                };
            });

            const success = await importProducts(payload);
            if (success) {
                setShowImportModal(false);
                setImportData([]);
            }
        } finally {
            setIsImporting(false);
        }
    };

    const importColumns = useMemo(() => {
        if (!dynamicFieldsData?.product_fields) return [];
        return dynamicFieldsData.product_fields
            .filter(f => f.name !== 'partNumber')
            .map(f => ({
                key: f.name,
                label: f.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                minWidth: 150
            }));
    }, [dynamicFieldsData]);

    if (loading) return <><DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout></>;

    return (
        <>
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Product Master</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage product specifications and inventory</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="file" ref={fileRef} className="hidden" accept=".xlsx,.xls,.csv" onChange={handleImportExcel} />
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={() => fileRef.current?.click()}>
                            <Upload className="w-3.5 h-3.5" />
                            Import Excel
                        </Button>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                            <Download className="w-3.5 h-3.5" />
                            Export Data
                        </Button>
                        <Link href="/product-master/new">
                            <Button size="sm" className="h-9 gap-1.5 text-xs">
                                <Plus className="w-3.5 h-3.5" />
                                Add Product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="border-0 shadow-sm pb-0">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold">{counts?.total || 0}</span>
                            <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Products</span>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm pb-0">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-emerald-600">{counts?.active || 0}</span>
                            <span className="text-xs text-emerald-600/80 uppercase tracking-wider mt-1">Active</span>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm pb-0">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-orange-600">{counts?.pending || 0}</span>
                            <span className="text-xs text-orange-600/80 uppercase tracking-wider mt-1">Pending</span>
                        </CardContent>
                    </Card>
                    <Card className="border-0 shadow-sm pb-0">
                        <CardContent className="p-4 flex flex-col items-center justify-center">
                            <span className="text-2xl font-bold text-red-600">{counts?.rejected || 0}</span>
                            <span className="text-xs text-red-600/80 uppercase tracking-wider mt-1">Rejected</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by part number, customer, vendor..."
                                    className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <select 
                                className="h-9 px-3 rounded-md border border-input bg-background/50 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="rejected">Rejected</option>
                            </select>
                            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                                <Filter className="w-3.5 h-3.5" />
                                Filters
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">All Products</CardTitle>
                            <span className="text-xs text-muted-foreground">{filteredProducts.length} products</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        {dynamicFieldsData?.product_fields.map((field, idx) => {
                                            const isFirst = idx === 0;
                                            return (
                                                <TableHead key={field.name} className={`text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap ${isFirst ? 'pl-6' : ''}`}>
                                                    {field.name.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                                </TableHead>
                                            );
                                        })}
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 text-right sticky right-0 bg-background/95 backdrop-blur z-10">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {paginatedProducts.map((product) => {
                                        const isEdited = (key: string) => Array.isArray(product.edited_fields) && product.edited_fields.includes(key);
                                        const getCellClass = (key: string, baseClass = "") => {
                                            return `text-sm whitespace-nowrap ${baseClass} ${isEdited(key) ? "bg-amber-100/50 dark:bg-amber-900/40 font-medium text-amber-900 dark:text-amber-200" : ""}`;
                                        };

                                        return (
                                        <TableRow key={(product as any).id || product.specification?.id} className="group  hover:bg-muted/20 transition-colors">
                                            {dynamicFieldsData?.product_fields.map((field, idx) => {
                                                const isFirst = idx === 0;
                                                const fieldName = field.name;

                                                if (fieldName === 'status') {
                                                    return (
                                                        <TableCell key={fieldName} className={getCellClass("status", "whitespace-nowrap")}>
                                                            <Badge variant="outline" className={`text-[10px] ${statusStyles[(product as any).status || product.status || "Pending"] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                                                                {(product as any).status || product.status || "Pending"}
                                                            </Badge>
                                                        </TableCell>
                                                    );
                                                }

                                                const topLevelMap: Record<string, string> = {
                                                    partNumber: 'part_number',
                                                    customer: 'customer',
                                                };
                                                
                                                const checkKey = topLevelMap[fieldName] || fieldName;
                                                let cellValue = (product as any)[checkKey];
                                                if (cellValue === undefined) {
                                                    cellValue = product.specification?.[fieldName];
                                                }

                                                // apply styling rules
                                                let baseClass = "text-muted-foreground";
                                                if (isFirst) baseClass = "font-mono font-medium pl-6";
                                                if (checkKey === 'customer' || fieldName === 'partType') baseClass = "";
                                                if (fieldName === 'vendorCode' || fieldName === 'poNumber' || fieldName === 'iqaVcNumber') baseClass = "font-mono text-muted-foreground";

                                                return (
                                                    <TableCell key={fieldName} className={getCellClass(checkKey, baseClass)}>
                                                        {cellValue || "-"}
                                                    </TableCell>
                                                );
                                            })}
                                            <TableCell className="pr-6 text-right sticky right-0 bg-background/95 backdrop-blur z-10 group-hover:bg-muted/20 transition-colors">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36">
                                                        <DropdownMenuItem 
                                                            className="text-xs p-0 cursor-pointer" 
                                                            onClick={(e) => { 
                                                                e.preventDefault(); 
                                                                handleEditClick(product as Product); 
                                                            }}
                                                        >
                                                            <div className="flex items-center w-full px-2 py-1.5">
                                                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                            </div>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="text-xs gap-2 cursor-pointer">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem 
                                                            className="text-xs gap-2 text-red-500 focus:text-red-500 cursor-pointer"
                                                            onClick={() => deleteProduct(product.id)}
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                    })}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">
                                Showing {filteredProducts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                            </p>
                            <div className="flex items-center gap-1">
                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8" 
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    let pageNum;
                                    if (totalPages <= 5) {
                                        pageNum = i + 1;
                                    } else if (currentPage <= 3) {
                                        pageNum = i + 1;
                                    } else if (currentPage >= totalPages - 2) {
                                        pageNum = totalPages - 4 + i;
                                    } else {
                                        pageNum = currentPage - 2 + i;
                                    }
                                    
                                    return (
                                        <Button 
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "outline"} 
                                            size="icon" 
                                            className="h-8 w-8 text-xs"
                                            onClick={() => setCurrentPage(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}

                                <Button 
                                    variant="outline" 
                                    size="icon" 
                                    className="h-8 w-8"
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Import Modal */}
            <Dialog open={showImportModal} onOpenChange={(open) => !isImporting && setShowImportModal(open)}>
                <DialogContent className="!max-w-[95vw] w-full max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle>Review Imported Data</DialogTitle>
                    </DialogHeader>
                    
                    {duplicatePartNumbers.size > 0 && (
                        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mt-2 flex-shrink-0">
                            There are duplicate part numbers in the imported data. Please resolve them by editing or deleting rows before submitting.
                        </div>
                    )}

                    <div className="flex-1 overflow-auto border rounded-md mt-4 relative">
                        {isImporting && (
                            <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-2">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm font-medium">Importing products...</p>
                                </div>
                            </div>
                        )}
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[150px] sticky top-0 left-0 z-30 bg-muted/95 backdrop-blur shadow-[1px_1px_0_0_#e5e7eb]">Part Number</TableHead>
                                    {importColumns.map(col => (
                                        <TableHead key={col.key} style={{ minWidth: col.minWidth }} className="sticky top-0 z-20 bg-muted/95 backdrop-blur shadow-[0_1px_0_0_#e5e7eb]">{col.label}</TableHead>
                                    ))}
                                    <TableHead className="min-w-[80px] sticky top-0 right-0 z-30 bg-muted/95 backdrop-blur shadow-[-1px_1px_0_0_#e5e7eb]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {importData.map((row, index) => {
                                    const isDuplicate = duplicatePartNumbers.has(row.partNumber);
                                    return (
                                        <TableRow key={row._id} className={isDuplicate ? "bg-destructive/10 hover:bg-destructive/20" : ""}>
                                            <TableCell className="sticky left-0 z-10 bg-background/95 backdrop-blur p-2 shadow-[1px_0_0_0_#e5e7eb]">
                                                <Input 
                                                    value={row.partNumber} 
                                                    onChange={(e) => handleUpdateImportRow(index, "partNumber", e.target.value)}
                                                    className={`h-8 text-xs font-mono ${isDuplicate ? "border-destructive focus-visible:ring-destructive" : ""}`}
                                                />
                                            </TableCell>
                                            {importColumns.map(col => (
                                                <TableCell key={col.key} className="p-2">
                                                    <Input 
                                                        value={row[col.key] || ""} 
                                                        onChange={(e) => handleUpdateImportRow(index, col.key, e.target.value)} 
                                                        className="h-8 text-xs" 
                                                    />
                                                </TableCell>
                                            ))}
                                            <TableCell className="sticky right-0 z-10 bg-background/95 backdrop-blur p-2 shadow-[-1px_0_0_0_#e5e7eb]">
                                                <Button size="icon" variant="ghost" onClick={() => handleDeleteImportRow(index)} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter className="mt-4 sm:justify-between items-center flex-shrink-0">
                        <div className="text-sm text-muted-foreground">
                            Total rows: {importData.length}
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowImportModal(false)} disabled={isImporting}>Cancel</Button>
                            <Button onClick={confirmImport} disabled={isImporting || importData.length === 0 || duplicatePartNumbers.size > 0}>
                                {isImporting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importing...</> : "Submit"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>

        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent className="!max-w-[95vw] h-[95vh] p-0 overflow-y-auto">
                {selectedProduct && (
                    <div className="p-6">
                        <ProductForm
                            isEdit={true}
                            productId={selectedProduct.id}
                            initialData={selectedProduct}
                            isPopup={true}
                            onSuccess={() => {
                                setShowEditModal(false);
                                // The ProductsContext already calls fetchProducts() automatically on update/create success!
                            }}
                            onCancel={() => setShowEditModal(false)}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    </>
    );
}
