import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  ChevronLeft,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  UserCheck,
  UserRound,
  Upload,
  CheckCircle2,
  Phone,
  FileText,
  AlertCircle,
  FileCheck2,
  User,
  MapPin,
  Heart,
  Building2,
  Award,
  Users,
  Bot,
  BellRing,
  Briefcase,
  Sparkles,
  X,
  Menu,
  ArrowRight,
  Shield,
  Layers,
  MessageSquare,
  Clock,
  Home as HomeIcon,
  PhoneCall,
  Check,
  Globe
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { clearAuthSession, loginUser } from "../services/authService";
import {
  clearResidentSession,
  getResidentSession,
  loginResident,
  requestResidentActivation,
  validateResidentRegistrationProof,
} from "../services/residentAuthService";
import { isValidSmsPhone } from "../services/smsService";
import { getDashboardPathForRole } from "../utils/authRoutes";
import { buildFullName, calculateAge, formatPurok, purokOptions } from "../utils/residentProfile";

const purokOptionList = purokOptions.map((purok) => (
  <option key={purok} value={purok}>
    {formatPurok(purok)}
  </option>
));

const getLoginDisplayName = ({ user, profile, resident }) =>
  resident?.full_name ||
  profile?.full_name ||
  profile?.name ||
  user?.user_metadata?.full_name ||
  user?.user_metadata?.name ||
  user?.email?.split("@")[0] ||
  "User";

