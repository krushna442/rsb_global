"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useDynamicFields } from "@/contexts/DynamicFieldsContext";
import { useProducts } from "@/contexts/ProductsContext";
import { useScannedProducts } from "@/contexts/ScannedProductsContext";
import { useDashboard } from "@/contexts/DashboardContext";

export function GlobalLoader() {
  const { loading: fieldsLoading } = useDynamicFields();
  const { loading: productsLoading } = useProducts();
  const { loading: scannedLoading } = useScannedProducts();
  const { loading: dashboardLoading } = useDashboard();
  
  const [show, setShow] = useState(true);

  // We wait for all critical contexts to finish initial loading.
  const isGlobalLoading = fieldsLoading || productsLoading || scannedLoading || dashboardLoading;

  useEffect(() => {
    if (!isGlobalLoading) {
      // Add a slight delay before hiding for smoother transition
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    } else {
      setShow(true);
    }
  }, [isGlobalLoading]);

  if (!show) return null;

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md transition-opacity duration-300 ${isGlobalLoading ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative flex flex-col items-center p-8 rounded-2xl bg-card shadow-xl border border-border">
        {/* Animated rings */}
        <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-primary animate-[spin_3s_linear_infinite]" />
        <div className="absolute inset-2 rounded-xl border-2 border-transparent border-b-muted-foreground animate-[spin_2s_linear_infinite_reverse]" />
        
        <Loader2 className="h-12 w-12 text-primary animate-spin mb-4 relative z-10" />
        
        <div className="space-y-2 text-center relative z-10">
          <h3 className="text-xl font-semibold tracking-tight">RSB global</h3>
          <p className="text-sm text-muted-foreground animate-pulse">
            Initializing workspace environment...
          </p>
        </div>
      </div>
    </div>
  );
}
