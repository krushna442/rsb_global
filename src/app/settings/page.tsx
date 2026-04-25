"use client";
import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Bell, Shield, Globe, Palette, Database, Camera, Loader2, Lock, Eye, EyeOff, User as UserIcon } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
    const { user, updateProfile, uploadProfileImage } = useUser();
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        username: "",
    });

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || "",
                email: user.email || "",
                mobile: user.mobile || "",
                username: user.username || "",
            });
        }
    }, [user]);

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPasswordData(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const togglePasswordVisibility = (key: keyof typeof showPasswords) => {
        setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setIsUploading(true);
            await uploadProfileImage(e.target.files[0]);
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        await updateProfile(user.id, formData);
        setIsSaving(false);
    };

    const handleUpdatePassword = async () => {
        if (!user) return;
        
        // Basic validation
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            toast.error("Please fill in all password fields");
            return;
        }

        if (passwordData.currentPassword !== user.password) {
            toast.error("Current password incorrect");
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error("New passwords do not match");
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsUpdatingPassword(true);
        const success = await updateProfile(user.id, { password: passwordData.newPassword });
        setIsUpdatingPassword(false);

        if (success) {
            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });
        }
    };

    if (!user) return null; // Avoid rendering flash before auth

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-4xl mx-auto pb-10">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your profile, system preferences, and configurations</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6">
                    {/* Left Column - Profile Card */}
                    <div className="space-y-6">
                        <Card className="border-0 shadow-sm overflow-hidden">
                            <div className="h-24 bg-gradient-to-r from-blue-600 to-violet-600"></div>
                            <CardContent className="pt-0 relative px-6 pb-6 text-center">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 group">
                                    <div className="relative rounded-full overflow-hidden w-24 h-24 border-4 border-background shadow-md bg-white">
                                        <Avatar className="w-full h-full rounded-none">
                                            {user.profile_image ? (
                                                <AvatarImage src={`${process.env.NEXT_PUBLIC_URL}/${user.profile_image}`} className="object-cover" />
                                            ) : (
                                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-2xl font-semibold rounded-none">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </AvatarFallback>
                                            )}
                                        </Avatar>
                                        <label className={`absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-white text-[10px] font-medium backdrop-blur-sm ${isUploading ? 'opacity-100' : ''}`}>
                                            {isUploading ? (
                                                <Loader2 className="w-5 h-5 animate-spin mb-1" />
                                            ) : (
                                                <>
                                                    <Camera className="w-5 h-5 mb-1" />
                                                    Upload
                                                </>
                                            )}
                                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                                        </label>
                                    </div>
                                </div>
                                
                                <div className="mt-14 space-y-1">
                                    <h2 className="text-lg font-bold">{user.name}</h2>
                                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">{user.role}</p>
                                </div>

                                <div className="mt-4 flex flex-col gap-2">
                                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <span className="w-16 font-medium text-left">Email:</span>
                                        <span className="truncate flex-1 text-left">{user.email}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <span className="w-16 font-medium text-left">Mobile:</span>
                                        <span className="truncate flex-1 text-left">{user.mobile || "Not specified"}</span>
                                    </div>
                                    <div className="flex items-center text-xs text-muted-foreground bg-muted/30 p-2 rounded-md">
                                        <span className="w-16 font-medium text-left">Status:</span>
                                        <div className="flex items-center gap-1.5 flex-1 justify-start">
                                            <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? "bg-emerald-500" : "bg-gray-400"}`} />
                                            <span className={`${user.is_active ? "text-emerald-600" : "text-gray-500"}`}>
                                                {user.is_active ? "Active" : "Inactive"} Account
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column - Forms */}
                    {/* disable the profile information update form for non admin users */}
                    <div className="space-y-6">
                        {/* Profile Settings Form */}
                    {user.role === "admin" || user.role === "super admin" && (
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                        <UserIcon className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-semibold">Profile Information</CardTitle>
                                        <p className="text-xs text-muted-foreground">Update your personal details</p>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                                        <Input id="name" value={formData.name} onChange={handleFormChange} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="username" className="text-xs font-medium">Username</Label>
                                        <Input id="username" value={formData.username} onChange={handleFormChange} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                                        <Input id="email" type="email" value={formData.email} onChange={handleFormChange} className="h-9 text-sm" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="mobile" className="text-xs font-medium">Mobile Number</Label>
                                        <Input id="mobile" value={formData.mobile} onChange={handleFormChange} className="h-9 text-sm" placeholder="e.g. 9876543210" />
                                    </div>
                                </div>
                                <div className="pt-4 flex justify-end">
                                    <Button onClick={handleSave} disabled={isSaving} size="sm" className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]">
                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} 
                                        {isSaving ? "Saving..." : "Save Profile"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                        {/* Security & Password Form */}
                        <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                                        <Lock className="w-4 h-4 text-red-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-sm font-semibold">Security & Password</CardTitle>
                                        <p className="text-xs text-muted-foreground">Update your account password</p>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="currentPassword" title={user.password} className="text-xs font-medium">Current Password</Label>
                                        <div className="relative">
                                            <Input 
                                                id="currentPassword" 
                                                type={showPasswords.current ? "text" : "password"}
                                                value={passwordData.currentPassword} 
                                                onChange={handlePasswordChange} 
                                                className="h-9 text-sm pr-9" 
                                            />
                                            <button 
                                                onClick={() => togglePasswordVisibility('current')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.current ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="newPassword"  className="text-xs font-medium">New Password</Label>
                                        <div className="relative">
                                            <Input 
                                                id="newPassword" 
                                                type={showPasswords.new ? "text" : "password"}
                                                value={passwordData.newPassword} 
                                                onChange={handlePasswordChange} 
                                                className="h-9 text-sm pr-9" 
                                            />
                                            <button 
                                                onClick={() => togglePasswordVisibility('new')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.new ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="confirmPassword"  className="text-xs font-medium">Confirm New Password</Label>
                                        <div className="relative">
                                            <Input 
                                                id="confirmPassword" 
                                                type={showPasswords.confirm ? "text" : "password"}
                                                value={passwordData.confirmPassword} 
                                                onChange={handlePasswordChange} 
                                                className="h-9 text-sm pr-9" 
                                            />
                                            <button 
                                                onClick={() => togglePasswordVisibility('confirm')}
                                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                            >
                                                {showPasswords.confirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-2 flex justify-end">
                                    <Button 
                                        onClick={handleUpdatePassword} 
                                        disabled={isUpdatingPassword || !passwordData.currentPassword || !passwordData.newPassword} 
                                        size="sm" 
                                        className="h-9 gap-1.5 text-xs bg-red-600 hover:bg-red-700 text-white min-w-[120px]"
                                    >
                                        {isUpdatingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />} 
                                        {isUpdatingPassword ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>

                        {/* System Preferences Placeholder */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card className="border-0 shadow-sm flex flex-col">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                            <Bell className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    {["Email notifications", "Daily reports", "Alerts"].map((item) => (
                                        <div key={item} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                                            <span className="text-xs font-medium text-muted-foreground">{item}</span>
                                            <button className="w-8 h-4 bg-primary rounded-full relative transition-colors"><div className="w-3 h-3 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" /></button>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-sm flex flex-col">
                                <CardHeader className="pb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                            <Palette className="w-4 h-4 text-violet-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-sm font-semibold">Preferences</CardTitle>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Language</Label>
                                        <Select defaultValue="en">
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="en">English (US)</SelectItem><SelectItem value="hi">Hindi</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Timezone</Label>
                                        <Select defaultValue="ist">
                                            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                            <SelectContent><SelectItem value="ist">IST (UTC+5:30)</SelectItem><SelectItem value="utc">UTC</SelectItem></SelectContent>
                                        </Select>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
