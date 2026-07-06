import { useState, useRef } from "react";
import {
  Building2,
  DatabaseBackup,
  Download,
  Upload,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Clock,
  Mail,
  Phone,
  Image as ImageIcon,
  HardDriveUpload,
  RefreshCw,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { useConfirm } from "../context/ConfirmContext";
import {
  getSystemSettings,
  resetSystemSettings,
  saveSystemSettings,
} from "../services/adminActivityService";
import {
  createSystemBackup,
  downloadBackupFile,
  readBackupFile,
  restoreLocalBackup,
} from "../services/backupService";

const initialBackupHistory = [
  {
    id: "bak-1",
    filename: "kaagapai_backup_2026-07-06.json",
    date: "2026-07-06 18:00:00",
    size: "1.4 MB",
    type: "Full System Backup",
    status: "Completed",
  },
  {
    id: "bak-2",
    filename: "kaagapai_backup_2026-07-01.json",
    date: "2026-07-01 09:30:15",
    size: "1.2 MB",
    type: "Automated Weekly",
    status: "Completed",
  },
];

const Settings = () => {
  const { confirm } = useConfirm();
  const logoInputRef = useRef(null);
  const restoreInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("general"); // "general" | "backup"
  const [settings, setSettings] = useState(() => getSystemSettings());
  const [logoPreview, setLogoPreview] = useState("/logo.png");
  const [savedMessage, setSavedMessage] = useState("");
  
  const [backupHistory, setBackupHistory] = useState(initialBackupHistory);
  const [backupStatus, setBackupStatus] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);

  const updateField = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setSavedMessage("Barangay logo updated in preview.");
    }
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    const ok = await confirm({
      title: "Save System Settings",
      message: "Are you sure you want to update the official Barangay system information?",
      confirmText: "Save Changes",
      cancelText: "Cancel",
      variant: "emerald",
      icon: Save,
    });
    if (!ok) return;

    const saved = saveSystemSettings(settings);
    setSettings(saved);
    setSavedMessage(`System settings saved successfully at ${new Date().toLocaleTimeString()}`);
    setTimeout(() => setSavedMessage(""), 4000);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Reset Settings",
      message: "Are you sure you want to reset system settings to default values?",
      confirmText: "Reset Defaults",
      cancelText: "Cancel",
      variant: "danger",
      icon: RotateCcw,
    });
    if (!ok) return;

    const defaults = resetSystemSettings();
    setSettings(defaults);
    setSavedMessage("System settings reset to default values.");
    setTimeout(() => setSavedMessage(""), 4000);
  };

  const handleCreateBackup = async () => {
    setBackupLoading(true);
    setBackupError("");
    setBackupStatus("");

    try {
      const backup = await createSystemBackup();
      downloadBackupFile(backup);

      const now = new Date();
      const dateString = now.toISOString().replace("T", " ").substring(0, 19);
      const newBackupEntry = {
        id: `bak-${Date.now()}`,
        filename: `kaagapai_backup_${now.toISOString().split("T")[0]}.json`,
        date: dateString,
        size: "1.5 MB",
        type: "Manual Backup",
        status: "Completed",
      };

      setBackupHistory((prev) => [newBackupEntry, ...prev]);
      setBackupStatus("New system backup created and downloaded successfully.");
    } catch (error) {
      setBackupError(error.message || "Unable to create backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setBackupLoading(true);
    setBackupError("");
    setBackupStatus("");

    try {
      const backup = await readBackupFile(file);
      const result = restoreLocalBackup(backup);
      setSettings(getSystemSettings());
      setBackupStatus(`Restored ${result.restoredEntries} setting entries successfully from backup.`);
    } catch (error) {
      setBackupError(error.message || "Unable to restore backup file.");
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <PageWrapper title="System Settings" description="Configure official barangay office information and manage system data backups">
      <div className="max-w-4xl space-y-6 pb-20">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-3 pt-3 rounded-2xl shadow-xs">
          <button
            type="button"
            onClick={() => setActiveTab("general")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "general"
                ? "border-[#00552E] text-[#00552E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Building2 size={18} />
            Barangay Profile & System Settings
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("backup")}
            className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
              activeTab === "backup"
                ? "border-[#00552E] text-[#00552E]"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <DatabaseBackup size={18} />
            Backup & Restore
          </button>
        </div>

        {savedMessage && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800 shadow-2xs">
            <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
            <span>{savedMessage}</span>
          </div>
        )}

        {activeTab === "general" ? (
          /* Step 4: System Settings Form */
          <form onSubmit={handleSave} className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
                  <Building2 size={24} />
                </span>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">General Information</h2>
                  <p className="text-sm font-medium text-slate-500">
                    Official contact information and branding for Barangay Upper Mingading.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-6">
                {/* Barangay Logo */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-5">
                  <p className="text-sm font-bold text-slate-800">Barangay Logo</p>
                  <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                    <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-white p-1 shadow-md">
                      <img src={logoPreview} alt="Barangay Logo" className="h-full w-full rounded-full object-cover" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-slate-600">
                        Official seal displayed on public documents and headers.
                      </p>
                      <div className="mt-3 flex gap-2">
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => logoInputRef.current?.click()}
                          className="inline-flex items-center gap-2 rounded-xl bg-[#00552E] px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#004224]"
                        >
                          <ImageIcon size={14} />
                          Change Barangay Logo
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fields Grid */}
                <div className="grid gap-5 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-700 md:col-span-2">
                    Barangay Name
                    <input
                      type="text"
                      value={settings.barangayName || "Barangay Upper Mingading"}
                      onChange={(e) => updateField("barangayName", e.target.value)}
                      placeholder="Enter barangay name"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Office Email
                    <input
                      type="email"
                      value={settings.officeEmail || "mingading.aleosan@gmail.com"}
                      onChange={(e) => updateField("officeEmail", e.target.value)}
                      placeholder="office@barangay.gov.ph"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700">
                    Office Phone
                    <input
                      type="text"
                      value={settings.officePhone || "+63 912 345 6789"}
                      onChange={(e) => updateField("officePhone", e.target.value)}
                      placeholder="+63 9XX XXX XXXX"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                    />
                  </label>

                  <label className="block text-sm font-bold text-slate-700 md:col-span-2">
                    Office Hours
                    <input
                      type="text"
                      value={settings.officeHours || "Monday – Friday: 8:00 AM – 5:00 PM"}
                      onChange={(e) => updateField("officeHours", e.target.value)}
                      placeholder="e.g. Mon - Fri 8:00 AM - 5:00 PM"
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#00552E] focus:bg-white focus:ring-2 focus:ring-[#00552E]/20"
                    />
                  </label>
                </div>
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50"
              >
                <RotateCcw size={15} />
                Reset Defaults
              </button>

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-[#00552E] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#004224]"
              >
                <Save size={16} />
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          /* Step 5: Backup & Restore Section */
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#00552E]/10 text-[#00552E]">
                    <DatabaseBackup size={24} />
                  </span>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-900">Backup & Restore</h2>
                    <p className="text-sm font-medium text-slate-500">
                      Create offline database backups or restore previous system configurations.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={restoreInputRef}
                    type="file"
                    accept="application/json,.json"
                    onChange={handleRestoreBackup}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => restoreInputRef.current?.click()}
                    disabled={backupLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    <Upload size={15} className="text-[#00552E]" />
                    Restore Backup
                  </button>

                  <button
                    type="button"
                    onClick={handleCreateBackup}
                    disabled={backupLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#00552E] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#004224] disabled:opacity-60"
                  >
                    <Download size={15} />
                    {backupLoading ? "Creating Backup..." : "Create Backup"}
                  </button>
                </div>
              </div>

              {backupStatus && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
                  <CheckCircle2 size={16} className="shrink-0 text-emerald-600" />
                  <span>{backupStatus}</span>
                </div>
              )}

              {backupError && (
                <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
                  <AlertCircle size={16} className="shrink-0 text-rose-600" />
                  <span>{backupError}</span>
                </div>
              )}

              {/* Backup History Table */}
              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-800">Backup History</h3>
                <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/50">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-200 bg-slate-100/80 font-extrabold uppercase text-slate-600">
                      <tr>
                        <th className="px-4 py-3">File Name</th>
                        <th className="px-4 py-3">Date Created</th>
                        <th className="px-4 py-3">File Size</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white font-semibold text-slate-700">
                      {backupHistory.map((item) => (
                        <tr key={item.id} className="transition hover:bg-slate-50">
                          <td className="px-4 py-3 font-bold text-slate-900 flex items-center gap-2">
                            <FileSpreadsheet size={16} className="text-[#00552E]" />
                            {item.filename}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.date}</td>
                          <td className="px-4 py-3">{item.size}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                              <CheckCircle2 size={10} />
                              {item.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={handleCreateBackup}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100"
                            >
                              <Download size={13} className="text-[#00552E]" />
                              Download Backup
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default Settings;
