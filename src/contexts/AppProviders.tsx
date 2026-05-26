"use client";

import React, { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { DynamicFieldsProvider } from "@/contexts/DynamicFieldsContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { ScannedProductsProvider } from "@/contexts/ScannedProductsContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { GlobalLoader } from "@/components/ui/GlobalLoader";
import { Loader2 } from "lucide-react";
import { connectSocket, disconnectSocket } from "@/lib/socket";
import { SessionTimeoutProvider } from "@/contexts/SessionTimeoutContext";

const PUBLIC_ROUTES = ["/login", "/register"];

/**
 * Manages the Socket.IO connection lifecycle tied to the user's auth state.
 * - Connects once when the user is authenticated.
 * - Disconnects (and destroys the singleton) on logout.
 * - This keeps a single persistent WebSocket open for the entire app session.
 */
function SocketLifecycle() {
  const { isAuthenticated } = useUser();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  return null; // purely side-effect component
}

function InnerProviders({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, isAuthenticated } = useUser();
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Still fetching auth state, wait briefly to avoid layout shift
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in and trying to view public page (Login/Register)
  if (!isAuthenticated && isPublicRoute) {
    return <>{children}</>;
  }

  // Prevent data providers from fetching if we're not authenticated
  // and we're on a PROTECTED route. We show the loader while UserContext redirects us.
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <DynamicFieldsProvider>
      <ProductsProvider>
        <ScannedProductsProvider>
          <DashboardProvider>
            <GlobalLoader />
            {children}
          </DashboardProvider>
        </ScannedProductsProvider>
      </ProductsProvider>
    </DynamicFieldsProvider>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <UserProvider>
      {/* SocketLifecycle lives inside UserProvider to access useUser() */}
      <SocketLifecycle />
      <SessionTimeoutProvider>
        <InnerProviders>{children}</InnerProviders>
      </SessionTimeoutProvider>
    </UserProvider>
  );
}
