import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useConfirm } from "../context/ConfirmContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area
} from "recharts";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Bot,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  FileCheck2,
  FileText,
  HelpCircle,
  Home,
  KeyRound,
  Loader,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  RefreshCw,
  Send,
  Settings,
  User,
  X,
  Clock,
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  Info,
  CheckCircle,
  Briefcase,
  Star,
  Upload,
  AlertCircle,
  Users,
  MapPin,
  Sun,
  Trash2,
  Sparkles,
  Shield,
  Moon,
  Monitor,
  Eye,
  EyeOff
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { getCurrentUserWithProfile, logoutUser, uploadProfilePhoto } from "../services/authService";
import { getResidentById } from "../services/adminService";
import { fetchPublishedAnnouncements } from "../services/announcementService";
import {
  createDocumentRequest,
  fetchDocumentRequests,
  fetchDocumentTemplates,
  fetchResidentNotifications,
  getResidentDocumentRequests,
  markResidentNotificationRead,
} from "../services/documentRequestService";
import { fetchLivelihoodPosts, applyForLivelihood, fetchResidentLivelihoodApplications } from "../services/livelihoodService";
import { fetchResidentKnowledge } from "../services/knowledgeService";
import { askResidentAssistant } from "../services/residentAssistantService";
import { getOrganizationOfficials } from "../services/organizationService";
import {
  clearResidentSession,
  getResidentSession,
  saveResidentSession,
  updateResidentCredentials,
} from "../services/residentAuthService";
import {
  requestResidentProfileUpdate,
  updateResidentProfileDirect,
} from "../services/residentProfileUpdateService";
import { fetchResidentStats } from "../services/residentStatsService";
import {
  purokDefinitions,
  civilStatusOptions,
  educationalAttainmentOptions,
  householdRelationshipOptions,
  buildFullName,
  getResidentAge,
  calculateAge,
} from "../utils/residentProfile";
import TypingIndicator from "../components/TypingIndicator";

const ANNOUNCEMENT_READ_KEY = "kaagapai_read_announcements";
const LIVELIHOOD_READ_KEY = "kaagapai_read_livelihood_posts";
const ASSISTANT_HISTORY_KEY = "kaagapai_resident_assistant_messages";
const MAX_ASSISTANT_HISTORY_MESSAGES = 80;
const RESIDENT_KNOWLEDGE_LIMIT = 100;
const DEFAULT_ASSISTANT_MESSAGE = {
  id: "welcome",
  role: "assistant",
  text: "Hello! I can answer questions about your clearance status, council news, setting records, or other municipal details.",
};

const getStoredReadIds = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const saveStoredReadIds = (key, ids) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(ids));
  } catch (e) {
    console.warn("localStorage save failed:", e);
  }
};

const CHART_COLORS = ["#0B5D3B", "#1FA971", "#157347", "#86efac", "#dcfce7", "#34d399", "#059669"];

