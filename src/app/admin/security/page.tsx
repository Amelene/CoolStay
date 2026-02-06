"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  Key,
  Mail,
  CheckCircle2,
  Lock,
  Smartphone,
  Globe,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import ChangePasswordModal from "@/components/admin/security/ChangePasswordModal";
import TwoFactorModal from "@/components/admin/security/TwoFactorModal"; // ✅ Import 2FA Modal
import { Button } from "@/components/ui/Button";

type SecurityData = {
  profile: {
    full_name: string;
    email: string;
    role: string;
    is_two_factor_enabled: boolean;
  };
  logs: {
    id: string;
    action: string;
    ip_address: string;
    created_at: string;
    location: string;
    device_info: string;
  }[];
};

const LOGS_PER_PAGE = 5;

export default function SecurityPage() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- Modals State ---
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isTwoFactorModalOpen, setIsTwoFactorModalOpen] = useState(false); // ✅ New State

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSecurityData = async () => {
    try {
      const res = await fetch("/api/admin/security");
      if (!res.ok) throw new Error("Failed");
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
  }, []);

  if (isLoading)
    return (
      <div className="p-10 text-center text-slate-500 animate-pulse">
        Loading security details...
      </div>
    );
  if (!data)
    return (
      <div className="p-10 text-center text-red-500">
        Failed to load security data.
      </div>
    );

  const securityScore = data.profile.is_two_factor_enabled ? 100 : 50;

  // --- Pagination Logic ---
  const totalLogs = data.logs.length;
  const totalPages = Math.ceil(totalLogs / LOGS_PER_PAGE);
  const startIndex = (currentPage - 1) * LOGS_PER_PAGE;
  const currentLogs = data.logs.slice(startIndex, startIndex + LOGS_PER_PAGE);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#F5F8FA] p-8 -m-6 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-serif font-bold text-black">
            Security & Verification
          </h1>
          <p className="text-slate-600 font-medium mt-1">
            Manage your account access and security settings.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Profile */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-16 -mt-16 z-0"></div>
            <h2 className="text-xl font-bold text-[#0A1A44] mb-6 relative z-10 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" /> Account Profile
            </h2>

            <div className="relative z-10 flex flex-col md:flex-row items-start gap-8">
              <div className="flex flex-col items-center gap-3">
                <div className="w-24 h-24 rounded-full bg-[#0A1A44] text-white flex items-center justify-center text-3xl font-serif font-bold border-4 border-blue-100 shadow-lg">
                  {data.profile.full_name?.substring(0, 2).toUpperCase()}
                </div>
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                  {data.profile.role}
                </span>
              </div>

              <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Display Name
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                    <span className="flex-1">{data.profile.full_name}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">
                    Email Address
                  </label>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-medium">
                    <Mail className="w-4 h-4 text-slate-400" />
                    <span className="flex-1">{data.profile.email}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-8 shadow-sm border border-blue-100">
            <h2 className="text-xl font-bold text-[#0A1A44] mb-6 flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-500" /> Login & Recovery
            </h2>

            <div className="space-y-4">
              {/* Password Section */}
              <div className="flex items-center justify-between p-4 border border-blue-100 rounded-xl bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-500">
                    <Key className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0A1A44]">Password</h4>
                    <p className="text-xs text-slate-500">
                      Managed via Auth Provider
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Update
                </button>
              </div>

              {/* 2FA Section - Now Interactive */}
              <div className="flex items-center justify-between p-4 border border-blue-100 rounded-xl hover:bg-blue-50 transition-colors bg-white">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-lg ${
                      data.profile.is_two_factor_enabled
                        ? "bg-green-100 text-green-600"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#0A1A44]">
                      Two-Factor Authentication
                    </h4>
                    <p className="text-xs text-slate-500">
                      {data.profile.is_two_factor_enabled
                        ? "Enabled & Secure"
                        : "Not Enabled"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsTwoFactorModalOpen(true)}
                  className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {data.profile.is_two_factor_enabled ? "Manage" : "Setup"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Score & Logs */}
        <div className="space-y-8">
          <div className="bg-[#0A1A44] text-white rounded-3xl p-8 shadow-lg relative overflow-hidden text-center">
            <div className="relative z-10">
              <h3 className="text-sm font-bold uppercase tracking-widest text-blue-200 mb-4">
                Security Health
              </h3>
              <div
                className={`inline-flex items-center justify-center w-32 h-32 rounded-full border-8 mb-4 bg-[#0f2452] shadow-2xl ${
                  securityScore === 100
                    ? "border-green-500"
                    : "border-yellow-500"
                }`}
              >
                <span className="text-4xl font-serif font-bold">
                  {securityScore}%
                </span>
              </div>
              <p className="text-sm text-gray-300 px-4">
                {securityScore === 100
                  ? "Your account is secure."
                  : "Enable 2FA to improve your score."}
              </p>
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-sm rounded-3xl p-6 shadow-sm border border-white/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-[#0A1A44]">Activity Log</h3>
              <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                Page {currentPage} of {totalPages || 1}
              </span>
            </div>

            {data.logs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">
                No recent activity.
              </p>
            ) : (
              <div className="space-y-4">
                {currentLogs.map((log) => (
                  <div
                    key={log.id}
                    className="bg-white p-4 rounded-xl shadow-sm border border-blue-50 animate-in fade-in slide-in-from-bottom-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 text-slate-400">
                        {log.device_info?.includes("Mobile") ? (
                          <Smartphone className="w-4 h-4" />
                        ) : (
                          <Globe className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0A1A44]">
                          {log.action}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {log.ip_address} • {log.location || "Unknown"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="text-slate-500 disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>

                <div className="flex gap-1">
                  {Array.from({ length: Math.min(totalPages, 5) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i + 1 === currentPage ? "bg-blue-500" : "bg-slate-200"
                        }`}
                      />
                    ),
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="text-slate-500 disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- Modals --- */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <TwoFactorModal
        isOpen={isTwoFactorModalOpen}
        onClose={() => setIsTwoFactorModalOpen(false)}
        isEnabled={data.profile.is_two_factor_enabled}
        onSuccess={() => {
          fetchSecurityData(); // Refresh data so "Enabled" status updates immediately
        }}
      />
    </div>
  );
}
