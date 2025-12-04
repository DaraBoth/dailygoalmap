"use client";

import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Lock } from "lucide-react";

export default function ChangePasswordForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      toast({
        title: "Missing fields",
        description: "Please fill in all password fields.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "New password and confirmation password must match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      toast({
        title: "Same password",
        description: "New password must be different from current password.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user?.email) {
        throw new Error("User email not found");
      }

      // Attempt to sign in with current password to verify it
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: formData.currentPassword,
      });

      if (signInError) {
        toast({
          title: "Incorrect password",
          description: "Current password is incorrect.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: formData.newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully.",
      });

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to change password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword" className="text-white">
          Current Password
        </Label>
        <div className="relative">
          <Input
            id="currentPassword"
            name="currentPassword"
            type={showCurrentPassword ? "text" : "password"}
            value={formData.currentPassword}
            onChange={handleChange}
            placeholder="Enter current password"
            className="bg-gray-800/50 border-gray-700 text-white pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showCurrentPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword" className="text-white">
          New Password
        </Label>
        <div className="relative">
          <Input
            id="newPassword"
            name="newPassword"
            type={showNewPassword ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            placeholder="Enter new password (min. 6 characters)"
            className="bg-gray-800/50 border-gray-700 text-white pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowNewPassword(!showNewPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showNewPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword" className="text-white">
          Confirm New Password
        </Label>
        <div className="relative">
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm new password"
            className="bg-gray-800/50 border-gray-700 text-white pr-10"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showConfirmPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
            Changing Password...
          </>
        ) : (
          <>
            <Lock className="h-4 w-4 mr-2" />
            Change Password
          </>
        )}
      </Button>
    </form>
  );
}
