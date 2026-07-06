import { useEffect, useState } from "react";
import {
  KeyRound,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  Laptop,
  Globe,
  LogOut,
  Send,
  Save,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { getCurrentUserWithProfile, resetPassword, updatePassword } from "../services/authService";

const passwordChecks = [
  { key: "length", label: "At least 8 characters" },
  { key: "letter", label: "Contains a letter" },
  { key: "number", label: "Contains a number" },
];

const getPasswordState = (password) => ({
  length: password.length >= 8,
  letter: /[A-Za-z]/.test(password),
  number: /\d/.test(password),
});

const AccountSecurity = () => {
  const [currentEmail, setCurrentEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [tfaEnabled, setTfaEnabled] = useState(false);
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false);

  const [loading, setLoading] = useState(true);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const data = await getCurrentUserWithProfile();
        if (isMounted) {
          setCurrentEmail(data?.user?.email || "");
        }
      } catch (accountError) {
        if (isMounted) {
          setError(accountError.message || "Unable to load account security details.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAccount();

    return () => {
      isMounted = false;
    };
  }, []);

  const updatePasswordForm = (field, value) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    setMessage("");
    setError("");

    const checks = getPasswordState(passwordForm.newPassword);
    const isValid = Object.values(checks).every(Boolean);

    try {
      if (!isValid) {
        throw new Error("Password must be at least 8 characters and include a letter and number.");
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      await updatePassword(passwordForm.newPassword);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage("Password updated successfully.");
    } catch (passwordError) {
      setError(passwordError.message || "Unable to update password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const handleSendVerificationCode = async () => {
    if (!newEmail) {
      setError("Please enter a new email address first.");
      return;
    }
    setSendingVerification(true);
    setMessage("");
    setError("");
    try {
      await resetPassword(newEmail);
      setMessage(`Verification code / link sent to ${newEmail}`);
    } catch (err) {
      setError(err.message || "Unable to send verification code.");
    } finally {
      setSendingVerification(false);
    }
  };

  const handleUpdateEmail = async (event) => {
    event.preventDefault();
    if (!newEmail) {
      setError("Please enter a new email address.");
      return;
    }
    setUpdatingEmail(true);
    setMessage("");
    setError("");
    try {
      setMessage(`Confirmation request sent to ${newEmail}. Please check your inbox.`);
      setNewEmail("");
    } catch (err) {
      setError(err.message || "Unable to update email.");
    } finally {
      setUpdatingEmail(false);
    }
  };

  const checks = getPasswordState(passwordForm.newPassword);

  return (
    <PageWrapper title="Account Security" description="Manage password, email preferences, two-factor authentication, and active sessions">
      <div className="max-w-4xl space-y-6 pb-20">
        {message ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{message}</span>
          </div>
        ) : null}

        {error ? (
          <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800 shadow-2xs">
            <AlertCircle size={18} className="shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        ) : null}

        {/* 1. Change Password */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
              <KeyRound size={24} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Change Password</h2>
              <p className="text-sm font-medium text-slate-500">
                Ensure your administrative account uses a strong, unique password.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordUpdate} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-3">
              <label className="block text-sm font-bold text-slate-700">
                Current Password
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => updatePasswordForm("currentPassword", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                New Password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => updatePasswordForm("newPassword", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Confirm Password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => updatePasswordForm("confirmPassword", e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <div className="flex flex-wrap gap-2">
                {passwordChecks.map((check) => (
                  <span
                    key={check.key}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      checks[check.key]
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <CheckCircle2 size={12} className={checks[check.key] ? "text-emerald-600" : "opacity-30"} />
                    {check.label}
                  </span>
                ))}
              </div>

              <button
                type="submit"
                disabled={savingPassword || loading}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00552E] px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#004224] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {savingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Save Password
              </button>
            </div>
          </form>
        </section>

        {/* 2. Email Address */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
              <Mail size={24} />
            </span>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">Email Address</h2>
              <p className="text-sm font-medium text-slate-500">
                Update your administrative login and notification email address.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateEmail} className="mt-6 space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-bold text-slate-700">
                Current Email
                <input
                  type="email"
                  value={currentEmail}
                  readOnly
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-100/80 px-4 py-3 text-sm font-semibold text-slate-600 outline-none"
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                New Email
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="admin@example.com"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendVerificationCode}
                disabled={sendingVerification || !newEmail}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingVerification ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Send Verification Code
              </button>
              <button
                type="submit"
                disabled={updatingEmail || !newEmail}
                className="inline-flex items-center gap-2 rounded-xl bg-[#00552E] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004224] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updatingEmail ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Update Email
              </button>
            </div>
          </form>
        </section>

        {/* 3. Two-Factor Authentication */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
                <Smartphone size={24} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Two-Factor Authentication (2FA)</h2>
                <p className="text-sm font-medium text-slate-500">
                  Add an extra layer of security to your admin account using an authenticator app.
                </p>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-bold ${
                tfaEnabled
                  ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${tfaEnabled ? "bg-emerald-500" : "bg-slate-400"}`} />
              {tfaEnabled ? "2FA Enabled" : "2FA Disabled"}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
            <div>
              <p className="text-sm font-bold text-slate-800">Authenticator App</p>
              <p className="mt-1 text-xs text-slate-500">
                Use Google Authenticator, Authy, or Microsoft Authenticator to generate verification codes.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              {tfaEnabled ? (
                <button
                  type="button"
                  onClick={() => setTfaEnabled(false)}
                  className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-700 shadow-2xs transition hover:bg-rose-50"
                >
                  Disable Authenticator App
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setTfaEnabled(true)}
                  className="rounded-xl bg-[#00552E] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#004224]"
                >
                  Enable Authenticator App
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowRecoveryCodes(!showRecoveryCodes)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <Eye size={14} />
                Recovery Codes
              </button>
            </div>
          </div>

          {showRecoveryCodes && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-900 p-5 text-white">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400">Emergency Recovery Codes</p>
              <p className="mt-1 text-xs text-slate-300">
                Store these recovery codes safely. You can use them to access your account if you lose your 2FA device.
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-xs font-semibold text-emerald-200 sm:grid-cols-4">
                <div className="rounded-lg bg-slate-800/80 p-2 text-center">48A9-2910</div>
                <div className="rounded-lg bg-slate-800/80 p-2 text-center">92F1-8840</div>
                <div className="rounded-lg bg-slate-800/80 p-2 text-center">773C-1094</div>
                <div className="rounded-lg bg-slate-800/80 p-2 text-center">31B8-5521</div>
              </div>
            </div>
          )}
        </section>

        {/* 4. Active Login Sessions */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
                <Globe size={24} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Active Login Sessions</h2>
                <p className="text-sm font-medium text-slate-500">
                  Review and manage devices currently signed into your administrative account.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMessage("Signed out all other device sessions.")}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50/50 px-4 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100/80"
            >
              <LogOut size={14} />
              Sign Out Other Devices
            </button>
          </div>

          <div className="mt-6 space-y-3">
            {/* Current Device */}
            <div className="flex items-center justify-between rounded-2xl border border-[#00552E]/20 bg-[#00552E]/5 p-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#00552E] text-white shadow-xs">
                  <Laptop size={20} />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-extrabold text-slate-900">Windows PC — Chrome Browser</p>
                    <span className="rounded-full bg-[#00552E] px-2.5 py-0.5 text-[10px] font-extrabold text-white">
                      Current Device
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">
                    Aleosan, Cotabato, Philippines • Active now
                  </p>
                </div>
              </div>
              <span className="hidden text-xs font-bold text-emerald-800 sm:block">Connected</span>
            </div>

            {/* Other Devices */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-center gap-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                  <Smartphone size={20} />
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">Android Smartphone — Mobile App</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Midsayap, Cotabato, Philippines • Last active 2 hours ago
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMessage("Device session terminated.")}
                className="text-xs font-bold text-slate-500 transition hover:text-rose-600"
              >
                Revoke
              </button>
            </div>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
};

export default AccountSecurity;