const stepHeaders = [
  { label: "Personal Info", icon: User },
  { label: "Address Details", icon: MapPin },
  { label: "Security & Contact", icon: Lock },
  { label: "Sector Status", icon: Heart },
  { label: "Verification Proof", icon: FileText },
  { label: "Review & Submit", icon: FileCheck2 },
];

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Modal State System
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalStep, setModalStep] = useState("choose"); // "choose" | "resident_login" | "resident_register" | "admin_login"
  const [accessMode, setAccessMode] = useState("Resident");
  const [residentAuthMode, setResidentAuthMode] = useState("signin");
  const [registrationProof, setRegistrationProof] = useState(null);
  const [registrationStep, setRegistrationStep] = useState(1);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Single-Screen Information Viewer Overlay
  const [activeOverlay, setActiveOverlay] = useState(null); // null | "about" | "features" | "services" | "contact"

  const [formData, setFormData] = useState({
    fullName: "",
    last_name: "",
    first_name: "",
    middle_name: "",
    email: "",
    password: "",
    birthday: "",
    householdNo: "",
    phone: "",
    sex: "Male",
    birthplace: "",
    purok: "",
    educational_attainment: "",
    occupation: "",
    civil_status: "Single",
    relationship_to_household_head: "Head",
    house_no: "",
    address: "",
    is_4ps_member: false,
    is_solo_parent: false,
    is_pwd: false,
    pwd_type: "",
  });

  const navigate = useNavigate();
  const isResidentRegistration = modalStep === "resident_register";

  const residentRegistrationAge = useMemo(
    () => calculateAge(formData.birthday),
    [formData.birthday]
  );
  
  const residentRegistrationFullName = useMemo(
    () => buildFullName(formData),
    [formData]
  );

  const handleInputChange = (event) => {
    const { checked, name, type, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "is_pwd" && !checked ? { pwd_type: "" } : {}),
    }));
    setError(null);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        validateResidentRegistrationProof(file);
        setRegistrationProof(file);
        setError(null);
      } catch (err) {
        setError(err.message);
        setRegistrationProof(null);
      }
    }
  };

  const openPortalModal = (type = "choose") => {
    sessionStorage.removeItem("just_logged_out");
    setModalStep(type);
    setError(null);
    setNotice(null);
    setShowLoginModal(true);
  };

  const closeModal = () => {
    setShowLoginModal(false);
    setError(null);
    setNotice(null);
    localStorage.removeItem("kaagapai_redirect_module");
  };

  useEffect(() => {
    const justLoggedOut = sessionStorage.getItem("just_logged_out") === "true";

    // 1. If already logged in AND did not just log out, redirect immediately
    const residentSession = getResidentSession();
    if (residentSession && !justLoggedOut) {
      navigate("/resident-dashboard", { replace: true });
      return;
    }

    if (!justLoggedOut) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          supabase
            .from("user_profiles")
            .select("role")
            .eq("id", session.user.id)
            .single()
            .then(({ data: profile }) => {
              if (profile) {
                const path = getDashboardPathForRole(profile.role);
                if (path) {
                  navigate(path, { replace: true });
                }
              }
            });
        }
      });
    }

    // 2. Otherwise check for auto-login (Skip completely if user just signed out)
    if (justLoggedOut) {
      return;
    }

    const timer = setTimeout(() => {
      const emailInput = document.querySelector('input[name="email"]');
      const passwordInput = document.querySelector('input[name="password"]');
      
      if (emailInput && passwordInput && emailInput.value && passwordInput.value) {
        setFormData((current) => ({
          ...current,
          email: emailInput.value,
          password: passwordInput.value,
        }));
        
        setLoading(true);
        clearResidentSession();
        clearAuthSession();
        
        loginResident(emailInput.value, passwordInput.value)
          .then((res) => {
            closeModal();
            navigate("/welcome", {
              replace: true,
              state: {
                redirectTo: "/resident-dashboard",
                role: "resident",
                displayName: getLoginDisplayName({ resident: res }),
              },
            });
          })
          .catch((err) => {
            console.error("Auto login failed:", err);
            setError(err.message || "Auto login failed.");
            setLoading(false);
          });
      }
    }, 1200);

    return () => {
      clearTimeout(timer);
    };
  }, [navigate]);

  const renderStep1Fields = () => (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-1.5 mb-2">
        <User size={14} className="text-[#0B5D3B]" />
        <span>Personal Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">First Name *</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="Juan" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Name *</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="Dela Cruz" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Middle Name</label>
        <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="Reyes" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birth Date *</label>
          <input type="date" name="birthday" value={formData.birthday} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sex *</label>
          <select name="sex" value={formData.sex} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birth Place *</label>
          <input type="text" name="birthplace" value={formData.birthplace} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="City / Municipality" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Civil Status *</label>
          <select name="civil_status" value={formData.civil_status} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium">
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 font-medium">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Relationship to Household Head *</label>
        <select name="relationship_to_household_head" value={formData.relationship_to_household_head} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium">
          <option value="Head">Household Head</option>
          <option value="Spouse">Spouse</option>
          <option value="Child">Child</option>
          <option value="Sibling">Sibling</option>
          <option value="Parent">Parent</option>
          <option value="Other">Other Relative</option>
        </select>
      </div>
    </div>
  );

  const renderStep2Fields = () => (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-1.5 mb-2">
        <MapPin size={14} className="text-[#0B5D3B]" />
        <span>Address Information</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Household No *</label>
          <input type="text" name="householdNo" value={formData.householdNo} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="e.g. 024" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">House No *</label>
          <input type="text" name="house_no" value={formData.house_no} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="e.g. 104-B" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Purok *</label>
        <select name="purok" value={formData.purok} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium">
          <option value="">Select Purok</option>
          {purokOptionList}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Address Description *</label>
        <textarea name="address" value={formData.address} onChange={handleInputChange} rows={3} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white resize-none font-medium" placeholder="Specify block, lot, street name, and key landmarks..." />
      </div>
    </div>
  );

  const renderStep3Fields = () => (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-1.5 mb-2">
        <Lock size={14} className="text-[#0B5D3B]" />
        <span>Security & Access Credentials</span>
      </div>
      
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SMS Phone Number *</label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="09171234567" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Used for SMS announcements and document status notifications.</p>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address (Optional)</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="resident@example.com" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Household Portal Password *</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white font-medium" placeholder="Create portal password" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center text-slate-400 hover:text-slate-700 transition">
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Must be at least 6 characters long.</p>
      </div>
    </div>
  );

  const renderStep4Fields = () => (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-1.5 mb-2">
        <Heart size={14} className="text-[#0B5D3B]" />
        <span>Community Sector Details</span>
      </div>
      
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_pwd" checked={formData.is_pwd} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-350 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Person with Disability (PWD / PWED)</p>
            <p className="text-[10px] text-slate-400 font-medium">Check this if you are a registered PWD.</p>
          </div>
        </label>

        {formData.is_pwd && (
          <div className="pl-7 pt-1">
            <input type="text" name="pwd_type" value={formData.pwd_type} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] font-medium" placeholder="Specify disability type..." />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_solo_parent" checked={formData.is_solo_parent} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-350 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Solo Parent</p>
            <p className="text-[10px] text-slate-400 font-medium">Registered single parent supporting dependents.</p>
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_4ps_member" checked={formData.is_4ps_member} onChange={handleInputChange} className="h-4 w-4 rounded border-slate-350 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">DSWD 4Ps Beneficiary</p>
            <p className="text-[10px] text-slate-400 font-medium">Household listed as DSWD 4Ps beneficiary.</p>
          </div>
        </label>
      </div>
    </div>
  );

  const renderStep5Fields = () => (
    <div className="space-y-3 text-left">
      <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-1.5 mb-2">
        <FileText size={14} className="text-[#0B5D3B]" />
        <span>Verification Documents</span>
      </div>
      
      <div className="space-y-2 text-left">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Attach Official ID or Residency Proof *</label>
        
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-5 text-center hover:bg-slate-50 hover:border-[#0B5D3B] transition relative overflow-hidden group">
          <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
          
          {registrationProof ? (
            <div className="flex flex-col items-center">
              <FileCheck2 size={24} className="text-[#0B5D3B] mb-1" />
              <p className="text-xs font-extrabold text-slate-800 truncate max-w-[240px]">{registrationProof.name}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-0.5">{(registrationProof.size / 1024 / 1024).toFixed(2)} MB • Click to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload size={22} className="text-slate-400 mb-1" />
              <p className="text-xs font-extrabold text-slate-800">Choose residency file proof</p>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">JPG, PNG, WebP or PDF (Max 5MB)</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const validateStep = (step) => {
    try {
      if (step === 1) {
        if (!formData.first_name.trim() || !formData.last_name.trim()) throw new Error("First name and last name are required.");
        if (!formData.birthday) throw new Error("Please select a valid birth date.");
        if (!formData.sex) throw new Error("Please select your sex.");
        if (!formData.birthplace.trim()) throw new Error("Please enter your birth place.");
      } else if (step === 2) {
        if (!formData.householdNo.trim()) throw new Error("Household number is required.");
        if (!formData.house_no.trim()) throw new Error("House number is required.");
        if (!formData.purok) throw new Error("Please select your Purok.");
        if (!formData.address.trim()) throw new Error("Full address is required.");
      } else if (step === 3) {
        if (!formData.phone.trim()) throw new Error("SMS phone number is required.");
        if (!isValidSmsPhone(formData.phone)) throw new Error("Invalid phone format (e.g. 09171234567).");
        if (!formData.password.trim() || formData.password.length < 6) throw new Error("Password must be at least 6 characters.");
      } else if (step === 4) {
        if (formData.is_pwd && !formData.pwd_type.trim()) throw new Error("Please detail your PWD type.");
      } else if (step === 5) {
        if (!registrationProof) throw new Error("Please attach proof of identity/residency.");
      }
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const nextStep = () => {
    if (validateStep(registrationStep)) {
      setRegistrationStep((current) => current + 1);
      setError(null);
    }
  };

  const prevStep = () => {
    setRegistrationStep((current) => current - 1);
    setError(null);
  };

  const goToRegistrationStep = (step) => {
    if (step <= registrationStep) {
      setRegistrationStep(step);
      setError(null);
    }
  };

  const signInAdmin = async () => {
    const result = await loginUser(formData.email, formData.password);
    const dashboardPath = getDashboardPathForRole(result.profile?.role);

    if (!dashboardPath) throw new Error("Unauthorized access.");

    closeModal();
    navigate("/welcome", {
      replace: true,
      state: {
        redirectTo: dashboardPath,
        role: result.profile?.role || "admin",
        displayName: getLoginDisplayName(result),
      },
    });
  };

  const signInResident = async () => {
    const resident = await loginResident(formData.email, formData.password);
    closeModal();
    navigate("/welcome", {
      replace: true,
      state: {
        redirectTo: "/resident-dashboard",
        role: "resident",
        displayName: getLoginDisplayName({ resident }),
      },
    });
  };

  const registerResidentOnline = async () => {
    if (!agreeTerms) throw new Error("You must agree to the Terms of Service.");

    const result = await requestResidentActivation({
      ...formData,
      fullName: residentRegistrationFullName,
      birthday: formData.birthday,
      householdNo: formData.householdNo,
      house_no: formData.house_no,
      proofFile: registrationProof,
    });

    setNotice({
      type: "pending",
      text: result.message,
    });
    setModalStep("resident_login");
    setAccessMode("Resident");
    setResidentAuthMode("signin");
    setRegistrationStep(1);
    setRegistrationProof(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (isResidentRegistration && registrationStep < 6) {
      nextStep();
      return;
    }

    setLoading(true);

    try {
      clearResidentSession();
      await clearAuthSession();

      if (modalStep === "admin_login" || accessMode === "Admin") {
        await signInAdmin();
        return;
      }

      if (isResidentRegistration) {
        await registerResidentOnline();
        return;
      }

      await signInResident();
    } catch (submitError) {
      setError(submitError.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-800 font-sans antialiased selection:bg-emerald-500 selection:text-white flex flex-col relative">
      
      {/* ======================================================
          FULL-SCREEN BACKGROUND WITH SOFT BLUR & GLASS OVERLAY
      ====================================================== */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0 scale-105 pointer-events-none"
        style={{ backgroundImage: "url('/barangay/BARANGAYOFICE.PNG')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-900/90 to-emerald-950/75 backdrop-blur-[3px] z-0 pointer-events-none" />

      {/* ======================================================
          HEADER / NAVBAR (Compact 56px Glass Navbar)
      ====================================================== */}
      <header className="relative z-20 h-14 shrink-0 bg-slate-900/70 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 flex items-center justify-between">
        {/* LEFT BRANDING */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveOverlay(null)}>
          <div className="h-9 w-9 rounded-xl bg-white p-0.5 border border-white/20 shadow-md flex items-center justify-center">
            <img src="/logo.png" alt="Barangay Seal" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-black text-white tracking-tight">Kaagap<span className="text-emerald-400">AI</span></span>
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Gov Portal</span>
            </div>
            <p className="text-[10px] font-bold text-slate-300 leading-none">Barangay Upper Mingading</p>
          </div>
        </div>

        {/* CENTER NAV BUTTONS (Triggers Overlay Info Cards) */}
        <div className="hidden lg:flex items-center gap-5">
          <button
            onClick={() => setActiveOverlay(null)}
            className={`text-xs font-bold transition px-2 py-1 rounded-lg ${activeOverlay === null ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"}`}
          >
            Home Overview
          </button>
          <button
            onClick={() => setActiveOverlay("about")}
            className={`text-xs font-bold transition px-2 py-1 rounded-lg ${activeOverlay === "about" ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"}`}
          >
            About Us
          </button>
          <button
            onClick={() => setActiveOverlay("features")}
            className={`text-xs font-bold transition px-2 py-1 rounded-lg ${activeOverlay === "features" ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"}`}
          >
            Features
          </button>
          <button
            onClick={() => setActiveOverlay("services")}
            className={`text-xs font-bold transition px-2 py-1 rounded-lg ${activeOverlay === "services" ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"}`}
          >
            Digital Services
          </button>
          <button
            onClick={() => setActiveOverlay("contact")}
            className={`text-xs font-bold transition px-2 py-1 rounded-lg ${activeOverlay === "contact" ? "text-emerald-400 bg-white/10" : "text-slate-300 hover:text-white"}`}
          >
            Contact Hall
          </button>
        </div>

        {/* RIGHT LOGIN BUTTON */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => openPortalModal("choose")}
            className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-[#0B5D3B] hover:from-emerald-500 hover:to-emerald-700 text-white text-xs font-extrabold px-5 py-2 rounded-xl shadow-lg hover:scale-105 active:scale-95 transition duration-200"
          >
            <UserCheck size={15} />
            <span>Login to Portal</span>
          </button>
        </div>
      </header>

      {/* ======================================================
          MAIN HERO VIEWPORT (Fits 100% in viewport without scrolling)
      ====================================================== */}
      <main className="relative z-10 flex-1 min-h-0 px-4 sm:px-8 py-2 flex items-center justify-center overflow-hidden">
        
        {/* OVERLAY VIEWER (When clicking About/Features/Services/Contact in header) */}
        <AnimatePresence mode="wait">
          {activeOverlay ? (
            <motion.div
              key={activeOverlay}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="w-full max-w-5xl bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 text-white shadow-2xl relative max-h-[78vh] overflow-y-auto"
            >
              <button
                onClick={() => setActiveOverlay(null)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-slate-300 hover:text-white transition"
              >
                <X size={16} />
              </button>

              {/* ABOUT US OVERLAY */}
              {activeOverlay === "about" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-wider">
                    <Building2 size={16} />
                    <span>About Barangay Upper Mingading</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">Serving Citizens with Integrity & Innovation</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    Barangay Upper Mingading is dedicated to bringing government services directly to our residents' fingertips. Through <span className="font-bold text-emerald-400">KaagapAI</span>, we streamline document issuance, automate resident profiling, and empower barangay officials with real-time analytics to ensure fast, fair, and accessible assistance for everyone.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                      <ShieldCheck size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Mission</h4>
                      <p className="text-[11px] text-slate-400 mt-1">To deliver transparent, technology-driven, and prompt barangay services for all residents.</p>
                    </div>
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                      <Eye size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Vision</h4>
                      <p className="text-[11px] text-slate-400 mt-1">A digitally empowered, progressive, and resilient Barangay Upper Mingading.</p>
                    </div>
                    <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                      <Award size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Core Values</h4>
                      <p className="text-[11px] text-slate-400 mt-1">Integrity, Compassion, Innovation, and Service Excellence.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* FEATURES OVERLAY */}
              {activeOverlay === "features" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-wider">
                    <Sparkles size={16} />
                    <span>System Capabilities — Why Choose KaagapAI?</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">Smart Governance Built for Residents & Admins</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                    {[
                      { title: "Resident Online Registration", desc: "Paperless household registration with ID upload verification.", icon: UserCheck },
                      { title: "Digital Document Requests", desc: "Request Barangay Clearance, Residency, & Permits anytime.", icon: FileCheck2 },
                      { title: "24/7 AI Resident Assistant", desc: "Instant answers regarding barangay requirements & services.", icon: Bot },
                      { title: "Real-Time Analytics & Reports", desc: "Automated census analytics and official PDF reporting.", icon: Layers },
                      { title: "Livelihood & Jobs Program", desc: "Direct access to community job postings and skills training.", icon: Briefcase },
                      { title: "SMS & Portal Announcements", desc: "Receive emergency notifications and application updates.", icon: BellRing },
                    ].map((feat, idx) => {
                      const FeatIcon = feat.icon;
                      return (
                        <div key={idx} className="bg-white/5 p-3.5 rounded-2xl border border-white/10">
                          <FeatIcon size={20} className="text-emerald-400 mb-1.5" />
                          <h4 className="text-xs font-bold text-white">{feat.title}</h4>
                          <p className="text-[11px] text-slate-400 mt-1">{feat.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SERVICES OVERLAY: EXACT 7 DOCUMENTS AS REQUESTED */}
              {activeOverlay === "services" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-wider">
                    <FileText size={16} />
                    <span>Barangay Online Services</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">Convenient Services Designed for Every Resident</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {[
                      { title: "Barangay Clearance", desc: "Official clearance for employment, school, postal, and legal transactions.", icon: FileCheck2 },
                      { title: "Certificate of Residency", desc: "Official certification proving resident domicile and length of stay.", icon: MapPin },
                      { title: "Certificate of Indigency", desc: "Official certification for medical, financial, and educational assistance.", icon: Heart },
                      { title: "Business Permit", desc: "Barangay clearance for local business operations and commercial establishments.", icon: Building2 },
                      { title: "RSBSA Certification", desc: "Registry System for Basic Sectors in Agriculture certification for farmers.", icon: Briefcase },
                      { title: "Solo Parent Certification", desc: "Official certificate for registered solo parents to avail benefits.", icon: User },
                      { title: "4Ps Certification", desc: "Official certification for Pantawid Pamilyang Pilipino Program beneficiaries.", icon: Award },
                    ].map((srv, idx) => {
                      const SrvIcon = srv.icon;
                      return (
                        <div key={idx} className="bg-white/5 p-3.5 rounded-2xl border border-white/10 flex flex-col justify-between hover:border-emerald-400/50 transition">
                          <div>
                            <SrvIcon size={18} className="text-emerald-400 mb-1.5" />
                            <h4 className="text-xs font-extrabold text-white">{srv.title}</h4>
                            <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{srv.desc}</p>
                          </div>
                          <button
                            onClick={() => openPortalModal("choose")}
                            className="mt-3 text-[10px] font-bold text-emerald-400 hover:underline flex items-center gap-1"
                          >
                            <span>Request Online</span>
                            <ArrowRight size={10} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* CONTACT OVERLAY */}
              {activeOverlay === "contact" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-emerald-400 font-black uppercase text-xs tracking-wider">
                    <PhoneCall size={16} />
                    <span>Contact Barangay Hall</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white">We Are Ready to Assist You</h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <MapPin size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Location</h4>
                      <p className="text-[11px] text-slate-300 mt-1">Barangay Upper Mingading Hall, Aleosan, Cotabato</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <PhoneCall size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Contact Phone</h4>
                      <p className="text-[11px] text-slate-300 mt-1">09306259795</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <Mail size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Email Address</h4>
                      <p className="text-[11px] text-slate-300 mt-1 break-all">calambarussel5@gmail.com</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                      <Clock size={20} className="text-emerald-400 mb-2" />
                      <h4 className="text-xs font-bold text-white">Office Hours</h4>
                      <p className="text-[11px] text-slate-300 mt-1">Monday - Friday | 8:00 AM - 5:00 PM</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            /* DEFAULT COMPACT SINGLE-SCREEN HERO CONTENT (100% Viewport Fit) */
            <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
              
              {/* LEFT COLUMN: HERO TEXT & BUTTONS */}
              <div className="lg:col-span-7 space-y-3.5 text-left">
                {/* Pill Tag */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md px-3.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-widest shadow-inner"
                >
                  <Sparkles size={13} className="text-emerald-400" />
                  <span>Official Barangay Digital Platform</span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-[1.1] tracking-tight"
                >
                  Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-green-400">KaagapAI</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.h2
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-sm sm:text-lg font-bold text-slate-200 tracking-wide"
                >
                  Barangay Upper Mingading Resident Management System
                </motion.h2>

                {/* Description */}
                <motion.p
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-xl font-normal"
                >
                  A secure and modern digital platform that allows residents to conveniently access barangay services online while helping administrators efficiently manage records, requests, and community information.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex flex-wrap items-center gap-3 pt-1"
                >
                  <button
                    onClick={() => openPortalModal("choose")}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-[#0B5D3B] hover:from-emerald-500 hover:to-emerald-800 text-white font-extrabold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-xl shadow-emerald-950/50 hover:scale-105 active:scale-95 transition duration-200"
                  >
                    <span>Login to Portal</span>
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() => setActiveOverlay("services")}
                    className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 backdrop-blur-md font-bold text-xs sm:text-sm px-5 py-3 rounded-2xl hover:scale-105 active:scale-95 transition duration-200"
                  >
                    <Layers size={16} />
                    <span>Explore Services</span>
                  </button>
                </motion.div>
              </div>

              {/* RIGHT COLUMN: REAL BARANGAY HALL PHOTO SHOWCASE CARD */}
              <div className="lg:col-span-5 hidden lg:block">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25 }}
                  className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900/60 backdrop-blur-md p-2 group"
                >
                  <div className="relative rounded-2xl overflow-hidden h-[230px] sm:h-[250px]">
                    <img
                      src="/barangay/BARANGAYOFICE.PNG"
                      alt="Barangay Upper Mingading Hall"
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="flex items-center justify-between mb-1">
                        <span className="bg-emerald-600/90 backdrop-blur-md text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                          <Building2 size={12} /> Barangay Hall Complex
                        </span>
                        <span className="text-[10px] font-semibold text-emerald-300">Aleosan, Cotabato</span>
                      </div>
                      <p className="text-xs font-bold text-white truncate">Barangay Upper Mingading</p>
                    </div>
                  </div>
                </motion.div>
              </div>

            </div>
          )}
        </AnimatePresence>

      </main>

      {/* ======================================================
          BOTTOM DOCK BAR (Single-Screen 4 Stat Cards & Barangay Logo)
      ====================================================== */}
      <footer className="relative z-20 shrink-0 bg-slate-900/80 backdrop-blur-xl border-t border-white/10 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
          
          {/* 4 STATS FLOATING MINI CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 w-full md:w-auto">
            {[
              { label: "Total Residents", val: "2,206", desc: "Registered Community Members", icon: Users },
              { label: "Total Households", val: "480+", desc: "Mapped Household Units", icon: HomeIcon },
              { label: "Documents Processed", val: "1,500+", desc: "Certificates & Clearances", icon: FileCheck2 },
              { label: "Online Request Rate", val: "98%", desc: "Faster Turnaround Efficiency", icon: Sparkles },
            ].map((stat, idx) => {
              const StatIcon = stat.icon;
              return (
                <div key={idx} className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 backdrop-blur-md">
                  <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
                    <StatIcon size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-white leading-none">{stat.val}</p>
                    <p className="text-[9px] font-semibold text-slate-300 leading-none mt-0.5">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CONTACT INFO & OFFICIAL BARANGAY LOGO */}
          <div className="flex flex-col sm:flex-row items-center gap-3 text-[10px] text-slate-300 font-semibold">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-emerald-400">
                <PhoneCall size={12} /> 09306259795
              </span>
              <span className="hidden sm:inline text-slate-500">•</span>
              <span className="hidden sm:flex items-center gap-1 text-slate-300">
                <Mail size={12} /> calambarussel5@gmail.com
              </span>
            </div>
            <span className="text-slate-500 hidden md:inline">|</span>
            
            {/* OFFICIAL BARANGAY LOGO & TITLE */}
            <div className="flex items-center gap-2 bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
              <div className="h-5 w-5 rounded-md bg-white p-0.5 flex items-center justify-center shrink-0">
                <img src="/logo.png" alt="Barangay Seal" className="h-full w-full object-contain" />
              </div>
              <span className="font-extrabold text-white text-xs tracking-tight">Barangay Upper Mingading</span>
            </div>
          </div>

        </div>
      </footer>

      {/* ======================================================
          LOGIN & REGISTRATION MODAL FLOW SYSTEM
      ====================================================== */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
            {/* Modal Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-0"
            />

            {/* Modal Dialog Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Close Button */}
              <button
                onClick={closeModal}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 flex items-center justify-center transition z-20"
              >
                <X size={18} />
              </button>

              {/* MODAL STEP 1: CHOOSE LOGIN TYPE ("LOGIN AS") */}
              {modalStep === "choose" && (
                <div className="p-6 sm:p-8 text-center space-y-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-100 mx-auto">
                    <img src="/logo.png" alt="Barangay Seal" className="h-12 w-12 object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#0B5D3B]">KaagapAI Portal</span>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-1">Login As</h2>
                    <p className="text-xs text-slate-500 mt-1">Select your portal access level to continue</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 pt-2">
                    {/* RESIDENT CARD */}
                    <div
                      onClick={() => {
                        setAccessMode("Resident");
                        setResidentAuthMode("signin");
                        setModalStep("resident_login");
                      }}
                      className="group cursor-pointer rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-5 text-left hover:border-[#0B5D3B] hover:bg-emerald-50/30 transition duration-300 relative shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#0B5D3B] to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition duration-200">
                          <UserCheck size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-900">Resident Portal</h3>
                            <ChevronRight size={18} className="text-slate-400 group-hover:text-[#0B5D3B] group-hover:translate-x-1 transition duration-200" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Access resident services, request documents, and manage your account.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ADMIN CARD */}
                    <div
                      onClick={() => {
                        setAccessMode("Admin");
                        setModalStep("admin_login");
                      }}
                      className="group cursor-pointer rounded-2xl border-2 border-slate-100 bg-slate-50/60 p-5 text-left hover:border-slate-800 hover:bg-slate-100/50 transition duration-300 relative shadow-sm hover:shadow-md"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition duration-200">
                          <ShieldCheck size={22} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-base font-extrabold text-slate-900">Barangay Admin</h3>
                            <ChevronRight size={18} className="text-slate-400 group-hover:text-slate-900 group-hover:translate-x-1 transition duration-200" />
                          </div>
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                            Manage barangay records, residents, reports, and system administration.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODAL STEP 2: RESIDENT LOGIN */}
              {modalStep === "resident_login" && (
                <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
                  <button
                    onClick={() => setModalStep("choose")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                  >
                    <ChevronLeft size={16} /> Back to Selection
                  </button>

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-[#0B5D3B] flex items-center justify-center shrink-0 border border-emerald-100">
                      <UserCheck size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">Resident Sign In</h2>
                      <p className="text-xs text-slate-500">Access document requests and local announcements</p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  {notice && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs font-semibold text-amber-800">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-600" />
                      <span>{notice.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Approved Username / Email / Mobile</label>
                      <div className="relative">
                        <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter username, phone, or email"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                        <button type="button" onClick={() => setError("Please contact the Barangay Secretary if you forgot your portal password.")} className="text-[11px] font-bold text-[#0B5D3B] hover:underline">Forgot password?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter password"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-11 py-3 text-xs text-slate-900 outline-none focus:border-[#0B5D3B] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-emerald-600 text-xs font-bold text-white shadow-lg hover:shadow-xl hover:from-[#08482d] hover:to-emerald-700 transition duration-200 disabled:bg-slate-400"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                      {loading ? "Signing in..." : "LOGIN AS RESIDENT"}
                    </button>
                  </form>

                  <div className="text-center pt-4 border-t border-slate-100 text-xs text-slate-500 font-medium">
                    New Barangay Upper Mingading resident?{" "}
                    <button
                      onClick={() => {
                        setResidentAuthMode("register");
                        setRegistrationStep(1);
                        setModalStep("resident_register");
                        setError(null);
                      }}
                      className="font-bold text-[#0B5D3B] hover:underline"
                    >
                      Register Here
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL STEP 3: RESIDENT REGISTRATION */}
              {modalStep === "resident_register" && (
                <div className="p-6 sm:p-8 overflow-y-auto space-y-4">
                  <button
                    onClick={() => setModalStep("resident_login")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition"
                  >
                    <ChevronLeft size={16} /> Back to Sign In
                  </button>

                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-lg font-black text-slate-900">Resident Online Registration</h2>
                      <p className="text-[11px] text-slate-500">Step {registrationStep} of 6: {stepHeaders[registrationStep - 1].label}</p>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  <div className="flex justify-between items-center relative my-3 px-1">
                    <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10" />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#0B5D3B] transition-all duration-300 -z-10"
                      style={{ width: `${((registrationStep - 1) / 5) * 100}%` }}
                    />
                    {stepHeaders.map((step, idx) => {
                      const StepIcon = step.icon;
                      const stepNumber = idx + 1;
                      const active = registrationStep === idx + 1;
                      const completed = registrationStep > idx + 1;
                      const canOpenStep = stepNumber <= registrationStep;
                      return (
                        <button
                          key={idx}
                          type="button"
                          disabled={!canOpenStep}
                          onClick={() => goToRegistrationStep(stepNumber)}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition duration-200 text-[10px] font-bold ${
                            active
                              ? "bg-[#0B5D3B] text-white ring-4 ring-emerald-100 scale-110"
                              : completed
                              ? "bg-[#0B5D3B] text-white"
                              : "bg-white border-2 border-slate-200 text-slate-400"
                          }`}
                        >
                          {completed ? <CheckCircle2 size={12} /> : <StepIcon size={12} />}
                        </button>
                      );
                    })}
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-700">
                      <AlertCircle size={15} className="mt-0.5 shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="max-h-[300px] overflow-y-auto pr-1">
                      {registrationStep === 1 && renderStep1Fields()}
                      {registrationStep === 2 && renderStep2Fields()}
                      {registrationStep === 3 && renderStep3Fields()}
                      {registrationStep === 4 && renderStep4Fields()}
                      {registrationStep === 5 && renderStep5Fields()}
                      {registrationStep === 6 && (
                        <div className="space-y-4 text-left">
                          <div className="flex items-center gap-2 text-[#0B5D3B] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
                            <FileCheck2 size={14} className="text-[#0B5D3B]" />
                            <span>Confirm Information Details</span>
                          </div>
                          
                          <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                            {[
                              { label: "Full Name", val: residentRegistrationFullName },
                              { label: "Birth Date", val: formData.birthday },
                              { label: "Age", val: `${residentRegistrationAge} years old` },
                              { label: "Gender", val: formData.sex },
                              { label: "Civil Status", val: formData.civil_status },
                              { label: "Purok Area", val: formatPurok(formData.purok) },
                              { label: "Household No", val: formData.householdNo },
                              { label: "House No", val: formData.house_no },
                              { label: "Contact Phone", val: formData.phone },
                              { label: "Account Email", val: formData.email || "Not specified" },
                              {
                                label: "Sectors Status",
                                val: [
                                  formData.is_pwd ? `PWD (${formData.pwd_type || "Yes"})` : "",
                                  formData.is_solo_parent ? "Solo Parent" : "",
                                  formData.is_4ps_member ? "4Ps Beneficiary" : "",
                                ].filter(Boolean).join(", ") || "No sectors checked",
                              },
                              { label: "ID Verification File", val: registrationProof?.name, highlight: true },
                            ].map((item, idx) => (
                              <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-200/50 pb-2 last:border-0 last:pb-0">
                                <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mt-0.5 shrink-0">{item.label}</span>
                                <span className={`text-right font-bold text-xs truncate max-w-[240px] ${item.highlight ? "text-[#0B5D3B]" : "text-slate-800"}`}>
                                  {item.val}
                                </span>
                              </div>
                            ))}
                          </div>

                          <label className="flex items-start gap-3 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={agreeTerms}
                              onChange={(e) => setAgreeTerms(e.target.checked)}
                              className="h-4 w-4 rounded border-slate-350 text-[#0B5D3B] focus:ring-emerald-500 mt-0.5"
                            />
                            <span className="text-xs text-slate-600 font-medium leading-normal">
                              I agree to the <span className="font-bold text-slate-900">Privacy Policy</span> and <span className="font-bold text-slate-900">Terms of Service</span> of Barangay Upper Mingading.
                            </span>
                          </label>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-slate-100">
                      {registrationStep > 1 && (
                        <button
                          type="button"
                          onClick={prevStep}
                          className="flex h-11 items-center justify-center gap-1.5 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 text-xs transition"
                        >
                          <ChevronLeft size={16} /> Back
                        </button>
                      )}
                      
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0B5D3B] to-emerald-600 text-xs font-bold text-white shadow-lg hover:shadow-xl transition duration-200 disabled:bg-slate-400"
                      >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : registrationStep === 6 ? <FileCheck2 size={16} /> : <ChevronRight size={16} />}
                        {loading
                          ? "Registering..."
                          : registrationStep === 6
                            ? "Submit Application"
                            : "Continue"}
                      </button>
                    </div>
                  </form>

                  <div className="text-center pt-2 text-xs text-slate-500 font-medium">
                    Already registered?{" "}
                    <button
                      onClick={() => setModalStep("resident_login")}
                      className="font-bold text-[#0B5D3B] hover:underline"
                    >
                      Login Here
                    </button>
                  </div>
                </div>
              )}

              {/* MODAL STEP 4: ADMIN LOGIN */}
              {modalStep === "admin_login" && (
                <div className="p-6 sm:p-8 overflow-y-auto space-y-5">
                  <button
                    onClick={() => setModalStep("choose")}
                    className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-900 transition mb-2"
                  >
                    <ChevronLeft size={16} /> Back to Selection
                  </button>

                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-md">
                      <ShieldCheck size={22} />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">Administrative Sign In</h2>
                      <p className="text-xs text-slate-500">Manage records, requests, and system administration</p>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700">
                      <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Administrative Email / Username</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="Enter administrative email"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-200 transition font-medium"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                        <button type="button" onClick={() => setError("Please contact system administration for password reset.")} className="text-[11px] font-bold text-slate-600 hover:underline">Forgot password?</button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type={showPassword ? "text" : "password"}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter secret password"
                          className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-11 py-3 text-xs text-slate-900 outline-none focus:border-slate-800 focus:bg-white focus:ring-4 focus:ring-slate-200 transition font-medium"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-white shadow-lg hover:shadow-xl transition duration-200 disabled:bg-slate-400"
                    >
                      {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                      {loading ? "Authenticating Admin..." : "AUTHENTICATE ADMIN"}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default Login;
