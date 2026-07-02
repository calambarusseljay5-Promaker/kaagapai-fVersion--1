import { useEffect, useState } from "react";
import { KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck } from "lucide-react";
import Header from "../components/Header";
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
  const [email, setEmail] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAccount = async () => {
      try {
        const data = await getCurrentUserWithProfile();

        if (isMounted) {
          setEmail(data?.user?.email || "");
        }
      } catch (accountError) {
        if (isMounted) {
          setError(accountError.message || "Unable to load account security.");
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

  const updateField = (field, value) => {
    setPasswordForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    setSaving(true);
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
      setPasswordForm({ newPassword: "", confirmPassword: "" });
      setMessage("Password updated successfully.");
    } catch (passwordError) {
      setError(passwordError.message || "Unable to update password.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetEmail = async () => {
    if (!email || sendingReset) return;

    setSendingReset(true);
    setMessage("");
    setError("");

    try {
      await resetPassword(email);
      setMessage("Password reset email sent.");
    } catch (resetError) {
      setError(resetError.message || "Unable to send password reset email.");
    } finally {
      setSendingReset(false);
    }
  };

  const checks = getPasswordState(passwordForm.newPassword);

  return (
    <div className="flex h-screen flex-col bg-[#eef3f8]">
      <Header title="Account Security" subtitle="Update password and review sign-in protections" />

      <div className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1180px] space-y-5">
          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <ShieldCheck size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#17233c]">Protected route</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                This page is available only to signed-in admin accounts.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <Mail size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#17233c]">Account email</p>
              <p className="mt-1 truncate text-xs leading-5 text-slate-500">
                {loading ? "Loading..." : email || "No email found"}
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <LockKeyhole size={22} />
              </span>
              <p className="mt-4 text-sm font-semibold text-[#17233c]">Password recovery</p>
              <button
                type="button"
                onClick={handleResetEmail}
                disabled={loading || sendingReset || !email}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingReset ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send Reset Email
              </button>
            </div>
          </section>

          <form onSubmit={handlePasswordUpdate} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <KeyRound size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#17233c]">Change Password</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Set a stronger password for the current admin account.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                New password
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) => updateField("newPassword", event.target.value)}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Confirm password
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(event) => updateField("confirmPassword", event.target.value)}
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {passwordChecks.map((check) => (
                <span
                  key={check.key}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${checks[check.key]
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                    }`}
                >
                  {check.label}
                </span>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="submit"
                disabled={saving || loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f63ca] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1854ad] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                Update Password
              </button>
            </div>
          </form>

          {message ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
              {message}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default AccountSecurity;
