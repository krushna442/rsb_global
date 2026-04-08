"use client";

import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";
import { useUser } from "@/contexts/UserContext";
import { hasAccess } from "@/lib/rbac";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!loading && user) {
            if (!hasAccess(user.role, pathname)) {
                // If an unauthorized user tries to access a restricted path, push them back to dashboard
                router.push("/");
            }
        }
    }, [user, pathname, loading, router]);

    // Show nothing while verifying to prevent layout shifting/flashing of unauthorized content
    if (!loading && user && !hasAccess(user.role, pathname)) {
        return null;
    }

    return (
        <div className="flex min-h-screen bg-background">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0">
                <Navbar />
                <main className="flex-1 p-4 lg:p-6 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
