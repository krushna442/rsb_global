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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    LogOutIcon,
} from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { useState } from "react";
import Link from "next/link";

import { useUser } from "@/contexts/UserContext";

export function Navbar() {
    const [language, setLanguage] = useState<"en" | "hi">("en");
    const { user, logout } = useUser();

    return (
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
            {/* Left */}
            <div className="flex items-center gap-3">
                <MobileSidebar />
            </div>

            {/* Right */}
            <div className="flex items-center gap-2">



                {/* Language */}
                <DropdownMenu>
                    <DropdownMenuTrigger render={
                         <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">
                            <Globe className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">{language === "en" ? "EN" : "HI"}</span>
                        </Button>
                    }>
                        
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => setLanguage("en")} className="text-xs">
                            🇺🇸 English
                        </DropdownMenuItem>

                    </DropdownMenuContent>
                </DropdownMenu>


                {/* User Info */}
                {user && (
                    <div className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-lg border border-transparent transition-colors">
                        <Avatar className="w-7 h-7">
                            {user.profile_image ? (
                                <AvatarImage src={`${process.env.NEXT_PUBLIC_URL}/${user.profile_image}`} alt={user.name} />
                            ) : (
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-xs font-semibold">
                                    {user.name ? user.name.charAt(0).toUpperCase() : "U"}
                                </AvatarFallback>
                            )}
                        </Avatar>
                        <div className="hidden md:flex flex-col items-start mr-8">
                            <span className="text-xs font-semibold leading-tight">{user.name}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight capitalize">{user.role}</span>
                        </div>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={logout}>
                            <LogOutIcon className="w-4 h-4 text-muted-foreground" />
                        </Button>
                    </div>
                )}
            </div>
        </header>
    );
}
