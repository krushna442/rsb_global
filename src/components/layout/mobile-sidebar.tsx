"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
    Menu,
    Sliders,
} from "lucide-react";
import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { hasAccess } from "@/lib/rbac";

const menuItems = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/" },
    { label: "Product Master", icon: Package, href: "/product-master" },
    { label: "Production Approval", icon: CheckCircle2, href: "/approvals" },
    { label: "Production Verification", icon: ClipboardCheck, href: "/production-verification" },
    { label: "Quality Verification", icon: ShieldCheck, href: "/quality-verification" },
    { label: "Documents", icon: FileText, href: "/documents" },
    { label: "Control Plan", icon: ListChecks, href: "/control-plan" },
    { label: "Product Specifications", icon: ClipboardCheck, href: "/product-specifications" },
    { label: "Dynamic Fields", icon: Sliders, href: "/dynamic-fields" },
    { label: "Users", icon: Users, href: "/users" },
    { label: "Settings", icon: Settings, href: "/settings" },
];

export function MobileSidebar() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);
    const { user, logout } = useUser();

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger render={<button className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors" />}>
                <Menu className="w-5 h-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
                {/* Brand */}
                <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <Factory className="w-4.5 h-4.5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight text-white">RSB Global</span>
                        <img src="/logo.png" alt="Logo" className="w-10 h-10" />
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 space-y-1">
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
                                onClick={() => setOpen(false)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 relative",
                                    isActive
                                        ? "bg-sidebar-accent text-white"
                                        : "text-sidebar-foreground/70 hover:text-white hover:bg-sidebar-accent/50"
                                )}
                            >
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-blue-400 rounded-r-full" />
                                )}
                                <item.icon className={cn(
                                    "w-4.5 h-4.5 flex-shrink-0",
                                    isActive ? "text-blue-400" : "text-sidebar-foreground/50"
                                )} />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                {/* Logout */}
                <div className="px-3 pb-4 mt-auto">
                    <button
                        onClick={() => logout()}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 w-full"
                    >
                        <LogOut className="w-4.5 h-4.5" />
                        <span>Logout</span>
                    </button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
