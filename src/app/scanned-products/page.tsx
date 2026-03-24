"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Package,
    CheckCircle2,
    XCircle,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";




export default function ScannedProductsPage() {
    const { scannedProducts, scanStats, meta, loading, fetchScannedProducts, fetchScanStats } = useScannedProducts();
    const [dateFilter, setDateFilter] = useState("default"); // "default", "all", "today", "this_month", "custom"
    const [customDate, setCustomDate] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const initialMount = useRef(true);
    
    // Trigger data fetch on filter change
    useEffect(() => {
        if (initialMount.current) {
            initialMount.current = false;
            return;
        }

        const options: any = { page: currentPage };
        
        if (searchQuery) options.part_no = searchQuery;
        
        if (dateFilter === "today") options.today = true;
        else if (dateFilter === "this_month") options.this_month = true;
        else if (dateFilter === "custom" && customDate) options.dispatch_date = customDate;
        else if (dateFilter === "default") {
            // Re-fetch default if manually set back
            options.today = true;
        }
        
        fetchScannedProducts(options);
        
        // Stats
        if (dateFilter === "default") {
            fetchScanStats({ this_month: true });
        } else {
            fetchScanStats({ today: options.today, this_month: options.this_month, dispatch_date: options.dispatch_date });
        }
    }, [dateFilter, customDate, currentPage, searchQuery, fetchScannedProducts, fetchScanStats]);

    const totalPages = Math.ceil((meta?.total || 0) / (meta?.limit || 20)) || 1;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Header & Date Filter */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Scanned Products Dashboard</h1>
                        <p className="text-sm text-muted-foreground mt-1">Monitor scanned products and validation metrics</p>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-card p-1.5 rounded-lg border shadow-sm">
                        <Calendar className="w-4 h-4 text-muted-foreground ml-2" />
                        <select 
                            className="h-8 px-2 bg-transparent text-sm border-0 focus:ring-0 cursor-pointer outline-none"
                            value={dateFilter}
                            onChange={(e) => {
                                setDateFilter(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            <option value="default">Default (List: Today, Stats: Month)</option>
                            <option value="all">All Scans</option>
                            <option value="today">Today Only</option>
                            <option value="this_month">This Month</option>
                            <option value="custom">Specific Date</option>
                        </select>
                        {dateFilter === "custom" && (
                            <input 
                                type="date" 
                                className="h-8 px-2 border rounded text-sm"
                                value={customDate}
                                onChange={(e) => setCustomDate(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-0 shadow-sm relative overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Products Scanned</p>
                                <p className="text-3xl font-bold">{loading ? "..." : scanStats?.total || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                <Package className="w-6 h-6 text-blue-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm relative overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-emerald-600/80 uppercase tracking-wider">Total PDI (Passed)</p>
                                <p className="text-3xl font-bold text-emerald-600">{loading ? "..." : scanStats?.pass || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-sm relative overflow-hidden">
                        <CardContent className="p-5 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-sm font-medium text-red-600/80 uppercase tracking-wider">Rejected</p>
                                <p className="text-3xl font-bold text-red-600">{loading ? "..." : scanStats?.rejected || 0}</p>
                            </div>
                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="border-0 shadow-sm">
                    <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by part number..."
                                className="pl-9 h-9 bg-muted/30 border-transparent focus:border-primary/30 text-sm"
                                value={searchQuery}
                                onChange={(e) => {
                                    setSearchQuery(e.target.value);
                                    if(e.target.value === "") setCurrentPage(1);
                                }}
                                onKeyDown={(e) => {
                                    if(e.key === "Enter") setCurrentPage(1);
                                }}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
                            <Filter className="w-3.5 h-3.5" />
                            More Filters
                        </Button>
                    </CardContent>
                </Card>

                {/* Table */}
                <Card className="border-0 shadow-sm overflow-hidden">
                    <CardHeader className="pb-0 px-6 pt-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold">
                                {dateFilter === "today" ? "Today's Scans" : 
                                 dateFilter === "this_month" ? "This Month's Scans" : 
                                 dateFilter === "default" ? "Today's Scans Overview" :
                                 "Scanned Records"}
                            </CardTitle>
                            <span className="text-xs text-muted-foreground">Total: {meta?.total || 0} records</span>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pl-6 whitespace-nowrap">Sr no.</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Dispatch On</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Customer Name</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Vendor Code</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Plant Code</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Part No.</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Plant Location</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Part SL No.</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Scanned Text</TableHead>
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Remarks</TableHead>
                                        {/* <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 whitespace-nowrap">Created On</TableHead> */}
                                        <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground h-10 pr-6 whitespace-nowrap">Created By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                                Loading scans...
                                            </TableCell>
                                        </TableRow>
                                    ) : scannedProducts.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                                                No scanned products found for the selected date.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        scannedProducts.map((scan) => (
                                            <TableRow key={scan.id} className="hover:bg-muted/20 transition-colors">
                                                <TableCell className="pl-6 font-mono text-xs">{scan.sl_no || scan.id || "-"}</TableCell>

                                                {/* Dispatch On — show only the date part from the IST string stored in DB.
                                                    We slice "YYYY-MM-DD" directly instead of using new Date() to avoid
                                                    any UTC↔local timezone shift on the browser side. */}
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {scan.dispatch_date
                                                        ? String(scan.dispatch_date).slice(0, 10)
                                                        : "-"}
                                                </TableCell>

                                                <TableCell className="text-xs font-medium whitespace-nowrap">{scan.customer_name || "-"}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">{scan.vendorCode || "-"}</TableCell>
                                                <TableCell className="text-xs whitespace-nowrap">25100</TableCell>
                                                <TableCell className="text-xs font-medium whitespace-nowrap">{scan.part_no || "-"}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{scan.plant_location || "-"}</TableCell>
                                                <TableCell className="text-xs font-mono whitespace-nowrap">{scan.part_sl_no || "-"}</TableCell>
                                                <TableCell className="text-xs font-mono max-w-[270px] truncate" title={scan.scanned_text}>
                                                    {scan.scanned_text || "-"}
                                                </TableCell>
                                                <TableCell className="text-xs max-w-[270px] truncate" title={scan.remarks}>
                                                    {scan.remarks || "-"}
                                                </TableCell>

                                                {/* Created On — created_at is UTC from DB.
                                                    Always render in IST by pinning timeZone to "Asia/Kolkata". */}
                                                {/* <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {scan.created_at
                                                        ? new Date(scan.created_at).toLocaleString("en-IN", {
                                                            day: "2-digit",
                                                            month: "short",
                                                            year: "numeric",
                                                            hour: "2-digit",
                                                            minute: "2-digit",
                                                            hour12: true,
                                                            timeZone: "Asia/Kolkata",
                                                          })
                                                        : "-"}
                                                </TableCell> */}

                                                <TableCell className="pr-6 text-xs whitespace-nowrap">{scan.created_by || "System"}</TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {meta && scannedProducts.length > 0 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
                                <p className="text-xs text-muted-foreground">
                                    Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total} records
                                </p>
                                <div className="flex items-center gap-1">
                                    <Button 
                                        variant="outline" 
                                        size="icon" 
                                        className="h-8 w-8" 
                                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                        disabled={currentPage === 1 || loading}
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
                                                disabled={loading}
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
                                        disabled={currentPage === totalPages || loading}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}