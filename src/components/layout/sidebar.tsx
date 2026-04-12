"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Package,
    CheckCircle2,
    ClipboardCheck,
    ShieldCheck,
    FileText,
    ListChecks,
    Users,
    Settings,
    LogOut,
    Factory,
    ChevronLeft,
    ChevronRight,
    Sliders,
    BarChart3,
    Notebook
} from "lucide-react";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { hasAccess } from "@/lib/rbac";

const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Product Master", icon: Package, href: "/product-master" },
    { label: "Production Approval", icon: CheckCircle2, href: "/approvals" },
    { label: "Product Scanning", icon: ClipboardCheck, href: "/production-verification" },
    { label: "Quality Approval", icon: ShieldCheck, href: "/quality-verification" },
    { label: "Documents", icon: FileText, href: "/documents" },
    { label: "Control Plan", icon: ListChecks, href: "/control-plan" },
    { label: "Product Specifications", icon: ClipboardCheck, href: "/product-specifications" },
    { label: "Dynamic Fields", icon: Sliders, href: "/dynamic-fields" },
    { label: "Scanned Products", icon: BarChart3, href: "/scanned-products" },
    { label: "PDI Report", icon: Notebook, href: "/pdi-partreport" },
    { label: "Users", icon: Users, href: "/users" },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export function Sidebar() {
    const pathname = usePathname();
    const [collapsed, setCollapsed] = useState(false);
    const { user, logout } = useUser();

    return (
        <aside
            className={cn(
                "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300 ease-in-out h-screen sticky top-0",
                collapsed ? "w-[72px]" : "w-[260px]"
            )}
        >
            {/* Brand */}
            <div className={cn(
                "flex items-center justify-center gap-3 px-5 h-16 border-b border-sidebar-border flex-shrink-0",
                collapsed && "justify-center px-0"
            )}>
<img src="/logo.png" className="w-[80%]"/>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    // Check if current user has access to this specific menu item
                    if (!hasAccess(user?.role, item.href)) {
                        return null;
                    }

                    const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 group relative",
                                isActive
                                    ? "bg-sidebar-accent text-white shadow-sm"
                                    : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/50",
                                collapsed && "justify-center px-0"
                            )}
                        >
                            {isActive && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
                            )}
                            <item.icon className={cn(
                                "flex-shrink-0 transition-colors duration-200",
                                isActive ? "text-blue-400" : "text-sidebar-foreground/50 group-hover:text-blue-400",
                                collapsed ? "w-5 h-5" : "w-4.5 h-4.5"
                            )} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Button */}
            <div className="px-3 pb-2">
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[13px] text-sidebar-foreground/50 hover:text-white hover:bg-sidebar-accent/50 transition-colors"
                >
                    {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    {!collapsed && <span>Collapse</span>}
                </button>
            </div>

            {/* Logout */}
            <div className="px-3 pb-4">
                <button
                    onClick={() => logout()}
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full",
                        collapsed && "justify-center px-0"
                    )}
                >
                    <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>
        </aside>
    );
}
