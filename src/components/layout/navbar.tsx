"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Bell,
    Download,
    Globe,
    ChevronDown,
    User,
    Settings,
    LogOut,
} from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { useState } from "react";
import Link from "next/link";

export function Navbar() {
    const [language, setLanguage] = useState<"en" | "hi">("en");

    return (
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left */}
            <div className="flex items-center gap-3">
                <MobileSidebar />
                <div className="relative hidden sm:block">
                <Link   href="/product-specifications">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search products, parts, documents..."
                        className="w-[280px] lg:w-[360px] pl-9 h-9 bg-muted/50 border-transparent focus:border-primary/30 text-sm transition-all"
                    />
                </Link>
                </div>
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">
                {/* Search (mobile) */}
                <Button variant="ghost" size="icon" className="sm:hidden h-9 w-9">
                    <Search className="w-4 h-4" />
                </Button>

                {/* Export */}
                <Button variant="ghost" size="sm" className="hidden md:flex gap-1.5 h-9 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <Download className="w-3.5 h-3.5" />
                    Export
                </Button>

                {/* Language */}
                <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground" />}>
                        <Globe className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{language === "en" ? "EN" : "HI"}</span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => setLanguage("en")} className="text-xs">
                            🇺🇸 English
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setLanguage("hi")} className="text-xs">
                            🇮🇳 Hindi
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                {/* Notifications */}
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <Badge className="absolute -top-0.5 -right-0.5 h-4 w-4 p-0 flex items-center justify-center text-[9px] bg-red-500 text-white border-2 border-card">
                        3
                    </Badge>
                </Button>

                {/* User */}
                <DropdownMenu>
                    <DropdownMenuTrigger render={<button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg hover:bg-accent transition-colors" />}>
                        <Avatar className="w-7 h-7">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold">
                                AK
                            </AvatarFallback>
                        </Avatar>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-xs font-semibold leading-tight">Anil Kumar</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">Super Admin</span>
                        </div>
                        <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem className="text-xs gap-2">
                            <User className="w-3.5 h-3.5" /> Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-xs gap-2">
                            <Settings className="w-3.5 h-3.5" /> Settings
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-xs gap-2 text-red-500 focus:text-red-500">
                            <LogOut className="w-3.5 h-3.5" /> Logout
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
