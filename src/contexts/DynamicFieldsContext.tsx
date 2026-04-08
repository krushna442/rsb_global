"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import api from "@/lib/api";
import { DynamicFieldsData, ApiResponse } from "@/types/api";
import { toast } from "sonner";

interface DynamicFieldsContextType {
  data: DynamicFieldsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateFields: (payload: any) => Promise<boolean>;
  addImportantFields: (names: string[]) => Promise<boolean>;
  removeImportantFields: (names: string[]) => Promise<boolean>;
  addDocuments: (docs: { name: string; category: "individual" | "ppap" }[]) => Promise<boolean>;
  removeDocuments: (docs: { name: string; category: "individual" | "ppap" }[]) => Promise<boolean>;
}

const DynamicFieldsContext = createContext<DynamicFieldsContextType | undefined>(undefined);

export function DynamicFieldsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DynamicFieldsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFields = async () => {
    try {
      setLoading(true);
      const response = await api.get<ApiResponse<DynamicFieldsData>>("/dynamic-fields");
      if (response.data.success && response.data.data) {
        setData(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch dynamic fields");
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching dynamic fields");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateFields = async (payload: any) => {
    try {
      const response = await api.put<ApiResponse<DynamicFieldsData>>("/dynamic-fields", payload);
      if (response.data.success) {
        await fetchFields();
        toast.success("Fields updated successfully");
        return true;
      } else {
        toast.error(response.data.message || "Failed to update fields");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating fields");
      return false;
    }
  };

  // ── important_fields ──────────────────────────────────────────────────────

  const addImportantFields = async (names: string[]) => {
    try {
      const response = await api.post<ApiResponse<DynamicFieldsData>>(
        "/dynamic-fields",
        { names }
      );
      if (response.data.success) {
        await fetchFields();
        toast.success("Important fields updated");
        return true;
      } else {
        toast.error(response.data.message || "Failed to add important fields");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding important fields");
      return false;
    }
  };

  const removeImportantFields = async (names: string[]) => {
    try {
      const response = await api.delete<ApiResponse<DynamicFieldsData>>(
        "/dynamic-fields/important-fields",
        { data: { names } }         // axios DELETE with body
      );
      if (response.data.success) {
        await fetchFields();
        toast.success("Important fields removed");
        return true;
      } else {
        toast.error(response.data.message || "Failed to remove important fields");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error removing important fields");
      return false;
    }
  };

  // ── documents ─────────────────────────────────────────────────────────────

  const addDocuments = async (docs: { name: string; category: "individual" | "ppap" }[]) => {
    try {
      const response = await api.post<ApiResponse<DynamicFieldsData>>(
        "/dynamic-fields/documents",
        { docs }
      );
      if (response.data.success) {
        await fetchFields();
        toast.success("Documents added");
        return true;
      } else {
        toast.error(response.data.message || "Failed to add documents");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error adding documents");
      return false;
    }
  };

  const removeDocuments = async (docs: { name: string; category: "individual" | "ppap" }[]) => {
    try {
      const response = await api.delete<ApiResponse<DynamicFieldsData>>(
        "/dynamic-fields/documents",
        { data: { docs } }
      );
      if (response.data.success) {
        await fetchFields();
        toast.success("Documents removed");
        return true;
      } else {
        toast.error(response.data.message || "Failed to remove documents");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error removing documents");
      return false;
    }
  };

  useEffect(() => {
    fetchFields();
  }, []);

  return (
    <DynamicFieldsContext.Provider
      value={{
        data,
        loading,
        error,
        refetch: fetchFields,
        updateFields,
        addImportantFields,
        removeImportantFields,
        addDocuments,
        removeDocuments,
      }}
    >
      {children}
    </DynamicFieldsContext.Provider>
  );
}

export function useDynamicFields() {
  const context = useContext(DynamicFieldsContext);
  if (context === undefined) {
    throw new Error("useDynamicFields must be used within a DynamicFieldsProvider");
  }
  return context;
}