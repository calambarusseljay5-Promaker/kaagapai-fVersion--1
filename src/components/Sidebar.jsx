import { NavLink, useLocation } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  Building2,
  Briefcase,
  Megaphone,
  Archive,
  Activity,
  BrainCircuit,
  Settings,
  Landmark,
} from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

const navigationGroups = [
  {
    label: "Main",
    items: [
      { name: "Dashboard", icon: "LayoutDashboard", path: "/dashboard" },
      { name: "Resident", icon: "Users", path: "/residents" },
      { name: "Organizational Chart", icon: "Building2", path: "/organization" },
      { name: "Document Management", icon: "FileText", path: "/documents" },
      { name: "Announcements", icon: "Megaphone", path: "/announcements" },
      { name: "Livelihood & Jobs", icon: "Briefcase", path: "/livelihood" },
      { name: "Resident Knowledge", icon: "BrainCircuit", path: "/ai-knowledge" },
      { name: "Reports & Analytics", icon: "BarChart3", path: "/analytics" },
      { name: "Audit Logs", icon: "Activity", path: "/audit" },
      { name: "Archive Management", icon: "Archive", path: "/archive" },
    ],
  },
];

const iconMap = {
  LayoutDashboard: <LayoutDashboard size={24} />,
  Users: <Users size={24} />,
  FileText: <FileText size={24} />,
  BarChart3: <BarChart3 size={24} />,
  Building2: <Building2 size={24} />,
  Briefcase: <Briefcase size={24} />,
  Megaphone: <Megaphone size={24} />,
  Archive: <Archive size={24} />,
  Activity: <Activity size={24} />,
  BrainCircuit: <BrainCircuit size={24} />,
  Settings: <Settings size={24} />,
};

const AdminOrbitLogo = () => (
  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/75 bg-white p-0.5 shadow-lg shadow-emerald-950/20">
    <img
      src="/logo.png"
      alt="Barangay Mingading Logo"
      className="h-full w-full rounded-full object-cover"
    />
  </div>
);

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const location = useLocation();
  const shouldReduceMotion = useReducedMotion();

  const sidebarVariants = {
    expanded: {
      width: 260,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 260, damping: 30, mass: 0.75 },
    },
    collapsed: {
      width: 80,
      transition: shouldReduceMotion
        ? { duration: 0 }
        : { type: "spring", stiffness: 260, damping: 30, mass: 0.75 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 },
  };

  const getActiveState = (path) => {
    if (path === "/dashboard") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname === path;
  };

  return (
    <motion.aside
      className="fixed left-1 top-1 z-50 flex h-[calc(100vh-0.5rem)] flex-col overflow-hidden rounded-2xl border border-white/20 bg-gradient-to-b from-[#14532D] via-[#0f3e21] to-[#0a2916] text-slate-100 shadow-2xl backdrop-blur-xl sm:left-2 sm:top-2 sm:h-[calc(100vh-1rem)]"
      variants={sidebarVariants}
      animate={isCollapsed ? "collapsed" : "expanded"}
      initial={false}
    >
      <div className="border-b border-white/10 px-3 py-3.5">
        <div className="flex items-start justify-between gap-2">
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: shouldReduceMotion ? 0 : 0.22, ease: "easeOut" }}
                className="min-w-0 px-1"
              >
                <h1 className="text-xl font-extrabold leading-none text-white tracking-wide mt-1">
                  Kaagap<span className="text-[#C8A14A]">AI</span>
                </h1>
                <div className="mt-3.5 flex items-center gap-3">
                  <AdminOrbitLogo />
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold leading-tight text-white">Barangay Upper Mingading</p>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-200/90">Aleosan, Cotabato</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/10 text-white transition hover:bg-white/20 mt-1"
            aria-label="Toggle sidebar"
          >
            {isCollapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </motion.button>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto custom-scrollbar px-3 py-4">
        {navigationGroups.map((group, groupIndex) => (
          <motion.div
            key={group.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: shouldReduceMotion ? 0 : groupIndex * 0.04,
              duration: shouldReduceMotion ? 0 : 0.2,
            }}
          >
            {!isCollapsed && (
              <p className="mb-2.5 px-2 text-[11px] font-extrabold uppercase tracking-widest text-[#C8A14A]">
                {group.label}
              </p>
            )}
            <div className="space-y-1">
              {group.items.map((item, itemIndex) => {
                const active = getActiveState(item.path);
                return (
                  <motion.div
                    key={item.path}
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={shouldReduceMotion ? undefined : { x: 2 }}
                    whileTap={shouldReduceMotion ? undefined : { scale: 0.99 }}
                    transition={{
                      delay: shouldReduceMotion ? 0 : groupIndex * 0.04 + itemIndex * 0.025,
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                  >
                    <NavLink
                      to={item.path}
                      title={isCollapsed ? item.name : undefined}
                      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-all duration-200 ${active
                          ? "bg-white/15 text-white shadow-md ring-1 ring-white/20"
                          : "text-emerald-100/90 hover:bg-white/10 hover:text-white"
                        }`}
                    >
                      {active && (
                        <motion.span
                          layoutId="activeIndicator"
                          className="absolute bottom-2 left-0 top-2 w-1.5 rounded-r-full bg-[#C8A14A]"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                      {active && (
                        <motion.span
                          layoutId="activeNavGlow"
                          className="pointer-events-none absolute inset-0 rounded-[14px] bg-gradient-to-r from-white/12 via-slate-300/8 to-transparent"
                          initial={false}
                          transition={{ type: "spring", stiffness: 420, damping: 32 }}
                        />
                      )}
                      <span className="relative flex-shrink-0 text-current transition-transform duration-200 group-hover:scale-110">
                        {iconMap[item.icon]}
                      </span>
                      {!isCollapsed && (
                        <span className="relative truncate">
                          {item.name}
                        </span>
                      )}
                    </NavLink>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </nav>

      {!isCollapsed ? (
        <div className="p-4">
          <div className="rounded-[16px] border border-white/16 bg-white/8 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFB800] text-[#00552E]">
                <Landmark size={24} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-white">Barangay Upper Mingading</p>
                <p className="text-xs font-semibold leading-tight text-emerald-100 mt-0.5">Aleosan, Cotabato</p>
                <p className="mt-1 text-xs font-semibold text-emerald-100">Since 1950</p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </motion.aside>
  );
};

export default Sidebar;
