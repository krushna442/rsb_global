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
import { useRef } from "react";
import * as XLSX from "xlsx";
import { useProducts } from "@/lib/use-products";
import { toast } from "sonner";

const statusStyles: Record<string, string> = {
    Approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Pending: "bg-orange-50 text-orange-700 border-orange-200",
    Rejected: "bg-red-50 text-red-700 border-red-200",
};

export default function ProductMasterPage() {
    const router = useRouter();
    const { products, isLoaded, deleteProduct, importProducts } = useProducts();
    const fileRef = useRef<HTMLInputElement>(null);

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
                
                const imported = data.map((row: any) => ({
                    partNumber: row["Part Number"] || row["partNumber"] || `IMP-${Math.floor(Math.random() * 10000)}`,
                    customer: row["Customer"] || row["customer"] || row["Customer Name"] || "Unknown",
                    vendorCode: row["Vendor Code"] || row["vendorCode"] || "",
                    tubeLength: row["Tube Length"] || row["tubeLength"] || "",
                    tubeDiameter: row["Tube Diameter"] || row["tubeDiameter"] || "",
                    partType: row["Part Type"] || row["partType"] || "",
                    status: row["Status"] || row["status"] || "Pending",
                    partWeightKg: row["Part Weight (kg)"] || row["partWeightKg"] || "",
                    revNo: row["Rev No"] || row["revNo"] || "",
                    poNumber: row["PO Number"] || row["poNumber"] || "",
                    supplyDate: row["Supply date"] || row["Supply Date"] || row["supplyDate"] || "",
                    sampleStatus: row["Sample Status"] || row["sampleStatus"] || "Pending",
                    sampleSupplyMode: row["Sample Supply Mode"] || row["sampleSupplyMode"] || "",
                    acceptedMailDate: row["Accepted Mail Date"] || row["acceptedMailDate"] || "",
                    trsoDate: row["TRSO Date"] || row["trsoDate"] || "",
                    trsoModel: row["TRSO MODEL"] || row["trsoModel"] || "",
                    trsoRev: row["TRSO_Rev"] || row["trsoRev"] || "",
                    iqaDate: row["IQA Date"] || row["iqaDate"] || "",
                    iqaModel: row["IQA Model"] || row["iqaModel"] || "",
                    iqaVcNumber: row["IQA VC Number"] || row["iqaVcNumber"] || "",
                    ppapIntimateDate: row["PPAP Intimate Date"] || row["ppapIntimateDate"] || "",
                    ppapClosingDate: row["PPAP closing Date"] || row["PPAP Closing Date"] || row["ppapClosingDate"] || "",
                    ppapStatus: row["PPAP Status"] || row["ppapStatus"] || "Initiated",
                    drawingNumber: row["Drawing Number"] || row["drawingNumber"] || "",
                    drawingModel: row["Drawing Model"] || row["drawingModel"] || "",
                    vehicleType: row["Vehicle Type"] || row["vehicleType"] || "",
                    partDescription: row["Part Description"] || row["partDescription"] || "",
                    series: row["Series"] || row["series"] || "",
                    noiseDeadenerLength: row["Noise Deadener length"] || row["Noise Deadener Length"] || row["noiseDeadenerLength"] || "",
                    availableNoiseDeadener: row["Available Noise Deadener"] || row["availableNoiseDeadener"] || "",
                    fepPressHStockPositions: row["Fep Press H. Stock Positions"] || row["fepPressHStockPositions"] || "",
                    frontEndPieceDetails: row["Front End Piece Details"] || row["frontEndPieceDetails"] || "",
                    rearHousingLength: row["Rear Housing length"] || row["Rear Housing Length"] || row["rearHousingLength"] || "",
                    longForkLength: row["Long Fork Length"] || row["longForkLength"] || "",
                    sfDetails: row["S.F Details"] || row["sfDetails"] || "",
                    pdcLength: row["PDC Length"] || row["pdcLength"] || "",
                    couplingFlangeOrientations: row["Coupling Flange Orientations"] || row["couplingFlangeOrientations"] || "",
                    hexBoltNutTighteningTorque: row["Hex bolt/Hex Nut Tightening torque"] || row["Hex Bolt/Hex Nut Tightening Torque"] || row["hexBoltNutTighteningTorque"] || "",
                    loctiteGradeUse: row["Loctite Grade Use"] || row["loctiteGradeUse"] || "",
                    cbKitDetails: row["CB KIT Details"] || row["CB Kit Details"] || row["cbKitDetails"] || "",
                    slipDetails: row["Slip Details"] || row["slipDetails"] || "",
                    greaseableOrNonGreaseable: row["Greaseable Or Non Greaseable"] || row["greaseableOrNonGreaseable"] || "",
                    mountingDetailsFlangeYoke: row["Mounting Details flange yoke"] || row["Mounting Details Flange Yoke"] || row["mountingDetailsFlangeYoke"] || "",
                    mountingDetailsCouplingFlange: row["Mounting Details coupling flange"] || row["Mounting Details Coupling Flange"] || row["mountingDetailsCouplingFlange"] || "",
                    iaBellowDetails: row["I/A Bellow Details"] || row["iaBellowDetails"] || "",
                    totalLength: row["Total Length"] || row["totalLength"] || "",
                    balancingRpm: row["Balancing RPM"] || row["balancingRpm"] || "",
                    unbalanceInCmg: row["Unbalance In Cmg"] || row["unbalanceInCmg"] || "",
                    unbalanceInGram: row["Unbalance In Gram"] || row["unbalanceInGram"] || "",
                    unbalanceInGram75Percent: row["Unbalance In Gram 75%"] || row["unbalanceInGram75Percent"] || "",
                }));

                importProducts(imported as any);
                toast.success(`Imported ${imported.length} products successfully`);
            } catch {
                toast.error("Failed to parse Excel file");
            }
            if (fileRef.current) fileRef.current.value = "";
        };
        reader.readAsBinaryString(file);
    };

    if (!isLoaded) return <DashboardLayout><div className="p-8 text-center text-muted-foreground">Loading...</div></DashboardLayout>;

    return (
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

                {/* Filters */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by part number, customer, vendor..."
                                    className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                                />
                            </div>
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
                            <span className="text-xs text-muted-foreground">{products.length} products</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-6 whitespace-nowrap">Part Number</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Customer Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Tube Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Tube Diameter</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Part Type</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Vendor Code</TableHead>
                                        {/* Original 16 + Basic */}
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Part Weight (kg)</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[100px]">Rev No</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">PO Number</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Supply Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Sample Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Sample Supply Mode</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Accepted Mail Date</TableHead>

                                        {/* Newly Added 27 Fields */}
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Drawing Number</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Drawing Model</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Vehicle Type</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[180px]">Part Description</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[100px]">Series</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[180px]">Noise Deadener Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[200px]">Available Noise Deadener</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[220px]">FEP Press H. Stock Positions</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[200px]">Front End Piece Details</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[180px]">Rear Housing Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Long Fork Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">S.F Details</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">PDC Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[220px]">Coupling Flange Orientations</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[250px]">Hex Bolt/Nut Tightening Torque</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">Loctite Grade Use</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[150px]">CB KIT Details</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Slip Details</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[220px]">Greaseable Or Non Greaseable</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[220px]">Mounting Details Flange Yoke</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[240px]">Mounting Details Coupling Flange</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[160px]">I/A Bellow Details</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">Total Length</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[140px]">Balancing RPM</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[160px]">Unbalance In Cmg</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[160px]">Unbalance In Gram</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[200px]">Unbalance In Gram 75%</TableHead>

                                        {/* TRSO / IQA / PPAP */}
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap min-w-[120px]">TRSO Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">TRSO MODEL</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">TRSO_Rev</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">IQA Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">IQA Model</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">IQA VC Number</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">PPAP Intimate Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">PPAP Closing Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">PPAP Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Status</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 text-right sticky right-0 bg-background/95 backdrop-blur z-10">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {products.map((product) => (
                                        <TableRow key={product.id} className="group hover:bg-muted/20 transition-colors">
                                            <TableCell className="text-sm font-mono font-medium pl-6 whitespace-nowrap">{product.partNumber}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.customer}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.tubeLength}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.tubeDiameter}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.partType}</TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground whitespace-nowrap">{product.vendorCode}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.partWeightKg}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.revNo}</TableCell>
                                            <TableCell className="text-sm font-mono whitespace-nowrap">{product.poNumber}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.supplyDate}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.sampleStatus}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.sampleSupplyMode}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.acceptedMailDate}</TableCell>

                                            {/* Newly Added 27 Fields */}
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.drawingNumber || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.drawingModel || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.vehicleType || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.partDescription || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.series || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.noiseDeadenerLength || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.availableNoiseDeadener || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.fepPressHStockPositions || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.frontEndPieceDetails || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.rearHousingLength || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.longForkLength || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.sfDetails || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.pdcLength || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.couplingFlangeOrientations || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.hexBoltNutTighteningTorque || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.loctiteGradeUse || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.cbKitDetails || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.slipDetails || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.greaseableOrNonGreaseable || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.mountingDetailsFlangeYoke || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.mountingDetailsCouplingFlange || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.iaBellowDetails || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.totalLength || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.balancingRpm || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.unbalanceInCmg || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.unbalanceInGram || "-"}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.unbalanceInGram75Percent || "-"}</TableCell>

                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.trsoDate}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.trsoModel}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.trsoRev}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.iqaDate}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.iqaModel}</TableCell>
                                            <TableCell className="text-sm font-mono whitespace-nowrap">{product.iqaVcNumber}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.ppapIntimateDate}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{product.ppapClosingDate}</TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">{product.ppapStatus}</TableCell>
                                            <TableCell className="whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[10px] ${statusStyles[product.status] || "bg-gray-50 text-gray-700 border-gray-200"}`}>
                                                    {product.status || "Pending"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6 text-right sticky right-0 bg-background/95 backdrop-blur z-10 group-hover:bg-muted/20 transition-colors">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity" />}>
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-36">
                                                        <DropdownMenuItem className="text-xs p-0 cursor-pointer">
                                                            <Link href={`/product-master/edit/${product.id}`} className="flex items-center w-full px-2 py-1.5">
                                                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                                                            </Link>
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
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                            <p className="text-xs text-muted-foreground">Showing 1–8 of 2,847 products</p>
                            <div className="flex items-center gap-1">
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <Button variant="default" size="icon" className="h-8 w-8 text-xs">1</Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-xs">2</Button>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-xs">3</Button>
                                <Button variant="outline" size="icon" className="h-8 w-8">
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
