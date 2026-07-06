import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  CalendarDays,
  FileText,
  Loader2,
  Megaphone,
  Search,
  Users,
  X,
} from "lucide-react";
import Header from "../components/Header";
import DashboardOverview from "../components/DashboardOverview";
import { fetchResidents, getResidentsCount } from "../services/adminService";
import { fetchDocumentRequests } from "../services/documentRequestService";
import { fetchAnnouncements } from "../services/announcementService";
import { fetchLivelihoodPosts } from "../services/livelihoodService";
import { fetchAuditActivity } from "../services/adminActivityService";
import { formatPurok } from "../utils/residentProfile";

const SEARCH_LIMIT = 5;

const formatDate = (value) => {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

const resultGroups = [
  {
    key: "residents",
    label: "Residents",
    path: "/residents",
    icon: Users,
    color: "bg-blue-50 text-blue-700",
    emptyText: "No resident matches.",
  },
  {
    key: "documents",
    label: "Document Requests",
    path: "/documents",
    icon: FileText,
    color: "bg-emerald-50 text-emerald-700",
    emptyText: "No document request matches.",
  },
  {
    key: "announcements",
    label: "Announcements",
    path: "/announcements",
    icon: Megaphone,
    color: "bg-rose-50 text-rose-700",
    emptyText: "No announcement matches.",
  },
  {
    key: "livelihood",
    label: "Livelihood & Jobs",
    path: "/livelihood",
    icon: Briefcase,
    color: "bg-amber-50 text-amber-700",
    emptyText: "No livelihood or job matches.",
  },
];

const initialSearchResults = {
  residents: [],
  documents: [],
  announcements: [],
  livelihood: [],
};

const compactText = (...values) =>
  values
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(" - ");

const buildResidentResult = (resident) => ({
  id: resident.id,
  title: resident.full_name || "Unnamed resident",
  meta: compactText(resident.status, resident.purok && formatPurok(resident.purok), resident.house_no && `House ${resident.house_no}`),
  detail: compactText(resident.email, resident.address),
});

const buildDocumentResult = (request) => ({
  id: request.id,
  title: request.document_type || "Document request",
  meta: compactText(request.status, formatDate(request.created_at)),
  detail: request.residents?.full_name ? `Resident: ${request.residents.full_name}` : "Resident not linked",
});

const buildAnnouncementResult = (announcement) => ({
  id: announcement.id,
  title: announcement.title || "Untitled announcement",
  meta: compactText(announcement.status, announcement.category, formatDate(announcement.publish_date || announcement.created_at)),
  detail: announcement.body || "No message preview.",
});

const buildLivelihoodResult = (post) => ({
  id: post.id,
  title: post.title || "Untitled livelihood post",
  meta: compactText(post.status, post.category, post.location),
  detail: compactText(post.organization, post.deadline && `Deadline ${formatDate(post.deadline)}`) || post.description || "No details listed.",
});

const Dashboard = () => {
  const [stats, setStats] = useState([
    { label: "Total Residents", value: 0, icon: "Users", accent: "blue", caption: "Current records", trend: "Live" },
    { label: "Documents Issued", value: 0, icon: "FileText", accent: "green", caption: "Completed/released", trend: "Updated" },
    { label: "Pending Requests", value: 0, icon: "Clock", accent: "amber", caption: "For approval", trend: "Needs review" },
    { label: "Livelihood Programs", value: 0, icon: "Briefcase", accent: "cyan", caption: "Open posts", trend: "Active" },
  ]);
  const [overview, setOverview] = useState({
    totalRequests: 0,
    pendingRequests: 0,
    documentsIssued: 0,
    publishedAnnouncements: 0,
    openLivelihood: 0,
  });
  const [chartResidents, setChartResidents] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [publishedAnnouncements, setPublishedAnnouncements] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState(initialSearchResults);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const trimmedSearch = searchQuery.trim();

  useEffect(() => {
    const loadCounts = async () => {
      const [residentResult, residentListResult, requestResult, announcementResult, livelihoodResult, activityResult] =
        await Promise.allSettled([
          getResidentsCount({ excludeArchived: true }),
          fetchResidents("", "", { excludeArchived: true, withAccounts: false }),
          fetchDocumentRequests({ limit: 200 }),
          fetchAnnouncements({ status: "Published", limit: 100 }),
          fetchLivelihoodPosts({ status: "Open", limit: 100 }),
          fetchAuditActivity(8),
        ]);

      if (residentResult.status === "rejected") {
        console.error("Unable to load resident count:", residentResult.reason?.message);
      }

      const totalResidents = residentResult.status === "fulfilled" ? residentResult.value : 0;
      const residents = residentListResult.status === "fulfilled" ? residentListResult.value || [] : [];
      const requests = requestResult.status === "fulfilled" ? requestResult.value.data || [] : [];
      const totalRequests = requestResult.status === "fulfilled" ? requestResult.value.count || requests.length : 0;
      const pendingRequests = requests.filter((request) => request.status === "Pending").length;
      const documentsIssued = requests.filter((request) =>
        ["Completed", "Released"].includes(request.status)
      ).length;
      const publishedAnnouncements =
        announcementResult.status === "fulfilled" ? announcementResult.value.length : 0;
      const openLivelihood =
        livelihoodResult.status === "fulfilled" ? livelihoodResult.value.length : 0;
      const activities =
        activityResult.status === "fulfilled" ? activityResult.value.activities || [] : [];

      setOverview({
        totalRequests,
        pendingRequests,
        documentsIssued,
        publishedAnnouncements,
        openLivelihood,
      });
      setChartResidents(residents);
      setRecentRequests(requests);
      setPublishedAnnouncements(
        announcementResult.status === "fulfilled" ? announcementResult.value || [] : []
      );
      setRecentActivities(activities);

      setStats([
        { label: "Total Residents", value: totalResidents, icon: "Users", accent: "blue", caption: "Current records", trend: "Live" },
        { label: "Documents Issued", value: documentsIssued, icon: "FileText", accent: "green", caption: "Completed/released", trend: "Updated" },
        { label: "Pending Requests", value: pendingRequests, icon: "Clock", accent: "amber", caption: "For approval", trend: pendingRequests ? "Needs review" : "Clear" },
        { label: "Livelihood Programs", value: openLivelihood, icon: "Briefcase", accent: "cyan", caption: "Open posts", trend: "Active" },
      ]);
    };

    loadCounts();
  }, []);

  useEffect(() => {
    if (trimmedSearch.length < 2) {
      return undefined;
    }

    let isCurrent = true;
    const timerId = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError("");

      const [residentResult, documentResult, announcementResult, livelihoodResult] =
        await Promise.allSettled([
          fetchResidents(trimmedSearch),
          fetchDocumentRequests({ search: trimmedSearch, limit: SEARCH_LIMIT }),
          fetchAnnouncements({ search: trimmedSearch, limit: SEARCH_LIMIT }),
          fetchLivelihoodPosts({ search: trimmedSearch, limit: SEARCH_LIMIT }),
        ]);

      if (!isCurrent) return;

      const errors = [residentResult, documentResult, announcementResult, livelihoodResult]
        .filter((result) => result.status === "rejected")
        .map((result) => result.reason?.message || "A module could not be searched.");

      setSearchResults({
        residents:
          residentResult.status === "fulfilled"
            ? residentResult.value.slice(0, SEARCH_LIMIT).map(buildResidentResult)
            : [],
        documents:
          documentResult.status === "fulfilled"
            ? (documentResult.value.data || []).slice(0, SEARCH_LIMIT).map(buildDocumentResult)
            : [],
        announcements:
          announcementResult.status === "fulfilled"
            ? announcementResult.value.slice(0, SEARCH_LIMIT).map(buildAnnouncementResult)
            : [],
        livelihood:
          livelihoodResult.status === "fulfilled"
            ? livelihoodResult.value.slice(0, SEARCH_LIMIT).map(buildLivelihoodResult)
            : [],
      });
      setSearchError(errors.length ? "Some modules could not be searched. Showing available results." : "");
      setSearchLoading(false);
    }, 300);

    return () => {
      isCurrent = false;
      window.clearTimeout(timerId);
    };
  }, [trimmedSearch]);

  const totalSearchResults = useMemo(
    () => Object.values(searchResults).reduce((total, group) => total + group.length, 0),
    [searchResults]
  );

  const showSearchPanel = trimmedSearch.length >= 2;

  const updateSearchQuery = (value) => {
    setSearchQuery(value);

    if (value.trim().length < 2) {
      setSearchResults(initialSearchResults);
      setSearchError("");
      setSearchLoading(false);
    }
  };

  const clearSearchQuery = () => {
    setSearchQuery("");
    setSearchResults(initialSearchResults);
    setSearchError("");
    setSearchLoading(false);
  };

  const dashboardSearch = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
      <input
        value={searchQuery}
        onChange={(event) => updateSearchQuery(event.target.value)}
        placeholder="Search records, requests, residents..."
        className="hd-focus h-10 w-full rounded-lg border border-[#E5E6EB] bg-white pl-9 pr-20 text-sm font-medium text-[#1D2129] shadow-sm shadow-slate-900/5"
        aria-label="Search admin records"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={clearSearchQuery}
          className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          aria-label="Clear dashboard search"
        >
          <X size={15} />
        </button>
      ) : (
        <span className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-500 sm:inline-flex">
          Ctrl + K
        </span>
      )}

      {showSearchPanel ? (
        <div className="dashboard-v2-popup hd-surface-strong absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <span className="text-xs font-semibold text-slate-500">
              {searchLoading ? "Searching..." : `${totalSearchResults} result${totalSearchResults === 1 ? "" : "s"}`}
            </span>
            <span className="text-[11px] text-slate-400">Admin Search</span>
          </div>

          {searchError ? (
            <div className="mx-3 mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertCircle className="mt-0.5 shrink-0" size={14} />
              <span>{searchError}</span>
            </div>
          ) : null}

          {searchLoading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Searching admin records...
            </div>
          ) : totalSearchResults === 0 ? (
            <div className="px-3 py-4 text-sm text-slate-500">
              No matches for "{trimmedSearch}".
            </div>
          ) : (
            <div className="py-2">
              {resultGroups.map((group) => {
                const Icon = group.icon;
                const items = searchResults[group.key] || [];
                if (items.length === 0) return null;

                return (
                  <section key={group.key} className="py-1">
                    <div className="flex items-center justify-between px-3 pb-1 pt-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${group.color}`}>
                          <Icon size={14} />
                        </span>
                        <p className="truncate text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">
                          {group.label}
                        </p>
                      </div>
                      <Link
                        to={group.path}
                        onClick={clearSearchQuery}
                        className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-700 transition hover:text-blue-800"
                      >
                        Open
                        <ArrowRight size={12} />
                      </Link>
                    </div>

                    <div>
                      {items.map((item) => (
                        <Link
                          key={`${group.key}-${item.id}`}
                          to={group.path}
                          onClick={clearSearchQuery}
                          className="block px-3 py-2 transition hover:bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{item.title}</p>
                              <p className="mt-0.5 truncate text-xs text-slate-500">{item.meta || group.label}</p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{item.detail}</p>
                            </div>
                            <ArrowRight className="mt-1 shrink-0 text-slate-300" size={14} />
                          </div>
                        </Link>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const currentDate = new Date().toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    weekday: "short",
  });

  return (
    <div className="dashboard-v2-shell relative min-h-screen bg-transparent px-3 py-2 sm:px-4 lg:px-5">
      {/* Subtle Barangay Office Background Reflection */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-15 bg-cover bg-center" style={{ backgroundImage: "url('/barangay/BARANGAYOFICE.PNG')" }} />
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-b from-slate-100/60 via-slate-50/80 to-slate-100/90" />

      <div className="relative z-10">
        <Header
          title={`${greeting}, Admin!`}
          subtitle="Welcome back to Barangay Upper Mingading"
          middleContent={dashboardSearch}
          className="dashboard-v2-header mb-3 rounded-2xl px-4 py-2 bg-white/75 backdrop-blur-md border border-slate-200/80 shadow-xs min-h-[64px]"
          actions={
            <span className="hidden items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs xl:flex">
              <CalendarDays size={15} className="text-[#14532D]" />
              {currentDate}
            </span>
          }
        />
        <div>
          <DashboardOverview
            stats={stats}
            overview={overview}
            residents={chartResidents}
            requests={recentRequests}
            announcements={publishedAnnouncements}
            activities={recentActivities}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
