import { useEffect, useState } from "react";
import {
  Building2,
  Calendar,
  Crown,
  Edit2,
  ImagePlus,
  Mail,
  MapPin,
  Phone,
  Printer,
  RotateCcw,
  X,
} from "lucide-react";
import Header from "../components/Header";
import FloatingModal from "../components/FloatingModal";
import {
  DEFAULT_ORGANIZATION_OFFICIALS,
  getOrganizationOfficials,
  fetchOrganizationOfficials,
  resetOrganizationOfficials,
  saveOrganizationOfficials,
} from "../services/organizationService";

const PHOTO_MAX_FILE_SIZE = 8 * 1024 * 1024;
const PHOTO_MAX_SIZE = 420;
const ALEOSAN_LOGO_SRC = "/logo.png";
const BARANGAY_LOGO_SRC = "/logo.png";

const fieldClass =
  "mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100";

const initialsFromName = (name) =>
  String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "BO";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const escapeAttribute = (value) => escapeHtml(value).replace(/`/g, "&#96;");

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read image file."));
    reader.readAsDataURL(file);
  });

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image file."));
    image.src = src;
  });

const compressOfficialPhoto = async (file) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Please upload an image file.");
  }

  if (file.size > PHOTO_MAX_FILE_SIZE) {
    throw new Error("Photo must be 8 MB or smaller.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const scale = Math.min(1, PHOTO_MAX_SIZE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round((image.naturalWidth || PHOTO_MAX_SIZE) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || PHOTO_MAX_SIZE) * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.84);
};

const Avatar = ({ official, size = "md" }) => {
  const isCaptain = official.level === "captain";
  const dimensionClass = size === "lg" ? "h-[160px] w-[160px]" : size === "md" ? "h-[120px] w-[120px]" : "h-[70px] w-[70px]";

  if (official.photoUrl) {
    return (
      <span className={`block shrink-0 overflow-hidden rounded-full border-4 border-white shadow-md mx-auto bg-slate-100 ${dimensionClass}`}>
        <img src={official.photoUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-black shadow-md mx-auto text-4xl border-4 border-white ${
        isCaptain ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"
      } ${dimensionClass}`}
    >
      {isCaptain ? <Crown size={size === "lg" ? 64 : size === "md" ? 44 : 28} /> : initialsFromName(official.name)}
    </span>
  );
};

const OfficialCard = ({ official, onClick }) => {
  const isActive = official.status === "Active";

  return (
    <article
      onClick={() => onClick(official)}
      className="relative w-full max-w-[280px] rounded-2xl bg-white border border-slate-200 border-b-[6px] border-b-blue-600 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:border-blue-300 cursor-pointer p-6 flex flex-col items-center text-center group"
    >
      <Avatar official={official} size="md" />

      <div className="mt-4 flex flex-col items-center">
        <p className="text-base font-bold text-slate-800 tracking-tight leading-snug group-hover:text-blue-600 transition-colors">
          {official.name}
        </p>
        <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] text-blue-600">
          {official.position}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-1.5">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
            isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
          {official.status || "Active"}
        </span>
      </div>
    </article>
  );
};

const findOfficialById = (officials, officialId) =>
  officials.find((official) => official.id === officialId) ||
  DEFAULT_ORGANIZATION_OFFICIALS.find((official) => official.id === officialId) ||
  null;

const printAvatarMarkup = (official) => {
  if (official.photoUrl) {
    return `<img class="avatar" src="${escapeAttribute(official.photoUrl)}" alt="" />`;
  }

  return `<div class="avatar initials">${official.level === "captain" ? "PB" : escapeHtml(initialsFromName(official.name))}</div>`;
};

const printOfficialCard = (official, modifier = "") => `
  <article class="official-card ${modifier}">
    ${printAvatarMarkup(official)}
    <div>
      <h3>${escapeHtml(official.name)}</h3>
      <p class="position">${escapeHtml(official.position)}</p>
      <p class="committee">${escapeHtml(official.committee)}</p>
      <p class="focus">${escapeHtml(official.focusArea)}</p>
    </div>
  </article>
`;

