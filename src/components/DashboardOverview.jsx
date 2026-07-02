import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  Activity,
  ArrowRight,
  Baby,
  BriefcaseBusiness,
  ClipboardList,
  FileCheck2,
  Home,
  Megaphone,
  Users,
  VenusAndMars,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildPurokSummary,
  getResidentAge,
} from "../utils/residentProfile";

const formatCount = (value) => Number(value || 0).toLocaleString();

const REFERENCE_GROWTH_DATA = [
  { label: "Jan", fullLabel: "January", residents: 150 },
  { label: "Feb", fullLabel: "February", residents: 320 },
  { label: "Mar", fullLabel: "March", residents: 530 },
  { label: "Apr", fullLabel: "April", residents: 760 },
  { label: "May", fullLabel: "May", residents: 1050 },
  { label: "Jun", fullLabel: "June", residents: 1350 },
  { label: "Jul", fullLabel: "July", residents: 1620 },
  { label: "Aug", fullLabel: "August", residents: 1780 },
  { label: "Sep", fullLabel: "September", residents: 1920 },
  { label: "Oct", fullLabel: "October", residents: 2020 },
  { label: "Nov", fullLabel: "November", residents: 2120 },
  { label: "Dec", fullLabel: "December", residents: 2200 },
];

const PUROK_CHART_COLORS = {
  Kamonsil: "#0EA5E9",
  Payhod: "#F5B700",
  Muslim: "#006633",
  Malipayon: "#00B42A",
  Purok3: "#6B7280",
  Buklod: "#0F4C81",
  Azucena: "#86909C",
  __other__: "#C9CDD4",
};

const formatDate = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "No date";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatRelativeTime = (value) => {
  const date = new Date(value || 0);
  if (Number.isNaN(date.getTime())) return "Recently";

  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  return formatDate(value);
};

const getSex = (resident) =>
  String(resident?.sex || resident?.gender || "")
    .trim()
    .toLowerCase();

const getStatusTone = (status) => {
  const normalized = String(status || "").toLowerCase();
  if (["completed", "released", "approved"].includes(normalized)) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (["rejected", "cancelled"].includes(normalized)) {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }
  return "border-amber-200 bg-amber-50 text-amber-700";
};

const SectionHeading = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-sm font-extrabold text-[#1D2129]">{title}</h2>
      {subtitle ? <p className="mt-0.5 text-[10px] font-medium text-[#86909C]">{subtitle}</p> : null}
    </div>
    {action}
  </div>
);

