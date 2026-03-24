"use client";

import React, { createContext, useContext, useState,useEffect, ReactNode, useCallback } from "react";
import api from "@/lib/api";
import { Product, ApiResponse, ProductCounts, DropdownOptions } from "@/types/api";
import { toast } from "sonner";

interface FetchProductsOptions {
  status?: string;
  approved?: string;
  quality_verified?: string;
  customer?: string;
  search?: string;
}

interface ProductsContextType {
  products: Product[];
  counts: ProductCounts | null;
  dropdownOptions: DropdownOptions | null;
  loading: boolean;
  error: string | null;
  fetchProducts: (options?: FetchProductsOptions) => Promise<void>;
  fetchDropdownOptions: () => Promise<void>;
  getProductByPart: (partNumber: string) => Promise<Product | null>;
  createProduct: (payload: any) => Promise<boolean>;
  updateProduct: (id: number, payload: any) => Promise<boolean>;
  updateApproval: (id: number, status: 'approved' | 'rejected' | 'pending') => Promise<boolean>;
  updateQuality: (id: number, status: 'approved' | 'rejected' | 'pending') => Promise<boolean>;
  importProducts: (rows: any[]) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
  uploadPpapDocument: (id: number, name: string, file: File) => Promise<boolean>;
  deletePpapDocument: (id: number, fileName: string) => Promise<boolean>;
}

const ProductsContext = createContext<ProductsContextType | undefined>(undefined);

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [counts, setCounts] = useState<ProductCounts | null>(null);
  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = useCallback(async (options?: FetchProductsOptions) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (options?.status) params.append("status", options.status);
      if (options?.approved) params.append("approved", options.approved);
      if (options?.quality_verified) params.append("quality_verified", options.quality_verified);
      if (options?.customer) params.append("customer", options.customer);
      if (options?.search) params.append("search", options.search);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<ApiResponse<Product[]>>(`/products${qs}`);
      
      if (response.data.success && response.data.data) {
        setProducts(response.data.data);
        setError(null);
      } else {
        setError(response.data.message || "Failed to fetch products");
      }
      
      try {
        const countsRes = await api.get<ApiResponse<ProductCounts>>("/products/counts");
        if (countsRes.data.success && countsRes.data.data) {
          setCounts(countsRes.data.data);
        }
      } catch (e) {
        console.error("Failed to fetch product counts", e);
      }
    } catch (err: any) {
      setError(err.message || "Network error fetching products");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDropdownOptions = useCallback(async () => {
    try {
      const response = await api.get<ApiResponse<DropdownOptions>>("/products/dropdown/options");
      if (response.data.success && response.data.data) {
        setDropdownOptions(response.data.data);
      }
    } catch (err: any) {
      console.error("Failed to fetch dropdown options", err);
    }
  }, []);

  const getProductByPart = async (partNumber: string): Promise<Product | null> => {
    try {
      const response = await api.get<ApiResponse<Product>>(`/products/by-part/${partNumber}`);
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return null;
    } catch (err: any) {
      console.error(err);
      return null;
    }
  };

  const createProduct = async (payload: any) => {
    try {
      const response = await api.post<ApiResponse<Product>>("/products", payload);
      if (response.data.success) {
        toast.success("Product created successfully");
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to create product");
        return false;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error creating product");
      return false;
    }
  };

  const updateProduct = async (id: number, payload: any) => {
    try {
      const response = await api.put<ApiResponse<Product>>(`/products/${id}`, payload);
      if (response.data.success) {
        toast.success("Product updated successfully");
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to update product");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating product");
      return false;
    }
  };

  const updateApproval = async (id: number, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const response = await api.put<ApiResponse<Product>>(`/products/${id}/approval`, { status });
      if (response.data.success) {
        toast.success(`Approval status updated to ${status}`);
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to update approval");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating approval");
      return false;
    }
  };

  const updateQuality = async (id: number, status: 'approved' | 'rejected' | 'pending') => {
    try {
      const response = await api.put<ApiResponse<Product>>(`/products/${id}/quality`, { status });
      if (response.data.success) {
        toast.success(`Quality status updated to ${status}`);
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to update quality");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error updating quality");
      return false;
    }
  };

  const importProducts = async (rows: any[]) => {
    try {
      const response = await api.post<ApiResponse<{ inserted: number; skipped: number }>>("/products/import", { rows });
      if (response.data.success) {
        toast.success(`Imported ${response.data.data?.inserted} products, skipped ${response.data.data?.skipped}`);
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to import products");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error importing products");
      return false;
    }
  };

  const deleteProduct = async (id: number) => {
    try {
      const response = await api.delete<ApiResponse<null>>(`/products/${id}`);
      if (response.data.success) {
        toast.success("Product deleted successfully");
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to delete product");
        return false;
      }
    } catch (err: any) {
      toast.error(err.message || "Error deleting product");
      return false;
    }
  };

  const uploadPpapDocument = async (id: number, name: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("file", file);

      const response = await api.put<ApiResponse<Product>>(`/products/${id}/ppap`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        toast.success("Document uploaded successfully");
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to upload document");
        return false;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error uploading document");
      return false;
    }
  };

  const deletePpapDocument = async (id: number, fileName: string) => {
    try {
      const response = await api.delete<ApiResponse<Product>>(`/products/${id}/ppap/${encodeURIComponent(fileName)}`);
      
      if (response.data.success) {
        toast.success("Document deleted successfully");
        await fetchProducts();
        return true;
      } else {
        toast.error(response.data.message || "Failed to delete document");
        return false;
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Error deleting document");
      return false;
    }
  };


  useEffect(() => {
    fetchProducts();
    fetchDropdownOptions();
  }, [fetchProducts, fetchDropdownOptions]);

  return (
    <ProductsContext.Provider
      value={{
        products,
        counts,
        dropdownOptions,
        loading,
        error,
        fetchProducts,
        fetchDropdownOptions,
        getProductByPart,
        createProduct,
        updateProduct,
        updateApproval,
        updateQuality,
        importProducts,
        deleteProduct,
        uploadPpapDocument,
        deletePpapDocument,
      }}
    >
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductsContext);
  if (context === undefined) {
    throw new Error("useProducts must be used within a ProductsProvider");
  }
  return context;
}
