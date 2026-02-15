"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import HomeFooter from "@/components/HomeFooter";
import { Button } from "@/components/ui/Button";
import { AuthInput } from "@/components/auth/AuthInput";
import { AuthSelect } from "@/components/auth/AuthSelect";
import { toast } from "sonner";
import { User, Lock, Edit2, Save, X, ShieldCheck } from "lucide-react";
import { updateUserProfile, changeUserPassword } from "@/app/auth/actions";

interface ProfileData {
  fullName: string;
  phone: string;
  gender: string;
  email: string;
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"personal" | "security">(
    "personal",
  );

  const [isEditing, setIsEditing] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: "",
    phone: "",
    gender: "",
    email: "",
  });

  const [passSaving, setPassSaving] = useState(false);
  const [passData, setPassData] = useState({
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profile) {
          // ✅ FAILSAFE: Check DB first, then User Metadata for phone number
          const safePhone = profile.phone || user.user_metadata?.phone || "";

          setProfileData({
            fullName: profile.full_name || "",
            phone: safePhone,
            gender: profile.gender || "Prefer not to say",
            email: user.email || "",
          });
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const result = await updateUserProfile({
        fullName: profileData.fullName,
        phone: profileData.phone,
        gender: profileData.gender as "Male" | "Female" | "Prefer not to say",
      });

      if (result.success) {
        toast.success("Profile updated successfully!");
        setIsEditing(false);
      } else {
        toast.error(result.error || "Failed to update profile");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passData.password !== passData.confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    setPassSaving(true);
    try {
      const result = await changeUserPassword({
        password: passData.password,
        confirmPassword: passData.confirmPassword,
      });

      if (result.success) {
        toast.success("Password changed securely!");
        setPassData({ password: "", confirmPassword: "" });
      } else {
        toast.error(result.error || "Failed to change password");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred");
    } finally {
      setPassSaving(false);
    }
  };

  // ✅ VISIBILITY FIX: Use bg-white with border for Read-Only inputs
  const readOnlyClass =
    "bg-white border-slate-200 text-slate-700 font-medium cursor-default shadow-sm ring-0";

  return (
    <main className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Navbar activePage="" logoVariant="text" />

      <div className="grow pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT: IDENTITY SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden relative group">
              <div className="h-32 bg-linear-to-r from-[#0A1A44] to-[#1e3a8a] relative">
                <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
              </div>

              <div className="px-8 pb-8 text-center -mt-12 relative">
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <div className="w-full h-full bg-white rounded-full p-1.5 shadow-lg">
                    <div className="w-full h-full bg-slate-100 rounded-full flex items-center justify-center text-[#0A1A44] border border-slate-200">
                      <User className="w-10 h-10 opacity-70" />
                    </div>
                  </div>
                </div>

                <h2 className="text-xl font-bold text-[#0A1A44] font-serif tracking-tight">
                  {loading ? "..." : profileData.fullName || "Guest User"}
                </h2>
                <p className="text-sm text-slate-500 font-medium">
                  {profileData.email}
                </p>
                <div className="mt-2 inline-flex px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                  Guest Account
                </div>
              </div>

              <div className="px-4 pb-6 space-y-1">
                <button
                  onClick={() => setActiveTab("personal")}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-semibold text-sm ${
                    activeTab === "personal"
                      ? "bg-blue-50 text-[#0A1A44] ring-1 ring-blue-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <User className="w-4 h-4" /> Personal Information
                </button>
                <button
                  onClick={() => setActiveTab("security")}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all font-semibold text-sm ${
                    activeTab === "security"
                      ? "bg-blue-50 text-[#0A1A44] ring-1 ring-blue-100"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" /> Login & Security
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: CONTENT PANEL */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-3xl shadow-lg border border-slate-100 p-8 min-h-[500px]">
              {/* --- TAB 1: PERSONAL INFO --- */}
              {activeTab === "personal" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-100 pb-6 gap-4">
                    <div>
                      <h1 className="text-2xl font-serif font-bold text-[#0A1A44]">
                        Personal Details
                      </h1>
                      <p className="text-slate-500 text-sm mt-1">
                        Manage your personal information.
                      </p>
                    </div>
                    {!isEditing ? (
                      <Button
                        onClick={() => setIsEditing(true)}
                        className="bg-[#0A1A44] text-white hover:bg-[#0A1A44]/90 shadow-md"
                      >
                        <Edit2 className="w-4 h-4 mr-2" /> Edit Details
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setIsEditing(false)}
                        variant="ghost"
                        className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" /> Cancel Editing
                      </Button>
                    )}
                  </div>

                  <form onSubmit={handleProfileSave} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AuthInput
                        label="Full Name"
                        variant="outline"
                        value={profileData.fullName}
                        disabled={!isEditing}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfileData({
                            ...profileData,
                            fullName: e.target.value,
                          })
                        }
                        className={!isEditing ? readOnlyClass : ""}
                      />
                      <AuthInput
                        label="Phone Number"
                        variant="outline"
                        value={profileData.phone}
                        disabled={!isEditing}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfileData({
                            ...profileData,
                            phone: e.target.value,
                          })
                        }
                        className={!isEditing ? readOnlyClass : ""}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1">
                        <AuthSelect
                          label="Gender"
                          variant="outline"
                          options={[
                            { label: "Male", value: "Male" },
                            { label: "Female", value: "Female" },
                            {
                              label: "Prefer not to say",
                              value: "Prefer not to say",
                            },
                          ]}
                          value={profileData.gender}
                          disabled={!isEditing}
                          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                            setProfileData({
                              ...profileData,
                              gender: e.target.value,
                            })
                          }
                          className={!isEditing ? readOnlyClass : ""}
                        />
                      </div>
                      <AuthInput
                        label="Email Address"
                        variant="outline"
                        value={profileData.email}
                        disabled={true}
                        className={`${readOnlyClass} text-slate-500 bg-slate-50`} // Distinct style for email
                      />
                    </div>

                    {isEditing && (
                      <div className="pt-4 flex justify-end animate-in fade-in slide-in-from-bottom-2">
                        <Button
                          type="submit"
                          disabled={profileSaving}
                          className="bg-[#0A1A44] hover:bg-[#0A1A44]/90 text-white px-8 py-2.5 h-auto text-sm shadow-lg shadow-blue-900/20"
                        >
                          {profileSaving ? (
                            "Saving Changes..."
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" /> Save Changes
                            </>
                          )}
                        </Button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* --- TAB 2: SECURITY --- */}
              {activeTab === "security" && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                  <div className="mb-8 border-b border-slate-100 pb-6">
                    <h1 className="text-2xl font-serif font-bold text-[#0A1A44]">
                      Login & Security
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                      Update your password to keep your account secure.
                    </p>
                  </div>

                  <div className="bg-linear-to-br from-blue-50 to-white rounded-2xl p-8 border border-blue-100">
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="shrink-0">
                        <div className="w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center text-blue-600 border border-blue-50">
                          <Lock className="w-6 h-6" />
                        </div>
                      </div>

                      <div className="grow">
                        <h3 className="font-bold text-[#0A1A44] text-lg mb-2">
                          Change Password
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed max-w-lg mb-6">
                          Choose a strong password that contains at least 8
                          characters, including an uppercase letter, a number,
                          and a special character.
                        </p>

                        <form
                          onSubmit={handlePasswordChange}
                          className="space-y-5 max-w-md"
                        >
                          <AuthInput
                            label="New Password"
                            type="password"
                            variant="outline"
                            value={passData.password}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setPassData({
                                ...passData,
                                password: e.target.value,
                              })
                            }
                            placeholder="••••••••"
                            className="bg-white"
                          />
                          <AuthInput
                            label="Confirm New Password"
                            type="password"
                            variant="outline"
                            value={passData.confirmPassword}
                            onChange={(
                              e: React.ChangeEvent<HTMLInputElement>,
                            ) =>
                              setPassData({
                                ...passData,
                                confirmPassword: e.target.value,
                              })
                            }
                            placeholder="••••••••"
                            className="bg-white"
                          />
                          <div className="pt-2">
                            <Button
                              type="submit"
                              disabled={passSaving}
                              className="w-full bg-[#0A1A44] hover:bg-[#0A1A44]/90 text-white shadow-lg shadow-blue-900/10 h-12"
                            >
                              {passSaving
                                ? "Updating Password..."
                                : "Update Password"}
                            </Button>
                          </div>
                        </form>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <HomeFooter />
    </main>
  );
}