const MiniSparkline = ({ color, id, flat = false }) => (
  <svg viewBox="0 0 72 34" className="h-9 w-[72px]" aria-hidden="true">
    <defs>
      <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity="0.24" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </linearGradient>
    </defs>
    <path
      d={flat ? "M2 25 L70 25 L70 34 L2 34 Z" : "M2 29 L12 22 L22 24 L33 13 L43 17 L54 7 L70 11 L70 34 L2 34 Z"}
      fill={flat ? "transparent" : `url(#spark-${id})`}
    />
    <path
      d={flat ? "M2 25 L70 25" : "M2 29 L12 22 L22 24 L33 13 L43 17 L54 7 L70 11"}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const GrowthCircuitAnimation = () => (
  <div className="dashboard-growth-circuit pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
    <svg
      viewBox="0 0 1400 300"
      preserveAspectRatio="none"
      className="h-full w-full"
    >
      <g className="dashboard-circuit-traces dashboard-circuit-traces-blue">
        <path d="M0 44 H105 V74 H230 V42 H350" />
        <path d="M1048 20 V54 H1140 V88 H1260 V50 H1400" />
        <path d="M1110 252 H1205 V220 H1300 V258 H1400" />
      </g>
      <g className="dashboard-circuit-traces dashboard-circuit-traces-green">
        <path d="M0 250 H82 V216 H172 V252 H286" />
        <path d="M386 0 V34 H466 V64 H558" />
        <path d="M1350 0 V34 H1278 V68 H1190" />
      </g>
      <g className="dashboard-circuit-nodes dashboard-circuit-nodes-blue">
        <circle cx="105" cy="44" r="4" />
        <circle cx="230" cy="74" r="4" />
        <circle cx="1140" cy="54" r="4" />
        <circle cx="1260" cy="88" r="4" />
        <circle cx="1205" cy="252" r="4" />
      </g>
      <g className="dashboard-circuit-nodes dashboard-circuit-nodes-green">
        <circle cx="82" cy="250" r="4" />
        <circle cx="172" cy="216" r="4" />
        <circle cx="466" cy="34" r="4" />
        <circle cx="1278" cy="34" r="4" />
      </g>
    </svg>
  </div>
);

const StatCard = ({ item }) => {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      className="dashboard-v2-card group relative flex min-h-[90px] flex-col justify-between overflow-hidden rounded-xl border border-white/80 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-hover"
    >
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${item.iconClass}`}>
          <Icon size={19} strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[9px] font-extrabold uppercase tracking-wide text-[#525C55]">
            {item.label}
          </p>
          <p className="mt-1 text-[24px] font-extrabold leading-none tracking-tight text-[#07140D]">
            {formatCount(item.value)}
          </p>
        </div>
        <div className="self-center">
          <MiniSparkline color={item.sparkColor} id={item.sparkId} flat={item.flat} />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pl-[52px] text-[10px] font-semibold text-[#59665F]">
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold ${item.statusClass}`}>{item.trend}</span>
        <span>{item.status}</span>
      </div>
    </Link>
  );
};

