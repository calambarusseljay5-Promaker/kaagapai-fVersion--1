import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createDocumentRequest,
  fetchDocumentRequests,
  fetchDocumentTemplates,
  updateDocumentRequestStatus,
  deleteDocumentRequest,
  getPreparedDocument,
  savePreparedDocument,
  uploadDocumentTemplateFile,
} from "../services/documentRequestService";
import { getCurrentUserWithProfile } from "../services/authService";
import { fetchResidents } from "../services/adminService";
import {
  DEFAULT_PREPARED_BY,
  PUNONG_BARANGAY,
  getEditableDocumentText,
  getRealDocumentMarkup,
  getRealDocumentPrintMarkup,
  getTemplateFilePath,
} from "../utils/realDocumentTemplates";
import {
  AlertCircle,
  Bot,
  Check,
  CheckCircle,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Filter,
  Loader,
  Printer,
  RefreshCw,
  Save,
  Search,
  Trash2,
  Upload,
  UserCheck,
  X,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import FloatingModal from "../components/FloatingModal";
import { DataGrid } from "@mui/x-data-grid";
const STATUS_OPTIONS = ["Pending", "Processing", "Approved", "Completed", "Released", "Rejected"];
const TEMPLATE_UPLOAD_ACCEPT =
  ".doc,.docx,.dot,.dotx,.pdf,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.wordprocessingml.template";

const todayInputValue = () => new Date().toISOString().slice(0, 10);

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const formatDate = (value, options = {}) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      ...options,
    });
  } catch {
    return "-";
  }
};

const formatDateTime = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
};

const getNestedResident = (resident) => (Array.isArray(resident) ? resident[0] : resident);

const shortId = (value) => (value ? String(value).slice(0, 8).toUpperCase() : "NO-ID");

const getTemplateLabel = (template) =>
  template?.template_name || template?.document_type || "Untitled Template";

const getResidentLabel = (resident) => resident?.full_name || "Unnamed resident";

const getResidentMeta = (resident) =>
  [
    resident?.purok ? `Purok ${resident.purok}` : "",
    resident?.house_no ? `House ${resident.house_no}` : "",
    resident?.email || "",
  ]
    .filter(Boolean)
    .join(" - ") ||
  resident?.address ||
  "No resident details";

const getTemplateFileName = (template) => {
  const path = getTemplateFilePath(template);
  if (!path) return "No file uploaded";

  const fileName = String(path).split("?")[0].split("/").filter(Boolean).pop();

  try {
    return decodeURIComponent(fileName || path);
  } catch {
    return fileName || path;
  }
};

const findMatchingTemplate = (templates, documentType) => {
  const requested = normalizeText(documentType);
  if (!requested) return templates[0] || null;

  return (
    templates.find((template) => normalizeText(template.template_name) === requested) ||
    templates.find((template) => normalizeText(template.document_type) === requested) ||
    templates.find((template) => requested.includes(normalizeText(template.template_name))) ||
    templates.find((template) => normalizeText(template.template_name).includes(requested)) ||
    templates.find((template) => requested.includes(normalizeText(template.document_type))) ||
    templates.find((template) => normalizeText(template.document_type).includes(requested)) ||
    templates[0] ||
    null
  );
};

const buildResidentFields = (resident, request, template, savedFields = {}) => ({
  documentTitle: getTemplateLabel(template) || request?.document_type || "Barangay Document",
  residentName: resident?.full_name || "",
  age: resident?.age ?? "",
  gender: resident?.gender || "",
  houseNo: resident?.house_no || "",
  purok: resident?.purok || "",
  address: resident?.address || "",
  email: resident?.email || "",
  pwdStatus: resident?.is_pwd ? "Yes" : "No",
  pwdType: resident?.pwd_type || "",
  purpose: savedFields.purpose || "",
  issueDate: savedFields.issueDate || todayInputValue(),
  preparedBy: savedFields.preparedBy || DEFAULT_PREPARED_BY,
  approvingOfficer: savedFields.approvingOfficer || PUNONG_BARANGAY,
  remarks: savedFields.remarks || "",
  documentText: savedFields.documentText || "",
  printFontSize: savedFields.printFontSize || "12",
  printLineHeight: savedFields.printLineHeight || "1.38",
  printParagraphGap: savedFields.printParagraphGap || "0.08",
  ...savedFields,
});

const normalizeEditablePreviewText = (value) =>
  String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const getEditablePreviewBlockText = (element) => {
  const childBlocks = Array.from(element.children || [])
    .map((child) => normalizeEditablePreviewText(child.innerText || child.textContent))
    .filter(Boolean);

  if (childBlocks.length > 0) return childBlocks.join("\n\n");

  return normalizeEditablePreviewText(element.innerText || element.textContent);
};

const getRequiredMissingFields = (fields, selectedTemplateId, selectedResidentId) => {
  const missing = [];

  if (!selectedTemplateId) missing.push("document template");
  if (!selectedResidentId) missing.push("resident");
  if (!fields.residentName) missing.push("resident name");
  if (!fields.address && !fields.purok) missing.push("address or purok");
  if (!fields.issueDate) missing.push("issue date");

  return missing;
};

