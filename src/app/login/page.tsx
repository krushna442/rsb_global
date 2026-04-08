"use client";

import { useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useUser();
  const [userid, setUserid] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userid || !password) return;
    
    setIsSubmitting(true);
    await login(userid, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
      
      <Card className="w-full max-w-md border-0 shadow-xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-1 text-center pb-6">
          <div className="bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 ">
<img src="/logo.png" alt="RSB Logo" className="w-full h-full object-contain" />          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Enter your credentials to access the RSB Global Dashboard
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit} className=" flex flex-col items-center">
          <CardContent className="space-y-4 w-[80%]">
            <div className="space-y-2">
              <Label htmlFor="userid">User ID</Label>
              <Input 
                id="userid" 
                type="text" 
                placeholder="Enter User ID"
                value={userid}
                onChange={(e) => setUserid(e.target.value)}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                {/* <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                  Forgot password?
                </Link> */}
              </div>
              <Input 
                id="password" 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm transition-all focus:bg-white dark:focus:bg-zinc-800"
              />
            </div>
          </CardContent>
          <div className="flex flex-col space-y-4 mt-6">
            <Button 
              type="submit" 
              className="w-[200px] py-5 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20" 
              disabled={isSubmitting || !userid || !password}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
