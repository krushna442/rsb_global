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
        await fetchFields(); // Refetch to ensure we have the latest
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

  useEffect(() => {
    fetchFields();
  }, []);

  return (
    <DynamicFieldsContext.Provider value={{ data, loading, error, refetch: fetchFields, updateFields }}>
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