const DocumentManagement = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [delayedLoading, setDelayedLoading] = useState(false);
  const loadingStartTimeRef = useRef(0);

  useEffect(() => {
    let timer;

    if (loading) {
      timer = setTimeout(() => {
        setDelayedLoading(true);
        loadingStartTimeRef.current = Date.now();
      }, 250);
    } else {
      const elapsed = Date.now() - loadingStartTimeRef.current;
      const minDuration = 600;

      if (loadingStartTimeRef.current > 0 && elapsed < minDuration) {
        timer = setTimeout(() => {
          setDelayedLoading(false);
          loadingStartTimeRef.current = 0;
        }, minDuration - elapsed);
      } else {
        setDelayedLoading(false);
        loadingStartTimeRef.current = 0;
      }
    }

    return () => clearTimeout(timer);
  }, [loading]);

  const [message, setMessage] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [residentSearch, setResidentSearch] = useState("");
  const [walkInForm, setWalkInForm] = useState({
    templateId: "",
    residentId: "",
    residentSearch: "",
    purpose: "",
  });
  const [walkInResidentSearchOpen, setWalkInResidentSearchOpen] = useState(false);
  const [documentFields, setDocumentFields] = useState(() => buildResidentFields(null, null, null));
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [aiReview, setAiReview] = useState(null);
  const previewEditorRef = useRef(null);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) || null,
    [selectedTemplateId, templates]
  );

  const selectedWalkInTemplate = useMemo(
    () => templates.find((template) => template.id === walkInForm.templateId) || null,
    [templates, walkInForm.templateId]
  );

  const selectedWalkInResident = useMemo(
    () => residents.find((resident) => resident.id === walkInForm.residentId) || null,
    [residents, walkInForm.residentId]
  );

  const selectedResident = useMemo(() => {
    const resident =
      residents.find((item) => item.id === selectedResidentId) ||
      (selectedRequest?.resident_id === selectedResidentId ? getNestedResident(selectedRequest?.residents) : null);

    return resident || null;
  }, [residents, selectedRequest, selectedResidentId]);

  const residentOptions = useMemo(() => {
    const requestResident = getNestedResident(selectedRequest?.residents);
    const merged = requestResident
      ? [requestResident, ...residents.filter((resident) => resident.id !== requestResident.id)]
      : residents;
    const query = residentSearch.trim().toLowerCase();

    if (!query) return merged;

    return merged.filter((resident) =>
      [resident.full_name, resident.email, resident.house_no, resident.purok, resident.address]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [residentSearch, residents, selectedRequest]);

  const walkInResidentOptions = useMemo(() => {
    const query = walkInForm.residentSearch.trim().toLowerCase();
    const filteredResidents = query
      ? residents.filter((resident) =>
        [resident.full_name, resident.email, resident.house_no, resident.purok, resident.address]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query))
      )
      : residents;

    if (
      selectedWalkInResident &&
      !filteredResidents.some((resident) => resident.id === selectedWalkInResident.id)
    ) {
      return [selectedWalkInResident, ...filteredResidents];
    }

    return filteredResidents;
  }, [residents, selectedWalkInResident, walkInForm.residentSearch]);

  const resolvedWalkInResident = useMemo(() => {
    if (selectedWalkInResident) return selectedWalkInResident;

    const query = walkInForm.residentSearch.trim().toLowerCase();
    if (!query) return null;

    const exactMatch = walkInResidentOptions.find(
      (resident) => getResidentLabel(resident).toLowerCase() === query
    );

    return exactMatch || (walkInResidentOptions.length === 1 ? walkInResidentOptions[0] : null);
  }, [selectedWalkInResident, walkInForm.residentSearch, walkInResidentOptions]);

  const missingRequiredFields = useMemo(
    () => getRequiredMissingFields(documentFields, selectedTemplateId, selectedResidentId),
    [documentFields, selectedResidentId, selectedTemplateId]
  );

  const documentIsReady = missingRequiredFields.length === 0;
  const editableDocumentText = useMemo(
    () => documentFields.documentText || getEditableDocumentText(documentFields, selectedTemplate),
    [documentFields, selectedTemplate]
  );

  const stats = useMemo(
    () => ({
      total: requests.length,
      pending: requests.filter((request) => request.status === "Pending").length,
      processing: requests.filter((request) => ["Processing", "Approved"].includes(request.status)).length,
      completed: requests.filter((request) => ["Completed", "Released"].includes(request.status)).length,
    }),
    [requests]
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "bg-amber-500 text-white border border-amber-600 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
      case "Processing":
        return "bg-blue-700 text-white border border-blue-800 shadow-[0_0_10px_rgba(29,78,216,0.4)]";
      case "Approved":
        return "bg-sky-500 text-white border border-sky-600 shadow-[0_0_10px_rgba(14,165,233,0.3)]";
      case "Completed":
      case "Released":
        return "bg-emerald-600 text-white border border-emerald-700 shadow-[0_0_10px_rgba(5,150,105,0.3)]";
      case "Rejected":
        return "bg-rose-600 text-white border border-rose-700 shadow-[0_0_10px_rgba(225,29,72,0.3)]";
      default:
        return "bg-slate-500 text-white border border-slate-600 shadow-sm";
    }
  };

  const loadData = async ({ showLoading = false } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const userData = await getCurrentUserWithProfile();
      if (!userData || userData.profile?.role !== "admin") {
        navigate("/");
        return;
      }

      const [requestResult, templateResult, residentResult] = await Promise.allSettled([
        fetchDocumentRequests({ status: statusFilter, search: searchTerm }),
        fetchDocumentTemplates(),
        fetchResidents(""),
      ]);

      if (requestResult.status === "fulfilled") {
        setRequests(requestResult.value.data || []);
      } else {
        setRequests([]);
        setMessage({
          type: "error",
          text: requestResult.reason?.message || "Failed to load document requests.",
        });
      }

      if (templateResult.status === "fulfilled") {
        setTemplates(templateResult.value);
      } else {
        setTemplates([]);
        setMessage({
          type: "error",
          text: templateResult.reason?.message || "Failed to load document templates.",
        });
      }

      if (residentResult.status === "fulfilled") {
        setResidents(residentResult.value);
      } else {
        setResidents([]);
        setMessage({
          type: "error",
          text: residentResult.reason?.message || "Failed to load resident records.",
        });
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setMessage({ type: "error", text: err.message || "Failed to load document requests." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const userData = await getCurrentUserWithProfile();
        if (!userData || userData.profile?.role !== "admin") {
          navigate("/");
          return;
        }

        const [requestResult, templateResult, residentResult] = await Promise.allSettled([
          fetchDocumentRequests({ status: statusFilter, search: searchTerm }),
          fetchDocumentTemplates(),
          fetchResidents(""),
        ]);

        if (!isMounted) return;

        if (requestResult.status === "fulfilled") {
          setRequests(requestResult.value.data || []);
        } else {
          setRequests([]);
          setMessage({
            type: "error",
            text: requestResult.reason?.message || "Failed to load document requests.",
          });
        }

        if (templateResult.status === "fulfilled") {
          setTemplates(templateResult.value);
        } else {
          setTemplates([]);
          setMessage({
            type: "error",
            text: templateResult.reason?.message || "Failed to load document templates.",
          });
        }

        if (residentResult.status === "fulfilled") {
          setResidents(residentResult.value);
        } else {
          setResidents([]);
          setMessage({
            type: "error",
            text: residentResult.reason?.message || "Failed to load resident records.",
          });
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading data:", err);
          setMessage({ type: "error", text: err.message || "Failed to load document requests." });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [navigate, searchTerm, statusFilter]);

  const openRequest = (request) => {
    const requestResident = getNestedResident(request.residents);
    const matchedTemplate = findMatchingTemplate(templates, request.document_type);
    const savedDocument = getPreparedDocument(request.id);
    const savedFields = savedDocument?.fields || {};
    const resident =
      residents.find((item) => item.id === (savedDocument?.residentId || request.resident_id)) ||
      requestResident ||
      null;
    const template = templates.find((item) => item.id === savedDocument?.templateId) || matchedTemplate;

    setSelectedRequest(request);
    setSelectedTemplateId(template?.id || "");
    setSelectedResidentId(resident?.id || request.resident_id || "");
    setResidentSearch(resident?.full_name || "");
    setDocumentFields(buildResidentFields(resident, request, template, savedFields));
    setAiReview(null);
    setShowDetailModal(true);
  };

  const updateWalkInForm = (field, value) => {
    setWalkInForm((current) => ({
      ...current,
      ...(field === "residentSearch" && current.residentId ? { residentId: "" } : {}),
      [field]: value,
    }));

    if (field === "residentSearch") {
      setWalkInResidentSearchOpen(true);
    }
  };

  const handleWalkInResidentChange = (residentId) => {
    const resident = residents.find((item) => item.id === residentId) || null;

    setWalkInForm((current) => ({
      ...current,
      residentId,
      residentSearch: resident ? getResidentLabel(resident) : current.residentSearch,
    }));
    setWalkInResidentSearchOpen(false);
  };

  const handleWalkInResidentSearchKeyDown = (event) => {
    if (event.key !== "Enter" || walkInForm.residentId || walkInResidentOptions.length === 0) return;

    event.preventDefault();
    handleWalkInResidentChange(walkInResidentOptions[0].id);
  };

  const handleWalkInSubmit = async (event) => {
    event.preventDefault();

    if (!selectedWalkInTemplate || !resolvedWalkInResident) {
      setMessage({
        type: "error",
        text: "Select both the document and resident before preparing a walk-in request.",
      });
      return;
    }

    setCreatingWalkIn(true);
    setMessage(null);

    try {
      const createdRequest = await createDocumentRequest({
        resident_id: resolvedWalkInResident.id,
        document_type: getTemplateLabel(selectedWalkInTemplate),
        status: "Processing",
      });
      const requestWithResident = {
        ...createdRequest,
        residents: getNestedResident(createdRequest.residents) || resolvedWalkInResident,
      };
      const fields = buildResidentFields(
        resolvedWalkInResident,
        requestWithResident,
        selectedWalkInTemplate,
        { purpose: walkInForm.purpose }
      );
      const review = {
        source: "Walk-in autofill",
        confidence: "Ready for review",
        summary:
          "Resident information and document template were autofilled from barangay records. Review the preview before printing.",
        checklist: [
          `Template selected: ${getTemplateLabel(selectedWalkInTemplate)}`,
          `Resident selected: ${getResidentLabel(resolvedWalkInResident)}`,
          walkInForm.purpose ? "Purpose is filled." : "Purpose can be edited before printing.",
          "Document preview is ready for admin review.",
        ],
      };

      setRequests((currentRequests) => [
        requestWithResident,
        ...currentRequests.filter((request) => request.id !== requestWithResident.id),
      ]);
      setSelectedRequest(requestWithResident);
      setSelectedTemplateId(selectedWalkInTemplate.id);
      setSelectedResidentId(resolvedWalkInResident.id);
      setResidentSearch(getResidentLabel(resolvedWalkInResident));
      setDocumentFields(fields);
      setAiReview(review);
      setShowDetailModal(true);
      setWalkInForm({
        templateId: "",
        residentId: "",
        residentSearch: "",
        purpose: "",
      });
      setMessage({
        type: "success",
        text: "Walk-in request created. Review the autofilled document, then print when ready.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to create walk-in request." });
    } finally {
      setCreatingWalkIn(false);
    }
  };

  const updateDocumentField = (field, value) => {
    setDocumentFields((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetPrintableText = () => {
    setDocumentFields((current) => ({
      ...current,
      documentText: "",
    }));
  };

  const collectPreviewEdits = (baseFields = documentFields) => {
    const root = previewEditorRef.current;
    if (!root) return baseFields;

    let nextFields = baseFields;
    const setPreviewField = (field, value) => {
      const normalizedValue = normalizeEditablePreviewText(value);
      const currentValue = normalizeEditablePreviewText(baseFields[field]);

      if (!normalizedValue || normalizedValue === currentValue) return;
      if (nextFields === baseFields) nextFields = { ...baseFields };
      nextFields[field] = normalizedValue;
    };

    const bodyNode = root.querySelector("[data-editable-document-body]");
    if (bodyNode) {
      const nextDocumentText = getEditablePreviewBlockText(bodyNode);
      const currentPreviewText = normalizeEditablePreviewText(editableDocumentText);
      const currentCustomText = normalizeEditablePreviewText(baseFields.documentText);

      if (nextDocumentText && (nextDocumentText !== currentPreviewText || currentCustomText)) {
        setPreviewField("documentText", nextDocumentText);
      }
    }

    root.querySelectorAll("[data-editable-field]").forEach((node) => {
      const field = node.dataset.editableField;
      if (!["approvingOfficer", "preparedBy"].includes(field)) return;
      setPreviewField(field, node.innerText || node.textContent);
    });

    return nextFields;
  };

  const commitPreviewEdits = () => {
    const nextFields = collectPreviewEdits();
    if (nextFields !== documentFields) {
      setDocumentFields(nextFields);
    }
    return nextFields;
  };

  const handlePreviewEditorBlur = () => {
    commitPreviewEdits();
  };

  const handlePreviewEditorPaste = (event) => {
    const editableTarget =
      event.target instanceof Element ? event.target.closest('[contenteditable="true"]') : null;
    if (!editableTarget || !event.currentTarget.contains(editableTarget)) return;

    const pastedText = event.clipboardData?.getData("text/plain");
    if (!pastedText) return;

    event.preventDefault();

    const selection = window.getSelection();
    if (!selection?.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(pastedText));
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleTemplateChange = (templateId) => {
    const template = templates.find((item) => item.id === templateId) || null;

    setSelectedTemplateId(templateId);
    setDocumentFields((current) => ({
      ...current,
      documentTitle: getTemplateLabel(template),
      documentText: "",
    }));
    setAiReview(null);
  };

  const handleResidentChange = (residentId) => {
    const resident =
      residents.find((item) => item.id === residentId) ||
      (selectedRequest?.resident_id === residentId ? getNestedResident(selectedRequest?.residents) : null);

    setSelectedResidentId(residentId);
    setResidentSearch(resident?.full_name || "");
    setDocumentFields((current) =>
      buildResidentFields(resident, selectedRequest, selectedTemplate, {
        purpose: current.purpose,
        issueDate: current.issueDate,
        preparedBy: current.preparedBy,
        approvingOfficer: current.approvingOfficer,
        remarks: current.remarks,
        documentTitle: current.documentTitle,
        documentText: "",
        printFontSize: current.printFontSize,
        printLineHeight: current.printLineHeight,
        printParagraphGap: current.printParagraphGap,
      })
    );
    setAiReview(null);
  };



  const handleStatusChange = async (id, newStatus) => {
    setUpdating(true);

    try {
      const updatedRequest = await updateDocumentRequestStatus(id, newStatus);

      setRequests((currentRequests) =>
        currentRequests.map((request) =>
          request.id === id ? { ...request, ...updatedRequest, status: newStatus } : request
        )
      );

      setMessage({
        type: "success",
        text:
          newStatus === "Completed"
            ? "Request marked as Completed. The resident portal was notified for pickup."
            : `Request marked as ${newStatus}.`,
      });

      if (selectedRequest?.id === id) {
        setSelectedRequest((current) => ({
          ...current,
          ...updatedRequest,
          status: newStatus,
        }));
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to update status." });
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteRequest = async (id) => {
    if (!window.confirm("Are you sure? This action cannot be undone.")) return;

    try {
      await deleteDocumentRequest(id);
      setRequests((currentRequests) => currentRequests.filter((request) => request.id !== id));
      setMessage({
        type: "success",
        text: "Request deleted successfully.",
      });

      if (selectedRequest?.id === id) {
        setShowDetailModal(false);
        setSelectedRequest(null);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to delete request." });
    }
  };

  const handleSaveDocument = () => {
    if (!selectedRequest) return;
    setSavingDocument(true);
    const fieldsToSave = commitPreviewEdits();

    try {
      savePreparedDocument(selectedRequest.id, {
        templateId: selectedTemplateId,
        residentId: selectedResidentId,
        fields: fieldsToSave,
        aiReview,
      });

      setMessage({
        type: "success",
        text: "Prepared document saved.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to save document." });
    } finally {
      setSavingDocument(false);
    }
  };

  const handlePrintDocument = () => {
    if (!selectedRequest || !documentIsReady) return;
    const fieldsToPrint = commitPreviewEdits();

    const printWindow = window.open(
      "",
      "kaagapai-document-print-preview",
      "width=980,height=1000,resizable=yes,scrollbars=yes"
    );
    if (!printWindow) {
      setMessage({ type: "error", text: "Please allow pop-ups so the document can be printed." });
      return;
    }

    try {
      printWindow.document.open();
      printWindow.document.write(
        getRealDocumentPrintMarkup({
          fields: fieldsToPrint,
          template: selectedTemplate,
        })
      );
      printWindow.document.close();
      printWindow.opener = null;
      printWindow.focus();
      setShowDetailModal(false);
      setMessage({
        type: "success",
        text: "Print preview opened. Review the document and click Print Document when ready.",
      });
    } catch (error) {
      printWindow.close();
      setMessage({
        type: "error",
        text: error.message || "Unable to open the document print preview.",
      });
    }
  };

  const handleTemplateFileUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !selectedTemplate) return;

    setUploadingTemplate(true);
    setMessage(null);

    try {
      const updatedTemplate = await uploadDocumentTemplateFile(selectedTemplate, file);

      setTemplates((currentTemplates) => {
        let replaced = false;
        const selectedTemplateName = normalizeText(selectedTemplate.template_name);
        const selectedTemplateType = normalizeText(selectedTemplate.document_type);
        const updatedTemplateName = normalizeText(updatedTemplate.template_name);
        const updatedTemplateType = normalizeText(updatedTemplate.document_type);
        const nextTemplates = currentTemplates.map((template) => {
          const isSelectedTemplate = template.id === selectedTemplate.id;
          const isUpdatedTemplate = template.id === updatedTemplate.id;
          const hasSameName =
            updatedTemplateName &&
            [normalizeText(template.template_name), normalizeText(template.document_type)].includes(
              updatedTemplateName
            );
          const hasSameType =
            updatedTemplateType &&
            [normalizeText(template.template_name), normalizeText(template.document_type)].includes(
              updatedTemplateType
            );
          const matchesSelectedName =
            selectedTemplateName &&
            [normalizeText(template.template_name), normalizeText(template.document_type)].includes(
              selectedTemplateName
            );
          const matchesSelectedType =
            selectedTemplateType &&
            [normalizeText(template.template_name), normalizeText(template.document_type)].includes(
              selectedTemplateType
            );

          if (
            isSelectedTemplate ||
            isUpdatedTemplate ||
            hasSameName ||
            hasSameType ||
            matchesSelectedName ||
            matchesSelectedType
          ) {
            replaced = true;
            return {
              ...template,
              ...updatedTemplate,
            };
          }

          return template;
        });

        return replaced ? nextTemplates : [...nextTemplates, updatedTemplate];
      });
      setSelectedTemplateId(updatedTemplate.id || selectedTemplate.id);
      setMessage({
        type: "success",
        text: `${file.name} uploaded for ${getTemplateLabel(updatedTemplate)}.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to upload template." });
    } finally {
      setUploadingTemplate(false);
    }
  };



  const columns = [
    {
      field: "resident",
      headerName: "Resident",
      flex: 1.5,
      renderCell: (params) => {
        const request = params.row;
        return getNestedResident(request.residents)?.full_name || "N/A";
      }
    },
    {
      field: "document_type",
      headerName: "Document Type",
      flex: 1.5,
      renderCell: (params) => params.row.document_type
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        const request = params.row;
        return (
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${getStatusColor(request.status)}`}>
            {request.status}
          </span>
        );
      }
    },
    {
      field: "created_at",
      headerName: "Requested",
      flex: 1.2,
      renderCell: (params) => formatDate(params.row.created_at)
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      headerAlign: "right",
      align: "right",
      renderCell: (params) => {
        const request = params.row;
        return (
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => openRequest(request)}
              className="gov-action-btn view"
              title="Open template and preview"
            >
              <Eye size={18} />
            </button>
            <button
              type="button"
              onClick={() => handleDeleteRequest(request.id)}
              className="gov-action-btn delete"
              title="Delete"
            >
              <Trash2 size={18} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <>
      <PageWrapper title="Document Management" description="Review requests, generate certificates, and print documents">
          {message && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-lg p-4 ${message.type === "success"
                ? "border border-emerald-200 bg-emerald-50"
                : "border border-rose-200 bg-rose-50"
                }`}
            >
              {message.type === "success" ? (
                <CheckCircle className="shrink-0 text-emerald-600" size={20} />
              ) : (
                <AlertCircle className="shrink-0 text-rose-600" size={20} />
              )}
              <span className={message.type === "success" ? "text-emerald-700" : "text-rose-700"}>
                {message.text}
              </span>
            </div>
          )}

          <div className="glass-container">
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 p-6 border-b border-slate-200/50">
              <div className="relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 shadow-sm transition-transform group-hover:scale-110">
                    <ClipboardList size={28} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Requests</p>
                    <div className="flex items-end gap-2 mt-1">
                      {delayedLoading ? (
                        <div className="h-7 w-16 animate-pulse rounded bg-slate-200 mt-1" />
                      ) : (
                        <>
                          <p className="text-3xl font-black text-slate-900 leading-none">{stats.total}</p>
                          <span className="text-xs font-semibold text-emerald-500">↑ 12%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 shadow-sm transition-transform group-hover:scale-110">
                    <FileText size={28} className="text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-amber-600">Pending</p>
                    <div className="flex items-end gap-2 mt-1">
                      {delayedLoading ? (
                        <div className="h-7 w-16 animate-pulse rounded bg-slate-200 mt-1" />
                      ) : (
                        <>
                          <p className="text-3xl font-black text-amber-600 leading-none">{stats.pending}</p>
                          <span className="text-xs font-semibold text-amber-500">Active</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-md transition-transform group-hover:scale-110">
                    <RefreshCw size={28} className="text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-blue-700">Processing</p>
                    <div className="flex items-end gap-2 mt-1">
                      {delayedLoading ? (
                        <div className="h-7 w-16 animate-pulse rounded bg-slate-200 mt-1" />
                      ) : (
                        <p className="text-3xl font-black text-blue-700 leading-none">{stats.processing}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative overflow-hidden group">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-emerald-200 shadow-sm transition-transform group-hover:scale-110">
                    <CheckCircle size={28} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Completed</p>
                    <div className="flex items-end gap-2 mt-1">
                      {delayedLoading ? (
                        <div className="h-7 w-16 animate-pulse rounded bg-slate-200 mt-1" />
                      ) : (
                        <>
                          <p className="text-3xl font-black text-emerald-600 leading-none">{stats.completed}</p>
                          <span className="text-xs font-semibold text-emerald-500">↑ 5%</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleWalkInSubmit}
              className="p-6 border-b border-slate-200/50 bg-white/20"
            >
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800">Walk-in Request</h2>
                  <p className="mt-1 text-sm font-medium text-slate-500">
                    Create a counter request, autofill resident details, then open the print preview.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 border border-slate-200 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
                  Barangay Office
                </span>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
                <label className="text-sm font-semibold text-slate-700">
                  Document
                  <select
                    value={walkInForm.templateId}
                    onChange={(event) => updateWalkInForm("templateId", event.target.value)}
                    className="mt-2 h-[60px] w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  >
                    <option value="">Select document</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {getTemplateLabel(template)}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="relative text-sm font-semibold text-slate-700">
                  Search resident
                  <input
                    value={walkInForm.residentSearch}
                    onChange={(event) => updateWalkInForm("residentSearch", event.target.value)}
                    onFocus={() => setWalkInResidentSearchOpen(true)}
                    onBlur={() => window.setTimeout(() => setWalkInResidentSearchOpen(false), 120)}
                    onKeyDown={handleWalkInResidentSearchKeyDown}
                    placeholder="Type resident name"
                    role="combobox"
                    aria-expanded={walkInResidentSearchOpen}
                    aria-controls="walk-in-resident-results"
                    aria-autocomplete="list"
                    className="mt-2 h-[60px] w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  />
                  {walkInResidentSearchOpen && walkInForm.residentSearch.trim() ? (
                    <div
                      id="walk-in-resident-results"
                      className="absolute left-0 right-0 top-full z-30 mt-2 max-h-64 overflow-y-auto rounded-[16px] border border-slate-200 bg-white p-2 shadow-xl"
                      role="listbox"
                    >
                      {walkInResidentOptions.length > 0 ? (
                        walkInResidentOptions.slice(0, 6).map((resident) => (
                          <button
                            key={resident.id}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => handleWalkInResidentChange(resident.id)}
                            className="flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50 focus:bg-slate-100 focus:outline-none"
                            role="option"
                            aria-selected={walkInForm.residentId === resident.id}
                          >
                            <span className="text-sm font-bold text-slate-900">
                              {getResidentLabel(resident)}
                            </span>
                            <span className="mt-0.5 text-xs font-medium text-slate-500">
                              {getResidentMeta(resident)}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm font-medium text-slate-500 text-center">
                          No resident found.
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                <label className="text-sm font-semibold text-slate-700">
                  Resident list
                  <select
                    value={walkInForm.residentId || resolvedWalkInResident?.id || ""}
                    onChange={(event) => handleWalkInResidentChange(event.target.value)}
                    className="mt-2 h-[60px] w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  >
                    <option value="">Select resident</option>
                    {walkInResidentOptions.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.full_name} - {resident.purok || "No purok"}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-semibold text-slate-700">
                  Purpose
                  <input
                    value={walkInForm.purpose}
                    onChange={(event) => updateWalkInForm("purpose", event.target.value)}
                    placeholder="Optional"
                    className="mt-2 h-[60px] w-full rounded-[16px] border border-slate-200 bg-slate-50 px-4 text-base font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  />
                </label>

                <button
                  type="submit"
                  disabled={creatingWalkIn || !walkInForm.templateId || !resolvedWalkInResident}
                  className="inline-flex h-[60px] min-w-[140px] items-center justify-center gap-2 rounded-[16px] bg-emerald-600 px-6 text-base font-bold text-white transition hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {creatingWalkIn ? <Loader size={20} className="animate-spin" /> : <UserCheck size={20} />}
                  {creatingWalkIn ? "Preparing..." : "Autofill & Prepare"}
                </button>
              </div>
            </form>

            <div className="p-6 border-b border-slate-200/50 bg-slate-50/20">
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_220px_auto] lg:items-end">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <Search size={16} className="mr-2 inline text-emerald-500" />
                    Search
                  </label>
                  <input
                    type="text"
                    placeholder="Search by resident name or document type..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    <Filter size={16} className="mr-2 inline text-emerald-500" />
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full h-[46px] rounded-[12px] border border-slate-200 bg-slate-50 px-4 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  >
                    <option value="">All Status</option>
                    {STATUS_OPTIONS.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  onClick={() => loadData({ showLoading: true })}
                  className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-6 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="gov-datagrid-container overflow-hidden mt-6" style={{ height: 600, width: '100%' }}>
              <DataGrid
                rows={requests}
                columns={columns}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 10 },
                  },
                }}
                pageSizeOptions={[10, 25, 50]}
                disableRowSelectionOnClick
                loading={delayedLoading}
                rowHeight={70}
                getRowId={(row) => row.id}
              />
            </div>
          </div>
        </PageWrapper>

        {selectedRequest && (
          <FloatingModal
            open={showDetailModal}
            onClose={() => setShowDetailModal(false)}
            title="Process Document Request"
            eyebrow="Document processing"
            maxWidth="max-w-[95vw] lg:max-w-7xl"
            footer={
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.2fr_auto] w-full">
                <button
                  type="button"
                  onClick={handleSaveDocument}
                  disabled={savingDocument || !selectedRequest}
                  className="btn-gov btn-gov-success min-h-[46px]"
                >
                  <Save size={18} />
                  {savingDocument ? "Saving..." : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={handlePrintDocument}
                  disabled={!documentIsReady}
                  className="btn-gov btn-gov-info min-h-[46px]"
                >
                  <Printer size={18} />
                  Print Document
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedRequest.id, "Completed")}
                  disabled={updating || selectedRequest.status === "Completed" || !documentIsReady}
                  className="btn-gov btn-gov-primary min-h-[46px]"
                >
                  <Download size={18} />
                  Complete & Notify
                </button>

                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="btn-gov btn-gov-secondary min-h-[46px]"
                >
                  Close
                </button>
              </div>
            }
          >
            <div className="flex flex-col lg:flex-row flex-1">
              <aside className="w-full lg:w-[380px] shrink-0 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200 p-6">
                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-wider">
                    <FileText size={18} className="text-emerald-500" />
                    Document Template
                  </div>
                  <select
                    value={selectedTemplateId}
                    onChange={(event) => handleTemplateChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  >
                    <option value="">Select template</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {getTemplateLabel(template)}
                      </option>
                    ))}
                  </select>

                  {selectedTemplate ? (
                    <details className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 shadow-sm">
                      <summary className="cursor-pointer font-bold text-slate-700">
                        Template source
                      </summary>
                      <div className="mt-3">
                        <label
                          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 font-bold transition ${uploadingTemplate
                            ? "border-slate-200 bg-slate-100 text-slate-400"
                            : "border-emerald-200 bg-white text-emerald-700 hover:border-emerald-300 hover:bg-emerald-50"
                            }`}
                          title="Choose a document template file"
                        >
                          {uploadingTemplate ? (
                            <Loader size={14} className="animate-spin" />
                          ) : (
                            <Upload size={14} />
                          )}
                          {uploadingTemplate ? "Uploading..." : "Upload file"}
                          <input
                            type="file"
                            accept={TEMPLATE_UPLOAD_ACCEPT}
                            disabled={uploadingTemplate}
                            onChange={handleTemplateFileUpload}
                            className="sr-only"
                          />
                        </label>
                        <p className="mt-2 truncate text-[11px] font-medium text-slate-500">
                          {getTemplateFileName(selectedTemplate)}
                        </p>
                      </div>
                      <div className="mt-3 grid gap-1.5">
                        <p>
                          <span className="font-bold">Type:</span>{" "}
                          {selectedTemplate.document_type || "-"}
                        </p>
                        <p>
                          <span className="font-bold">Processing:</span>{" "}
                          {selectedTemplate.processing_time || "-"}
                        </p>
                        <p>
                          <span className="font-bold">Fee:</span> {selectedTemplate.fee || "-"}
                        </p>
                        <p>
                          <span className="font-bold">Requirements:</span>{" "}
                          {selectedTemplate.requirements || "-"}
                        </p>
                      </div>
                    </details>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-rose-600">
                      No template selected. Add or seed document templates in Supabase.
                    </p>
                  )}
                </section>

                <section>
                  <div className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-wider">
                    <UserCheck size={18} className="text-emerald-500" />
                    Resident Autofill
                  </div>
                  <input
                    value={residentSearch}
                    onChange={(event) => setResidentSearch(event.target.value)}
                    placeholder="Search resident, e.g. Juan"
                    className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  />
                  <select
                    value={selectedResidentId}
                    onChange={(event) => handleResidentChange(event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                  >
                    <option value="">Select resident</option>
                    {residentOptions.map((resident) => (
                      <option key={resident.id} value={resident.id}>
                        {resident.full_name} - {resident.purok || "No purok"}
                      </option>
                    ))}
                  </select>
                </section>

                <section className="grid gap-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800 uppercase tracking-wider">
                    <FileText size={18} className="text-emerald-500" />
                    Certificate data
                  </div>
                  <label className="text-sm font-bold text-slate-700">
                    Purpose
                    <input
                      value={documentFields.purpose}
                      onChange={(event) => updateDocumentField("purpose", event.target.value)}
                      placeholder="Scholarship, employment, business permit..."
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Issue date
                    <input
                      type="date"
                      value={documentFields.issueDate}
                      onChange={(event) => updateDocumentField("issueDate", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Prepared by
                    <input
                      value={documentFields.preparedBy}
                      onChange={(event) => updateDocumentField("preparedBy", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Approving officer
                    <input
                      value={documentFields.approvingOfficer}
                      onChange={(event) => updateDocumentField("approvingOfficer", event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </label>

                  <label className="text-sm font-bold text-slate-700">
                    Remarks
                    <textarea
                      value={documentFields.remarks}
                      onChange={(event) => updateDocumentField("remarks", event.target.value)}
                      rows={3}
                      className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 shadow-sm"
                    />
                  </label>
                </section>
              </aside>

              <section className="flex-1 space-y-6 p-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Request Details</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {selectedResident?.full_name || "No resident selected"} requested{" "}
                        {selectedRequest.document_type} on {formatDateTime(selectedRequest.created_at)}.
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-4 py-1.5 text-xs font-bold ${getStatusColor(
                        selectedRequest.status
                      )}`}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>
                </div>

                {!documentIsReady ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800 shadow-sm">
                    Complete these fields before printing: {missingRequiredFields.join(", ")}.
                  </div>
                ) : null}

                {aiReview ? (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm font-bold text-blue-900">
                          <Bot size={18} />
                          AI review
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-blue-800">{aiReview.summary}</p>
                      </div>
                      <span className="w-fit rounded-lg bg-white border border-blue-100 px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
                        {aiReview.source} - {aiReview.confidence}
                      </span>
                    </div>
                    {aiReview.checklist?.length > 0 ? (
                      <ul className="mt-4 space-y-2 text-sm font-medium text-blue-800">
                        {aiReview.checklist.map((item) => (
                          <li key={item} className="flex gap-2.5 items-start">
                            <CheckCircle size={16} className="mt-0.5 shrink-0 text-blue-600" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-900">Certificate editor</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">
                        {selectedTemplate ? getTemplateLabel(selectedTemplate) : "No template selected"}
                      </p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[140px_140px_150px_auto]">
                      <label className="text-xs font-semibold text-slate-700">
                        Text size
                        <select
                          value={documentFields.printFontSize}
                          onChange={(event) => updateDocumentField("printFontSize", event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="10">Small</option>
                          <option value="11">Compact</option>
                          <option value="12">Normal</option>
                          <option value="13">Large</option>
                        </select>
                      </label>

                      <label className="text-xs font-semibold text-slate-700">
                        Line spacing
                        <select
                          value={documentFields.printLineHeight}
                          onChange={(event) => updateDocumentField("printLineHeight", event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="1.25">Tight</option>
                          <option value="1.38">Normal</option>
                          <option value="1.55">Loose</option>
                        </select>
                      </label>

                      <label className="text-xs font-semibold text-slate-700">
                        Paragraph gap
                        <select
                          value={documentFields.printParagraphGap}
                          onChange={(event) => updateDocumentField("printParagraphGap", event.target.value)}
                          className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="0.04">Tight</option>
                          <option value="0.08">Normal</option>
                          <option value="0.12">Wide</option>
                        </select>
                      </label>

                      <button
                        type="button"
                        onClick={resetPrintableText}
                        title="Reset certificate body from selected resident and template"
                        className="inline-flex items-center justify-center gap-1.5 self-end rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 shadow-sm"
                      >
                        <RefreshCw size={16} />
                        Reset body
                      </button>
                    </div>
                  </div>

                  <div
                    ref={previewEditorRef}
                    onBlur={handlePreviewEditorBlur}
                    onPaste={handlePreviewEditorPaste}
                    className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-inner"
                    dangerouslySetInnerHTML={{
                      __html: getRealDocumentMarkup({
                        fields: documentFields,
                        template: selectedTemplate,
                        editable: true,
                      }),
                    }}
                  />
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-4 text-sm font-bold text-slate-900">Update Status</p>
                  <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
                    {STATUS_OPTIONS.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handleStatusChange(selectedRequest.id, status)}
                        disabled={updating || selectedRequest.status === status}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                      >
                        {status === "Rejected" ? <X size={16} /> : status === "Pending" ? <ClipboardList size={16} /> : <Check size={16} />}
                        {status}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            </div>
          </FloatingModal>
        )}
    </>
  );
};

export default DocumentManagement;