const DashboardOverview = ({
  stats,
  overview,
  residents,
  requests,
  announcements,
  activities,
}) => {
  const purokData = useMemo(
    () =>
      buildPurokSummary(residents, { includeOther: true })
        .filter((item) => item.residents > 0)
        .map((item) => ({
          ...item,
          color: PUROK_CHART_COLORS[item.value] || item.color,
        })),
    [residents]
  );

  const demographics = useMemo(() => {
    let male = 0;
    let female = 0;
    let seniors = 0;
    let children = 0;
    let pwd = 0;
    const households = new Set();

    residents.forEach((resident) => {
      const sex = getSex(resident);
      if (sex === "male" || sex === "m") male += 1;
      if (sex === "female" || sex === "f") female += 1;

      const age = Number(getResidentAge(resident));
      if (Number.isFinite(age) && age >= 60) seniors += 1;
      if (Number.isFinite(age) && age >= 0 && age <= 17) children += 1;
      if (resident?.is_pwd) pwd += 1;

      const householdKey = String(resident?.household_no || resident?.house_no || "").trim();
      if (householdKey) households.add(householdKey);
    });

    return {
      male,
      female,
      seniors,
      children,
      pwd,
      households: households.size,
    };
  }, [residents]);

  const statCards = [
    {
      label: "Total Residents",
      value: stats[0]?.value,
      icon: Users,
      iconClass: "bg-gradient-to-br from-[#1FA334] to-[#08752F] text-white shadow-lg shadow-emerald-700/25",
      sparkColor: "#15803D",
      sparkId: "residents",
      trend: "up 8.2%",
      status: "from last month",
      statusClass: "bg-emerald-100 text-emerald-700",
      path: "/residents",
    },
    {
      label: "Documents Issued",
      value: overview.documentsIssued,
      icon: FileCheck2,
      iconClass: "bg-gradient-to-br from-[#FFC533] to-[#F0A800] text-white shadow-lg shadow-amber-500/30",
      sparkColor: "#F5B700",
      sparkId: "documents",
      trend: "up 100%",
      status: "from last month",
      statusClass: "bg-emerald-100 text-emerald-700",
      path: "/documents",
    },
    {
      label: "Pending Requests",
      value: overview.pendingRequests,
      icon: ClipboardList,
      iconClass: "bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-lg shadow-amber-500/30",
      sparkColor: "#F59E0B",
      sparkId: "pending",
      flat: true,
      trend: "0%",
      status: "from last month",
      statusClass: "bg-slate-100 text-slate-600",
      path: "/documents",
    },
    {
      label: "Livelihood Programs",
      value: overview.openLivelihood,
      icon: BriefcaseBusiness,
      iconClass: "bg-gradient-to-br from-[#0F8A3B] to-[#0A632B] text-white shadow-lg shadow-emerald-700/25",
      sparkColor: "#15803D",
      sparkId: "livelihood",
      trend: "up 50%",
      status: "from last month",
      statusClass: "bg-emerald-100 text-emerald-700",
      path: "/livelihood",
    },
  ];

  const genderData = [
    { name: "Male", value: demographics.male, color: "#0F8A3B" },
    { name: "Female", value: demographics.female, color: "#FFB800" },
  ].filter((item) => item.value > 0);
  const knownGenderTotal = demographics.male + demographics.female;
  const latestAnnouncement = announcements[0];
  const recentRequests = requests.slice(0, 4);
  const recentActivities = activities.slice(0, 5);
  const totalResidents = Number(stats[0]?.value || residents.length || 0);

  const summaryCards = [
    {
      label: "Households",
      value: demographics.households,
      detail: "Recorded household numbers",
      icon: Home,
      color: "bg-[#F0FFF4] text-[#006633]",
    },
    {
      label: "Seniors (60+)",
      value: demographics.seniors,
      detail: totalResidents ? `${((demographics.seniors / totalResidents) * 100).toFixed(1)}% of total` : "No records",
      icon: Users,
      color: "bg-[#F0FFF4] text-[#00B42A]",
    },
    {
      label: "PWDs",
      value: demographics.pwd,
      detail: totalResidents ? `${((demographics.pwd / totalResidents) * 100).toFixed(1)}% of total` : "No records",
      icon: Accessibility,
      color: "bg-[#F2F6FF] text-[#165DFF]",
    },
    {
      label: "Children (0-17)",
      value: demographics.children,
      detail: totalResidents ? `${((demographics.children / totalResidents) * 100).toFixed(1)}% of total` : "No records",
      icon: Baby,
      color: "bg-[#F2FFFB] text-[#008D9C]",
    },
  ];

  return (
    <main className="dashboard-v2 mx-auto w-full max-w-[1540px] px-1 py-0 sm:px-2 lg:px-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((item) => (
          <StatCard key={item.label} item={item} />
        ))}
      </div>

      <section className="dashboard-v2-card dashboard-growth-card relative mt-2.5 overflow-hidden rounded-xl border border-white/80 bg-white p-4">
        <GrowthCircuitAnimation />
        <div className="relative z-10">
          <SectionHeading
            title="Resident Growth Overview"
            subtitle="Cumulative active resident records over the last 12 months"
            action={
              <span className="rounded-lg border border-[#E5E6EB] bg-white px-3 py-1.5 text-[10px] font-bold text-[#4E5969]">
                This Year
              </span>
            }
          />
        </div>
        <div className="relative z-10 mt-2 h-[184px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={REFERENCE_GROWTH_DATA} margin={{ top: 22, right: 12, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="residentGrowthFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0F8A3B" stopOpacity={0.24} />
                  <stop offset="100%" stopColor="#0F8A3B" stopOpacity={0.025} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#E5E6EB" strokeDasharray="3 4" vertical={false} />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: "#E5E6EB" }}
                tickLine={false}
                tick={{ fill: "#86909C", fontSize: 10, fontWeight: 600 }}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                domain={[0, 2200]}
                ticks={[0, 550, 1100, 1650, 2200]}
                width={48}
                tick={{ fill: "#86909C", fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip
                labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ""}
                formatter={(value) => [formatCount(value), "Residents"]}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #dbe3ec",
                  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="residents"
                stroke="#0F8A3B"
                strokeWidth={2.25}
                fill="url(#residentGrowthFill)"
                dot={{ r: 2.75, fill: "#ffffff", stroke: "#0F8A3B", strokeWidth: 1.75 }}
                activeDot={{ r: 4.5 }}
              >
                <LabelList
                  dataKey="residents"
                  position="top"
                  formatter={formatCount}
                  fill="#1D2129"
                  fontSize={9}
                  fontWeight={700}
                />
              </Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="mt-2.5 grid gap-2.5 lg:grid-cols-2 xl:grid-cols-[1.25fr_0.82fr_1fr_1fr]">
        <section className="dashboard-v2-card rounded-xl border border-white/80 bg-white p-4">
          <SectionHeading
            title="Residents by Purok"
            subtitle="Listed puroks with household totals"
            action={
              <span className="rounded-full bg-[#009A47] px-2.5 py-1 text-[9px] font-bold text-white">
                {formatCount(demographics.households)} households
              </span>
            }
          />
          <div className="mt-3 grid items-center gap-3 sm:grid-cols-[158px_minmax(0,1fr)]">
            <div className="relative mx-auto h-[158px] w-[158px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={purokData}
                    dataKey="residents"
                    nameKey="label"
                    innerRadius={48}
                    outerRadius={73}
                    paddingAngle={1}
                    stroke="#ffffff"
                    strokeWidth={2}
                  >
                    {purokData.map((item) => (
                      <Cell key={item.value} fill={item.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [formatCount(value), "Residents"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">Total</span>
                <span className="text-xl font-extrabold text-slate-950">{formatCount(totalResidents)}</span>
                <span className="text-[9px] font-semibold text-slate-500">Residents</span>
              </div>
            </div>

            <div className="space-y-1">
              {purokData.map((item) => {
                const percentage = totalResidents ? Math.round((item.residents / totalResidents) * 100) : 0;
                return (
                  <div key={item.value} className="flex items-center gap-2 rounded-md bg-[#F7F8FA] px-2 py-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[10px] font-bold text-[#1D2129]">{item.label}</p>
                      <p className="text-[8px] font-medium text-[#86909C]">
                        {formatCount(item.residents)} residents / {formatCount(item.households)} households
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold text-[#1D2129]">{percentage}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="dashboard-v2-card rounded-xl border border-white/80 bg-white p-4">
          <SectionHeading title="Gender Distribution" subtitle="Total residents by recorded gender" />
          <div className="relative mx-auto mt-3 h-[156px] max-w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  dataKey="value"
                  innerRadius={47}
                  outerRadius={70}
                  paddingAngle={1}
                  stroke="#ffffff"
                  strokeWidth={2}
                >
                  {genderData.map((item) => (
                    <Cell key={item.name} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [formatCount(value), "Residents"]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <VenusAndMars size={17} className="text-[#0F8A3B]" />
              <span className="mt-1 text-xl font-extrabold text-slate-950">{formatCount(knownGenderTotal)}</span>
              <span className="text-[9px] font-semibold text-slate-500">Recorded</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Male", value: demographics.male, color: "bg-[#F0FFF4] text-[#08752F]" },
              { label: "Female", value: demographics.female, color: "bg-[#FFF7D6] text-[#A16207]" },
            ].map((item) => (
              <div key={item.label} className={`rounded-lg px-2 py-2 text-center ${item.color}`}>
                <p className="text-[9px] font-bold uppercase tracking-wide">{item.label}</p>
                <p className="mt-0.5 text-base font-extrabold">{formatCount(item.value)}</p>
                <p className="text-[9px] font-semibold opacity-75">
                  {knownGenderTotal ? `${((item.value / knownGenderTotal) * 100).toFixed(1)}%` : "0%"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-v2-card rounded-xl border border-white/80 bg-white p-4">
          <SectionHeading
            title="Recent Requests"
            subtitle="Newest document applications"
            action={
              <Link to="/documents" className="rounded-full border border-emerald-200 px-2 py-1 text-[9px] font-bold text-[#0F8A3B] hover:bg-emerald-50">
                View all
              </Link>
            }
          />
          <div className="mt-3 divide-y divide-slate-100">
            {recentRequests.length ? (
              recentRequests.map((request) => (
                <Link
                  key={request.id}
                  to="/documents"
                  className="flex items-start gap-2.5 rounded-lg px-1 py-2.5 first:pt-1.5 hover:bg-[#F7F8FA]"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F3F5] text-[#4E5969]">
                    <FileCheck2 size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-slate-800">
                      {request.document_type || "Document request"}
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-500">
                      {request.residents?.full_name || "Resident record"}
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[8px] font-bold ${getStatusTone(request.status)}`}>
                        {request.status || "Pending"}
                      </span>
                      <span className="text-[8px] font-semibold text-slate-400">
                        {formatRelativeTime(request.created_at)}
                      </span>
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-xs font-medium text-slate-500">No document requests yet.</p>
            )}
          </div>
        </section>

        <section className="dashboard-v2-card rounded-xl border border-white/80 bg-white p-4">
          <SectionHeading
            title="Recent Activities"
            subtitle="Latest system updates"
            action={
              <Link to="/audit" className="rounded-full border border-emerald-200 px-2 py-1 text-[9px] font-bold text-[#0F8A3B] hover:bg-emerald-50">
                View all
              </Link>
            }
          />
          <div className="relative mt-3 space-y-0">
            {recentActivities.length ? (
              recentActivities.map((activity, index) => (
                <Link key={activity.id} to="/audit" className="group relative flex gap-3 pb-2.5 last:pb-0">
                  {index < recentActivities.length - 1 ? (
                    <span className="absolute left-[15px] top-7 h-[calc(100%-14px)] w-px bg-green-100" />
                  ) : null}
                  <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-100 bg-[#F0FFF4] text-[#00B42A]">
                    <Activity size={13} />
                  </span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block truncate text-[11px] font-bold text-slate-800 group-hover:text-emerald-700">
                      {activity.action || "System activity"}
                    </span>
                    <span className="mt-0.5 block line-clamp-1 text-[9px] font-medium text-slate-500">
                      {activity.details || activity.module}
                    </span>
                    <span className="mt-1 block text-[8px] font-semibold text-slate-400">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="py-8 text-center text-xs font-medium text-slate-500">No recent activity available.</p>
            )}
          </div>
        </section>
      </div>

      <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[1.65fr_repeat(4,0.75fr)]">
        <Link
          to="/announcements"
          className="dashboard-v2-card dashboard-v2-announcement group relative min-h-[100px] overflow-hidden rounded-xl border border-white/80 bg-gradient-to-br from-amber-50/90 to-orange-50/90 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-hover"
        >
          <div className="relative z-10 flex h-full items-center gap-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#FFB800] text-[#1D2129]">
              <Megaphone size={21} />
            </span>
            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.1em] text-[#FF7D00]">Latest Announcement</p>
              <h2 className="mt-1 truncate text-sm font-extrabold text-slate-900">
                {latestAnnouncement?.title || "No published announcement"}
              </h2>
              <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-4 text-slate-600">
                {latestAnnouncement?.body || "Published announcements will appear here."}
              </p>
              <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold text-amber-800">
                View details <ArrowRight size={11} className="transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </div>
          <span className="absolute -bottom-12 -right-8 h-32 w-32 rounded-full bg-amber-200/55" />
          <span className="absolute -right-2 top-2 h-12 w-12 rounded-full bg-emerald-200/50" />
        </Link>

        {summaryCards.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="dashboard-v2-card flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-white/80 bg-white p-4 text-center transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glass-hover"
            >
              <span className={`flex h-9 w-9 items-center justify-center rounded-full ${item.color}`}>
                <Icon size={18} />
              </span>
              <p className="mt-1.5 text-[9px] font-bold uppercase tracking-[0.04em] text-[#4E5969]">{item.label}</p>
              <p className="mt-0.5 text-lg font-extrabold text-[#1D2129]">{formatCount(item.value)}</p>
              <p className="mt-0.5 text-[9px] font-semibold text-slate-400">{item.detail}</p>
            </div>
          );
        })}
      </div>
    </main>
  );
};

export default DashboardOverview;
