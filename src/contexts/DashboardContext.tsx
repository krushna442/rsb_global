"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import { ProductCounts, ApiResponse } from "@/types/api";

interface DashboardContextType {
  counts: ProductCounts | null;
  loading: boolean;
  error: string | null;
  fetchCounts: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [counts, setCounts] = useState<ProductCounts | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCounts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<ProductCounts>>("/products/counts");
      if (response.data.success && response.data.data) {
        setCounts(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch dashboard counts");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching dashboard counts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  return (
    <DashboardContext.Provider value={{ counts, loading, error, fetchCounts }}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error("useDashboard must be used within a DashboardProvider");
  }
  return context;
}
