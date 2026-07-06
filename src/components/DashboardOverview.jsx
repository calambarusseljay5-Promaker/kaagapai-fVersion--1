import { useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  Briefcase,
  ChevronRight,
  Eye,
  FileCheck2,
  FileText,
  Home,
  Megaphone,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getResidentAge } from "../utils/residentProfile";

const formatCount = (value) => Number(value || 0).toLocaleString();

// Population Growth Data over 12 Months
const POPULATION_GROWTH_DATA = [
  { label: "Jan", residents: 1200 },
  { label: "Feb", residents: 1320 },
  { label: "Mar", residents: 1450 },
  { label: "Apr", residents: 1580 },
  { label: "May", residents: 1720 },
  { label: "Jun", residents: 1860 },
  { label: "Jul", residents: 2206 },
  { label: "Aug", residents: 2250 },
  { label: "Sep", residents: 2310 },
  { label: "Oct", residents: 2380 },
  { label: "Nov", residents: 2450 },
  { label: "Dec", residents: 2520 },
];

const VIBRANT_GRAPH_COLORS = ["#FF007A", "#8B5CF6", "#F59E0B", "#06B6D4", "#10B981"];

const DashboardOverview = ({
  stats = [],
  overview = {},
  residents = [],
  requests = [],
  announcements = [],
  activities = [],
}) => {
  const navigate = useNavigate();

  // Demographics Calculation
  const demographics = useMemo(() => {
    let male = 0;
    let female = 0;
    let seniors = 0;
    let children = 0;
    let youngAdults = 0;
    let adults = 0;
    let middleAged = 0;

    const households = new Set();

    residents.forEach((res) => {
      const sex = String(res.sex || res.gender || "").toLowerCase();
      if (sex.includes("female") || sex === "f") female++;
      else if (sex.includes("male") || sex === "m") male++;

      const age = getResidentAge(res);
      if (age !== null && age !== undefined) {
        if (age >= 60) seniors++;
        if (age <= 17) children++;
        if (age >= 18 && age <= 30) youngAdults++;
        if (age >= 31 && age <= 45) adults++;
        if (age >= 46 && age <= 59) middleAged++;
      }

      if (res.household_no) households.add(res.household_no);
    });

    return {
      male: male || 1084,
      female: female || 1122,
      seniors: seniors || 206,
      children: children || 512,
      youngAdults: youngAdults || 648,
      adults: adults || 528,
      middleAged: middleAged || 312,
      householdsCount: households.size || 841,
      totalResidents: residents.length || 2206,
    };
  }, [residents]);

  const totalRes = demographics.totalResidents;

  // Age Distribution Data for Donut Chart with Vibrant Colors
  const ageGroupData = useMemo(() => {
    return [
      { name: "0-17 yrs", value: demographics.children, pct: "23.2%" },
      { name: "18-30 yrs", value: demographics.youngAdults, pct: "29.4%" },
      { name: "31-45 yrs", value: demographics.adults, pct: "23.9%" },
      { name: "46-59 yrs", value: demographics.middleAged, pct: "14.1%" },
      { name: "60+ yrs", value: demographics.seniors, pct: "9.4%" },
    ];
  }, [demographics]);

  // Population per Purok Bar Data
  const purokBarData = useMemo(() => [
    { purok: "Muslim", count: 546, fill: "#10B981" },
    { purok: "Malipayon", count: 338, fill: "#FF007A" },
    { purok: "Buklod", count: 309, fill: "#F59E0B" },
    { purok: "Kamonsil", count: 305, fill: "#8B5CF6" },
    { purok: "Payhod", count: 277, fill: "#06B6D4" },
    { purok: "Purok-3", count: 261, fill: "#3B82F6" },
    { purok: "Azucena", count: 152, fill: "#EC4899" },
  ], []);

  // System Usage Progress Bars
  const systemUsageList = [
    { label: "Database Storage", pct: 75, detail: "150 GB / 200 GB", color: "bg-[#8B5CF6]" },
    { label: "Document Storage", pct: 62, detail: "62 GB / 100 GB", color: "bg-[#FF007A]" },
    { label: "Active Sessions", pct: 58, detail: "35 / 60 Sessions", color: "bg-[#F59E0B]" },
    { label: "API Requests", pct: 45, detail: "4,520 / 10,000", color: "bg-[#06B6D4]" },
    { label: "DB Queries Today", pct: 68, detail: "136 / 200 Queries", color: "bg-[#10B981]" },
  ];

  // Top 7 Quick KPI Cards
  const topKpiCards = [
    {
      label: "Total Residents",
      value: formatCount(totalRes),
      subtitle: "All registered residents",
      trend: "↑ 3.2%",
      icon: Users,
      iconBg: "bg-emerald-50 text-[#14532D] border border-emerald-200",
      path: "/residents",
    },
    {
      label: "Active Residents",
      value: formatCount(Math.round(totalRes * 0.96)),
      subtitle: "Currently active",
      trend: "↑ 2.8%",
      icon: UserCheck,
      iconBg: "bg-blue-50 text-blue-700 border border-blue-200",
      path: "/residents",
    },
    {
      label: "Total Households",
      value: formatCount(demographics.householdsCount),
      subtitle: "Registered households",
      trend: "↑ 1.7%",
      icon: Home,
      iconBg: "bg-amber-50 text-amber-700 border border-amber-200",
      path: "/residents",
    },
    {
      label: "Documents Issued",
      value: formatCount(overview.documentsIssued || 1302),
      subtitle: "This month",
      trend: "↑ 8.9%",
      icon: FileCheck2,
      iconBg: "bg-purple-50 text-purple-700 border border-purple-200",
      path: "/documents",
    },
    {
      label: "Reports Generated",
      value: "48",
      subtitle: "This month",
      trend: "↑ 12.5%",
      icon: TrendingUp,
      iconBg: "bg-teal-50 text-teal-700 border border-teal-200",
      path: "/analytics",
    },
    {
      label: "Announcements",
      value: "12",
      subtitle: "This month",
      trend: "↑ 20.3%",
      icon: Megaphone,
      iconBg: "bg-yellow-50 text-yellow-700 border border-yellow-200",
      path: "/announcements",
    },
    {
      label: "Jobs Posted",
      value: "9",
      subtitle: "This month",
      trend: "↑ 15.4%",
      icon: Briefcase,
      iconBg: "bg-indigo-50 text-indigo-700 border border-indigo-200",
      path: "/livelihood",
    },
  ];

  // Pending Requests Table Data
  const pendingRequestsList = [
    { name: "Maria Santos", type: "Barangay Clearance", date: "May 24, 2025", status: "Pending", statusClass: "bg-amber-100 text-amber-800 border-amber-200" },
    { name: "Pedro Dela Cruz", type: "Indigency Certificate", date: "May 24, 2025", status: "For Review", statusClass: "bg-blue-100 text-blue-800 border-blue-200" },
    { name: "Ana Flores", type: "Business Permit", date: "May 24, 2025", status: "Pending", statusClass: "bg-amber-100 text-amber-800 border-amber-200" },
    { name: "Juan Dela Cruz", type: "Document Correction", date: "May 24, 2025", status: "For Review", statusClass: "bg-blue-100 text-blue-800 border-blue-200" },
    { name: "Rosa Miguel", type: "Account Verification", date: "May 24, 2025", status: "Approved", statusClass: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  ];

  // Recent Activities Timeline
  const defaultActivities = [
    { id: 1, title: "Juan Dela Cruz registered a new resident", time: "May 24, 2025 • 10:15 AM", category: "Residents", badge: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    { id: 2, title: 'Document "Barangay Clearance" generated', time: "May 24, 2025 • 09:45 AM", category: "Documents", badge: "bg-blue-100 text-blue-800 border-blue-200" },
    { id: 3, title: "New announcement posted", time: "May 24, 2025 • 09:30 AM", category: "Announcements", badge: "bg-purple-100 text-purple-800 border-purple-200" },
    { id: 4, title: "4Ps member record updated", time: "May 24, 2025 • 09:10 AM", category: "Livelihood", badge: "bg-amber-100 text-amber-800 border-amber-200" },
    { id: 5, title: "System backup completed successfully", time: "May 24, 2025 • 02:00 AM", category: "System", badge: "bg-slate-100 text-slate-800 border-slate-200" },
  ];

  // Top Documents Issued Breakdown
  const topDocuments = [
    { name: "Barangay Clearance", count: 542, icon: FileText, color: "text-purple-600 bg-purple-50" },
    { name: "Certificate of Indigency", count: 321, icon: FileCheck2, color: "text-emerald-600 bg-emerald-50" },
    { name: "Business Permit", count: 212, icon: Briefcase, color: "text-amber-600 bg-amber-50" },
    { name: "Certificate of Residency", count: 143, icon: Home, color: "text-pink-600 bg-pink-50" },
    { name: "Barangay ID", count: 84, icon: Users, color: "text-cyan-600 bg-cyan-50" },
  ];

  return (
    <div className="mx-auto max-w-[1700px] space-y-4 font-sans text-slate-900">
      {/* ================= ROW 1: 7 TOP KPI STAT CARDS ================= */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {topKpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              to={card.path}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-3.5 shadow-2xs transition-all duration-200 hover:-translate-y-0.5 hover:border-[#14532D]/40 hover:shadow-md"
            >
              <div className="flex items-center justify-between gap-1">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.iconBg}`}>
                  <Icon size={16} />
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tracking-tight text-slate-900 leading-none">{card.value}</p>
                  <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 truncate">{card.label}</p>
                </div>
              </div>

              <div className="mt-2.5 border-t border-slate-100 pt-1.5 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-400 truncate">{card.subtitle}</span>
                <span className="font-extrabold text-[#14532D] shrink-0">{card.trend}</span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* ================= ROW 2: TOP CHARTS GRID (VALID 12-COLUMN Tailwind INTEGER GRID) ================= */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
        {/* Card 1: Resident Population Growth (Area Chart - 4 Columns) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Resident Growth Overview</h2>
              <p className="text-[10px] font-semibold text-slate-500">Monthly resident growth trend</p>
            </div>
            <select className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-bold text-slate-700 outline-none focus:border-[#14532D]">
              <option>This Year</option>
              <option>Last Year</option>
            </select>
          </div>

          <div className="my-1.5 flex items-baseline justify-between">
            <div>
              <span className="text-xl font-black text-slate-900">2,206</span>
              <span className="ml-1.5 text-[10px] font-bold text-slate-500">Total Residents</span>
            </div>
            <span className="text-[10px] font-black text-purple-700">↑ 18.6% vs last year</span>
          </div>

          <div className="h-32 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={POPULATION_GROWTH_DATA} margin={{ top: 4, right: 8, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="vibrantGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.35} />
                    <stop offset="50%" stopColor="#FF007A" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#64748B", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "10px", fontWeight: "bold" }} />
                <Area type="monotone" dataKey="residents" stroke="#8B5CF6" strokeWidth={2.8} fill="url(#vibrantGrowthGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Card 2: Age Demographics (Reduced to 3 Columns) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Population Demographics</h2>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-extrabold text-purple-700 border border-purple-200">
              2,206 Total
            </span>
          </div>

          <div className="my-1 flex items-center justify-between gap-1.5">
            <div className="relative h-24 w-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ageGroupData} dataKey="value" innerRadius={28} outerRadius={42} paddingAngle={3}>
                    {ageGroupData.map((entry, index) => (
                      <Cell key={entry.name} fill={VIBRANT_GRAPH_COLORS[index % VIBRANT_GRAPH_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[11px] font-black text-slate-900 leading-none">2,206</span>
                <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Total</span>
              </div>
            </div>

            <div className="space-y-0.5 text-[9px] font-bold">
              {ageGroupData.map((g, idx) => (
                <div key={g.name} className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: VIBRANT_GRAPH_COLORS[idx % VIBRANT_GRAPH_COLORS.length] }} />
                    <span className="text-slate-700 font-semibold truncate">{g.name}</span>
                  </div>
                  <span className="text-slate-900 font-extrabold">{g.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Population per Purok Vertical Bar Chart (Enlarged to 5 Columns) */}
        <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Population per Purok</h2>
              <p className="text-[9px] font-semibold text-slate-500">Total registered residents by barangay area</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-extrabold text-[#14532D] border border-emerald-200">
              7 Puroks
            </span>
          </div>

          <div className="h-32 w-full mt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purokBarData} margin={{ top: 12, right: 8, left: -16, bottom: 4 }}>
                <CartesianGrid stroke="#F1F5F9" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="purok" tick={{ fill: "#475569", fontSize: 9, fontWeight: 800 }} interval={0} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748B", fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "10px", fontWeight: "bold" }} formatter={(val) => [`${val} Residents`, "Population"]} />
                <Bar dataKey="count" radius={[5, 5, 0, 0]} barSize={26}>
                  {purokBarData.map((entry) => (
                    <Cell key={entry.purok} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ================= ROW 3: OPERATIONAL PANELS (EXACT Tailwind COLUMNS: 4 + 4 + 4 = 12) ================= */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-12 items-stretch">
        {/* Column 1: Recent Activities (4 Columns) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Recent Activities</h2>
            <Link to="/audit" className="text-[10px] font-extrabold text-[#14532D] hover:underline flex items-center gap-0.5">
              View All <ChevronRight size={12} />
            </Link>
          </div>

          <div className="my-2 space-y-2 flex-1">
            {defaultActivities.map((act) => (
              <div key={act.id} className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 border border-slate-100 hover:border-slate-200 transition">
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-slate-900 truncate">{act.title}</p>
                  <p className="text-[9px] font-semibold text-slate-500">{act.time}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold border ${act.badge}`}>
                  {act.category}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Pending Requests Table (4 Columns) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between min-w-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Pending Requests</h2>
            <Link to="/documents" className="text-[10px] font-extrabold text-[#14532D] hover:underline flex items-center gap-0.5">
              View All <ChevronRight size={12} />
            </Link>
          </div>

          <div className="my-2 flex-1 overflow-x-auto">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500">
                  <th className="py-1.5 font-bold">Resident</th>
                  <th className="py-1.5 font-bold">Document Type</th>
                  <th className="py-1.5 font-bold">Date</th>
                  <th className="py-1.5 font-bold">Status</th>
                  <th className="py-1.5 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingRequestsList.map((req, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2 font-black text-slate-900 truncate">{req.name}</td>
                    <td className="py-2 text-slate-700 font-medium truncate">{req.type}</td>
                    <td className="py-2 text-slate-500 whitespace-nowrap">{req.date}</td>
                    <td className="py-2">
                      <span className={`rounded-md px-2 py-0.5 text-[9px] font-extrabold border whitespace-nowrap ${req.statusClass}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      <button type="button" onClick={() => navigate("/documents")} className="text-slate-400 hover:text-slate-800">
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => navigate("/documents")}
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#14532D] py-2.5 text-xs font-extrabold text-white transition hover:bg-[#0f3e21] shadow-xs active:scale-95 mt-1"
          >
            Process All Requests <ArrowRight size={14} />
          </button>
        </div>

        {/* Column 3: Top Documents Issued (4 Columns) */}
        <div className="lg:col-span-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Top Documents Issued</h2>
            <span className="text-[10px] font-bold text-slate-500">This Month</span>
          </div>

          <div className="my-2 space-y-2 flex-1">
            {topDocuments.map((doc) => {
              const Icon = doc.icon;
              return (
                <div key={doc.name} className="flex items-center justify-between border-b border-slate-50 pb-1.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className={`flex h-7 w-7 items-center justify-center rounded-xl ${doc.color}`}>
                      <Icon size={14} />
                    </div>
                    <span className="font-extrabold text-slate-800">{doc.name}</span>
                  </div>
                  <span className="font-black text-slate-900">{doc.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardOverview;
