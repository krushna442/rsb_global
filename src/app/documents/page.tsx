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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Upload,
    Download,
    Search,
    FileText,
    FileImage,
    FileSpreadsheet,
    Eye,
    Trash2,
    Plus,
    Filter,
} from "lucide-react";

const documents = [
    { id: 1, name: "DS-1045-A_Drawing_v2.pdf", type: "Drawing", partNumber: "DS-1045-A", uploadDate: "2026-03-10", uploadedBy: "Rajesh P.", size: "2.4 MB" },
    { id: 2, name: "TL-2089-C_IQA_Report.pdf", type: "IQA", partNumber: "TL-2089-C", uploadDate: "2026-03-09", uploadedBy: "Priya M.", size: "1.8 MB" },
    { id: 3, name: "CP-5067-D_PO_2026.pdf", type: "PO", partNumber: "CP-5067-D", uploadDate: "2026-03-08", uploadedBy: "Anil K.", size: "856 KB" },
    { id: 4, name: "FL-3021-B_TRSO_Approval.pdf", type: "TRSO", partNumber: "FL-3021-B", uploadDate: "2026-03-07", uploadedBy: "Suresh R.", size: "1.2 MB" },
    { id: 5, name: "SH-8034-F_Drawing_v1.dwg", type: "Drawing", partNumber: "SH-8034-F", uploadDate: "2026-03-06", uploadedBy: "Meena S.", size: "5.6 MB" },
    { id: 6, name: "BL-7012-E_IQA_Checklist.xlsx", type: "IQA", partNumber: "BL-7012-E", uploadDate: "2026-03-05", uploadedBy: "Rajesh P.", size: "340 KB" },
    { id: 7, name: "RP-9045-G_PO_March.pdf", type: "PO", partNumber: "RP-9045-G", uploadDate: "2026-03-04", uploadedBy: "Priya M.", size: "720 KB" },
    { id: 8, name: "KL-1078-H_TRSO_Rev2.pdf", type: "TRSO", partNumber: "KL-1078-H", uploadDate: "2026-03-03", uploadedBy: "Anil K.", size: "980 KB" },
];

const typeIcon: Record<string, React.ElementType> = {
    Drawing: FileImage,
    IQA: FileSpreadsheet,
    PO: FileText,
    TRSO: FileText,
};

const typeBadge: Record<string, string> = {
    Drawing: "bg-purple-50 text-purple-700 border-purple-200",
    IQA: "bg-teal-50 text-teal-700 border-teal-200",
    PO: "bg-blue-50 text-blue-700 border-blue-200",
    TRSO: "bg-orange-50 text-orange-700 border-orange-200",
};

export default function DocumentsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Document Management</h1>
                        <p className="text-sm text-muted-foreground mt-1">Upload and manage product documents</p>
                    </div>
                    <Button size="sm" className="h-9 gap-1.5 text-xs">
                        <Plus className="w-3.5 h-3.5" />
                        Upload Document
                    </Button>
                </div>

                {/* Upload Area */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-6">
                        <div className="border-2 border-dashed border-border rounded-xl p-10 text-center hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer group">
                            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/10 transition-colors">
                                <Upload className="w-7 h-7 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            <p className="text-sm font-semibold">Drop files here or click to upload</p>
                            <p className="text-xs text-muted-foreground mt-1">Support PDF, DOC, DWG, XLSX — Max 10MB per file</p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                {["Drawing", "IQA", "PO", "TRSO"].map((type) => (
                                    <Badge key={type} variant="outline" className={`text-[10px] ${typeBadge[type]}`}>
                                        {type}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filters */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search documents..."
                                    className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                                />
                            </div>
                            <Select>
                                <SelectTrigger className="w-[160px] h-9 text-sm">
                                    <SelectValue placeholder="Document Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="drawing">Drawing</SelectItem>
                                    <SelectItem value="iqa">IQA</SelectItem>
                                    <SelectItem value="po">PO</SelectItem>
                                    <SelectItem value="trso">TRSO</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5">
                                <Filter className="w-3.5 h-3.5" /> Filter
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Documents Table */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">All Documents</CardTitle>
                            <span className="text-xs text-muted-foreground">{documents.length} documents</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-6">Document Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Type</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Part Number</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Upload Date</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Uploaded By</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10">Size</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {documents.map((doc) => {
                                        const Icon = typeIcon[doc.type] || FileText;
                                        return (
                                            <TableRow key={doc.id} className="group hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                                                            <Icon className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                        <span className="text-sm font-medium truncate max-w-[200px]">{doc.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={`text-[10px] ${typeBadge[doc.type]}`}>
                                                        {doc.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-sm font-mono text-muted-foreground">{doc.partNumber}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">
                                                    {new Date(doc.uploadDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                                </TableCell>
                                                <TableCell className="text-sm">{doc.uploadedBy}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{doc.size}</TableCell>
                                                <TableCell className="pr-6">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <Download className="w-3.5 h-3.5" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
