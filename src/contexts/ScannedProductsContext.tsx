"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import { ScannedProduct, DailyScanSummary, ApiResponse } from "@/types/api";
import { toast } from "sonner";

interface FetchScannedOptions {
  dispatch_date?: string;
  from_date?: string;
  to_date?: string;
  shift?: string;
  part_no?: string;
  customer_name?: string;
  validation_status?: string;
  is_rejected?: boolean;
  plant_location?: string;
  page?: number;
  limit?: number;
  this_month?: boolean;
  today?: boolean;
}

interface ScannedProductsContextType {
  scannedProducts: ScannedProduct[];
  dailySummary: ScannedProduct[];
  scanStats: { total: number; pass: number; rejected: number } | null;
  meta: ApiResponse<any>['meta'] | undefined;
  loading: boolean;
  error: string | null;
  fetchScannedProducts: (options?: FetchScannedOptions) => Promise<void>;
  fetchDailySummary: (date: string) => Promise<void>;
  fetchScanStats: (options?: FetchScannedOptions) => Promise<void>;
  getScanById: (id: number) => Promise<ScannedProduct | null>;
  recordScan: (payload: any) => Promise<ScannedProduct | null>;
  updateRemarks: (id: number, remarks: string) => Promise<boolean>;
  toggleReject: (id: number, is_rejected: boolean) => Promise<boolean>;
}

const ScannedProductsContext = createContext<ScannedProductsContextType | undefined>(undefined);

export function ScannedProductsProvider({ children }: { children: ReactNode }) {
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [dailySummary, setDailySummary] = useState<ScannedProduct[]>([]);
  const [scanStats, setScanStats] = useState<{ total: number; pass: number; rejected: number } | null>(null);
  const [meta, setMeta] = useState<ApiResponse<any>['meta'] | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [todayScannedProducts, setTodayScannedProducts] = useState<ScannedProduct[]>([]);

  const fetchScannedProducts = useCallback(async (options?: FetchScannedOptions) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options?.dispatch_date) params.append("dispatch_date", options.dispatch_date);
      if (options?.from_date) params.append("from_date", options.from_date);
      if (options?.to_date) params.append("to_date", options.to_date);
      if (options?.shift) params.append("shift", options.shift);
      if (options?.part_no) params.append("part_no", options.part_no);
      if (options?.customer_name) params.append("customer_name", options.customer_name);
      if (options?.validation_status) params.append("validation_status", options.validation_status);
      if (options?.is_rejected !== undefined) params.append("is_rejected", String(options.is_rejected));
      if (options?.plant_location) params.append("plant_location", options.plant_location);
      if (options?.page) params.append("page", String(options.page));
      if (options?.limit) params.append("limit", String(options.limit));
      if (options?.this_month) params.append("this_month", "true");
      if (options?.today) params.append("today", "true");

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<ApiResponse<ScannedProduct[]>>(`/scanned-products${qs}`);
      
      if (response.data.success && response.data.data) {
        setScannedProducts(response.data.data);
        setMeta(response.data.meta);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch scanned products");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching scanned products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDailySummary = async (date: string) => {
    try {
      const response = await api.get<ApiResponse<ScannedProduct[]>>(`/scanned-products?dispatch_date=${date}&limit=9999`);
      if (response.data.success && response.data.data) {
        setDailySummary(response.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch daily summary", err);
    }
  };

  const fetchScanStats = useCallback(async (options?: FetchScannedOptions) => {
    try {
      const params = new URLSearchParams();
      if (options?.dispatch_date) params.append("dispatch_date", options.dispatch_date);
      if (options?.from_date) params.append("from_date", options.from_date);
      if (options?.to_date) params.append("to_date", options.to_date);
      if (options?.this_month) params.append("this_month", "true");
      if (options?.today) params.append("today", "true");

      const qs = params.toString() ? `?${params.toString()}` : '';
      const qsPass = params.toString() ? `?${params.toString()}&validation_status=pass` : '?validation_status=pass';
      const qsFail = params.toString() ? `?${params.toString()}&is_rejected=true` : '?is_rejected=true';

      const [resTotal, resPass, resRejected] = await Promise.all([
        api.get<ApiResponse<ScannedProduct[]>>(`/scanned-products${qs}`),
        api.get<ApiResponse<ScannedProduct[]>>(`/scanned-products${qsPass}`),
        api.get<ApiResponse<ScannedProduct[]>>(`/scanned-products${qsFail}`),
      ]);

      setScanStats({
        total: resTotal.data.meta?.total || 0,
        pass: resPass.data.meta?.total || 0,
        rejected: resRejected.data.meta?.total || 0,
      });
    } catch (err) {
      console.error("Failed to fetch scan stats", err);
      setScanStats({ total: 0, pass: 0, rejected: 0 });
    }
  }, []);

  const getScanById = async (id: number): Promise<ScannedProduct | null> => {
    try {
      const response = await api.get<ApiResponse<ScannedProduct>>(`/scanned-products/${id}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const recordScan = async (payload: any): Promise<ScannedProduct | null> => {
    try {
      const response = await api.post<ApiResponse<ScannedProduct>>("/scanned-products/scan", payload);
      if (response.data.success && response.data.data) {
        const scanResult = response.data.data;
        if (scanResult.validation_status === 'pass') {
          toast.success("Scan recorded successfully - PASS");
        } else {
          toast.error(`Scan FAILED: ${scanResult.remarks}`);
        }
        
        // Refresh both lists to ensure consistency
        const today = new Date().toISOString().split("T")[0];
        await Promise.all([
            fetchScannedProducts(),
            fetchDailySummary(today)
        ]);

        return scanResult;
      } else {
        toast.error(response.data.message || "Failed to record scan");
        return null;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error recording scan");
      return null;
    }
  };

  const updateRemarks = async (id: number, remarks: string) => {
    try {
      const response = await api.patch<ApiResponse<ScannedProduct>>(`/scanned-products/${id}/remarks`, { remarks });
      if (response.data.success) {
        toast.success("Remarks updated successfully");
        await fetchScannedProducts(); 
        return true;
      } else {
        toast.error(response.data.message || "Failed to update remarks");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating remarks");
      return false;
    }
  };

  const toggleReject = async (id: number, is_rejected: boolean) => {
    try {
      const response = await api.patch<ApiResponse<ScannedProduct>>(`/scanned-products/${id}/reject`, { is_rejected });
      if (response.data.success) {
        toast.success(`Scan marked as ${is_rejected ? 'rejected' : 'un-rejected'}`);
        const today = new Date().toISOString().split("T")[0];
        await Promise.all([
            fetchScannedProducts(),
            fetchDailySummary(today)
        ]);
        return true;
      } else {
        toast.error(response.data.message || "Failed to update rejection status");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating rejection status");
      return false;
    }
  };

useEffect(() => {
  fetchScannedProducts({ this_month: true, limit: 9999 });
  fetchScanStats({ this_month: true });
}, [fetchScannedProducts, fetchScanStats]);

  return (
    <ScannedProductsContext.Provider
      value={{
        scannedProducts,
        dailySummary,
        scanStats,
        meta,
        loading,
        error,
        fetchScannedProducts,
        fetchDailySummary,
        fetchScanStats,
        getScanById,
        recordScan,
        updateRemarks,
        toggleReject,
      }}
    >
      {children}
    </ScannedProductsContext.Provider>
  );
}

export function useScannedProducts() {
  const context = useContext(ScannedProductsContext);
  if (context === undefined) {
    throw new Error("useScannedProducts must be used within a ScannedProductsProvider");
  }
  return context;
}
