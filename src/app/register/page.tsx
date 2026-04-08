"use client";

import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const { register } = useUser();
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.email || !formData.password) return;
    
    setIsSubmitting(true);
    await register({
      ...formData,
      role: 'viewer' // Send default role, backend enforces this anyway
    });
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <span className="text-white font-bold text-xl">R</span>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Create an account</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your details to register for the RSB Global Dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                type="text" 
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input 
                id="username" 
                type="text" 
                placeholder="johndoe123"
                value={formData.username}
                onChange={handleChange}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="john.doe@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input 
                id="password" 
                type="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 mt-2">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" 
              disabled={isSubmitting || !formData.name || !formData.username || !formData.email || !formData.password}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Register"
              )}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