const getPrintMarkup = (officials) => {
  const captain = officials.find((official) => official.level === "captain") || officials[0];
  const staff = officials.filter((official) => official.level === "staff");
  const skOfficials = officials.filter((official) => official.level === "sk");
  const supportOfficials = [...staff, ...skOfficials];
  const kagawads = officials.filter((official) => official.level === "kagawad");

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barangay Organizational Chart</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; color: #111827; font-family: Arial, sans-serif; }
    body { padding: 0.35in; }
    .page { width: 100%; min-height: 100%; }
    .header { display: grid; grid-template-columns: 96px minmax(0, 1fr) 96px; align-items: center; gap: 24px; border-bottom: 2px solid #111827; padding-bottom: 16px; }
    .header-title { text-align: center; }
    .logo-slot { display: flex; min-height: 72px; align-items: center; justify-content: center; }
    .eyebrow { margin: 0 0 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #0f766e; }
    h1 { margin: 0; font-size: 26px; letter-spacing: 0.02em; }
    .meta { margin: 5px 0 0; font-size: 12px; color: #475569; }
    .seal { width: 72px; height: 72px; object-fit: contain; }
    .section-label { margin: 18px 0 9px; font-size: 11px; font-weight: 800; letter-spacing: 0.13em; text-transform: uppercase; color: #334155; }
    .captain { max-width: 480px; margin: 18px auto 0; border-color: #92400e; background: #fffbeb; }
    .support-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .kagawad-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    .official-card { min-height: 106px; border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px; display: grid; grid-template-columns: 54px minmax(0, 1fr); gap: 10px; break-inside: avoid; }
    .avatar { width: 54px; height: 54px; border-radius: 9px; object-fit: cover; background: #0f172a; color: #ecfeff; display: grid; place-items: center; font-weight: 800; }
    .initials { font-size: 14px; }
    h3 { margin: 0; font-size: 13px; line-height: 1.25; }
    .position { margin: 3px 0 0; font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #0f766e; }
    .committee { margin: 7px 0 0; font-size: 11px; font-weight: 700; color: #334155; }
    .focus { margin: 4px 0 0; font-size: 10.5px; line-height: 1.35; color: #475569; }
    @page { size: letter landscape; margin: 0; }
    @media print { body { padding: 0.35in; } }
  </style>
</head>
<body>
  <main class="page">
    <header class="header">
      <div class="logo-slot">
        <img class="seal" src="${ALEOSAN_LOGO_SRC}" alt="Municipality of Aleosan seal" />
      </div>
      <div class="header-title">
        <p class="eyebrow">Barangay Upper Mingading</p>
        <h1>Organizational Chart</h1>
        <p class="meta">Printed ${escapeHtml(new Date().toLocaleDateString())} for official barangay reference.</p>
      </div>
      <div class="logo-slot">
        <img class="seal" src="${BARANGAY_LOGO_SRC}" alt="Barangay Upper Mingading seal" />
      </div>
    </header>
    ${captain ? printOfficialCard(captain, "captain") : ""}
    <p class="section-label">Barangay Officials</p>
    <section class="kagawad-grid">${kagawads.map((official) => printOfficialCard(official)).join("")}</section>
    <p class="section-label">Secretary, Treasurer, and SK Chairman</p>
    <section class="support-grid">${supportOfficials.map((official) => printOfficialCard(official)).join("")}</section>
  </main>
  <script>
    window.addEventListener("load", () => {
      setTimeout(() => window.print(), 250);
    });
  </script>
</body>
</html>`;
};

const OrganizationChart = () => {
  const [officials, setOfficials] = useState(() => getOrganizationOfficials());
  const [editingId, setEditingId] = useState("");
  const [draftOfficial, setDraftOfficial] = useState(null);
  const [savedAt, setSavedAt] = useState("");
  const [message, setMessage] = useState("");
  const [editorError, setEditorError] = useState("");
  const [loadingOfficials, setLoadingOfficials] = useState(true);
  const [savingOfficial, setSavingOfficial] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadOfficials = async () => {
      try {
        const savedOfficials = await fetchOrganizationOfficials();
        if (isMounted) {
          setOfficials(savedOfficials);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error.message || "Unable to load saved organizational chart.");
        }
      } finally {
        if (isMounted) {
          setLoadingOfficials(false);
        }
      }
    };

    loadOfficials();

    return () => {
      isMounted = false;
    };
  }, []);

  const [viewingOfficial, setViewingOfficial] = useState(null);

  const captain = findOfficialById(officials, "captain");
  const secretary = findOfficialById(officials, "secretary-jovelyn-c-cabaya");
  const treasurer = findOfficialById(officials, "treasurer-rosalie-c-calamba");
  const skChairman = findOfficialById(officials, "sk-chairman-chrystophyr-b-trance");
  const kagawads = DEFAULT_ORGANIZATION_OFFICIALS.filter((official) => official.level === "kagawad")
    .map((defaultOfficial) => findOfficialById(officials, defaultOfficial.id))
    .filter(Boolean);

  const openEditor = (official) => {
    setEditingId(official.id);
    setDraftOfficial({ ...official });
    setEditorError("");
    setMessage("");
  };

  const closeEditor = () => {
    setEditingId("");
    setDraftOfficial(null);
    setEditorError("");
  };

  const updateDraft = (field, value) => {
    setDraftOfficial((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setEditorError("");

    try {
      const photoUrl = await compressOfficialPhoto(file);
      updateDraft("photoUrl", photoUrl);
    } catch (error) {
      setEditorError(error.message || "Unable to upload photo.");
    }
  };

  const handleUpdateOfficial = async (event) => {
    event.preventDefault();
    if (!draftOfficial) return;

    const currentOfficial = officials.find((official) => official.id === draftOfficial.id);
    const clearPhotoIds =
      currentOfficial?.photoUrl && !draftOfficial.photoUrl ? [draftOfficial.id] : [];
    const nextOfficials = officials.map((official) =>
      official.id === draftOfficial.id
        ? {
          ...official,
          ...draftOfficial,
          name: String(draftOfficial.name || "").trim() || official.name,
          position: String(draftOfficial.position || "").trim() || official.position,
        }
        : official
    );

    setSavingOfficial(true);
    try {
      const savedOfficials = await saveOrganizationOfficials(nextOfficials, {
        clearPhotoIds,
      });
      setOfficials(savedOfficials);
      setSavedAt(new Date().toLocaleTimeString());
      setMessage(`${draftOfficial.name} profile updated.`);
      closeEditor();
    } catch (error) {
      setEditorError(error.message || "Unable to save official profile.");
    } finally {
      setSavingOfficial(false);
    }
  };

  const handleReset = async () => {
    const confirmed = window.confirm(
      "Reset official names and details to their defaults? Existing uploaded photos will be kept."
    );
    if (!confirmed) return;

    setSavingOfficial(true);

    try {
      const defaultOfficials = await resetOrganizationOfficials({ preservePhotos: true });
      setOfficials(defaultOfficials);
      setSavedAt(new Date().toLocaleTimeString());
      setMessage("Organizational chart restored to defaults. Existing photos were kept.");
      closeEditor();
    } catch (error) {
      setMessage(error.message || "Unable to reset organizational chart.");
    } finally {
      setSavingOfficial(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) {
      setMessage("Please allow pop-ups so the organizational chart can be printed.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(getPrintMarkup(officials));
    printWindow.document.close();
  };

  return (
    <div className="flex h-screen flex-col bg-transparent">
      <Header
        title="Organizational Chart"
        subtitle="Manage barangay official profiles, photos, and print-ready hierarchy"
      />

      <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="glass-container mt-2 mx-auto max-w-[1360px] flex flex-col">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between p-6 border-b border-slate-200/50">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-700">
                <Building2 size={14} />
                Barangay Upper Mingading
              </span>
              <h2 className="mt-4 text-3xl font-black text-slate-800 sm:text-4xl">
                Organizational Chart
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
                View the official hierarchy, upload real profile photos, update official background, and print a clean chart when needed.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row lg:justify-end">
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                <Printer size={16} />
                Print Chart
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={savingOfficial}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 px-5 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100 disabled:opacity-60"
              >
                <RotateCcw size={16} />
                {savingOfficial ? "Saving..." : "Reset Data"}
              </button>
            </div>
          </div>

          {(message || savedAt) && (
            <div className="border-b border-slate-200/50 bg-emerald-50 px-6 py-3 text-sm font-bold text-emerald-800">
              {message || `Saved at ${savedAt}`}
            </div>
          )}

          <div className="overflow-x-auto bg-slate-50/30 px-4 py-4 sm:px-6">
            {loadingOfficials ? (
              <div className="text-center py-20 text-slate-500 font-semibold">Loading official profiles...</div>
            ) : (
              <div className="mx-auto flex w-max min-w-full flex-col items-center py-2">
                <style>{`
                  @keyframes orgChartFadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                  .org-chart-fade-in {
                    animation: orgChartFadeIn 420ms ease-out both;
                  }
                `}</style>

                <div className="org-chart-fade-in flex flex-col items-center">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-1 text-xs font-bold uppercase tracking-[0.14em] text-blue-700 shadow-sm">
                    <Crown size={14} />
                    Punong Barangay
                  </div>
                  {captain && <OfficialCard official={captain} onClick={setViewingOfficial} />}
                  <div className="h-6 w-px bg-slate-300" />
                </div>

                <div className="org-chart-fade-in relative mt-2 flex w-max items-start justify-center gap-10 px-4">
                  <div className="absolute left-1/2 top-0 h-6 w-px -translate-x-1/2 bg-slate-300" />
                  <div className="absolute left-0 right-0 top-6 h-px bg-slate-300" />

                  <div className="flex flex-col items-center">
                    <div className="h-6 w-px bg-slate-300" />
                    {secretary && <OfficialCard official={secretary} onClick={setViewingOfficial} />}
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="h-6 w-px bg-slate-300" />
                    {treasurer && <OfficialCard official={treasurer} onClick={setViewingOfficial} />}
                  </div>
                </div>

                <div className="org-chart-fade-in mt-3 flex flex-col items-center">
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-600 shadow-sm">
                    Sangguniang Barangay and SK
                  </div>

                  <div className="w-max max-w-none">
                    <div className="grid grid-flow-col auto-cols-[220px] gap-4 px-4">
                      {kagawads.map((official) => (
                        <div key={official.id} className="flex flex-col items-center">
                          <div className="h-6 w-px bg-slate-300" />
                          <OfficialCard official={official} onClick={setViewingOfficial} />
                        </div>
                      ))}

                      {skChairman && (
                        <div key={skChairman.id} className="flex flex-col items-center">
                          <div className="h-6 w-px bg-slate-300" />
                          <OfficialCard official={skChairman} onClick={setViewingOfficial} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {viewingOfficial && (
        <FloatingModal
          open={!!viewingOfficial}
          onClose={() => setViewingOfficial(null)}
          title="Official Profile Details"
          eyebrow="Sangguniang Barangay"
          maxWidth="max-w-2xl"
          footer={
            <div className="flex justify-between items-center w-full">
              <button
                type="button"
                onClick={() => {
                  const officialToEdit = viewingOfficial;
                  setViewingOfficial(null);
                  openEditor(officialToEdit);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 shadow-md"
              >
                <Edit2 size={16} />
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => setViewingOfficial(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          }
        >
          <div className="flex flex-col gap-6 sm:flex-row items-center sm:items-start text-center sm:text-left">
            <Avatar official={viewingOfficial} size="lg" />
            <div className="flex-1 space-y-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900 leading-tight">
                  {viewingOfficial.name}
                </h3>
                <p className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-1">
                  {viewingOfficial.position}
                </p>

                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider border mt-3 ${
                  viewingOfficial.status === "Active"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${viewingOfficial.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                  {viewingOfficial.status || "Active"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 text-sm border-t border-slate-100 pt-4">
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 size={16} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800">Committee:</span> {viewingOfficial.committee || "None"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar size={16} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800">Term:</span> {viewingOfficial.termOfOffice || "2023 - 2026"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone size={16} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800">Contact:</span> {viewingOfficial.contact || "N/A"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail size={16} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-slate-800">Email:</span> {viewingOfficial.email || "N/A"}
                </div>
              </div>

              <div className="text-sm border-t border-slate-100 pt-4">
                <div className="flex items-start gap-2 text-slate-600">
                  <MapPin size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">Address:</span>
                    <p className="mt-0.5 text-slate-600">{viewingOfficial.address || "Barangay Upper Mingading, Aleosan, Cotabato"}</p>
                  </div>
                </div>
              </div>

              {viewingOfficial.focusArea && (
                <div className="text-sm border-t border-slate-100 pt-4">
                  <span className="font-bold text-slate-800 block mb-1">Focus Area:</span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {viewingOfficial.focusArea}
                  </p>
                </div>
              )}

              {viewingOfficial.background && (
                <div className="text-sm border-t border-slate-100 pt-4">
                  <span className="font-bold text-slate-800 block mb-1">Background / Service Notes:</span>
                  <p className="text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {viewingOfficial.background}
                  </p>
                </div>
              )}
            </div>
          </div>
        </FloatingModal>
      )}

      {draftOfficial && (
        <FloatingModal
          open={!!draftOfficial}
          onClose={closeEditor}
          title="Edit Official Profile"
          eyebrow="Sangguniang Barangay"
          maxWidth="max-w-3xl"
          footer={
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={closeEditor}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpdateOfficial}
                disabled={editingId !== draftOfficial.id || savingOfficial}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingOfficial ? "Saving..." : "Update Official"}
              </button>
            </div>
          }
        >
          <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center">
              <div className="flex flex-col items-center text-center">
                <Avatar official={draftOfficial} size="lg" />
                <p className="mt-3 text-sm font-bold text-slate-800">{draftOfficial.name}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {draftOfficial.position}
                </p>
              </div>

              <div className="mt-4 grid gap-2 w-full">
                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 w-full text-center">
                  <ImagePlus size={16} />
                  Upload Photo
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} className="sr-only" />
                </label>

                {draftOfficial.photoUrl && (
                  <button
                    type="button"
                    onClick={() => updateDraft("photoUrl", "")}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 w-full"
                  >
                    <X size={16} />
                    Remove Photo
                  </button>
                )}
              </div>

              <p className="mt-3 text-[11px] leading-relaxed text-slate-500 text-center">
                JPG, PNG, or WebP up to 8 MB. Photo is auto-resized.
              </p>

              {editorError && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 w-full text-center">
                  {editorError}
                </p>
              )}
            </section>

            <section className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700">
                  Full name
                  <input
                    value={draftOfficial.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    className={fieldClass}
                  />
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Position
                  <input
                    value={draftOfficial.position}
                    onChange={(event) => updateDraft("position", event.target.value)}
                    className={fieldClass}
                  />
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700 block">
                Committee / assignment
                <input
                  value={draftOfficial.committee}
                  onChange={(event) => updateDraft("committee", event.target.value)}
                  className={fieldClass}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 block">
                Focus area
                <textarea
                  value={draftOfficial.focusArea}
                  onChange={(event) => updateDraft("focusArea", event.target.value)}
                  rows={3}
                  className={`${fieldClass} resize-none leading-relaxed`}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm font-semibold text-slate-700 block">
                  Phone
                  <div className="relative mt-2">
                    <Phone className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input
                      value={draftOfficial.contact}
                      onChange={(event) => updateDraft("contact", event.target.value)}
                      placeholder="Optional"
                      className={`${fieldClass} mt-0 pl-10`}
                    />
                  </div>
                </label>

                <label className="text-sm font-semibold text-slate-700 block">
                  Email
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-3 top-3.5 text-slate-400" size={16} />
                    <input
                      type="email"
                      value={draftOfficial.email}
                      onChange={(event) => updateDraft("email", event.target.value)}
                      placeholder="Optional"
                      className={`${fieldClass} mt-0 pl-10`}
                    />
                  </div>
                </label>
              </div>

              <label className="text-sm font-semibold text-slate-700 block">
                Background / service notes
                <textarea
                  value={draftOfficial.background}
                  onChange={(event) => updateDraft("background", event.target.value)}
                  rows={4}
                  className={`${fieldClass} resize-none leading-relaxed`}
                />
              </label>

              <label className="text-sm font-semibold text-slate-700 block">
                Status
                <select
                  value={draftOfficial.status}
                  onChange={(event) => updateDraft("status", event.target.value)}
                  className={fieldClass}
                >
                  <option>Active</option>
                  <option>On leave</option>
                  <option>Former official</option>
                  <option>Vacant</option>
                </select>
              </label>
            </section>
          </div>
        </FloatingModal>
      )}
    </div>
  );
};

export default OrganizationChart;
