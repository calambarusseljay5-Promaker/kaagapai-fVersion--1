import { supabase } from "../lib/supabaseClient";
import { recordAuditEvent } from "./adminActivityService";

const BACKUP_VERSION = 1;
const BACKUP_APP = "KaagapAI";
const LOCAL_KEY_PREFIX = "kaagapai_";
const LOCAL_KEY_EXCLUSIONS = new Set(["kaagapai_resident_session"]);

const DATABASE_TABLES = [
  "residents",
  "user_profiles",
  "document_templates",
  "document_requests",
  "resident_notifications",
  "livelihood_posts",
  "announcements",
  "ai_knowledge_items",
];

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

const getLocalStorageSnapshot = () => {
  const storage = getStorage();
  if (!storage) return {};

  return Object.keys(storage)
    .filter((key) => key.startsWith(LOCAL_KEY_PREFIX) && !LOCAL_KEY_EXCLUSIONS.has(key))
    .sort()
    .reduce((snapshot, key) => {
      snapshot[key] = storage.getItem(key);
      return snapshot;
    }, {});
};

const restoreLocalStorageSnapshot = (snapshot = {}) => {
  const storage = getStorage();
  if (!storage) throw new Error("Browser storage is not available.");

  Object.entries(snapshot).forEach(([key, value]) => {
    if (!key.startsWith(LOCAL_KEY_PREFIX) || LOCAL_KEY_EXCLUSIONS.has(key)) return;

    if (value === null || value === undefined) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, String(value));
    }
  });

  window.dispatchEvent(new CustomEvent("kaagapai:system-settings-updated"));
  window.dispatchEvent(new StorageEvent("storage"));
};

const fetchTableSnapshot = async (tableName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*").limit(10000);
    if (error) throw error;

    return {
      rows: data || [],
      error: null,
    };
  } catch (error) {
    return {
      rows: [],
      error: error.message || `Unable to back up ${tableName}.`,
    };
  }
};

export async function createSystemBackup() {
  const databaseEntries = await Promise.all(
    DATABASE_TABLES.map(async (tableName) => [tableName, await fetchTableSnapshot(tableName)])
  );
  const database = Object.fromEntries(databaseEntries);

  const backup = {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    backupType: "settings-local-and-database-snapshot",
    localStorage: getLocalStorageSnapshot(),
    database,
  };

  const tableSummary = DATABASE_TABLES.map((tableName) => {
    const table = database[tableName];
    return `${tableName}: ${table.rows.length}${table.error ? " (with warning)" : ""}`;
  }).join(", ");

  recordAuditEvent({
    module: "System Settings",
    action: "Backup exported",
    details: tableSummary,
    source: "Local",
  });

  return backup;
}

export function downloadBackupFile(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = `kaagapai-backup-${date}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const readBackupFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "{}")));
      } catch {
        reject(new Error("Backup file is not valid JSON."));
      }
    };

    reader.onerror = () => reject(new Error("Unable to read backup file."));
    reader.readAsText(file);
  });

export function restoreLocalBackup(backup) {
  if (!backup || backup.app !== BACKUP_APP || backup.version !== BACKUP_VERSION) {
    throw new Error("This is not a valid KaagapAI backup file.");
  }

  const localStorageSnapshot = backup.localStorage;
  if (!localStorageSnapshot || typeof localStorageSnapshot !== "object") {
    throw new Error("Backup file does not contain restorable local settings.");
  }

  restoreLocalStorageSnapshot(localStorageSnapshot);

  recordAuditEvent({
    module: "System Settings",
    action: "Backup restored",
    details: `${Object.keys(localStorageSnapshot).length} local settings entries restored.`,
    source: "Local",
  });

  return {
    restoredEntries: Object.keys(localStorageSnapshot).length,
    databaseTables: Object.keys(backup.database || {}).length,
  };
}
