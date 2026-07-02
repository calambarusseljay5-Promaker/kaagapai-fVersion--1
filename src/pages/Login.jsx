import { useMemo, useState } from "react";
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
} from "lucide-react";
import { clearAuthSession, loginUser } from "../services/authService";
import {
  clearResidentSession,
  loginResident,
  requestResidentActivation,
  validateResidentRegistrationProof,
} from "../services/residentAuthService";
import { isValidSmsPhone } from "../services/smsService";
import { getDashboardPathForRole } from "../utils/authRoutes";
import { buildFullName, calculateAge, formatPurok, purokOptions } from "../utils/residentProfile";

const accessModes = ["Admin", "Resident"];

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

const modeContent = {
  Admin: {
    eyebrow: "Barangay Administration Portal",
    title: "Administrative Sign In",
    description: "Manage resident profiles, request approvals, and configure system integrations.",
    emailLabel: "Administrative Email Address",
    secretLabel: "Password",
    secretPlaceholder: "Enter admin password",
  },
  Resident: {
    eyebrow: "Resident Services Portal",
    title: "Resident Portal",
    description: "Request official certificates, track application approvals, and view local programs.",
    emailLabel: "Approved Username / Email",
    secretLabel: "Household Password",
    secretPlaceholder: "Enter household password",
  },
};

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
  const [accessMode, setAccessMode] = useState("Resident");
  const [residentAuthMode, setResidentAuthMode] = useState("signin");
  const [registrationProof, setRegistrationProof] = useState(null);
  const [registrationStep, setRegistrationStep] = useState(1);

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
  const activeMode = modeContent[accessMode];
  const isResidentRegistration = accessMode === "Resident" && residentAuthMode === "register";

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

  const renderStep1Fields = () => (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
        <User size={14} className="text-[#1b4332]" />
        <span>Personal Details</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">First Name *</label>
          <input type="text" name="first_name" value={formData.first_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="Juan" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Last Name *</label>
          <input type="text" name="last_name" value={formData.last_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="Dela Cruz" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Middle Name</label>
        <input type="text" name="middle_name" value={formData.middle_name} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="Reyes" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birth Date *</label>
          <input type="date" name="birthday" value={formData.birthday} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sex *</label>
          <select name="sex" value={formData.sex} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium">
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Birth Place *</label>
          <input type="text" name="birthplace" value={formData.birthplace} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="City / Municipality" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Civil Status *</label>
          <select name="civil_status" value={formData.civil_status} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium">
            <option value="Single">Single</option>
            <option value="Married">Married</option>
            <option value="Widowed">Widowed</option>
            <option value="Separated">Separated</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 font-medium">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Relationship to Household Head *</label>
        <select name="relationship_to_household_head" value={formData.relationship_to_household_head} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium">
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
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
        <MapPin size={14} className="text-[#1b4332]" />
        <span>Address Information</span>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Household No *</label>
          <input type="text" name="householdNo" value={formData.householdNo} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="e.g. 024" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">House No *</label>
          <input type="text" name="house_no" value={formData.house_no} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="e.g. 104-B" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Purok *</label>
        <select name="purok" value={formData.purok} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium">
          <option value="">Select Purok</option>
          {purokOptionList}
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Full Address Description *</label>
        <textarea name="address" value={formData.address} onChange={handleInputChange} rows={4} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition resize-none font-medium" placeholder="Specify block, lot, street name, and key landmarks..." />
      </div>
    </div>
  );

  const renderStep3Fields = () => (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
        <Lock size={14} className="text-[#1b4332]" />
        <span>Security & Access Credentials</span>
      </div>
      
      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">SMS Phone Number *</label>
        <div className="relative">
          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="09171234567" />
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Used for SMS announcements and document status notifications.</p>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Email Address (Optional)</label>
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="resident@example.com" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Household Portal Password *</label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input type={showPassword ? "text" : "password"} name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 py-2.5 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium" placeholder="Create portal password" />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-700 transition" aria-label="Toggle password view">
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 font-semibold">Must be at least 6 characters long.</p>
      </div>
    </div>
  );

  const renderStep4Fields = () => (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
        <Heart size={14} className="text-[#1b4332]" />
        <span>Community Sector Details</span>
      </div>
      
      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 shadow-inner">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_pwd" checked={formData.is_pwd} onChange={handleInputChange} className="h-5 w-5 rounded border-slate-350 text-[#1b4332] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Person with Disability (PWD / PWED)</p>
            <p className="text-[10px] text-slate-400 font-medium">Check this if you are a registered PWD to receive specialized support benefits.</p>
          </div>
        </label>

        <AnimatePresence>
          {formData.is_pwd && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="pl-8 pt-1 overflow-hidden"
            >
              <label className="text-[10px] font-bold text-[#1b4332] uppercase tracking-wider block mb-1">Specify disability type *</label>
              <input type="text" name="pwd_type" value={formData.pwd_type} onChange={handleInputChange} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:ring-4 focus:ring-emerald-100/50 font-medium transition" placeholder="e.g. Visually Impaired, Orthopedic Disability" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-inner">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_solo_parent" checked={formData.is_solo_parent} onChange={handleInputChange} className="h-5 w-5 rounded border-slate-350 text-[#1b4332] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Solo Parent</p>
            <p className="text-[10px] text-slate-400 font-medium">Check this if you are registered as a single parent supporting household dependents.</p>
          </div>
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 shadow-inner">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" name="is_4ps_member" checked={formData.is_4ps_member} onChange={handleInputChange} className="h-5 w-5 rounded border-slate-350 text-[#1b4332] focus:ring-emerald-500 mt-0.5" />
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-800">Pantawid Pamilyang Pilipino Program (4Ps)</p>
            <p className="text-[10px] text-slate-400 font-medium">Check this if your household is currently listed as a DSWD 4Ps beneficiary.</p>
          </div>
        </label>
      </div>
    </div>
  );

  const renderStep5Fields = () => (
    <div className="space-y-4 text-left">
      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
        <FileText size={14} className="text-[#1b4332]" />
        <span>Verification Documents</span>
      </div>
      
      <div className="space-y-2 text-left">
        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Attach Official ID or Barangay Proof of Residency *</label>
        
        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50 p-8 text-center hover:bg-slate-50 hover:border-[#1b4332] transition relative overflow-hidden group shadow-inner">
          <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" />
          
          {registrationProof ? (
            <div className="flex flex-col items-center animate-fadeIn">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-[#1b4332] flex items-center justify-center mb-3 border border-emerald-100 shadow-sm">
                <FileCheck2 size={28} />
              </div>
              <p className="text-xs font-extrabold text-slate-800 truncate max-w-[320px]">{registrationProof.name}</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1">{(registrationProof.size / 1024 / 1024).toFixed(2)} MB • Click or Drag to replace</p>
            </div>
          ) : (
            <div className="flex flex-col items-center group-hover:scale-102 transition duration-200">
              <div className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3 group-hover:text-[#1b4332] group-hover:bg-emerald-100/10 transition duration-200 shadow-inner">
                <Upload size={24} />
              </div>
              <p className="text-xs font-extrabold text-slate-800">Choose residency file proof</p>
              <p className="text-[10px] text-slate-400 font-bold mt-1 leading-normal">Supports JPG, PNG, WebP images or PDF document (Max 5MB)</p>
            </div>
          )}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">Accepted documents include: Barangay Certificate of Residency, Voter Certification, National ID, Passport, Driver's License, or Utility bill featuring your registered name and address.</p>
      </div>
    </div>
  );

  const handleAccessModeChange = (mode) => {
    setAccessMode(mode);
    setResidentAuthMode("signin");
    setRegistrationStep(1);
    setRegistrationProof(null);
    setError(null);
    setNotice(null);
  };

  const validateStep = (step) => {
    try {
      if (step === 1) {
        if (!formData.first_name.trim() || !formData.last_name.trim()) {
          throw new Error("First name and last name are required.");
        }
        if (!formData.birthday) {
          throw new Error("Please select a valid birth date.");
        }
        if (!formData.sex) {
          throw new Error("Please select your sex.");
        }
        if (!formData.birthplace.trim()) {
          throw new Error("Please enter your birth place.");
        }
      } else if (step === 2) {
        if (!formData.householdNo.trim()) {
          throw new Error("Household number is required.");
        }
        if (!formData.house_no.trim()) {
          throw new Error("House number is required.");
        }
        if (!formData.purok) {
          throw new Error("Please select your Purok.");
        }
        if (!formData.address.trim()) {
          throw new Error("Full address is required.");
        }
      } else if (step === 3) {
        if (!formData.phone.trim()) {
          throw new Error("SMS phone number is required.");
        }
        if (!isValidSmsPhone(formData.phone)) {
          throw new Error("Invalid phone format. Must match e.g. 09171234567.");
        }
        if (!formData.password.trim()) {
          throw new Error("Password is required.");
        }
        if (formData.password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
      } else if (step === 4) {
        if (formData.is_pwd && !formData.pwd_type.trim()) {
          throw new Error("Please detail your PWD/PWED type.");
        }
      } else if (step === 5) {
        if (!registrationProof) {
          throw new Error("Please attach a valid proof of identity/residency.");
        }
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

    if (!dashboardPath) {
      throw new Error("Unauthorized. This account does not have a valid dashboard role.");
    }

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
      text: result.proofAttached
        ? `${result.message} Verification proof has been successfully attached for administrative review.`
        : result.message,
    });
    setResidentAuthMode("signin");
    setRegistrationStep(1);
    setRegistrationProof(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (isResidentRegistration) {
      // If multi-step is not finished yet, don't submit the form
      if (registrationStep < 6) {
        nextStep();
        return;
      }
    }

    setLoading(true);

    try {
      clearResidentSession();
      await clearAuthSession();

      if (accessMode === "Admin") {
        await signInAdmin();
        return;
      }

      if (isResidentRegistration) {
        await registerResidentOnline();
        return;
      }

      await signInResident();
    } catch (submitError) {
      setError(submitError.message || "Authentication failed. Please check credentials and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center font-sans antialiased relative p-4 sm:p-6 overflow-hidden">
      {/* Fixed Full screen Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center z-0 pointer-events-none"
        style={{ backgroundImage: "url('/barangay/BARANGAYOFICE.PNG')" }}
      />
      {/* Fixed premium dark forest glass overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-[#1b4332]/40 to-slate-950/90 backdrop-blur-[8px] z-0 pointer-events-none" />

      {/* Centered Glassmorphism Card with its own internal scroll */}
      <div className="relative z-10 w-full max-w-[560px] max-h-[95vh] overflow-y-auto bg-white/90 backdrop-blur-md rounded-[2rem] border border-white/20 shadow-2xl p-6 sm:p-8 transition duration-300" style={{ scrollbarWidth: 'thin' }}>
        
        {/* Unified Portal Header */}
        <div className="flex flex-col items-center text-center mb-6 border-b border-slate-200/40 pb-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1 border-2 border-[#c5a059]/40 shadow-lg mb-3 transition duration-300 hover:scale-105">
            <img src="/logo.png" alt="Barangay Seal" className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#c5a059] mb-1">Barangay Upper Mingading</p>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#1b4332] mt-1">
              Kaagap<span className="text-[#c5a059]">AI</span> Portal
            </h1>
            <p className="text-slate-500 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
              {isResidentRegistration 
                ? "Register to access clearances, announcements, and local program applications." 
                : activeMode.description}
            </p>
          </div>
        </div>

        {/* Access Mode Selector */}
        {!isResidentRegistration && (
          <div className="grid grid-cols-2 rounded-2xl bg-slate-100/70 p-1.5 mb-6 border border-slate-200/50 relative z-10">
            {accessModes.map((mode) => {
              const active = accessMode === mode;
              const TabIcon = mode === "Admin" ? ShieldCheck : UserCheck;

              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleAccessModeChange(mode)}
                  className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                    active
                      ? "bg-[#1b4332] text-white shadow-md border border-[#c5a059]/30"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/30"
                  }`}
                >
                  <TabIcon size={14} />
                  {mode}
                </button>
              );
            })}
          </div>
        )}

        {/* Notifications */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-xs font-semibold text-rose-700 shadow-sm"
            >
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </motion.div>
          )}
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-5 flex items-start gap-2.5 rounded-2xl bg-amber-50 border border-amber-100 p-4 text-xs font-semibold text-amber-800 leading-normal shadow-sm"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-amber-600" />
              <span>{notice.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Form */}
        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {isResidentRegistration ? (
            /* REDESIGNED REGISTRATION LAYOUT */
            <div className="space-y-4">
              {/* Step Progress Tracker */}
              <div className="mb-6 border-b border-slate-100 pb-5">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-3">
                  <span className="bg-slate-100 px-2 py-0.5 rounded-md">Step {registrationStep} of 6</span>
                  <span className="text-[#1b4332] uppercase font-extrabold tracking-wider">
                    {stepHeaders[registrationStep - 1].label}
                  </span>
                </div>
                {/* Visual Progress Icons */}
                <div className="flex justify-between items-center relative mt-4 px-1">
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 -z-10" />
                  <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-[#1b4332] transition-all duration-300 -z-10"
                    style={{ width: `${((registrationStep - 1) / 5) * 100}%` }}
                  />
                  {stepHeaders.map((step, idx) => {
                    const StepIcon = step.icon;
                    const stepNumber = idx + 1;
                    const active = registrationStep === idx + 1;
                    const completed = registrationStep > idx + 1;
                    const canOpenStep = stepNumber <= registrationStep;
                    return (
                      <div key={idx} className="flex flex-col items-center">
                        <button
                          type="button"
                          disabled={!canOpenStep}
                          onClick={() => goToRegistrationStep(stepNumber)}
                          title={step.label}
                          className={`h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 text-[10px] font-bold shadow-sm ${
                            active
                              ? "bg-gradient-to-br from-[#1b4332] to-[#2d6a4f] text-white ring-4 ring-emerald-100 scale-110"
                              : completed
                              ? "bg-[#1b4332] text-white"
                              : "bg-white border-2 border-slate-200 text-slate-400 hover:border-slate-350"
                          }`}
                        >
                          {completed ? <CheckCircle2 size={12} className="stroke-[3]" /> : <StepIcon size={12} />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Fields Viewer (with custom inner scrollbar to prevent page scrolling) */}
              <div className="max-h-[340px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                <AnimatePresence mode="wait">
                  {registrationStep === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderStep1Fields()}
                    </motion.div>
                  )}

                  {registrationStep === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderStep2Fields()}
                    </motion.div>
                  )}

                  {registrationStep === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderStep3Fields()}
                    </motion.div>
                  )}

                  {registrationStep === 4 && (
                    <motion.div
                      key="step4"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderStep4Fields()}
                    </motion.div>
                  )}

                  {registrationStep === 5 && (
                    <motion.div
                      key="step5"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      {renderStep5Fields()}
                    </motion.div>
                  )}

                  {registrationStep === 6 && (
                    <motion.div
                      key="step6"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 text-[#1b4332] font-bold text-xs border-b border-slate-100 pb-2 mb-2">
                        <FileCheck2 size={14} className="text-[#1b4332]" />
                        <span>Confirm Information Details</span>
                      </div>
                      
                      <div className="max-h-[280px] overflow-y-auto space-y-2 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 text-xs shadow-inner">
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
                          <div key={idx} className="flex justify-between items-start gap-4 border-b border-slate-200/50 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                            <span className="font-bold text-slate-400 uppercase text-[9px] tracking-wider mt-0.5 shrink-0">{item.label}</span>
                            <span className={`text-right font-bold text-xs leading-normal truncate max-w-[260px] ${item.highlight ? "text-[#1b4332]" : "text-slate-800"}`}>
                              {item.val}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Navigation & Submit Buttons */}
              <div className="flex gap-3 mt-8 border-t border-slate-100 pt-5">
                {registrationStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="flex h-11 items-center justify-center gap-1.5 px-5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 hover:text-slate-800 text-xs transition duration-200"
                  >
                    <ChevronLeft size={16} /> Back
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 flex h-11 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] px-5 text-xs font-bold text-white shadow-lg hover:shadow-xl hover:from-[#1b4332] hover:to-[#22573e] transition duration-200 disabled:bg-slate-400 disabled:shadow-none"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : registrationStep === 6 ? (
                    <FileCheck2 size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                  {loading
                    ? "Registering Account..."
                    : registrationStep === 6
                      ? "Submit Registration Application"
                      : "Continue Registration"}
                </button>
              </div>
            </div>
          ) : (
            /* REDESIGNED SIGN-IN FIELDS */
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{activeMode.emailLabel}</label>
                <div className="relative">
                  {accessMode === "Resident" ? (
                    <UserRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  ) : (
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  )}
                  <input
                    type={accessMode === "Resident" ? "text" : "email"}
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder={accessMode === "Resident" ? "Approved username or email" : "Enter administrative email"}
                    autoComplete={accessMode === "Resident" ? "username" : "email"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{activeMode.secretLabel}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder={activeMode.secretPlaceholder}
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-11 pr-11 py-3 text-xs text-slate-900 outline-none focus:border-[#1b4332] focus:bg-white focus:ring-4 focus:ring-emerald-100/50 transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center text-slate-400 hover:text-slate-600 transition"
                    aria-label="Toggle password view"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] px-5 text-xs font-bold text-white shadow-lg hover:shadow-xl hover:from-[#1b4332] hover:to-[#22573e] transition duration-200 disabled:bg-slate-450 disabled:shadow-none"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <UserCheck size={16} />}
                {loading ? "Signing into portal..." : "SIGN IN TO PORTAL"}
              </button>
            </div>
          )}
        </form>

        {/* Registration toggle */}
        {accessMode === "Resident" && (
          <footer className="mt-8 text-center text-xs text-slate-500 border-t border-slate-100 pt-5 relative z-10 font-semibold">
            {isResidentRegistration ? (
              <span>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setResidentAuthMode("signin");
                    setRegistrationStep(1);
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-bold text-[#1b4332] hover:text-[#c5a059] transition decoration-2"
                >
                  Sign in here
                </button>
              </span>
            ) : (
              <span>
                New Upper Mingading resident?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setResidentAuthMode("register");
                    setRegistrationStep(1);
                    setError(null);
                    setNotice(null);
                  }}
                  className="font-bold text-[#1b4332] hover:text-[#c5a059] transition decoration-2"
                >
                  Register here
                </button>
              </span>
            )}
          </footer>
        )}
      </div>
      
      {/* Footer copyright */}
      <div className="text-center text-xs text-[#c5a059]/80 font-bold tracking-wider mt-6 relative z-10 drop-shadow-sm select-none">
        © {new Date().getFullYear()} Barangay Upper Mingading. Capstone Project.
      </div>
    </div>
  );
};

export default Login;