const RenderChatChart = ({ text }) => {
  const match = text.match(/\[CHART:(PIE|BAR):(.*?)\]/);
  if (!match) return <p className="whitespace-pre-line leading-relaxed font-medium">{text}</p>;

  const cleanText = text.replace(match[0], "").trim();
  const chartType = match[1];
  let data = [];
  try {
    const rawData = JSON.parse(match[2]);
    data = Object.keys(rawData).map(key => ({ name: key, value: rawData[key] }));
  } catch (e) {
    return <p className="whitespace-pre-line leading-relaxed font-medium">{text}</p>;
  }

  return (
    <div className="w-full flex flex-col gap-2">
      {cleanText && <p className="whitespace-pre-line leading-relaxed font-medium">{cleanText}</p>}
      <div className="w-full sm:w-[300px] mt-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-2" style={{ height: `${Math.max(176, data.length * 35)}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 10, right: 20, left: 20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} />
            <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: "#64748b" }} width={80} />
            <Tooltip
              cursor={{ fill: "#f1f5f9" }}
              contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", fontSize: "10px", fontWeight: "bold" }}
            />
            <Bar dataKey="value" fill="#0B5D3B" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};





const PROFILE_PHOTO_MAX_SIZE = 360;
const PROFILE_PHOTO_QUALITY = 0.82;
const PROFILE_PHOTO_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const isSupportedProfilePhoto = (file) => {
  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) ||
    ["jpg", "jpeg", "png", "webp", "gif"].includes(extension);
};

const compressProfilePhoto = async (file) => {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read file."));
    reader.readAsDataURL(file);
  });
  const image = await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to load image."));
    img.src = dataUrl;
  });
  const scale = Math.min(1, PROFILE_PHOTO_MAX_SIZE / Math.max(image.naturalWidth || 1, image.naturalHeight || 1));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context is null.");
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY);
};

const sidebarNavItems = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "documents", label: "Document Request", icon: ClipboardList },
  { key: "livelihood", label: "Livelihoods & Jobs", icon: Briefcase },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "my_documents", label: "Document Logs", icon: FileSpreadsheet },
  { key: "officials", label: "Barangay Officials", icon: Users },
];

const getStatusClass = (status) => {
  switch (status) {
    case "Pending":
      return "bg-amber-50 border-amber-250 text-amber-700";
    case "Processing":
      return "bg-blue-50 border-blue-250 text-blue-700";
    case "Approved":
      return "bg-emerald-50 border-emerald-250 text-emerald-700";
    case "Completed":
    case "Released":
      return "bg-teal-50 border-teal-250 text-teal-700";
    case "Rejected":
      return "bg-rose-50 border-rose-250 text-rose-700";
    default:
      return "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350";
  }
};

const AssistantAiIcon = () => (
  <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B5D3B] to-[#157347] text-white shadow-inner">
    <Bot className="h-[55%] w-[55%]" strokeWidth={2} />
  </span>
);

const UserDashboard = () => {
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const shouldReduceMotion = useReducedMotion();

  // App Telemetry States
  const [userData, setUserData] = useState(null);
  const [resident, setResident] = useState(null);
  const [requests, setRequests] = useState([]);
  const [allSystemRequests, setAllSystemRequests] = useState([]);
  const [documentTemplates, setDocumentTemplates] = useState([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState("");
  const [notifications, setNotifications] = useState([]);
  const [announcementReadIds, setAnnouncementReadIds] = useState([]);
  const [livelihoodReadIds, setLivelihoodReadIds] = useState([]);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState([]);
  
  const [opportunities, setOpportunities] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [residentStats, setResidentStats] = useState(null);
  const [portalError, setPortalError] = useState("");
  const [portalSuccess, setPortalSuccess] = useState("");
  const [residentApplications, setResidentApplications] = useState([]);

  // Redesign state additions
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsTab, setSettingsTab] = useState("security"); // default changed to security
  const [theme, setTheme] = useState(() => localStorage.getItem("kaagapai_resident_theme") || "system");
  const [fontSize, setFontSize] = useState(() => localStorage.getItem("kaagapai_resident_font_size") || "medium");
  const [smsNotificationsEnabled, setSmsNotificationsEnabled] = useState(() => localStorage.getItem("kaagapai_sms_notifications") !== "false");
  const [announcementSmsAlerts, setAnnouncementSmsAlerts] = useState(() => localStorage.getItem("kaagapai_announcements_pref") !== "false");
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false);
  const [latestAnnouncementToast, setLatestAnnouncementToast] = useState(null);
  const [latestNotificationToast, setLatestNotificationToast] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (publishedAnnouncements.length === 0 || !resident?.id) return;
    const latest = publishedAnnouncements[0];
    const lastViewedId = localStorage.getItem(`kaagapai_last_viewed_announcement_id_${resident.id}`);
    if (lastViewedId !== String(latest.id)) {
      setLatestAnnouncementToast(latest);
      const timer = setTimeout(() => {
        setLatestAnnouncementToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [publishedAnnouncements, resident?.id]);

  useEffect(() => {
    if (notifications.length === 0 || !resident?.id) return;
    const latest = notifications[0];
    const lastViewedId = localStorage.getItem(`kaagapai_last_viewed_notification_id_${resident.id}`);
    if (lastViewedId !== String(latest.id) && !latest.is_read) {
      setLatestNotificationToast(latest);
      const timer = setTimeout(() => {
        setLatestNotificationToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notifications, resident?.id]);

  const dismissToast = () => {
    if (latestAnnouncementToast && resident?.id) {
      localStorage.setItem(`kaagapai_last_viewed_announcement_id_${resident.id}`, String(latestAnnouncementToast.id));
      setLatestAnnouncementToast(null);
    }
    if (latestNotificationToast && resident?.id) {
      localStorage.setItem(`kaagapai_last_viewed_notification_id_${resident.id}`, String(latestNotificationToast.id));
      setLatestNotificationToast(null);
    }
  };

  const viewAnnouncementFromToast = () => {
    if (latestAnnouncementToast && resident?.id) {
      localStorage.setItem(`kaagapai_last_viewed_announcement_id_${resident.id}`, String(latestAnnouncementToast.id));
      setLatestAnnouncementToast(null);
      openModule("announcements");
    }
  };

  const viewNotificationFromToast = () => {
    if (latestNotificationToast && resident?.id) {
      localStorage.setItem(`kaagapai_last_viewed_notification_id_${resident.id}`, String(latestNotificationToast.id));
      setLatestNotificationToast(null);
      handleMarkNotificationRead(latestNotificationToast);
      
      const title = (latestNotificationToast.title || "").toLowerCase();
      if (title.includes("announcement")) openModule("announcements"); 
      else if (title.includes("livelihood") || title.includes("application")) openModule("livelihood"); 
      else openModule("documents");
    }
  };
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [systemTheme, setSystemTheme] = useState(() => {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    localStorage.setItem("kaagapai_resident_theme", theme);
    localStorage.setItem("kaagapai_resident_font_size", fontSize);
  }, [theme, fontSize]);

  const isDarkMode = useMemo(() => {
    if (theme === "dark") return true;
    if (theme === "light") return false;
    return systemTheme === "dark";
  }, [theme, systemTheme]);

  const handleSmsToggle = (val) => {
    setSmsNotificationsEnabled(val);
    localStorage.setItem("kaagapai_sms_notifications", String(val));
  };

  const handleAnnouncementToggle = (val) => {
    setAnnouncementSmsAlerts(val);
    localStorage.setItem("kaagapai_announcements_pref", String(val));
  };

  // Avatar states
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState("");
  const [avatarSuccess, setAvatarSuccess] = useState("");

  // Job Application Modal States
  const [selectedOppForApplication, setSelectedOppForApplication] = useState(null);
  const [jobAppStep, setJobAppStep] = useState(1);
  const [jobAppForm, setJobAppForm] = useState({
    education: "",
    skills: "",
    experience: "",
  });
  const [jobAppResume, setJobAppResume] = useState(null);
  const [jobAppLoading, setJobAppLoading] = useState(false);
  const [jobAppSuccess, setJobAppSuccess] = useState(false);
  const [jobAppError, setJobAppError] = useState("");

  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [refreshingRequests, setRefreshingRequests] = useState(false);
  const [requestMessage, setRequestMessage] = useState(null);
  const [activeNav, setActiveNav] = useState("dashboard");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState(() => [
    { ...DEFAULT_ASSISTANT_MESSAGE },
  ]);

  // Password update form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  // Registry Information form matching the Admin portal completely
  const [profileForm, setProfileForm] = useState({
    username: "",
    currentPassword: "",
    
    // Personal Details
    first_name: "",
    middle_name: "",
    last_name: "",
    suffix: "",
    full_name: "",
    sex: "Male",
    birthday: "",
    age: "",
    civil_status: "Single",
    nationality: "Filipino",
    religion: "",
    blood_type: "",

    // Contact Details
    phone: "",
    telephone: "",
    email: "",
    emergency_contact_person: "",
    emergency_contact_phone: "",

    // Address Details
    region: "",
    province: "",
    municipality: "",
    barangay: "",
    purok: "",
    address: "",
    zip_code: "",

    // Residency Details
    household_no: "",
    relationship_to_household_head: "Head",
    status: "Active",
    voter_status: "No",
    occupation: "",
    employment_status: "Employed",
    educational_attainment: "",
    years_of_residency: "",

    // Additional Details
    is_senior_citizen: false,
    is_pwd: false,
    is_solo_parent: false,
    indigenous_group: "",
    philhealth_no: "",
    sss_no: "",
    tin_no: "",
  });
  const [profileMessage, setProfileMessage] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const assistantMessagesEndRef = useRef(null);
  const skipAssistantHistorySaveRef = useRef(false);



  useEffect(() => {
    if (!assistantOpen) return;
    assistantMessagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [assistantLoading, assistantMessages, assistantOpen]);

  // Load Assistant History
  useEffect(() => {
    if (!resident?.id) return;
    try {
      const historyKey = `${ASSISTANT_HISTORY_KEY}:${resident.id}`;
      const parsed = JSON.parse(window.localStorage.getItem(historyKey) || "[]");
      if (parsed.length) {
        setAssistantMessages(parsed);
      } else {
        setAssistantMessages([{ ...DEFAULT_ASSISTANT_MESSAGE }]);
      }
    } catch {
      setAssistantMessages([{ ...DEFAULT_ASSISTANT_MESSAGE }]);
    }
  }, [resident?.id]);

  // Save Assistant History
  useEffect(() => {
    if (!resident?.id) return;
    if (skipAssistantHistorySaveRef.current) {
      skipAssistantHistorySaveRef.current = false;
      return;
    }
    const historyKey = `${ASSISTANT_HISTORY_KEY}:${resident.id}`;
    window.localStorage.setItem(historyKey, JSON.stringify(assistantMessages.slice(-MAX_ASSISTANT_HISTORY_MESSAGES)));
  }, [assistantMessages, resident?.id]);

  // Setup Form states when resident is fetched
  useEffect(() => {
    if (!resident) return;
    setProfileForm({
      username: resident.username || resident.portal_username || resident.email || "",
      currentPassword: "",
      
      first_name: resident.first_name || "",
      middle_name: resident.middle_name || "",
      last_name: resident.last_name || "",
      suffix: resident.suffix || "",
      full_name: resident.full_name || "",
      sex: resident.sex || resident.gender || "Male",
      birthday: resident.birthday || "",
      age: resident.age ?? "",
      civil_status: resident.civil_status || "Single",
      nationality: resident.nationality || "Filipino",
      religion: resident.religion || "",
      blood_type: resident.blood_type || "",

      phone: resident.phone || "",
      telephone: resident.telephone || "",
      email: resident.email || "",
      emergency_contact_person: resident.emergency_contact_person || "",
      emergency_contact_phone: resident.emergency_contact_phone || "",

      region: resident.region || "",
      province: resident.province || "",
      municipality: resident.municipality || "",
      barangay: resident.barangay || "",
      purok: resident.purok || "",
      address: resident.address || "",
      zip_code: resident.zip_code || "",

      household_no: resident.household_no || "",
      relationship_to_household_head: resident.relationship_to_household_head || "Head",
      status: resident.status || "Active",
      voter_status: resident.voter_status || "No",
      occupation: resident.occupation || "",
      employment_status: resident.employment_status || "Employed",
      educational_attainment: resident.educational_attainment || "",
      years_of_residency: resident.years_of_residency ?? "",

      is_senior_citizen: Boolean(resident.is_senior_citizen),
      is_pwd: Boolean(resident.is_pwd),
      is_solo_parent: Boolean(resident.is_solo_parent),
      indigenous_group: resident.indigenous_group || "",
      philhealth_no: resident.philhealth_no || "",
      sss_no: resident.sss_no || "",
      tin_no: resident.tin_no || "",
    });
    setProfileMessage(null);
  }, [resident]);

  // Age Auto-Calculation handler
  const handleBirthdayChange = (e) => {
    const bday = e.target.value;
    const calculatedAge = calculateAge(bday);
    const isSenior = calculatedAge !== null && calculatedAge >= 60;
    setProfileForm((current) => ({
      ...current,
      birthday: bday,
      age: calculatedAge ?? "",
      is_senior_citizen: isSenior,
    }));
  };

  const refreshResidentActivity = async (residentId, { showLoading = false } = {}) => {
    if (!residentId) return;
    if (showLoading) {
      setRefreshingRequests(true);
    }
    try {
      const [requestResult, notificationResult, systemRequestsResult, applicationsResult] = await Promise.allSettled([
        getResidentDocumentRequests(residentId),
        fetchResidentNotifications(residentId),
        fetchDocumentRequests({ limit: 500 }),
        fetchResidentLivelihoodApplications(residentId),
      ]);
      if (requestResult.status === "fulfilled") {
        setRequests(requestResult.value);
      }
      if (notificationResult.status === "fulfilled") {
        setNotifications(notificationResult.value);
      } else {
        setNotifications([]);
      }
      if (systemRequestsResult.status === "fulfilled") {
        setAllSystemRequests(systemRequestsResult.value?.data || []);
      }
      if (applicationsResult.status === "fulfilled") {
        setResidentApplications(applicationsResult.value || []);
      }
    } finally {
      if (showLoading) {
        setRefreshingRequests(false);
      }
    }
  };

  const refreshResidentBroadcasts = useCallback(async () => {
    const [announcementResult, opportunityResult, knowledgeResult, statsResult] = await Promise.allSettled([
      fetchPublishedAnnouncements(8),
      fetchLivelihoodPosts({ status: "Open", limit: 8 }),
      fetchResidentKnowledge(RESIDENT_KNOWLEDGE_LIMIT),
      fetchResidentStats(),
    ]);

    if (announcementResult.status === "fulfilled") {
      setPublishedAnnouncements(announcementResult.value);
    }
    if (opportunityResult.status === "fulfilled") {
      setOpportunities(opportunityResult.value);
    }
    if (knowledgeResult.status === "fulfilled") {
      setKnowledgeItems(knowledgeResult.value);
    }
    if (statsResult.status === "fulfilled") {
      setResidentStats(statsResult.value);
    }
  }, []);

  // Mounting load logic
  useEffect(() => {
    let isMounted = true;
    const loadDashboard = async () => {
      try {
        const [templatesResult, announcementResult, opportunityResult, knowledgeResult, statsResult] = await Promise.allSettled([
          fetchDocumentTemplates(),
          fetchPublishedAnnouncements(8),
          fetchLivelihoodPosts({ status: "Open", limit: 8 }),
          fetchResidentKnowledge(RESIDENT_KNOWLEDGE_LIMIT),
          fetchResidentStats(),
        ]);

        if (isMounted) {
          const templates = templatesResult.status === "fulfilled" ? templatesResult.value : [];
          setDocumentTemplates(templates);
          setSelectedDocumentType(templates[0]?.document_type || "");
          setPublishedAnnouncements(announcementResult.status === "fulfilled" ? announcementResult.value : []);
          setOpportunities(opportunityResult.status === "fulfilled" ? opportunityResult.value : []);
          setKnowledgeItems(knowledgeResult.status === "fulfilled" ? knowledgeResult.value : []);
          setResidentStats(statsResult.status === "fulfilled" ? statsResult.value : null);
        }

        const residentSession = getResidentSession();
        if (residentSession) {
          setUserData({
            user: { email: residentSession.username || residentSession.email },
            profile: { role: "resident", resident_id: residentSession.id },
          });

          try {
            const residentData = await getResidentById(residentSession.id);
            if (!isMounted) return;
            setResident({
              ...(residentData || {}),
              account_id: residentSession.account_id,
              username: residentSession.username || residentData?.portal_username || residentData?.username || "",
              account_status: residentSession.account_status,
              must_change_credentials: false,
            });
          } catch (err) {
            setResident({ ...residentSession, must_change_credentials: false });
          }
          await refreshResidentActivity(residentSession.id);
          return;
        }

        const currentUser = await getCurrentUserWithProfile();
        if (!isMounted) return;
        setUserData(currentUser);

        if (currentUser?.profile?.resident_id) {
          const residentData = await getResidentById(currentUser.profile.resident_id);
          if (!isMounted) return;
          setResident(residentData);
          await refreshResidentActivity(currentUser.profile.resident_id);
        }
      } catch (error) {
        console.error("Unable to load user dashboard:", error);
        if (isMounted) {
          setPortalError(error.message || "Unable to load resident dashboard data.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboard();
    return () => {
      isMounted = false;
    };
  }, []);

  
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };
  const dynamicGreeting = getGreeting();

  const displayName = useMemo(() => {
    return (
      resident?.full_name ||
      userData?.user?.user_metadata?.full_name ||
      userData?.user?.email?.split("@")[0] ||
      "Resident"
    );
  }, [resident, userData]);

  const residentUsername = resident?.username || resident?.email || "";

  useEffect(() => {
    if (!resident?.id) return undefined;
    const readIds = getStoredReadIds(`${ANNOUNCEMENT_READ_KEY}:${resident.id}`);
    const livelihoodIds = getStoredReadIds(`${LIVELIHOOD_READ_KEY}:${resident.id}`);
    setAnnouncementReadIds(readIds);
    setLivelihoodReadIds(livelihoodIds);
  }, [resident?.id]);

  useEffect(() => {
    if (!resident?.id) return undefined;
    const intervalId = window.setInterval(refreshResidentBroadcasts, 5000);
    return () => window.clearInterval(intervalId);
  }, [refreshResidentBroadcasts, resident?.id]);

  useEffect(() => {
    if (!resident?.id) return undefined;
    const refreshActivity = async () => {
      await refreshResidentActivity(resident.id);
    };
    const intervalId = window.setInterval(refreshActivity, 5000);
    return () => window.clearInterval(intervalId);
  }, [resident?.id]);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications]
  );

  const recentRequests = useMemo(() => {
    return [...requests]
      .slice(0, 5)
      .map((request) => ({
        ...request,
        title: request.document_type || "Document Request",
        dateLabel: new Date(request.created_at).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
          day: "numeric",
        }),
      }));
  }, [requests]);

  const handleApplyLivelihood = async (livelihoodId) => {
    if (!resident?.id) {
      setPortalError("Please log in to apply.");
      return;
    }
    setPortalError("");
    setPortalSuccess("");
    try {
      await applyForLivelihood(livelihoodId, resident.id);
      setPortalSuccess("Successfully applied! The admin has been notified.");
      const apps = await fetchResidentLivelihoodApplications(resident.id);
      setResidentApplications(apps || []);
    } catch (err) {
      setPortalError(err.message || "Failed to apply.");
    }
  };

  // Recharts Data Preprocessors
  const requestOverviewData = useMemo(() => {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const counts = months.reduce((acc, m) => {
      acc[m] = 0;
      return acc;
    }, {});
    
    allSystemRequests.forEach((r) => {
      const date = new Date(r.created_at);
      if (!isNaN(date)) {
        const mName = months[date.getMonth()];
        counts[mName]++;
      }
    });
    
    return months.map((m) => ({ name: m, Requests: counts[m] }));
  }, [allSystemRequests]);

  const docsRequestedData = useMemo(() => {
    const counts = {};
    allSystemRequests.forEach((r) => {
      const type = r.document_type || "Other";
      counts[type] = (counts[type] || 0) + 1;
    });
    return Object.keys(counts).map((k) => ({
      name: k.replace("Clearance", "").replace("Certificate of", "").trim(),
      count: counts[k]
    }));
  }, [allSystemRequests]);

  const requestStatusData = useMemo(() => {
    const pending = allSystemRequests.filter((r) => ["Pending", "Processing"].includes(r.status)).length;
    const approved = allSystemRequests.filter((r) => ["Approved", "Released"].includes(r.status)).length;
    const rejected = allSystemRequests.filter((r) => r.status === "Rejected").length;
    const completed = allSystemRequests.filter((r) => r.status === "Completed").length;
    
    return [
      { name: "Pending", value: pending, color: "#F59E0B" },
      { name: "Approved", value: approved, color: "#3B82F6" },
      { name: "Rejected", value: rejected, color: "#EF4444" },
      { name: "Completed", value: completed, color: "#10B981" }
    ].filter(item => item.value > 0);
  }, [allSystemRequests]);

  const announcementStatsData = useMemo(() => {
    const total = publishedAnnouncements.length;
    const lastViewedId = localStorage.getItem(`kaagapai_last_viewed_announcement_id_${resident?.id || ""}`);
    let unread = 0;
    if (total > 0 && lastViewedId) {
      unread = publishedAnnouncements.filter(a => String(a.id) !== lastViewedId).length;
    }
    const read = Math.max(0, total - unread);
    return [
      { name: "Published", count: total },
      { name: "Read", count: read },
      { name: "Unread", count: unread }
    ];
  }, [publishedAnnouncements, resident?.id]);

  const activityOverviewData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const counts = days.reduce((acc, d) => {
      acc[d] = 0;
      return acc;
    }, {});
    
    allSystemRequests.forEach((r) => {
      const date = new Date(r.created_at);
      if (!isNaN(date)) {
        const dName = days[date.getDay()];
        counts[dName]++;
      }
    });
    
    return days.map((d) => ({ name: d, Activity: counts[d] }));
  }, [allSystemRequests]);

  // Dynamic search filtering
  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return recentRequests;
    return recentRequests.filter((r) =>
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.status.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [recentRequests, searchQuery]);

  const filteredAnnouncements = useMemo(() => {
    if (!searchQuery.trim()) return publishedAnnouncements;
    return publishedAnnouncements.filter((a) =>
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.body.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [publishedAnnouncements, searchQuery]);



  const selectedTemplateDetails = useMemo(() => {
    if (!selectedDocumentType || !documentTemplates.length) return null;
    return documentTemplates.find((t) => t.document_type === selectedDocumentType);
  }, [selectedDocumentType, documentTemplates]);

  // Navigation handlers
  const openModule = (itemKey, subTabKey = "personal_info") => {
    setActiveNav(itemKey);
    setSettingsTab(subTabKey);
    setMobileSidebarOpen(false);
    setShowAccountMenu(false);
    setShowNotificationMenu(false);
    setDocumentModalOpen(false);
    if (itemKey === "assistant") {
      setAssistantOpen(true);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    const ok = await confirm({
      title: "Confirm Logout",
      message: "Are you sure you want to log out of your KaagapAI Resident Account?",
      confirmText: "Logout",
      cancelText: "Cancel",
      variant: "danger",
      icon: LogOut,
    });
    if (!ok) return;

    const goodbyeName = displayName;
    clearResidentSession();
    await logoutUser();
    navigate("/goodbye", {
      replace: true,
      state: { displayName: goodbyeName, role: "resident" },
    });
  };

  const handlePrompt = (promptText) => {
    setAssistantOpen(true);
    setAssistantInput(promptText);
  };

  const handleAssistantSubmit = async (event) => {
    event.preventDefault();
    const question = assistantInput.trim();
    if (!question) return;

    const userMessage = { id: `user-${Date.now()}`, role: "user", text: question };
    setAssistantMessages((current) => [...current, userMessage]);
    setAssistantInput("");
    setAssistantLoading(true);

    try {
      const organizationOfficials = getOrganizationOfficials();
      const startTime = Date.now();
      const answer = await askResidentAssistant(question, {
        announcements: publishedAnnouncements,
        documentTemplates,
        knowledgeItems,
        opportunities,
        organizationOfficials,
        requests,
        resident,
        residentStats,
      });

      const elapsed = Date.now() - startTime;
      if (elapsed < 1000) {
        await new Promise((resolve) => setTimeout(resolve, 1000 - elapsed));
      }

      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: answer,
        },
      ]);
    } catch (error) {
      setAssistantMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: error.message || "Concierge could not process this question. Please try again.",
        },
      ]);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleDocumentRequest = async (event) => {
    event.preventDefault();
    if (!resident?.id) {
      setRequestMessage({ type: "error", text: "Unable to find resident registry ID." });
      return;
    }
    if (!selectedDocumentType) {
      setRequestMessage({ type: "error", text: "Please select a clearance template." });
      return;
    }

    setRequesting(true);
    setRequestMessage(null);

    try {
      const newRequest = await createDocumentRequest({
        resident_id: resident.id,
        document_type: selectedDocumentType,
      });
      setRequests((current) => [newRequest, ...current]);
      await refreshResidentActivity(resident.id);
      setRequestMessage({
        type: "success",
        text: `Application for ${selectedDocumentType} submitted successfully.`,
      });
      setDocumentModalOpen(false);
    } catch (error) {
      setRequestMessage({
        type: "error",
        text: error.message || "Failed to submit request.",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleMarkNotificationRead = async (notification) => {
    try {
      if (notification.type === "announcement") {
        const next = [...new Set([...announcementReadIds, notification.announcement_id])];
        saveStoredReadIds(`${ANNOUNCEMENT_READ_KEY}:${resident?.id}`, next);
        setAnnouncementReadIds(next);
        return;
      }
      if (notification.type === "livelihood") {
        const next = [...new Set([...livelihoodReadIds, notification.livelihood_id])];
        saveStoredReadIds(`${LIVELIHOOD_READ_KEY}:${resident?.id}`, next);
        setLivelihoodReadIds(next);
        return;
      }
      await markResidentNotificationRead(notification.id);
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
    } catch (error) {
      console.warn("Unable to read notification:", error.message);
    }
  };

  // Profile Picture Upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAvatarSaving(true);
    setAvatarError("");
    setAvatarSuccess("");

    try {
      if (!isSupportedProfilePhoto(file)) {
        throw new Error("Please choose a JPG, PNG, or WebP image.");
      }
      if (file.size > PROFILE_PHOTO_MAX_UPLOAD_BYTES) {
        throw new Error("Profile photo must be 5 MB or smaller.");
      }

      let publicUrl;
      try {
        publicUrl = await uploadProfilePhoto(resident.id, file);
      } catch (uploadErr) {
        console.warn("Storage upload failed, falling back to base64 compression.", uploadErr);
        publicUrl = await compressProfilePhoto(file);
      }

      const { error } = await supabase.rpc("update_resident_avatar", {
        p_resident_id: resident.id,
        p_photo_url: publicUrl,
      });

      if (error) throw error;

      const nextResident = { ...resident, profile_photo_url: publicUrl };
      saveResidentSession(nextResident);
      setResident(nextResident);
      setAvatarSuccess("Profile photo updated successfully!");
    } catch (err) {
      setAvatarError(err.message || "Failed to update profile photo.");
    } finally {
      setAvatarSaving(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarSaving(true);
    setAvatarError("");
    setAvatarSuccess("");

    try {
      const { error } = await supabase.rpc("update_resident_avatar", {
        p_resident_id: resident.id,
        p_photo_url: null,
      });

      if (error) throw error;

      const nextResident = { ...resident, profile_photo_url: null };
      saveResidentSession(nextResident);
      setResident(nextResident);
      setAvatarSuccess("Profile photo removed.");
    } catch (err) {
      setAvatarError(err.message || "Failed to remove profile photo.");
    } finally {
      setAvatarSaving(false);
    }
  };

  // Direct Profile Updates
  const getProfileChanges = (form, res) => {
    const fields = [
      "first_name",
      "middle_name",
      "last_name",
      "suffix",
      "full_name",
      "sex",
      "birthday",
      "age",
      "civil_status",
      "nationality",
      "religion",
      "blood_type",
      "phone",
      "telephone",
      "email",
      "emergency_contact_person",
      "emergency_contact_phone",
      "region",
      "province",
      "municipality",
      "barangay",
      "purok",
      "address",
      "zip_code",
      "household_no",
      "relationship_to_household_head",
      "status",
      "voter_status",
      "occupation",
      "employment_status",
      "educational_attainment",
      "years_of_residency",
      "is_senior_citizen",
      "is_pwd",
      "is_solo_parent",
      "indigenous_group",
      "philhealth_no",
      "sss_no",
      "tin_no",
    ];
    return fields.reduce((acc, field) => {
      const formVal = form[field];
      const currentVal = res[field];
      
      if (typeof formVal === "boolean") {
        if (formVal !== Boolean(currentVal)) {
          acc[field] = formVal;
        }
      } else {
        const formStr = String(formVal || "").trim();
        const currentStr = String(currentVal || "").trim();
        if (formStr !== currentStr) {
          acc[field] = formStr;
        }
      }
      return acc;
    }, {});
  };

  const handleProfileUpdate = (event) => {
    if (event) event.preventDefault();
    if (!resident?.id || !residentUsername) {
      setProfileMessage({ type: "error", text: "Unable to resolve resident record." });
      return;
    }

    const combinedFullName = [profileForm.first_name, profileForm.middle_name, profileForm.last_name]
      .filter(Boolean)
      .join(" ");
    const updatedForm = {
      ...profileForm,
      full_name: combinedFullName,
    };
    const changes = getProfileChanges(updatedForm, resident);

    if (Object.keys(changes).length === 0) {
      setProfileMessage({ type: "error", text: "No changes detected to submit." });
      return;
    }

    setConfirmPassword("");
    setConfirmPasswordError("");
    setPasswordConfirmOpen(true);
  };

  const handleProfileUpdateConfirm = async (e) => {
    if (e) e.preventDefault();
    if (!confirmPassword.trim()) {
      setConfirmPasswordError("Password is required.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);
    setConfirmPasswordError("");

    const combinedFullName = [profileForm.first_name, profileForm.middle_name, profileForm.last_name]
      .filter(Boolean)
      .join(" ");
    
    const updatedForm = {
      ...profileForm,
      full_name: combinedFullName,
    };

    const changes = getProfileChanges(updatedForm, resident);

    try {
      const result = await updateResidentProfileDirect({
        residentId: resident.id,
        currentUsername: residentUsername,
        currentPassword: confirmPassword,
        requestedUsername: null,
        changes,
      });

      const nextSession = {
        ...resident,
        username: result.username || resident.username,
        full_name: result.full_name || resident.full_name,
        ...changes,
      };

      saveResidentSession(nextSession);
      setResident(nextSession);
      setPasswordConfirmOpen(false);
      setProfileMessage({
        type: "success",
        text: "Your registry profile has been updated and synchronized successfully.",
      });
    } catch (err) {
      setConfirmPasswordError(err.message || "Failed to update profile. Please verify your password.");
    } finally {
      setSavingProfile(false);
    }
  };



  // Secure Password Change
  const handlePasswordUpdate = async (event) => {
    event.preventDefault();
    if (!passwordForm.currentPassword.trim()) {
      setPasswordMessage({ type: "error", text: "Current password is required." });
      return;
    }
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const isStrong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(passwordForm.newPassword);
    if (!isStrong) {
      setPasswordMessage({
        type: "error",
        text: "Password must be at least 8 characters and contain uppercase, lowercase, and a number.",
      });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      await updateResidentCredentials({
        currentUsername: resident.username,
        currentPassword: passwordForm.currentPassword,
        newUsername: resident.username,
        newPassword: passwordForm.newPassword,
      });

      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setPasswordMessage({
        type: "success",
        text: "Password updated securely.",
      });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error.message || "Unable to change password. Please verify current credentials.",
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Job Application Wizard
  const openJobApplication = (opp) => {
    setSelectedOppForApplication(opp);
    setJobAppStep(1);
    setJobAppForm({
      education: resident?.educational_attainment || "",
      skills: "",
      experience: "",
    });
    setJobAppResume(null);
    setJobAppSuccess(false);
    setJobAppError("");
  };

  const handleJobAppSubmit = (e) => {
    e.preventDefault();
    setJobAppError("");

    if (jobAppStep === 1) {
      setJobAppStep(2);
      return;
    }
    if (jobAppStep === 2) {
      if (!jobAppForm.skills.trim()) {
        setJobAppError("Please briefly list your skills.");
        return;
      }
      setJobAppStep(3);
      return;
    }
    if (jobAppStep === 3) {
      if (!jobAppResume) {
        setJobAppError("Please upload a resume file.");
        return;
      }
      setJobAppStep(4);
      return;
    }

    setJobAppLoading(true);
    setTimeout(() => {
      setJobAppLoading(false);
      setJobAppSuccess(true);
    }, 1000);
  };

  const renderDocumentRequestForm = () => (
    <form onSubmit={handleDocumentRequest} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 dark:text-slate-500">Clearance Document Type *</label>
        <select
          value={selectedDocumentType}
          onChange={(event) => setSelectedDocumentType(event.target.value)}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-900 outline-none transition focus:border-[#0B5D3B] focus:bg-white dark:bg-slate-900"
        >
          {documentTemplates.length === 0 ? (
            <option value="">No templates available</option>
          ) : (
            documentTemplates.map((template) => (
              <option key={template.id} value={template.document_type}>
                {template.template_name || template.document_type}
              </option>
            ))
          )}
        </select>
      </div>

      {requestMessage && (
        <div
          className={`rounded-xl px-4 py-2.5 text-xs font-bold ${
            requestMessage.type === "success"
              ? "border border-emerald-100 bg-emerald-50 text-emerald-800"
              : "border border-rose-100 bg-rose-50 text-rose-800"
          }`}
        >
          {requestMessage.text}
        </div>
      )}

      <button
        type="submit"
        disabled={requesting || !selectedDocumentType}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] py-2.5 text-xs font-bold text-white shadow-md transition hover:scale-101 hover:shadow-lg disabled:bg-slate-200 disabled:text-slate-400 dark:text-slate-500 disabled:border-none disabled:shadow-none"
      >
        {requesting ? <Loader size={12} className="animate-spin" /> : <PlusCircle size={12} />}
        {requesting ? "Submitting application..." : "Submit Application"}
      </button>
    </form>
  );

  if (loading) {
    const darkLoader = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    return (
      <div className={`flex min-h-screen items-center justify-center px-4 transition-colors ${
        darkLoader ? "bg-slate-950 text-white" : "bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200"
      }`}>
        <motion.div
          className={`flex flex-col items-center rounded-2xl border px-12 py-10 text-center shadow-xl ${
            darkLoader ? "bg-slate-900 border-slate-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Loader size={36} className="animate-spin text-[#0B5D3B]" />
          <p className="mt-4 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Loading Resident Workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`app-shell font-sans antialiased ${isDarkMode ? "dark" : ""} ${fontSize === "small" ? "text-sm" : fontSize === "large" ? "text-sm" : "text-xs"}`}>
      
      {/* 1. Sidebar (Dark Emerald Branding Menu) */}
      <aside className={`app-sidebar ${mobileSidebarOpen ? "open" : ""} flex flex-col justify-between`}>
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Brgy. Seal"
                className="h-14 w-14 shrink-0 object-contain rounded-full shadow-lg border-2 border-white/20 bg-white"
                onError={(e) => {
                  e.target.src = "https://placehold.co/100x100/0b5d3b/ffffff?text=Seal";
                }}
              />
              <div className="min-w-0 animate-fadeIn">
                <p className="text-sm font-black uppercase tracking-wider text-emerald-350">Upper Mingading</p>
                <h2 className="text-xs font-black text-white truncate">KaagapAI</h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden rounded-full p-1 hover:bg-white/10 text-white"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="space-y-1">
            {sidebarNavItems.map((item) => {
              const Icon = item.icon;
              const active = activeNav === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => openModule(item.key)}
                  className={`nav-item w-full ${active ? "active" : ""}`}
                >
                  <Icon size={18} className={`shrink-0 ${active ? "text-[#1FA971]" : "text-emerald-100/60"}`} />
                  <span className="nav-label ml-2 truncate">{item.label}</span>
                </button>
              );
            })}
            
            <button
              type="button"
              onClick={handleLogout}
              className="nav-item w-full text-rose-200 hover:bg-rose-950/30 mt-1"
            >
              <LogOut size={18} className="shrink-0 text-rose-400" />
              <span className="nav-label ml-2">Logout</span>
            </button>
          </nav>
        </div>
      </aside>

      {/* Main Body */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="app-header">
          <div className="header-left gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden rounded-xl border p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition shadow-sm"
              aria-label="Open mobile menu"
            >
              <Menu size={16} />
            </button>
            <div className="flex items-center gap-2.5">
              <img
                src="/logo.png"
                alt="Logo"
                className="h-9 w-9 object-contain rounded-full shadow-sm border border-emerald-100 bg-white"
                onError={(e) => {
                  e.target.src = "https://placehold.co/100x100/0b5d3b/ffffff?text=Logo";
                }}
              />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[10px] font-black tracking-widest uppercase text-emerald-600 dark:text-emerald-500">KaagapAI Portal</span>
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  {dynamicGreeting}, {resident?.first_name || displayName}
                </h2>
              </div>
            </div>
          </div>
          
          <div className="header-right">
            <div className="hidden md:block w-72 max-w-sm mr-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements or requests..."
                className={`w-full rounded-xl border px-3.5 py-1.5 text-sm font-semibold outline-none transition ${isDarkMode ? "border-slate-800 bg-slate-950 text-white focus:border-emerald-500" : "border-slate-200/60 bg-slate-50 text-slate-900 focus:border-[#0E6B3A]"}`}
              />
            </div>
            
            <div className="hidden sm:block text-right mr-2">
              <span className="text-sm text-slate-400 font-bold uppercase tracking-wide">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </span>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowAccountMenu(false); setShowNotificationMenu(!showNotificationMenu); }}
                className={`relative flex h-8 w-8 items-center justify-center rounded-xl border shadow-2xs transition ${isDarkMode ? "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-900 hover:text-white" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-805"}`}
              >
                <Bell size={14} />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-600 px-1 text-sm font-bold text-white ring-2 ring-white dark:ring-slate-900 animate-pulse">
                    {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
                  </span>
                )}
              </button>

              <AnimatePresence>
                {showNotificationMenu && (
                  <>
                    <div className="fixed inset-0 z-45" onClick={() => setShowNotificationMenu(false)} />
                    <motion.div
                      className={`absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border shadow-xl ${isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white border-slate-200 text-slate-808"}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    >
                      <div className={`flex items-center justify-between border-b px-4 py-2.5 ${isDarkMode ? "border-slate-800 bg-slate-950" : "border-slate-100 bg-slate-50"}`}>
                        <p className="text-sm font-black uppercase tracking-wider text-slate-505">Notifications</p>
                        <span className={`rounded-full px-2 py-0.5 text-sm font-bold ${isDarkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-805"}`}>
                          {unreadNotificationCount} New
                        </span>
                      </div>
                      <div className="max-h-72 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-bold">No recent alerts.</div>
                        ) : (
                          notifications.map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                handleMarkNotificationRead(n);
                                setShowNotificationMenu(false);
                                const title = (n.title || "").toLowerCase();
                                if (title.includes("announcement")) openModule("announcements");
                                else if (title.includes("livelihood") || title.includes("application")) openModule("livelihood");
                                else openModule("documents");
                              }}
                              className={`w-full flex gap-2.5 p-3 text-left transition-colors ${isDarkMode ? `hover:bg-slate-800 ${!n.is_read ? "bg-emerald-505/5" : ""}` : `hover:bg-slate-50 ${!n.is_read ? "bg-emerald-50/20" : ""}`}`}
                            >
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${isDarkMode ? "bg-slate-805 text-emerald-400" : "bg-emerald-50 text-emerald-700"}`}>
                                <FileText size={13} />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-bold">{n.title}</p>
                                <p className={`mt-0.5 line-clamp-2 text-sm leading-normal font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>{n.message}</p>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => { setShowNotificationMenu(false); setShowAccountMenu(!showAccountMenu); }}
                className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-emerald-200 hover:border-emerald-400 bg-slate-50 shadow-sm transition transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {resident?.profile_photo_url ? (
                  <img src={resident.profile_photo_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-black text-emerald-800 bg-emerald-50">
                    {displayName[0]?.toUpperCase() || "R"}
                  </div>
                )}
              </button>
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 z-10"></div>

              <AnimatePresence>
                {showAccountMenu && (
                  <>
                    <div className="fixed inset-0 z-45" onClick={() => setShowAccountMenu(false)} />
                    <motion.div
                      className={`absolute right-0 z-50 mt-2 w-52 rounded-2xl border p-1.5 shadow-xl backdrop-blur-md ${isDarkMode ? "bg-slate-900/95 border-slate-800 text-white" : "bg-white dark:bg-slate-900/95 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    >
                      <div className={`px-3 py-2.5 mb-1.5 text-center border-b ${isDarkMode ? "border-slate-800 bg-slate-950/40" : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50"}`}>
                        <div className="mx-auto h-10 w-10 overflow-hidden rounded-full border mb-2 border-slate-200 dark:border-slate-800">
                          {resident?.profile_photo_url ? (
                            <img src={resident.profile_photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-black text-emerald-800 bg-emerald-50">{displayName[0]?.toUpperCase() || "R"}</div>
                          )}
                        </div>
                        <p className="truncate text-xs font-black">{displayName}</p>
                        <p className="truncate text-sm text-slate-400 dark:text-slate-500 font-bold mt-0.5">{residentUsername}</p>
                      </div>

                      {[
                        { key: "profile", label: "My Profile", icon: User },
                        { key: "personal_info", label: "Personal Information", icon: FileText },
                        { key: "settings", sub: "security", label: "Settings", icon: Settings },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setShowAccountMenu(false); openModule(item.key, item.sub); }}
                          className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs font-bold transition ${isDarkMode ? "text-slate-300 hover:bg-slate-800 hover:text-white" : "text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:bg-slate-950 hover:text-slate-900"}`}
                        >
                          <item.icon size={13} className="text-[#0B5D3B] dark:text-emerald-450 shrink-0" />
                          {item.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto pb-24">
          
          {portalError && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800 shadow-sm">
              <AlertCircle size={16} className="text-rose-600 shrink-0" />
              <span>{portalError}</span>
            </div>
          )}

          {portalSuccess && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-sm">
              <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              <span>{portalSuccess}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD OVERVIEW */}
          {activeNav === "dashboard" && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Statistics Grid */}
              <div className="stats-grid lg:hidden">
                {[
                  { label: "Pending", value: requests.filter((r) => ["Pending", "Processing"].includes(r.status)).length, icon: Clock, trend: "In Queue" },
                  { label: "Approved", value: requests.filter((r) => ["Approved", "Released"].includes(r.status)).length, icon: CheckCircle, trend: "Released" },
                  { label: "Rejected", value: requests.filter((r) => r.status === "Rejected").length, icon: AlertCircle, trend: "Action Needed" },
                  { label: "Completed", value: requests.filter((r) => r.status === "Completed").length, icon: FileCheck2, trend: "Archived" }
                ].map((stat, i) => (
                  <div key={i} className="stat-card">
                    <div className="flex items-start justify-between opacity-70">
                      <p className="text-sm font-black uppercase tracking-wider truncate">{stat.label}</p>
                      <stat.icon size={16} />
                    </div>
                    <div className="mt-2">
                      <p className="stat-number">{stat.value}</p>
                      <span className="inline-flex items-center text-sm font-bold mt-1 opacity-70">
                        {stat.trend}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analytics Dashboard section */}
              <div className="space-y-3">
                <h3 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Dashboard Analytics</h3>
                <div className="analytics-grid">
                  
                  {/* Line Chart: Request Overview */}
                  <div className="chart-card flex flex-col h-72">
                    <p className="text-sm font-black uppercase tracking-wider opacity-60 mb-4 leading-none">Request Overview (Monthly)</p>
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={requestOverviewData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                          <XAxis dataKey="name" stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} />
                          <YAxis stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: isDarkMode ? "#1e293b" : "#ffffff", borderColor: isDarkMode ? "#334155" : "#e5e7eb" }} />
                          <Line type="monotone" dataKey="Requests" stroke={isDarkMode ? "#10b981" : "#0E6B3A"} strokeWidth={2} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Doughnut Chart: Request Status */}
                  <div className="chart-card flex flex-col h-72">
                    <p className="text-sm font-black uppercase tracking-wider opacity-60 mb-4 leading-none">Application Status Ratio</p>
                    <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                      {requestStatusData.length === 0 ? (
                        <div className="opacity-60 text-xs font-bold">No request logs.</div>
                      ) : (
                        <div className="w-full h-full flex flex-col sm:flex-row items-center justify-center gap-4">
                          <div className="w-28 h-28 relative shrink-0">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={requestStatusData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={28}
                                  outerRadius={44}
                                  paddingAngle={3}
                                  dataKey="value"
                                >
                                  {requestStatusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex flex-col gap-1 text-sm font-black">
                            {requestStatusData.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                <span className="opacity-70 uppercase tracking-wider">{item.name}:</span>
                                <span>{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Bar Chart: Documents Requested */}
                  <div className="chart-card flex flex-col h-72">
                    <p className="text-sm font-black uppercase tracking-wider opacity-60 mb-4 leading-none">Clearance Document Types</p>
                    <div className="flex-1 w-full min-h-0">
                      {docsRequestedData.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center opacity-60 text-xs font-bold">No clearance data available.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={docsRequestedData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                            <XAxis dataKey="name" stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={8} interval={0} />
                            <YAxis stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} allowDecimals={false} />
                            <Tooltip contentStyle={{ background: isDarkMode ? "#1e293b" : "#ffffff", borderColor: isDarkMode ? "#334155" : "#e5e7eb" }} />
                            <Bar dataKey="count" fill={isDarkMode ? "#10b981" : "#0E6B3A"} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  </div>

                  {/* Bar Chart: Announcement Stats */}
                  <div className="chart-card flex flex-col h-72">
                    <p className="text-sm font-black uppercase tracking-wider opacity-60 mb-4 leading-none">Announcement Statistics</p>
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={announcementStatsData}>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                          <XAxis dataKey="name" stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} />
                          <YAxis stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: isDarkMode ? "#1e293b" : "#ffffff", borderColor: isDarkMode ? "#334155" : "#e5e7eb" }} />
                          <Bar dataKey="count" fill={isDarkMode ? "#0E6B3A" : "#10B981"} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Area Chart: Resident Activity Timeline */}
                  <div className="chart-card chart-full flex flex-col h-72">
                    <p className="text-sm font-black uppercase tracking-wider opacity-60 mb-4 leading-none">Portal Activity Timeline (Weekly)</p>
                    <div className="flex-1 w-full min-h-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={activityOverviewData}>
                          <defs>
                            <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={isDarkMode ? "#10b981" : "#0E6B3A"} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={isDarkMode ? "#10b981" : "#0E6B3A"} stopOpacity={0.0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? "#334155" : "#e5e7eb"} />
                          <XAxis dataKey="name" stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} />
                          <YAxis stroke={isDarkMode ? "#94a3b8" : "#6b7280"} fontSize={9} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: isDarkMode ? "#1e293b" : "#ffffff", borderColor: isDarkMode ? "#334155" : "#e5e7eb" }} />
                          <Area type="monotone" dataKey="Activity" stroke={isDarkMode ? "#10b981" : "#0E6B3A"} strokeWidth={1.5} fillOpacity={1} fill="url(#colorActivity)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Dashboard Workspace Grid */}
              <div className="bottom-grid">
                
                {/* Left Columns: Recent Requests & Activities */}
                <div className="lg:col-span-2 space-y-6">
                  
                  
                    {/* Announcements Feed */}
                    <div className="section-card animate-fadeIn">
                      <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Latest Announcements</h4>
                        <Megaphone size={13} className="text-[#0E6B3A] dark:text-emerald-450" />
                      </div>
                      <div className="space-y-3">
                        {publishedAnnouncements.slice(0, 3).map((ann) => (
                          <div key={ann.id} className={`p-3 rounded-xl border text-sm ${isDarkMode ? "bg-slate-950 border-slate-850 text-slate-300" : "bg-white border-slate-200 text-slate-700"}`}>
                            <p className="font-black text-emerald-600 dark:text-emerald-400 mb-1">{ann.title}</p>
                            <p className="line-clamp-2">{ann.content}</p>
                          </div>
                        ))}
                        {publishedAnnouncements.length === 0 && (
                          <p className="text-xs text-slate-500 font-bold text-center py-4">No recent announcements.</p>
                        )}
                      </div>
                    </div>
                    
                    {/* My Recent Requests list */}
                  <div className="section-card">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Recent Requests</h4>
                      <FileSpreadsheet size={13} className="text-[#0E6B3A] dark:text-emerald-450" />
                    </div>
                    
                    <div className="space-y-2.5">
                      {filteredRequests.slice(0, 3).map((req) => (
                        <div
                          key={req.id}
                          className={`flex items-center justify-between p-3 rounded-xl border text-xs font-semibold ${
                            isDarkMode ? "bg-slate-950 border-slate-850 hover:bg-slate-900/40 text-slate-350" : "bg-slate-50/50 border-slate-100 hover:bg-slate-55 hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`font-black truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>{req.title}</p>
                            <p className="text-sm text-slate-450 mt-0.5">Submitted: {req.dateLabel}</p>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-sm font-black border ${getStatusClass(req.status)}`}>
                              {req.status}
                            </span>
                            <button
                              type="button"
                              onClick={() => openModule("my_documents")}
                              className="text-sm font-black text-[#0E6B3A] dark:text-emerald-450 hover:underline"
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {filteredRequests.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-8 space-y-3 animate-fadeIn">
                          <div className={`h-12 w-12 rounded-2xl border-2 border-dashed flex items-center justify-center ${
                            isDarkMode ? "border-slate-800 text-slate-600 bg-slate-950/40" : "border-slate-200 text-slate-300 bg-slate-50/40"
                          }`}>
                            <FileText size={20} />
                          </div>
                          <div className="space-y-0.5">
                            <p className={`text-xs font-black ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>No requests yet.</p>
                            <p className="text-sm text-slate-400 font-bold">Request your first barangay document.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => openModule("documents")}
                            className="inline-flex items-center justify-center gap-1.5 px-4.5 py-2 text-sm font-black bg-[#0E6B3A] hover:bg-[#0E6B3A]/90 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl shadow-xs transition"
                          >
                            <PlusCircle size={10} />
                            Request Now
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Activity Timeline Tracker */}
                  <div className="section-card">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-3 mb-4 flex justify-between items-center">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Recent Activity</h4>
                      <TrendingUp size={13} className="text-[#0E6B3A] dark:text-emerald-455" />
                    </div>
                    <div className="space-y-4">
                      {requests.slice(0, 2).map((req, idx) => (
                        <div key={req.id} className="relative flex gap-3 pb-1">
                          {idx < requests.slice(0, 2).length - 1 && (
                            <span className="absolute left-[13px] top-7 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800" />
                          )}
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 border ${
                            isDarkMode ? "bg-slate-950 border-slate-800 text-slate-450" : "bg-slate-50 border-slate-200 text-slate-505"
                          }`}>
                            <FileText size={12} />
                          </div>
                          <div className={`min-w-0 flex-1 border rounded-xl p-3 ${
                            isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50/50 border-slate-100/70"
                          }`}>
                            <p className={`text-xs font-black ${isDarkMode ? "text-slate-300" : "text-slate-800"}`}>
                              Clearance request {req.document_type} status update: <span className="text-[#0E6B3A] dark:text-emerald-450">{req.status}</span>
                            </p>
                            <p className="text-sm text-slate-400 font-bold mt-1">
                              {new Date(req.updated_at || req.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {requests.length === 0 && (
                        <p className="text-sm text-slate-450 text-center py-6 font-bold">No activities registered.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Columns: Announcements, Events & Quick services */}
                <div className="space-y-6">
                  
                  {/* Latest Announcements */}
                  <div className="section-card">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3 flex justify-between items-center">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Barangay Announcements</h4>
                      <Megaphone size={13} className="text-[#0E6B3A] dark:text-emerald-455" />
                    </div>
                    <div className="space-y-3">
                      {filteredAnnouncements.slice(0, 3).map((ann) => {
                        const isUnread = localStorage.getItem(`kaagapai_last_viewed_announcement_id_${resident?.id || ""}`) !== String(ann.id);
                        return (
                          <div
                            key={ann.id}
                            className={`border p-3 rounded-xl flex flex-col justify-between relative ${
                              isDarkMode ? "bg-slate-950/40 border-slate-855" : "bg-slate-50 border-slate-100"
                            }`}
                          >
                            {isUnread && (
                              <span className="absolute top-2.5 right-2.5 flex h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                            )}
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-black uppercase tracking-wider bg-[#0E6B3A]/10 text-[#0E6B3A] dark:bg-emerald-500/10 dark:text-emerald-450 px-1.5 py-0.5 rounded-md">
                                  {ann.category || "General"}
                                </span>
                                <span className="text-sm text-slate-400 font-bold">
                                  {new Date(ann.created_at || ann.published_at).toLocaleDateString()}
                                </span>
                              </div>
                              <h5 className={`text-sm font-black truncate mt-1.5 ${isDarkMode ? "text-white" : "text-slate-800"}`}>{ann.title}</h5>
                              <p className="text-sm text-slate-450 line-clamp-2 mt-1 leading-normal font-bold">{ann.body}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                localStorage.setItem("kaagapai_last_viewed_announcement_id", String(ann.id));
                                openModule("announcements");
                              }}
                              className="mt-2.5 text-right text-sm font-black text-[#0E6B3A] dark:text-emerald-450 hover:underline"
                            >
                              Read More
                            </button>
                          </div>
                        );
                      })}
                      
                      {publishedAnnouncements.length > 3 && (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={() => openModule("announcements")}
                            className="text-sm font-black text-[#0E6B3A] dark:text-emerald-450 hover:underline"
                          >
                            View All Announcements →
                          </button>
                        </div>
                      )}
                      
                      {publishedAnnouncements.length === 0 && (
                        <p className="text-sm text-slate-450 text-center py-4 font-bold">No announcements.</p>
                      )}
                    </div>
                  </div>

                  {/* Upcoming events list */}
                  <div className="section-card">
                    <div className="border-b border-slate-100 dark:border-slate-800 pb-2.5 mb-3 flex justify-between items-center">
                      <h4 className={`text-xs font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0E6B3A]"}`}>Upcoming Events</h4>
                      <Calendar size={13} className="text-[#0E6B3A] dark:text-emerald-455" />
                    </div>
                    <div className="space-y-3">
                      {opportunities.slice(0, 3).map((opp) => (
                        <div
                          key={opp.id}
                          className={`border p-3 rounded-xl ${
                            isDarkMode ? "bg-slate-950/40 border-slate-855" : "bg-slate-50 border-slate-100"
                          }`}
                        >
                          <h5 className={`text-sm font-black truncate ${isDarkMode ? "text-white" : "text-slate-800"}`}>{opp.title}</h5>
                          <div className="mt-2 space-y-0.5 text-sm text-slate-455 font-bold flex flex-col">
                            <span className="flex items-center gap-1">
                              <Calendar size={10} className="text-[#0E6B3A] dark:text-emerald-455 shrink-0" />
                              {new Date(opp.deadline).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={10} className="text-[#0E6B3A] dark:text-emerald-455 shrink-0" />
                              {opp.location || "Community Hall"}
                            </span>
                          </div>
                        </div>
                      ))}
                      {opportunities.length === 0 && (
                        <p className="text-sm text-slate-455 text-center py-4 font-bold">No scheduled activities.</p>
                      )}
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}          {/* TAB 2: REQUEST DOCUMENTS */}
          {activeNav === "documents" && (
            <div className="border rounded-2xl p-6 shadow-xs animate-fadeIn portal-theme-card">
              <div className="border-b pb-3 mb-5 border-slate-100 dark:border-slate-800">
                <h2 className="text-base font-black uppercase tracking-wider text-[#0E6B3A] dark:text-emerald-450">
                  Document Request
                </h2>
                <p className="text-sm text-slate-400 font-bold mt-0.5">Submit clearance and certificate requests directly to the Barangay Hall.</p>
              </div>

              <div className="grid gap-6 md:grid-cols-3">
                {/* Form Card */}
                <div className="border rounded-2xl p-5 shadow-2xs md:col-span-1 space-y-4 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Clearance Application</h3>
                    <p className="text-sm text-slate-400 mt-0.5 font-bold">Choose a template type and supply any required details.</p>
                  </div>
                  {renderDocumentRequestForm()}
                </div>

                {/* Specs/Details Card */}
                <div className="border rounded-2xl p-5 shadow-2xs md:col-span-2 portal-theme-card">
                  {selectedTemplateDetails ? (
                    <div className="space-y-4 animate-fadeIn">
                      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950 text-[#0E6B3A] dark:text-emerald-450">
                          <Info size={14} />
                        </span>
                        <h4 className="text-sm font-black uppercase tracking-wider text-slate-450">Clearance specifications</h4>
                      </div>
                      <h3 className="text-base font-black text-[#0E6B3A] dark:text-emerald-450">{selectedTemplateDetails.template_name}</h3>
                      <div className="grid gap-4 sm:grid-cols-2 text-xs leading-relaxed font-semibold">
                        <div>
                          <p className="text-sm text-slate-400 font-bold uppercase block">Description</p>
                          <p className="mt-1 font-medium text-slate-705 dark:text-slate-300">{selectedTemplateDetails.description || "Official document certificate."}</p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-400 font-bold uppercase block">Requirements</p>
                          <p className="mt-1 font-medium text-slate-705 dark:text-slate-300">{selectedTemplateDetails.requirements || "None listed."}</p>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                          <p className="text-sm text-slate-400 font-bold uppercase block">Processing Duration</p>
                          <p className="text-[#0E6B3A] dark:text-emerald-450 font-black mt-0.5">{selectedTemplateDetails.processing_time || "Same Day"}</p>
                        </div>
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-3">
                          <p className="text-sm text-slate-400 font-bold uppercase block">Application Fee</p>
                          <p className="text-[#0E6B3A] dark:text-emerald-455 font-black mt-0.5">{selectedTemplateDetails.fee || "Free"}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center py-12 space-y-2">
                      <FileText className="text-slate-305 dark:text-slate-700" size={28} />
                      <p className="text-xs text-slate-400 font-bold">Select document template to view specifications.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2.5: MY DOCUMENTS */}
          {activeNav === "my_documents" && (
            <div className="border rounded-2xl p-6 shadow-xs animate-fadeIn portal-theme-card">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                <div>
                  <h2 className="text-base font-black uppercase tracking-wider text-[#0E6B3A] dark:text-emerald-450">
                    My Documents
                  </h2>
                  <p className="text-sm text-slate-400 font-bold mt-0.5">Logs and progress of your requested clearances.</p>
                </div>
                <button
                  type="button"
                  onClick={() => refreshResidentActivity(resident?.id, { showLoading: true })}
                  disabled={refreshingRequests}
                  className="flex items-center gap-1 text-sm font-black text-[#0E6B3A] dark:text-emerald-455 hover:underline disabled:opacity-50"
                >
                  <RefreshCw size={11} className={refreshingRequests ? "animate-spin" : ""} />
                  Refresh Logs
                </button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-150 dark:border-slate-800">
                {requests.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-10 font-bold">No clearance applications submitted.</p>
                ) : (
                  <table className="w-full text-left text-xs min-w-[500px]">
                    <thead>
                      <tr className="border-b font-bold uppercase tracking-wider text-sm border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400">
                        <th className="px-4 py-3">Document Type</th>
                        <th className="px-4 py-3">Date Applied</th>
                        <th className="px-4 py-3">Last Updated</th>
                        <th className="px-4 py-3 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y font-semibold divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {requests.map((req) => (
                        <tr key={req.id} className="transition hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                          <td className="px-4 py-3 font-black text-slate-805 dark:text-white">{req.document_type}</td>
                          <td className="px-4 py-3">{new Date(req.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3">{new Date(req.updated_at || req.created_at).toLocaleDateString()}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-sm font-black border ${getStatusClass(req.status)}`}>
                              {req.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS */}

          {activeNav === "announcements" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-5 shadow-2xs space-y-5 animate-fadeIn">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Barangay Bulletins</h3>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Verified public service announcements and alerts.</p>
              </div>
              <div className="space-y-4">
                {publishedAnnouncements.map((ann, idx) => (
                  <article
                    key={ann.id}
                    className={`rounded-2xl border p-4.5 flex gap-4 transition duration-205 ${
                      idx === 0 ? "border-[#0B5D3B]/20 bg-emerald-50/20" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <span className={`h-9 w-9 flex items-center justify-center rounded-xl shrink-0 ${
                      idx === 0 ? "bg-gradient-to-r from-[#0B5D3B] to-[#157347] text-white shadow-sm" : "bg-[#0B5D3B]/10 text-[#0B5D3B]"
                    }`}>
                      <Megaphone size={15} />
                    </span>
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug">{ann.title}</h4>
                        <span className="rounded bg-slate-100 border border-slate-200 dark:border-slate-800 px-2 py-0.5 text-sm font-black text-[#0B5D3B] uppercase tracking-wider">
                          {ann.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium">{ann.body}</p>
                      <div className="flex justify-between items-center pt-2">
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-bold">
                          Published: {new Date(ann.publish_date).toLocaleDateString()}
                        </p>
                        <button
                          type="button"
                          onClick={() => openModule("announcements")}
                          className="text-sm font-black text-[#0B5D3B] hover:underline"
                        >
                          Read More
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
                {publishedAnnouncements.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 font-bold">No announcements posted.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: LIVELIHOODS & JOBS */}
          {activeNav === "livelihood" && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/60 rounded-2xl p-5 shadow-2xs space-y-5 animate-fadeIn">
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Livelihoods & jobs</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Active training sessions and program listings.</p>
                </div>
                <span className="text-sm font-bold bg-[#0B5D3B]/10 border border-[#0B5D3B]/20 text-[#0B5D3B] px-2.5 py-0.5 rounded-full">
                  {opportunities.length} Openings
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 flex flex-col justify-between hover:border-[#0B5D3B]/25 hover:shadow-xs transition duration-200"
                  >
                    <div>
                      <span className="inline-flex rounded bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 px-2 py-0.5 text-sm font-black uppercase tracking-wider text-[#0B5D3B] mb-2 shadow-2xs">
                        {opp.category}
                      </span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-snug">{opp.title}</h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-2 line-clamp-3 leading-relaxed font-semibold">
                        {opp.description || "No specific details provided."}
                      </p>
                    </div>
                    <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="space-y-1 text-sm font-bold text-slate-400 dark:text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={11} className="text-[#0B5D3B]" />
                          <span>Closing: {new Date(opp.deadline).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Home size={11} className="text-[#0B5D3B]" />
                          <span className="truncate">Venue: {opp.location || "Community Hall"}</span>
                        </div>
                      </div>
                      {(() => {
                        if (opp.status !== "Open") return null;
                        const application = residentApplications.find(app => app.livelihood_post_id === opp.id);
                        if (!application) {
                          return (
                            <button
                              type="button"
                              onClick={() => handleApplyLivelihood(opp.id)}
                              className="w-full mt-2 py-2 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] text-white font-bold text-sm hover:scale-101 hover:shadow-sm transition border border-white/10"
                            >
                              Apply Now
                            </button>
                          );
                        }
                        if (application.status === "Approved") {
                          return (
                            <div className="mt-2 py-2 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
                              <p className="flex items-center justify-center gap-1.5 mb-1"><CheckCircle size={14} className="text-emerald-600"/> Application Approved</p>
                              <span className="text-[10px] font-semibold text-emerald-700/80 leading-tight">You are listed. You need to visit the barangay for your verifications, and orientations etc.</span>
                            </div>
                          );
                        }
                        if (application.status === "Rejected") {
                          return (
                            <div className="mt-2 py-2 px-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold text-center">
                              Application Rejected
                            </div>
                          );
                        }
                        return (
                          <div className="mt-2 py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold text-center">
                            Application Pending
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
                {opportunities.length === 0 && (
                  <div className="text-xs text-slate-400 dark:text-slate-500 text-center py-10 sm:col-span-2 xl:col-span-4 font-bold">
                    No active program logs.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB: USER PROFILE */}
          {activeNav === "profile" && (
            <div className={`border rounded-2xl p-6 shadow-xs animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60"
            }`}>
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Profile Photo Card */}
                <div className={`w-full md:w-64 shrink-0 border rounded-2xl p-5 text-center flex flex-col items-center shadow-xs ${
                  isDarkMode ? "bg-slate-950 border-slate-800" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                }`}>
                  <div className="h-28 w-28 overflow-hidden rounded-full border-2 border-[#0B5D3B] bg-white dark:bg-slate-900 shadow-md relative group">
                    {resident?.profile_photo_url ? (
                      <img src={resident.profile_photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-black text-emerald-800 bg-emerald-50">
                        {displayName[0]?.toUpperCase() || "R"}
                      </div>
                    )}
                  </div>
                  <h3 className={`text-sm font-black mt-4 ${isDarkMode ? "text-white" : "text-slate-850 dark:text-slate-100"}`}>{displayName}</h3>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-sm font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mt-2">
                    Verified Resident
                  </span>
                  
                  {/* Photo Actions */}
                  <div className="mt-5 w-full flex flex-col gap-2">
                    <input
                      type="file"
                      id="avatar-profile-page-upload"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      disabled={avatarSaving}
                      className="hidden"
                    />
                    <label
                      htmlFor="avatar-profile-page-upload"
                      className="w-full inline-flex items-center justify-center gap-1.5 cursor-pointer rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] px-3.5 py-2.5 text-sm font-bold text-white transition hover:scale-101 shadow-sm disabled:opacity-50"
                    >
                      {avatarSaving ? <Loader size={11} className="animate-spin" /> : <Upload size={11} />}
                      Change Photo
                    </label>
                    {resident?.profile_photo_url && (
                      <button
                        type="button"
                        onClick={handleRemoveAvatar}
                        disabled={avatarSaving}
                        className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition disabled:opacity-50 ${
                          isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-slate-800" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:bg-slate-950"
                        }`}
                      >
                        <Trash2 size={11} className="text-rose-600" />
                        Remove Photo
                      </button>
                    )}
                  </div>
                  {avatarSuccess && <p className="text-sm text-emerald-600 font-bold mt-2.5">{avatarSuccess}</p>}
                  {avatarError && <p className="text-sm text-rose-600 font-bold mt-2.5">{avatarError}</p>}
                </div>

                {/* Identity Summary Card */}
                <div className="flex-1 w-full space-y-6">
                  <div className="border-b pb-3 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                    <h2 className={`text-base font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0B5D3B]"}`}>
                      User Profile Overview
                    </h2>
                    <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-0.5">Your official registry portal identity summary.</p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800/80" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"}`}>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Full Name</p>
                      <p className={`text-xs font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{displayName}</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800/80" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"}`}>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Gmail / Email Address</p>
                      <p className={`text-xs font-bold mt-1 truncate ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{resident?.email || "Not specified"}</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800/80" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"}`}>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Mobile / Contact Number</p>
                      <p className={`text-xs font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{resident?.phone || "Not specified"}</p>
                    </div>

                    <div className={`p-4 rounded-xl border ${isDarkMode ? "bg-slate-950 border-slate-800/80" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"}`}>
                      <p className="text-sm font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Household Number</p>
                      <p className={`text-xs font-bold mt-1 ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>HH #{resident?.household_no || "Not assigned"}</p>
                    </div>
                  </div>

                  <div className={`p-4.5 rounded-xl border leading-relaxed flex gap-3 ${
                    isDarkMode ? "bg-slate-950/40 border-slate-880 text-slate-400 dark:text-slate-500" : "bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-semibold"
                  }`}>
                    <Info size={16} className="text-[#0B5D3B] shrink-0 mt-0.5" />
                    <div>
                      <p className={`text-sm font-bold ${isDarkMode ? "text-slate-300" : "text-slate-800 dark:text-slate-100"}`}>Registry Information</p>
                      <p className="text-sm mt-1">To change official demographic details, household relationship status, or Purok, update them in the <strong>Personal Information</strong> section. Official sync is instant.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: PERSONAL INFORMATION */}
          {activeNav === "personal_info" && (
            <div className={`border rounded-2xl p-6 shadow-xs animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60"
            }`}>
              <div className="border-b pb-3 mb-6 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                <h2 className={`text-base font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0B5D3B]"}`}>
                  Personal Information Registry
                </h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-0.5">Demographic registry synchronized with administrative records.</p>
              </div>

              <form onSubmit={handleProfileUpdate} className="space-y-6">
                
                {/* 1. Personal Details */}
                <div className="space-y-3.5">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-1">Personal Details</h4>
                  <div className="grid gap-4.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      First Name *
                      <input
                        type="text"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Middle Name
                      <input
                        type="text"
                        value={profileForm.middle_name}
                        onChange={(e) => setProfileForm({ ...profileForm, middle_name: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Last Name *
                      <input
                        type="text"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Suffix / Extension Name
                      <input
                        type="text"
                        value={profileForm.suffix}
                        onChange={(e) => setProfileForm({ ...profileForm, suffix: e.target.value })}
                        placeholder="e.g. Jr. / III"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Sex / Gender
                      <select
                        value={profileForm.sex}
                        onChange={(e) => setProfileForm({ ...profileForm, sex: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Birth Date *
                      <input
                        type="date"
                        value={profileForm.birthday}
                        onChange={handleBirthdayChange}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Age
                      <input
                        type="number"
                        value={profileForm.age}
                        disabled
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none opacity-60 ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-850 dark:text-slate-100"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Birth Place
                      <input
                        type="text"
                        value={profileForm.birthplace}
                        onChange={(e) => setProfileForm({ ...profileForm, birthplace: e.target.value })}
                        placeholder="City / Municipality"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Civil Status
                      <select
                        value={profileForm.civil_status}
                        onChange={(e) => setProfileForm({ ...profileForm, civil_status: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {civilStatusOptions.map((stat) => (
                          <option key={stat} value={stat}>{stat}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {/* 2. Contact Details */}
                <div className="space-y-3.5">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-1">Contact Info</h4>
                  <div className="grid gap-4.5 grid-cols-1 sm:grid-cols-2">
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Mobile Number (SMS Contact) *
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        placeholder="09171234567"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Email Address (Optional)
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        placeholder="resident@example.com"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                  </div>
                </div>

                {/* 3. Address Details */}
                <div className="space-y-3.5">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-1">Address Details</h4>
                  <div className="grid gap-4.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      House Number
                      <input
                        type="text"
                        value={profileForm.house_no}
                        onChange={(e) => setProfileForm({ ...profileForm, house_no: e.target.value })}
                        placeholder="e.g. 104-B"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Purok Name / Area *
                      <select
                        value={profileForm.purok}
                        onChange={(e) => setProfileForm({ ...profileForm, purok: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                        required
                      >
                        <option value="">Select Purok</option>
                        {purokDefinitions.map((item) => (
                          <option key={item.key} value={item.key}>{item.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350 sm:col-span-2">
                      Full Address Description *
                      <input
                        type="text"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        placeholder="Street name, landmark details..."
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                  </div>
                </div>

                {/* 4. Household & Socio-Economic */}
                <div className="space-y-3.5">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-1">Household & Socio-Economic Details</h4>
                  <div className="grid gap-4.5 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Household ID Number *
                      <input
                        type="text"
                        value={profileForm.household_no}
                        onChange={(e) => setProfileForm({ ...profileForm, household_no: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                        required
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Relationship to Head *
                      <select
                        value={profileForm.relationship_to_household_head}
                        onChange={(e) => setProfileForm({ ...profileForm, relationship_to_household_head: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                        required
                      >
                        {householdRelationshipOptions.map((rel) => (
                          <option key={rel} value={rel}>{rel === "Head" ? "Household Head" : rel}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Occupation
                      <input
                        type="text"
                        value={profileForm.occupation}
                        onChange={(e) => setProfileForm({ ...profileForm, occupation: e.target.value })}
                        placeholder="e.g. Farmer, Teacher"
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 focus:bg-white dark:bg-slate-900"
                        }`}
                      />
                    </label>
                    <label className="block text-xs font-bold text-slate-655 dark:text-slate-350 dark:text-slate-350">
                      Educational Attainment
                      <select
                        value={profileForm.educational_attainment}
                        onChange={(e) => setProfileForm({ ...profileForm, educational_attainment: e.target.value })}
                        className={`mt-2 w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                          isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        <option value="">Select Level</option>
                        {educationalAttainmentOptions.map((lvl) => (
                          <option key={lvl} value={lvl}>{lvl}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>

                {/* 5. Special Sector Status */}
                <div className="space-y-3.5">
                  <h4 className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] border-b border-slate-100 dark:border-slate-800 dark:border-slate-800 pb-1">Sector Classifications</h4>
                  <div className="grid gap-4.5 grid-cols-1 md:grid-cols-3">
                    
                    {/* PWD Card */}
                    <div className={`p-4 rounded-xl border space-y-3 ${
                      isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"
                    }`}>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={profileForm.is_pwd}
                          onChange={(e) => setProfileForm({ ...profileForm, is_pwd: e.target.checked })}
                          className="h-4.5 w-4.5 rounded border-slate-300 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5"
                        />
                        <div>
                          <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Person with Disability (PWD)</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Check if listed as a PWD in municipal records.</p>
                        </div>
                      </label>
                      <AnimatePresence>
                        {profileForm.is_pwd && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pl-7 pt-1 overflow-hidden"
                          >
                            <label className="text-sm font-black text-[#0B5D3B] uppercase tracking-wider block mb-1">Disability type *</label>
                            <input
                              type="text"
                              value={profileForm.pwd_type}
                              onChange={(e) => setProfileForm({ ...profileForm, pwd_type: e.target.value })}
                              placeholder="e.g. Visually Impaired"
                              required
                              className={`w-full rounded-lg border px-3 py-2 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                                isDarkMode ? "bg-slate-900 border-slate-800 text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
                              }`}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Solo Parent Card */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                      isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"
                    }`}>
                      <input
                        type="checkbox"
                        checked={profileForm.is_solo_parent}
                        onChange={(e) => setProfileForm({ ...profileForm, is_solo_parent: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5"
                      />
                      <div>
                        <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Solo Parent</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Check if single parent supporting dependents.</p>
                      </div>
                    </div>

                    {/* 4Ps Beneficiary Card */}
                    <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                      isDarkMode ? "bg-slate-950/60 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850"
                    }`}>
                      <input
                        type="checkbox"
                        checked={profileForm.is_4ps_member}
                        onChange={(e) => setProfileForm({ ...profileForm, is_4ps_member: e.target.checked })}
                        className="h-4.5 w-4.5 rounded border-slate-300 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5"
                      />
                      <div>
                        <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>4Ps Beneficiary</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Check if household is registered 4Ps recipient.</p>
                      </div>
                    </div>

                  </div>
                </div>

                {profileMessage && (
                  <div className={`rounded-xl px-4 py-2.5 text-xs font-bold ${
                    profileMessage.type === "success"
                      ? "bg-emerald-50 border border-emerald-250 text-[#0B5D3B] dark:bg-emerald-950/20"
                      : "bg-rose-50 border border-rose-250 text-rose-800 dark:bg-rose-950/20 dark:text-rose-450"
                  }`}>
                    {profileMessage.text}
                  </div>
                )}

                <div className="flex gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:scale-101 transition disabled:opacity-50"
                  >
                    {savingProfile ? <Loader size={12} className="animate-spin" /> : <FileCheck2 size={12} />}
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (resident) {
                        setProfileForm({
                          ...profileForm,
                          first_name: resident.first_name || "",
                          middle_name: resident.middle_name || "",
                          last_name: resident.last_name || "",
                          suffix: resident.suffix || "",
                          sex: resident.sex || resident.gender || "Male",
                          birthday: resident.birthday || "",
                          age: resident.age ?? "",
                          civil_status: resident.civil_status || "Single",
                          birthplace: resident.birthplace || "",
                          phone: resident.phone || "",
                          email: resident.email || "",
                          house_no: resident.house_no || "",
                          purok: resident.purok || "",
                          address: resident.address || "",
                          household_no: resident.household_no || "",
                          relationship_to_household_head: resident.relationship_to_household_head || "Head",
                          occupation: resident.occupation || "",
                          educational_attainment: resident.educational_attainment || "",
                          is_pwd: Boolean(resident.is_pwd),
                          pwd_type: resident.pwd_type || "",
                          is_solo_parent: Boolean(resident.is_solo_parent),
                          is_4ps_member: Boolean(resident.is_4ps_member),
                        });
                      }
                      setProfileMessage(null);
                    }}
                    className={`px-4 py-2.5 rounded-xl border font-bold text-xs transition ${
                      isDarkMode ? "border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-800" : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-950"
                    }`}
                  >
                    Cancel
                  </button>
                </div>

              </form>
            </div>
          )}

          {/* TAB: BARANGAY OFFICIALS */}
          {activeNav === "officials" && (
            <div className={`border rounded-2xl p-6 shadow-xs animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60"
            }`}>
              <div className="border-b pb-3 mb-5 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                <h2 className={`text-base font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-[#0B5D3B]"}`}>
                  Barangay Officials & Directory
                </h2>
                <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-0.5">Meet the barangay council and official representatives of Upper Mingading.</p>
              </div>

              <div className="grid gap-4.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {getOrganizationOfficials().map((off) => {
                  const initials = off.name
                    ? off.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .substring(0, 2)
                        .toUpperCase()
                    : "OF";
                  return (
                    <article
                      key={off.id}
                      className={`flex gap-4.5 rounded-xl border p-4.5 shadow-2xs hover:shadow-xs transition duration-200 ${
                        isDarkMode ? "bg-slate-950 border-slate-850" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                      }`}
                    >
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-bold text-sm border shadow-inner text-[#0B5D3B] border-slate-200 dark:border-slate-800 dark:border-slate-800 dark:bg-slate-900">
                        {off.photoUrl ? (
                          <img src={off.photoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-xs font-black ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{off.name}</p>
                        <p className="text-sm font-black text-[#0B5D3B] dark:text-emerald-450 uppercase mt-0.5 tracking-wider">{off.position || "Council Officer"}</p>
                        {off.focusArea && (
                          <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-semibold truncate leading-tight">{off.focusArea}</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: SYSTEM SETTINGS */}
          {activeNav === "settings" && (
            <div className={`border rounded-2xl p-6 shadow-xs animate-fadeIn ${
              isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/60"
            }`}>
              
              <div className="flex flex-col md:flex-row gap-7">
                {/* Left settings sidebar */}
                <div className="w-full md:w-56 shrink-0 flex flex-col gap-1.5">
                  {[
                    { key: "security", label: "Account & Security", icon: KeyRound, desc: "Change username/password." },
                    { key: "appearance", label: "Theme & Appearance", icon: Sparkles, desc: "Customize theme and text scale." },
                    { key: "notifications", label: "Alerts & Notifications", icon: Bell, desc: "SMS and update configuration." },
                    { key: "support", label: "Help & Support Info", icon: HelpCircle, desc: "FAQ list and software legal info." }
                  ].map((tabItem) => (
                    <button
                      key={tabItem.key}
                      type="button"
                      onClick={() => setSettingsTab(tabItem.key)}
                      className={`w-full flex items-start text-left gap-3 px-4 py-3 rounded-xl border transition-all ${
                        settingsTab === tabItem.key
                          ? "bg-[#0B5D3B]/15 border-[#0B5D3B]/20 text-[#0B5D3B] dark:text-emerald-400 dark:bg-emerald-950/20"
                          : "border-transparent text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-950/40"
                      }`}
                    >
                      <tabItem.icon size={15} className="mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-none">{tabItem.label}</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-1 leading-normal">{tabItem.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right settings content */}
                <div className="flex-1 w-full min-w-0">
                  
                  {/* SUBTAB 1: ACCOUNT SECURITY */}
                  {settingsTab === "security" && (
                    <div className="space-y-6">
                      <div className="border-b pb-2 mb-4 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Account & Security Settings</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Manage authentication settings and login credentials.</p>
                      </div>

                      <div className="grid gap-5 md:grid-cols-2">
                        {/* Current Credentials overview */}
                        <div className={`p-4.5 rounded-xl border space-y-4 ${
                          isDarkMode ? "bg-slate-950/50 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                        }`}>
                          <p className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] dark:text-emerald-450">Login Registry File</p>
                          <div>
                            <p className={`text-xs font-black ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>{displayName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 mt-1 font-semibold">Username ID: <span className="font-bold font-mono text-slate-800 dark:text-slate-100 dark:text-slate-350">{residentUsername}</span></p>
                          </div>
                          <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-250 px-2.5 py-0.5 text-sm font-bold text-[#0B5D3B] dark:bg-emerald-950/20 dark:text-emerald-450 dark:border-emerald-800">
                            Synchronized Account Registry
                          </span>
                        </div>

                        {/* Change Password Form */}
                        <div className={`p-4.5 rounded-xl border space-y-4 ${
                          isDarkMode ? "bg-slate-950/50 border-slate-850" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                        }`}>
                          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 dark:border-slate-850 pb-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0B5D3B]/10 text-[#0B5D3B] dark:text-emerald-400">
                              <KeyRound size={14} />
                            </span>
                            <div>
                              <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Change Household Password</p>
                              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold font-mono">Updated passwords apply instantly.</p>
                            </div>
                          </div>

                          <form onSubmit={handlePasswordUpdate} className="space-y-3.5">
                            <div className="space-y-1">
                              <label className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Current Password *</label>
                              <input
                                type="password"
                                value={passwordForm.currentPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900"
                                }`}
                                placeholder="••••••••"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider block">New Password *</label>
                              <input
                                type="password"
                                value={passwordForm.newPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900"
                                }`}
                                placeholder="Min 8 chars, 1 uppercase, 1 number"
                                required
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Confirm New Password *</label>
                              <input
                                type="password"
                                value={passwordForm.confirmPassword}
                                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#0B5D3B] transition ${
                                  isDarkMode ? "bg-slate-950 border-slate-800 text-white" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900"
                                }`}
                                placeholder="••••••••"
                                required
                              />
                            </div>

                            {passwordMessage && (
                              <div className={`rounded-xl px-4 py-2.5 text-xs font-bold ${
                                passwordMessage.type === "success"
                                  ? "bg-emerald-50 border border-emerald-250 text-[#0B5D3B] dark:bg-emerald-950/20"
                                  : "bg-rose-50 border border-rose-250 text-rose-800 dark:bg-rose-950/20"
                              }`}>
                                {passwordMessage.text}
                              </div>
                            )}

                            <button
                              type="submit"
                              disabled={savingPassword}
                              className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] px-4 py-2.5 text-xs font-bold text-white shadow-xs border border-white/10 disabled:opacity-50 hover:scale-101 transition"
                            >
                              {savingPassword ? <Loader size={12} className="animate-spin" /> : <KeyRound size={12} />}
                              Change Password
                            </button>
                          </form>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: THEME & APPEARANCE */}
                  {settingsTab === "appearance" && (
                    <div className="space-y-6">
                      <div className="border-b pb-2 mb-4 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Theme & Appearance</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Customize layout theme color styles and text size scale.</p>
                      </div>

                      <div className="grid gap-5 sm:grid-cols-3">
                        {[
                          { key: "light", label: "Light Mode", icon: Sun, desc: "Classic white page surfaces" },
                          { key: "dark", label: "Dark Mode", icon: Moon, desc: "Low contrast slate dark display" },
                          { key: "system", label: "System Default", icon: Monitor, desc: "Follow OS browser rules" }
                        ].map((themeItem) => {
                          const active = theme === themeItem.key;
                          return (
                            <button
                              key={themeItem.key}
                              type="button"
                              onClick={() => setTheme(themeItem.key)}
                              className={`flex flex-col items-center justify-center text-center p-5 rounded-2xl border transition-all duration-200 ${
                                active
                                  ? "bg-[#0B5D3B]/10 border-[#0B5D3B] text-[#0B5D3B] shadow-sm dark:bg-emerald-950/20 dark:text-emerald-400"
                                  : isDarkMode ? "bg-slate-950 border-slate-850 hover:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-white dark:bg-slate-900"
                              }`}
                            >
                              <themeItem.icon size={22} className={`mb-3 ${active ? "text-[#0B5D3B] dark:text-emerald-450" : "text-slate-400 dark:text-slate-500"}`} />
                              <p className="text-xs font-bold leading-none">{themeItem.label}</p>
                              <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-1.5 leading-normal">{themeItem.desc}</p>
                            </button>
                          );
                        })}
                      </div>

                      {/* Font Size Selector */}
                      <div className={`p-4.5 rounded-xl border space-y-3.5 ${
                        isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                      }`}>
                        <p className="text-sm font-black uppercase tracking-widest text-[#0B5D3B] dark:text-emerald-450">Text Font Size Scale</p>
                        <div className="flex gap-2.5">
                          {[
                            { key: "small", label: "Small" },
                            { key: "medium", label: "Medium (Default)" },
                            { key: "large", label: "Large" }
                          ].map((item) => (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setFontSize(item.key)}
                              className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition ${
                                fontSize === item.key
                                  ? "bg-[#0B5D3B] text-white border-transparent"
                                  : isDarkMode ? "border-slate-800 bg-slate-900 text-slate-400 dark:text-slate-500 hover:bg-slate-800" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 hover:bg-slate-50 dark:bg-slate-950"
                              }`}
                            >
                              {item.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 3: NOTIFICATIONS */}
                  {settingsTab === "notifications" && (
                    <div className="space-y-6">
                      <div className="border-b pb-2 mb-4 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Alerts & Notifications</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Configure announcement SMS triggers and document queue update alerts.</p>
                      </div>

                      <div className="space-y-4">
                        <div className={`flex justify-between items-center p-4 rounded-xl border ${
                          isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 shadow-inner"
                        }`}>
                          <div>
                            <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>SMS Text Notifications</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-1">Receive immediate SMS notifications when clearances are approved/released.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSmsToggle(!smsNotificationsEnabled)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              smsNotificationsEnabled ? "bg-[#0B5D3B]" : "bg-slate-300 dark:bg-slate-800"
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                              smsNotificationsEnabled ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>

                        <div className={`flex justify-between items-center p-4 rounded-xl border ${
                          isDarkMode ? "bg-slate-950/40 border-slate-850" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 shadow-inner"
                        }`}>
                          <div>
                            <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Council Announcement Broadcasts</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-1">Send emergency municipal announcement SMS texts to your mobile phone number.</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleAnnouncementToggle(!announcementSmsAlerts)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              announcementSmsAlerts ? "bg-[#0B5D3B]" : "bg-slate-300 dark:bg-slate-800"
                            }`}
                          >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-slate-900 shadow-sm ring-0 transition duration-200 ease-in-out ${
                              announcementSmsAlerts ? "translate-x-5" : "translate-x-0"
                            }`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 4: HELP & SUPPORT */}
                  {settingsTab === "support" && (
                    <div className="space-y-6">
                      <div className="border-b pb-2 mb-4 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                        <h3 className={`text-sm font-black uppercase tracking-wider ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Help & Support Center</h3>
                        <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5 font-bold">Frequently asked questions, software documentation, and support contacts.</p>
                      </div>

                      {/* Collapsible FAQ accordion */}
                      <div className={`p-4 rounded-xl border space-y-3.5 ${
                        isDarkMode ? "bg-slate-950/40 border-slate-850 text-slate-300" : "bg-slate-50 dark:bg-slate-950 border-slate-150 dark:border-slate-850 shadow-inner text-slate-655 dark:text-slate-350"
                      }`}>
                        <div className="flex items-center gap-2 border-b pb-2 border-slate-200 dark:border-slate-800 dark:border-slate-800">
                          <HelpCircle size={14} className="text-[#0B5D3B]" />
                          <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-800 dark:text-slate-100"}`}>Common FAQ Guide</p>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-250">How do I request a Barangay clearance certificate?</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold mt-1">Navigate to the **Request Documents** tab in the sidebar, choose a clearance template, and click submit. You can track requests directly on the dashboard timeline.</p>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-250">How does direct synchronization work?</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold mt-1">Changes saved in the Personal Information form write directly to the database and are synchronized instantly with the Admin Dashboard.</p>
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 dark:text-slate-100 dark:text-slate-250">Can I request clearances without a household password?</p>
                            <p className="text-sm text-slate-400 dark:text-slate-500 font-semibold mt-1">No. To maintain security validation, you must confirm your household password when saving profile information or credentials changes.</p>
                          </div>
                        </div>
                      </div>

                      {/* Technical support card */}
                      <div className={`p-4.5 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        isDarkMode ? "bg-slate-950 border-slate-850" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm"
                      }`}>
                        <div className="space-y-1">
                          <p className={`text-xs font-bold ${isDarkMode ? "text-white" : "text-slate-850 dark:text-slate-100"}`}>Contact Barangay Technical Support</p>
                          <p className="text-sm text-slate-400 dark:text-slate-500 font-bold">Having system account or credentials issues? We can help.</p>
                        </div>
                        <a
                          href="mailto:support@barangaymingading.gov"
                          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0B5D3B] text-white px-3.5 py-2 text-sm font-bold hover:scale-101 transition shadow-xs shrink-0"
                        >
                          Email Support
                        </a>
                      </div>

                      {/* System and Policy info */}
                      <div className="flex justify-between items-center text-sm text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
                        <span>KaagapAI v1.2.0 • Active Server</span>
                        <div className="flex gap-2">
                          <span className="cursor-pointer hover:text-slate-650 dark:text-slate-350 transition">Privacy Policy</span>
                          <span>•</span>
                          <span className="cursor-pointer hover:text-slate-650 dark:text-slate-350 transition">Terms of Service</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          )}

      {/* 6. PASSWORD CONFIRMATION MODAL */}
      <AnimatePresence>
        {passwordConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setPasswordConfirmOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className={`relative w-full max-w-sm rounded-2xl border p-5 shadow-2xl z-10 animate-fadeIn ${
                isDarkMode ? "bg-slate-900 border-slate-850 text-white" : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
              }`}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="flex items-center gap-3 border-b pb-3 mb-4 border-slate-100 dark:border-slate-800 dark:border-slate-800">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-[#0B5D3B] dark:text-emerald-450">
                  <Shield size={16} />
                </span>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Authorize Registry Update</h3>
                  <p className="text-sm text-slate-400 dark:text-slate-500 font-bold mt-0.5">Authorization credentials verify safety.</p>
                </div>
              </div>

              <form onSubmit={handleProfileUpdateConfirm} className="space-y-4">
                <p className={`text-sm leading-relaxed font-semibold ${isDarkMode ? "text-slate-300" : "text-slate-500 dark:text-slate-400 dark:text-slate-500"}`}>
                  To finalize and synchronize your registry profile updates with our barangay database, please verify your current household password.
                </p>

                <div className="space-y-1">
                  <label className="text-sm font-black text-slate-500 dark:text-slate-400 dark:text-slate-500 dark:text-slate-450 dark:text-slate-500 uppercase tracking-wider block">Household Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2.5 text-xs font-semibold outline-none pr-10 focus:border-[#0B5D3B] transition ${
                        isDarkMode ? "bg-slate-950 border-slate-800 text-white focus:bg-slate-900" : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 focus:bg-white dark:bg-slate-900"
                      }`}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:text-slate-200 transition"
                      aria-label="Toggle password view"
                    >
                      {showConfirmPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </div>

                {confirmPasswordError && (
                  <div className="rounded-xl px-4 py-2 text-sm font-bold bg-rose-50 dark:bg-rose-950/20 border border-rose-200 text-rose-800 dark:text-rose-450">
                    {confirmPasswordError}
                  </div>
                )}

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] py-2.5 text-xs font-bold text-white shadow-xs disabled:opacity-50 hover:scale-101 transition"
                  >
                    {savingProfile ? <Loader size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                    Confirm & Update
                  </button>
                  <button
                    type="button"
                    onClick={() => setPasswordConfirmOpen(false)}
                    className={`px-3 py-2.5 rounded-xl border font-bold text-xs transition ${
                      isDarkMode ? "border-slate-800 text-slate-400 dark:text-slate-500 hover:bg-slate-800" : "border-slate-200 dark:border-slate-800 text-slate-550 hover:bg-slate-50 dark:bg-slate-950"
                    }`}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        </div>
      </main>

      {/* 5. Floating Circular AI Assistant (Slide-in Drawer Concierge Trigger) */}
      <div className="fixed bottom-6 right-6 z-50">
        <motion.button
          type="button"
          onClick={() => setAssistantOpen(!assistantOpen)}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0B5D3B] via-[#0E6B46] to-[#157347] text-white shadow-[0_8px_30px_rgba(11,93,59,0.35)] hover:shadow-[0_8px_30px_rgba(11,93,59,0.55)] focus:outline-none transition relative"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          animate={assistantOpen ? {} : { y: [0, -4, 0] }}
          transition={assistantOpen ? {} : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {!assistantOpen && (
            <span className="absolute -inset-1 rounded-full bg-emerald-600/20 animate-ping" style={{ animationDuration: "3s" }} />
          )}
          {assistantOpen ? <X size={20} /> : <Bot size={20} />}
        </motion.button>
      </div>

      {/* AI Slide-in Chat Panel Drawer (Microsoft / Apple Glassmorphic side panel) */}
      <AnimatePresence>
        {assistantOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-slate-900/30 backdrop-blur-xs"
              onClick={() => setAssistantOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            {/* Drawer */}
            <motion.div
              className="relative h-full w-full sm:w-[420px] bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col z-10"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
            >
              {/* Header */}
              <div className="flex h-14 shrink-0 items-center justify-between bg-gradient-to-r from-[#0B5D3B] to-[#0E6B46] px-4 text-white">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 overflow-hidden rounded-full border border-white/20">
                    <AssistantAiIcon />
                  </div>
                  <div>
                    <h3 className="text-xs font-black leading-none">KaagapAI Concierge</h3>
                    <span className="text-sm text-emerald-250 mt-0.5 block">Automated Slide-in Assistant</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAssistantOpen(false)}
                  className="rounded-full p-1.5 text-emerald-100 hover:bg-white dark:bg-slate-900/10 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Chat messages */}
              <div className="flex-1 min-h-0 flex flex-col bg-slate-50 dark:bg-slate-950">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {assistantMessages.map((chat) => {
                    const isUser = chat.role === "user";
                    return (
                      <div key={chat.id} className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
                        {!isUser && (
                          <div className="h-6 w-6 overflow-hidden rounded-full shrink-0 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <AssistantAiIcon />
                          </div>
                        )}
                        <div
                          className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed font-semibold shadow-2xs ${
                            isUser
                              ? "bg-gradient-to-br from-[#0B5D3B] to-[#157347] text-white rounded-br-none"
                              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-none"
                          }`}
                        >
                          {isUser ? (
                            <p className="whitespace-pre-line leading-relaxed font-medium">{chat.text}</p>
                          ) : (
                            <RenderChatChart text={chat.text} />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {assistantLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-end gap-2"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        className="h-6 w-6 overflow-hidden rounded-full shrink-0 border border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-500/20"
                      >
                        <AssistantAiIcon />
                      </motion.div>
                      <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-none border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 px-4 py-2.5 shadow-sm">
                        <span className="text-xs font-bold text-[#0B5D3B] dark:text-emerald-400">KaagapAI is thinking</span>
                        <TypingIndicator className="text-[#0B5D3B]" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={assistantMessagesEndRef} />
                </div>

                  {/* suggestions */}
                  <div className="bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 p-2.5 overflow-x-auto shrink-0 flex gap-2 scrollbar-hide">
                    {[
                      "How to request clearances?",
                      "List council officials",
                      "Check pending document request status",
                    ].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handlePrompt(s)}
                        className="rounded-xl border border-[#0B5D3B]/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-bold text-[#0B5D3B] dark:text-emerald-400 hover:bg-[#0B5D3B]/10 hover:border-[#0B5D3B]/30 dark:hover:bg-emerald-500/10 shrink-0 whitespace-nowrap transition-all active:scale-95"
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                {/* Input form */}
                <form onSubmit={handleAssistantSubmit} className="flex h-14 items-center gap-2 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 shrink-0">
                  <input
                    value={assistantInput}
                    onChange={(e) => setAssistantInput(e.target.value)}
                    placeholder="Ask KaagapAI Concierge..."
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs outline-none focus:border-[#0B5D3B] focus:bg-white dark:bg-slate-900 font-semibold text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={assistantLoading || !assistantInput.trim()}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#0B5D3B] to-[#157347] text-white shadow-xs disabled:opacity-50 hover:scale-101 transition"
                  >
                    <Send size={13} />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Document Request Modal */}
      <AnimatePresence>
        {documentModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-[#010907]/40 backdrop-blur-xs"
              onClick={() => setDocumentModalOpen(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative z-10 w-full max-w-md overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <div className="bg-[#0B5D3B] px-5 py-3.5 text-white flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-sm bg-white dark:bg-slate-900/10 border border-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-emerald-300">Application desk</span>
                  <h3 className="text-xs font-black mt-1">Apply for document clearance</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setDocumentModalOpen(false)}
                  className="text-white hover:bg-white dark:bg-slate-900/10 p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[80vh]">
                {renderDocumentRequestForm()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Livelihood Opportunities Application Wizard */}
      <AnimatePresence>
        {selectedOppForApplication && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
              onClick={() => setSelectedOppForApplication(null)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden z-10"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
            >
              <div className="bg-[#0B5D3B] px-5 py-3.5 text-white flex justify-between items-center border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-sm bg-white dark:bg-slate-900/10 border border-white/20 px-2 py-0.5 rounded uppercase font-black tracking-wider text-emerald-300">Application wizard</span>
                  <h3 className="text-xs font-black truncate max-w-[280px] mt-1">{selectedOppForApplication.title}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedOppForApplication(null)}
                  className="text-white hover:bg-white dark:bg-slate-900/10 p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between items-center text-sm font-bold text-slate-400 dark:text-slate-500">
                <span>Step {jobAppStep} of 4</span>
                <span className="text-[#0B5D3B] uppercase">
                  {jobAppStep === 1 && "Personal details"}
                  {jobAppStep === 2 && "Profile qualifications"}
                  {jobAppStep === 3 && "Resume attachment"}
                  {jobAppStep === 4 && "Review details"}
                </span>
              </div>

              <form onSubmit={handleJobAppSubmit} className="p-5 space-y-4">
                {jobAppSuccess ? (
                  <div className="py-6 text-center space-y-3 animate-fadeIn">
                    <div className="h-10 w-10 rounded-full bg-emerald-50 text-[#0B5D3B] flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
                      <CheckCircle size={22} />
                    </div>
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">Application Submitted!</h3>
                    <p className="text-xs text-slate-550 leading-relaxed font-semibold">
                      Your application has been received and synchronized successfully with the council organizers.
                    </p>
                    <button
                      type="button"
                      onClick={() => setSelectedOppForApplication(null)}
                      className="py-2 px-6 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-500 text-white font-bold text-xs hover:scale-101 transition shadow-xs mt-3 border border-white/10"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {jobAppError && (
                      <div className="flex gap-2 p-2.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl animate-fadeIn">
                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                        <span>{jobAppError}</span>
                      </div>
                    )}

                    <div className="min-h-[160px]">
                      {jobAppStep === 1 && (
                        <div className="space-y-2 text-xs">
                          <p className="font-bold text-slate-400 dark:text-slate-500 uppercase text-sm">Pre-filled Resident Registry</p>
                          <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-250 shadow-inner font-bold text-slate-650 dark:text-slate-350">
                            <div>
                              <span className="text-sm text-slate-400 dark:text-slate-500 uppercase block font-black">Full Name</span>
                              <span className="text-slate-800 dark:text-slate-100 font-black">{displayName}</span>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400 dark:text-slate-500 uppercase block font-black">Purok Area</span>
                              <span className="text-slate-800 dark:text-slate-100 font-black">{resident?.purok || "Upper Mingading"}</span>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400 dark:text-slate-500 uppercase block font-black">Age</span>
                              <span className="text-slate-800 dark:text-slate-100 font-black">{resident?.age || "Not specified"} yrs</span>
                            </div>
                            <div>
                              <span className="text-sm text-slate-400 dark:text-slate-500 uppercase block font-black">Phone Contact</span>
                              <span className="text-slate-800 dark:text-slate-100 font-black">{resident?.phone || "-"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {jobAppStep === 2 && (
                        <div className="space-y-3">
                          <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block">Highest Education</label>
                            <input
                              type="text"
                              value={jobAppForm.education}
                              onChange={(e) => setJobAppForm({ ...jobAppForm, education: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-[#0B5D3B] text-slate-800 dark:text-slate-100"
                              placeholder="e.g. College Graduate"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block">Skills *</label>
                            <input
                              type="text"
                              value={jobAppForm.skills}
                              onChange={(e) => setJobAppForm({ ...jobAppForm, skills: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-[#0B5D3B] text-slate-800 dark:text-slate-100"
                              placeholder="e.g. Encoding, Clerical work"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block">Work Experience (Optional)</label>
                            <input
                              type="text"
                              value={jobAppForm.experience}
                              onChange={(e) => setJobAppForm({ ...jobAppForm, experience: e.target.value })}
                              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-[#0B5D3B] text-slate-800 dark:text-slate-100"
                              placeholder="Describe previous job..."
                            />
                          </div>
                        </div>
                      )}

                      {jobAppStep === 3 && (
                        <div className="space-y-3">
                          <label className="text-sm font-bold text-slate-500 dark:text-slate-400 dark:text-slate-500 uppercase block">Upload Resume / CV File *</label>
                          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50 dark:bg-slate-950 p-5 text-center hover:bg-emerald-50/20 hover:border-[#0B5D3B] transition cursor-pointer relative shadow-inner">
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,image/*"
                              onChange={(e) => setJobAppResume(e.target.files?.[0])}
                              className="absolute inset-0 opacity-0 cursor-pointer"
                            />
                            {jobAppResume ? (
                              <div className="flex flex-col items-center text-xs font-bold text-[#0B5D3B]">
                                <FileCheck2 size={24} className="mb-1" />
                                <span className="truncate max-w-[200px]">{jobAppResume.name}</span>
                                <span className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{(jobAppResume.size / 1024 / 1024).toFixed(2)} MB • Replace</span>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center text-slate-400 dark:text-slate-500 font-bold">
                                <Upload size={20} className="mb-1 text-slate-300" />
                                <span className="text-sm">Select PDF or Word Document</span>
                                <span className="text-sm mt-0.5">Max 5MB</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {jobAppStep === 4 && (
                        <div className="space-y-3 text-xs leading-normal">
                          <p className="font-bold text-slate-450 dark:text-slate-500 uppercase text-sm border-b border-slate-100 dark:border-slate-800 pb-1">Review details</p>
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-150 dark:border-slate-850 font-bold text-slate-600 dark:text-slate-350">
                            <div className="flex justify-between">
                              <span className="text-slate-400 dark:text-slate-500 uppercase text-sm">Applicant</span>
                              <span className="text-slate-800 dark:text-slate-100 font-black">{displayName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 dark:text-slate-500 uppercase text-sm">Opportunity</span>
                              <span className="text-[#0B5D3B] font-black">{selectedOppForApplication.title}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 dark:text-slate-500 uppercase text-sm">Education</span>
                              <span className="text-slate-800 dark:text-slate-100">{jobAppForm.education || "None"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 dark:text-slate-500 uppercase text-sm">Skills</span>
                              <span className="text-slate-800 dark:text-slate-100">{jobAppForm.skills}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400 dark:text-slate-500 uppercase text-sm">Attachment</span>
                              <span className="text-slate-800 dark:text-slate-100 truncate max-w-[160px]">{jobAppResume?.name}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 border-t border-slate-100 dark:border-slate-800 pt-3.5 mt-4">
                      {jobAppStep > 1 && (
                        <button
                          type="button"
                          onClick={() => setJobAppStep(jobAppStep - 1)}
                          className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 font-bold hover:bg-slate-50 dark:bg-slate-950 text-xs transition"
                        >
                          Back
                        </button>
                      )}
                      <button
                        type="submit"
                        disabled={jobAppLoading}
                        className="flex-1 flex justify-center items-center gap-1 py-2 rounded-xl bg-gradient-to-r from-emerald-700 to-teal-500 text-white font-bold text-xs hover:scale-101 transition shadow-xs border border-white/10"
                      >
                        {jobAppLoading ? (
                          <Loader size={12} className="animate-spin" />
                        ) : jobAppStep === 4 ? (
                          <CheckCircle size={12} />
                        ) : (
                          <ChevronRight size={12} />
                        )}
                        {jobAppLoading ? "Submitting..." : jobAppStep === 4 ? "Submit Details" : "Continue"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* FLOATING TOAST NOTIFICATION (BOTTOM-RIGHT) */}
      <AnimatePresence>
        {(latestAnnouncementToast || latestNotificationToast) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 w-full max-w-sm flex flex-col gap-3"
          >
            {latestAnnouncementToast && (
              <div className="p-4 rounded-2xl border shadow-xl portal-theme-glass text-slate-800 dark:text-white flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Megaphone size={16} className="animate-bounce" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase tracking-wider text-[#0B5D3B] dark:text-emerald-400">📢 New Announcement</p>
                    <span className="text-sm text-slate-400 font-bold">Just Now</span>
                  </div>
                  <p className="text-xs font-black truncate">{latestAnnouncementToast.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-450 line-clamp-2 leading-normal font-bold">
                    {latestAnnouncementToast.body}
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={viewAnnouncementFromToast}
                      className="px-3.5 py-1.5 text-sm font-black rounded-lg bg-[#0B5D3B] hover:bg-[#0B5D3B]/90 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition active:scale-95"
                    >
                      View Announcement
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (resident?.id) {
                          localStorage.setItem(`kaagapai_last_viewed_announcement_id_${resident.id}`, String(latestAnnouncementToast.id));
                        }
                        setLatestAnnouncementToast(null);
                      }}
                      className="text-sm font-bold text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (resident?.id) {
                      localStorage.setItem(`kaagapai_last_viewed_announcement_id_${resident.id}`, String(latestAnnouncementToast.id));
                    }
                    setLatestAnnouncementToast(null);
                  }}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition shrink-0"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
            )}
            
            {latestNotificationToast && (
              <div className="p-4 rounded-2xl border shadow-xl portal-theme-glass text-slate-800 dark:text-white flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Bell size={16} className="animate-bounce" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-black uppercase tracking-wider text-[#0B5D3B] dark:text-emerald-400">🔔 New Notification</p>
                    <span className="text-sm text-slate-400 font-bold">Just Now</span>
                  </div>
                  <p className="text-xs font-black truncate">{latestNotificationToast.title}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-450 line-clamp-2 leading-normal font-bold">
                    {latestNotificationToast.body}
                  </p>
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={viewNotificationFromToast}
                      className="px-3.5 py-1.5 text-sm font-black rounded-lg bg-[#0B5D3B] hover:bg-[#0B5D3B]/90 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white transition active:scale-95"
                    >
                      View Update
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (resident?.id) {
                          localStorage.setItem(`kaagapai_last_viewed_notification_id_${resident.id}`, String(latestNotificationToast.id));
                        }
                        setLatestNotificationToast(null);
                      }}
                      className="text-sm font-bold text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (resident?.id) {
                      localStorage.setItem(`kaagapai_last_viewed_notification_id_${resident.id}`, String(latestNotificationToast.id));
                    }
                    setLatestNotificationToast(null);
                  }}
                  className="rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-655 dark:hover:text-slate-200 transition shrink-0"
                  aria-label="Close notification"
                >
                  <X size={14} />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserDashboard;