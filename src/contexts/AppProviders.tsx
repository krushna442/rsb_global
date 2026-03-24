"use client";

import React, { ReactNode } from "react";
import { DynamicFieldsProvider } from "@/contexts/DynamicFieldsContext";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { ScannedProductsProvider } from "@/contexts/ScannedProductsContext";
import { DashboardProvider } from "@/contexts/DashboardContext";
import { GlobalLoader } from "@/components/ui/GlobalLoader";

export function AppProviders({ children }: { children: ReactNode }) {
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
