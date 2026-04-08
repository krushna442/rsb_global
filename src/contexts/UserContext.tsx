"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User, ApiResponse } from "@/types/api";
import api from "@/lib/api";
import { toast } from "sonner";

interface UserContextType {
  user: User | null;
  allUsers: User[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (userid: string, password: string) => Promise<boolean>;
  register: (userData: any) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  fetchAllUsers: () => Promise<void>;
  updateProfile: (id: number, data: Partial<User>) => Promise<boolean>;
  uploadProfileImage: (file: File) => Promise<boolean>;
  deactivateUser: (id: number) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login", "/register"];

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  const isAuthenticated = !!user;

  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      
      const res = await api.get<ApiResponse<User>>("/users/me");
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
      }
    } catch (err: any) {
      setUser(null);
      // We don't want to show a hard error overlay on mount if it's just a 401 unauthenticated or backend error
      if (err.response?.status !== 401 && err.response?.status !== 404) {
        // Just log a warning so Next.js dev overlay doesn't interrupt the user
        console.warn("Auth check failed or backend unavailable:", err.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllUsers = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<User[]>>("/users");
      if (res.data.success && res.data.data) {
        setAllUsers(res.data.data);
      }
    } catch (err) {
      console.warn("Failed to fetch all users:", err);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Fetch all users once authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllUsers();
    }
  }, [isAuthenticated, fetchAllUsers]);

  // Route protection effect
  useEffect(() => {
    if (!loading) {
      const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
      if (!isAuthenticated && !isPublicRoute) {
        router.push("/login");
      } else if (isAuthenticated && isPublicRoute) {
        router.push("/");
      }
    }
  }, [loading, isAuthenticated, pathname, router]);

  const login = async (userid: string, password: string): Promise<boolean> => {
    try {
      const res = await api.post<ApiResponse<User>>("/users/login", { userid, password });
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
        toast.success(res.data.message || "Logged in successfully");
        router.push("/");
        return true;
      }
      toast.error(res.data.message || "Login failed");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred during login");
      return false;
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      const res = await api.post<ApiResponse<User>>("/users/register", userData);
      if (res.data.success) {
        toast.success("Account created successfully. You can now login.");
        router.push("/login");
        return true;
      }
      toast.error(res.data.message || "Registration failed");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred during registration");
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post<ApiResponse<null>>("/users/logout");
      setUser(null);
      setAllUsers([]);
      toast.success("Logged out successfully");
      router.push("/login");
    } catch (err: any) {
      toast.error("Failed to logout");
    }
  };

  const updateProfile = async (id: number, data: Partial<User>): Promise<boolean> => {
    try {
      const res = await api.put<ApiResponse<User>>(`/users/${id}`, data);
      if (res.data.success) {
        toast.success("Profile updated successfully");
        if (user && user.id === id && res.data.data) {
          setUser(res.data.data);
        } else {
          checkAuth();
        }
        fetchAllUsers();
        return true;
      }
      toast.error(res.data.message || "Failed to update profile");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred updating profile");
      return false;
    }
  };

  const uploadProfileImage = async (file: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append("profile_image", file);

      const res = await api.post<ApiResponse<User>>("/users/upload-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        toast.success("Profile picture updated!");
        if (res.data.data) {
          setUser(res.data.data);
        } else {
          checkAuth(); // Refetch if backend doesn't return full user
        }
        fetchAllUsers();
        return true;
      }
      toast.error(res.data.message || "Failed to upload image");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred uploading image");
      return false;
    }
  };

  const deactivateUser = async (id: number): Promise<boolean> => {
    try {
      const res = await api.put<ApiResponse<User>>(`/users/deactivate/${id}`);
      if (res.data.success) {
        toast.success("User deactivated successfully");
        fetchAllUsers();
        return true;
      }
      toast.error(res.data.message || "Failed to deactivate user");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred");
      return false;
    }
  };

  const deleteUser = async (id: number): Promise<boolean> => {
    try {
      const res = await api.delete<ApiResponse<null>>(`/users/${id}`);
      if (res.data.success) {
        toast.success("User deleted successfully");
        fetchAllUsers();
        return true;
      }
      toast.error(res.data.message || "Failed to delete user");
      return false;
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "An error occurred");
      return false;
    }
  };

  return (
    <UserContext.Provider value={{ 
      user, allUsers, isAuthenticated, loading, 
      login, register, logout, checkAuth, 
      fetchAllUsers, updateProfile, uploadProfileImage,
      deactivateUser, deleteUser
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
