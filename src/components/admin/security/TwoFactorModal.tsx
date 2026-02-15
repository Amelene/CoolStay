"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Smartphone,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Copy,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { toast } from "sonner";

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEnabled: boolean;
  onSuccess: () => void;
}

type Step = "intro" | "setup" | "verify" | "success" | "disable";

export default function TwoFactorModal({
  isOpen,
  onClose,
  isEnabled,
  onSuccess,
}: TwoFactorModalProps) {
  const [step, setStep] = useState<Step>("intro");
  const [loading, setLoading] = useState(false);

  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");

  useEffect(() => {
    if (isOpen) {
      setStep("intro");
      setVerifyCode("");
      setQrCode(null);
    }
  }, [isOpen]);

  const formatSecret = (str: string | null) => {
    if (!str) return "";
    return str.match(/.{1,4}/g)?.join(" ") || str;
  };

  if (!isOpen) return null;

  // --- ACTIONS ---
  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security/mfa/enroll", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to start setup");

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setStep("setup");
    } catch (error) {
      console.error("MFA Setup Error:", error);
      toast.error("Could not generate QR code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verifyCode || verifyCode.length < 6) {
      toast.error("Please enter the 6-digit code");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/security/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ factorId, code: verifyCode }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Verification failed");

      setStep("success");
      toast.success("Two-Factor Authentication Enabled!");
      onSuccess();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("Invalid code");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/security/mfa/unenroll", {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Failed to disable 2FA");

      toast.success("Two-Factor Authentication Disabled");
      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Could not disable 2FA. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // --- VIEWS ---

  const renderIntro = () => (
    <div className="space-y-6 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 animate-in zoom-in duration-300">
        <ShieldCheck className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-[#0A1A44] mb-2">
          {isEnabled ? "Manage 2FA" : "Secure Your Account"}
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed px-4">
          {isEnabled
            ? "Two-factor authentication is currently enabled. Your account is secure."
            : "Protect your account by requiring a code from an authenticator app (like Google Auth) when logging in."}
        </p>
      </div>

      {isEnabled ? (
        // ✅ VISIBILITY FIX: Solid Red Background instead of outline
        <Button
          className="w-full bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 font-bold"
          onClick={() => setStep("disable")}
        >
          Disable 2FA
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleStartSetup}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Setup 2FA Now"
          )}
        </Button>
      )}
    </div>
  );

  const renderDisableConfirm = () => (
    <div className="space-y-6 text-center animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-600">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-red-600 mb-2">
          Disable Security?
        </h3>
        <p className="text-slate-500 text-sm leading-relaxed px-2">
          Are you sure you want to turn off Two-Factor Authentication? Your
          account will be less secure against unauthorized access.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-200"
          onClick={handleDisable}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="w-4 h-4 mr-2" />
          )}
          {loading ? "Disabling..." : "Yes, Turn Off 2FA"}
        </Button>
        <Button
          variant="ghost"
          className="w-full text-slate-500 hover:text-slate-700"
          onClick={() => setStep("intro")}
          disabled={loading}
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderSetup = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-[#0A1A44]">Scan QR Code</h3>
        <p className="text-xs text-slate-500">
          Open your Authenticator App and scan this code.
        </p>
      </div>

      <div className="flex justify-center p-4 bg-white border border-slate-200 rounded-xl shadow-inner">
        {qrCode ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCode}
            alt="Scan this QR code"
            className="w-48 h-48 object-contain"
          />
        ) : (
          <div className="w-48 h-48 flex items-center justify-center bg-slate-50 text-slate-400 text-xs">
            Loading...
          </div>
        )}
      </div>

      <div
        className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center relative group cursor-pointer hover:bg-slate-100 transition-colors"
        onClick={() => {
          navigator.clipboard.writeText(secret || "");
          toast.success("Copied secret!");
        }}
      >
        <p className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-wider">
          Can&apos;t scan? Copy Code
        </p>
        <p className="font-mono text-xs font-bold text-[#0A1A44] wrap-break-word px-4">
          {formatSecret(secret)}
        </p>
        <Copy className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <Button className="w-full" onClick={() => setStep("verify")}>
        Next Step <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );

  const renderVerify = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold text-[#0A1A44]">Enter Code</h3>
        <p className="text-xs text-slate-500">
          Enter the 6-digit code from your app to confirm setup.
        </p>
      </div>

      <div className="bg-blue-50 p-6 rounded-2xl flex flex-col items-center justify-center gap-4 border border-blue-100">
        <Smartphone className="w-10 h-10 text-blue-500" />
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          autoFocus
          className="text-center text-3xl font-mono font-bold tracking-[0.5em] w-full bg-transparent border-b-2 border-blue-200 focus:border-blue-600 outline-none text-[#0A1A44] placeholder-blue-200/50 transition-colors"
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && handleVerify()}
        />
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => setStep("setup")}>
          Back
        </Button>
        <Button className="flex-1" onClick={handleVerify} disabled={loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Verify & Enable"
          )}
        </Button>
      </div>
    </div>
  );

  const renderSuccess = () => (
    <div className="text-center space-y-6 py-4 animate-in zoom-in duration-300">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle2 className="w-10 h-10 text-green-600" />
      </div>
      <div>
        <h3 className="text-2xl font-bold text-[#0A1A44]">
          You&apos;re Secured!
        </h3>
        <p className="text-slate-500 mt-2 text-sm px-4">
          Two-factor authentication is now active. You will need your code next
          time you login.
        </p>
      </div>
      <Button className="w-full" onClick={onClose}>
        Done
      </Button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#0A1A44] p-4 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-300" />
            <h2 className="text-base font-bold font-serif">Two-Factor Auth</h2>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/10 p-1 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === "intro" && renderIntro()}
          {step === "setup" && renderSetup()}
          {step === "verify" && renderVerify()}
          {step === "success" && renderSuccess()}
          {step === "disable" && renderDisableConfirm()}
        </div>
      </div>
    </div>
  );
}
