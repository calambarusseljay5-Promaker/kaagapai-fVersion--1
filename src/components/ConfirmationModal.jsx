import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  X,
  Loader2,
  LogOut,
  ShieldAlert,
  Save,
  RotateCcw,
  UserCheck,
  UserX,
  FileCheck2,
  FileX
} from "lucide-react";

/**
 * Professional Reusable Confirmation Modal Component
 * 
 * Fits KaagapAI Branding:
 * - Official Barangay Upper Mingading Seal (/logo.png)
 * - Modern Glassmorphism (white dominant + emerald accents)
 * - Rounded corners (rounded-3xl)
 * - Red for destructive actions (danger/delete)
 * - Emerald Green for positive actions (create/save/approve/restore)
 * - Keyboard accessibility (Escape to close, Enter to confirm)
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Action",
  message = "Are you sure you want to proceed with this action?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "emerald", // "emerald" | "danger" | "warning"
  loading = false,
  customIcon: CustomIcon = null
}) => {

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      } else if (event.key === "Enter" && !loading) {
        event.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, loading, onClose, onConfirm]);

  if (!isOpen) return null;

  // Determine icon & theme colors based on variant
  const isDanger = variant === "danger" || variant === "destructive";
  const isWarning = variant === "warning";

  const getHeaderIcon = () => {
    if (CustomIcon) return <CustomIcon size={24} />;
    if (isDanger) return <Trash2 size={24} />;
    if (isWarning) return <AlertTriangle size={24} />;
    return <CheckCircle2 size={24} />;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop (Clicking backdrop closes modal, does NOT confirm) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-0"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col p-6 sm:p-7 text-center space-y-5"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={loading}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition duration-150 disabled:opacity-50"
            >
              <X size={16} />
            </button>

            {/* BRANDING HEADER WITH BARANGAY LOGO */}
            <div className="flex flex-col items-center space-y-2">
              <div className="relative">
                {/* Outer Glow */}
                <div className={`h-16 w-16 rounded-3xl flex items-center justify-center border shadow-md ${
                  isDanger
                    ? "bg-rose-50 border-rose-200 text-rose-600"
                    : isWarning
                    ? "bg-amber-50 border-amber-200 text-amber-600"
                    : "bg-emerald-50 border-emerald-200 text-[#0B5D3B]"
                }`}>
                  {getHeaderIcon()}
                </div>

                {/* Mini Barangay Seal Badge */}
                <div className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-white p-0.5 border border-slate-200 shadow-md flex items-center justify-center overflow-hidden">
                  <img src="/logo.png" alt="Barangay Seal" className="h-full w-full object-contain" />
                </div>
              </div>

              {/* KaagapAI System Tag */}
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0B5D3B] bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full mt-1">
                KaagapAI System
              </span>
            </div>

            {/* TITLE & MESSAGE */}
            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-snug">
                {title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed font-medium max-w-sm mx-auto">
                {message}
              </p>
            </div>

            {/* BUTTON ACTIONS */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 flex h-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition duration-150 active:scale-95 disabled:opacity-50"
              >
                {cancelText}
              </button>

              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`flex-1 flex h-11 items-center justify-center gap-2 rounded-2xl text-xs font-extrabold text-white shadow-lg hover:shadow-xl transition duration-200 active:scale-95 disabled:opacity-50 ${
                  isDanger
                    ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-700 shadow-rose-900/20"
                    : isWarning
                    ? "bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-800 shadow-amber-900/20"
                    : "bg-gradient-to-r from-[#0B5D3B] to-emerald-600 hover:from-[#08482d] hover:to-emerald-700 shadow-emerald-900/20"
                }`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>{loading ? "Processing..." : confirmText}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
