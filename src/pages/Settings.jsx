import { useState } from "react";
import {
  Bell,
  Building2,
  DatabaseBackup,
  Download,
  Heart,
  RotateCcw,
  Save,
  Settings as SettingsIcon,
  Sun,
  Upload,
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

const toggleItems = [
  {
    key: "residentPortalEnabled",
    label: "Resident portal",
    description: "Allow residents to access their dashboard and document requests.",
    icon: Building2,
  },
  {
    key: "documentNotificationsEnabled",
    label: "Document notifications",
    description: "Create resident notifications when documents are completed.",
    icon: Bell,
  },
];

const themeOptions = [
  {
    key: "light",
    label: "Emerald civic glass",
    description: "Emerald navigation, blue and aqua actions, gold highlights, and translucent white surfaces.",
    icon: Sun,
  },
  {
    key: "favorite",
    label: "Favorite red",
    description: "Black sidebar, white cards, and clean red government-style highlights.",
    icon: Heart,
  },
];

const Settings = () => {
  const { confirm } = useConfirm();
  const [settings, setSettings] = useState(() => getSystemSettings());
  const [savedAt, setSavedAt] = useState("");
  const [backupStatus, setBackupStatus] = useState("");
  const [backupError, setBackupError] = useState("");
  const [backupLoading, setBackupLoading] = useState(false);

  const updateField = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async (event) => {
    event?.preventDefault();
    const ok = await confirm({
      title: "Save System Settings",
      message: "Are you sure you want to update the system settings?",
      confirmText: "Save Settings",
      cancelText: "Cancel",
      variant: "emerald",
      icon: Save,
    });
    if (!ok) return;

    const saved = saveSystemSettings(settings);
    setSettings(saved);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "Restore Settings Defaults",
      message: "Are you sure you want to reset all system settings to their default values?",
      confirmText: "Reset",
      cancelText: "Cancel",
      variant: "danger",
      icon: RotateCcw,
    });
    if (!ok) return;

    const defaults = resetSystemSettings();
    setSettings(defaults);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const handleExportBackup = async () => {
    setBackupLoading(true);
    setBackupError("");
    setBackupStatus("");

    try {
      const backup = await createSystemBackup();
      downloadBackupFile(backup);
      const databaseWarnings = Object.values(backup.database || {}).filter((table) => table.error).length;
      setBackupStatus(
        databaseWarnings > 0
          ? `Backup downloaded with ${databaseWarnings} database warning${databaseWarnings !== 1 ? "s" : ""}.`
          : "Backup downloaded successfully."
      );
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
      setSavedAt(new Date().toLocaleTimeString());
      setBackupStatus(
        `Restored ${result.restoredEntries} local setting entr${result.restoredEntries === 1 ? "y" : "ies"}. Database snapshot kept read-only.`
      );
    } catch (error) {
      setBackupError(error.message || "Unable to restore backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <PageWrapper title="System Settings" description="Configure system identity and module preferences">
      <form onSubmit={handleSave} className="space-y-6 pb-20">
          <section className="glass-panel p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <SettingsIcon size={22} />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-[#17233c]">System Identity</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These values are saved in this browser for the admin interface.
                  </p>
                </div>
              </div>

              {savedAt ? (
                <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                  Saved at {savedAt}
                </span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-semibold text-slate-700">
                System name
                <input
                  value={settings.systemName}
                  onChange={(event) => updateField("systemName", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Barangay name
                <input
                  value={settings.barangayName}
                  onChange={(event) => updateField("barangayName", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Office email
                <input
                  type="email"
                  value={settings.officeEmail}
                  onChange={(event) => updateField("officeEmail", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Office phone
                <input
                  value={settings.officePhone}
                  onChange={(event) => updateField("officePhone", event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700 md:col-span-2">
                Office hours
                <input
                  value={settings.officeHours}
                  onChange={(event) => updateField("officeHours", event.target.value)}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </label>
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-slate-800">Module Preferences</h2>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {toggleItems.map((item) => {
                const Icon = item.icon;
                const enabled = Boolean(settings[item.key]);

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateField(item.key, !enabled)}
                    className={`rounded-lg border p-4 text-left transition ${enabled
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${enabled ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        <Icon size={20} />
                      </span>
                      <span
                        className={`h-6 w-11 rounded-full p-1 transition ${enabled ? "bg-blue-600" : "bg-slate-300"
                          }`}
                      >
                        <span
                          className={`block h-4 w-4 rounded-full bg-white transition ${enabled ? "translate-x-5" : "translate-x-0"
                            }`}
                        />
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#17233c]">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-panel p-6">
            <h2 className="text-xl font-bold text-slate-800">Appearance</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose between the global Emerald civic glass theme and the white-card favorite red style.
            </p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {themeOptions.map((item) => {
                const Icon = item.icon;
                const selected = (settings.adminTheme || "light") === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => updateField("adminTheme", item.key)}
                    className={`rounded-lg border p-4 text-left transition ${selected
                        ? "border-blue-200 bg-blue-50"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${selected ? "bg-white text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                        <Icon size={20} />
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {selected ? "Selected" : "Choose"}
                      </span>
                    </div>
                    <p className="mt-4 text-sm font-semibold text-[#17233c]">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-panel p-6">
            <div className="flex flex-col gap-4 border-b border-slate-100/50 pb-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 shadow-sm">
                  <DatabaseBackup size={24} />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Backup & Restore</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Export settings, organizational chart, prepared documents, logs, and readable database snapshots into one JSON file.
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-md bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600">
                JSON backup
              </span>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-blue-700">
                    <Download size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#17233c]">Create backup</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Downloads a timestamped file you can keep offline for recovery and record keeping.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleExportBackup}
                  disabled={backupLoading}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#1f63ca] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1854ad] disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Download size={16} />
                  {backupLoading ? "Preparing..." : "Download Backup"}
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
                    <Upload size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[#17233c]">Restore local settings</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Restores browser-managed settings safely. Database records inside the file stay read-only.
                    </p>
                  </div>
                </div>
                <label className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  <Upload size={16} />
                  Choose Backup File
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={handleRestoreBackup}
                    disabled={backupLoading}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            {backupStatus ? (
              <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                {backupStatus}
              </p>
            ) : null}

            {backupError ? (
              <p className="mt-4 rounded-lg bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                {backupError}
              </p>
            ) : null}
          </section>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RotateCcw size={16} />
              Reset
            </button>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1f63ca] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1854ad]"
            >
              <Save size={16} />
              Save Settings
            </button>
          </div>
        </form>
    </PageWrapper>
  );
};

export default Settings;
