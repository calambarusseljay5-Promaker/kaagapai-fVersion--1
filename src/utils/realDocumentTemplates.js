export const BARANGAY_SEAL_SRC = "/files/document-templates/media/barangay-seal.png";
export const PUNONG_BARANGAY = "MAMERTO C. CLARITO";
export const DEFAULT_PREPARED_BY = "FATMAH S. SUMPAO";

export const normalizeDocumentTemplateText = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

export const REAL_DOCUMENT_TEMPLATES = [
  {
    id: "real-barangay-clearance",
    template_name: "Barangay Clearance",
    document_type: "Barangay Clearance",
    description: "Official barangay clearance based on existing barangay records.",
    requirements: "Valid ID; proof of residency; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/cert.barangay-clearance.docx",
  },
  {
    id: "real-certificate-residency",
    template_name: "Certificate of Residency",
    document_type: "Certificate of Residency",
    description: "Certifies that the requester is a bona fide resident of Barangay Upper Mingading.",
    requirements: "Valid ID; proof of residency; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/Cert.Residency-Templates.docx",
  },
  {
    id: "real-certificate-indigency",
    template_name: "Certificate of Indigency",
    document_type: "Certificate of Indigency",
    description: "Certifies low-income or indigent status for assistance and official requirements.",
    requirements: "Valid ID; proof of residency; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/Cert.indigency-templates.docx",
  },
  {
    id: "real-business-permit",
    template_name: "Business Permit",
    document_type: "Business Permit",
    description: "Barangay certification for business permit application and local business verification.",
    requirements: "Valid ID; barangay clearance; business details; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/Cert.BUSINESS-Permit.docx",
  },
  {
    id: "real-rsbsa-certification",
    template_name: "RSBSA Certification",
    document_type: "RSBSA Certification",
    description: "Certification for farmers and fisherfolk RSBSA registration.",
    requirements: "Valid ID; farm or crop details; proof of residency",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/cert.Rsbsa-templates.docx",
  },
  {
    id: "real-solo-parent-certification",
    template_name: "Solo Parent Certification",
    document_type: "Solo Parent Certification",
    description: "Barangay certification supporting solo parent application or related legal purpose.",
    requirements: "Valid ID; proof of residency; supporting solo parent document; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/Cert.-solo-parent-Templates.docx",
  },
  {
    id: "real-4ps-certification",
    template_name: "4Ps Certification",
    document_type: "4Ps Certification",
    description: "Barangay certification for Pantawid Pamilyang Pilipino Program requirements.",
    requirements: "Valid ID; proof of residency; 4Ps details; purpose of request",
    processing_time: "1 day",
    fee: "As assessed by barangay office",
    template_file_path: "/files/document-templates/Barangay-Cert.templates.-4ps.docx",
  },
];

const LEGACY_TEMPLATE_KEYS = new Set(
  [
    "Clearance",
    "Residency Certificate",
    "ID Card",
    "Good Moral Certificate",
    "Travel Authority",
    "NBI Clearance",
    "NBI Clearance Request",
    "Business Permit Certification",
  ].map((value) => normalizeDocumentTemplateText(value))
);

export const getTemplateFilePath = (template) =>
  template?.template_file_path || template?.file_path || template?.template_url || "";

export const getRealDocumentTemplateKey = (templateOrType) => {
  const value =
    typeof templateOrType === "string"
      ? templateOrType
      : [
          templateOrType?.template_name,
          templateOrType?.document_type,
          templateOrType?.template_file_path,
        ]
          .filter(Boolean)
          .join(" ");
  const normalized = normalizeDocumentTemplateText(value);

  if (normalized.includes("clearance")) return "clearance";
  if (normalized.includes("residency") || normalized.includes("residence")) return "residency";
  if (normalized.includes("indigency")) return "indigency";
  if (normalized.includes("business") || normalized.includes("permit")) return "business";
  if (normalized.includes("rsbsa")) return "rsbsa";
  if (normalized.includes("solo")) return "solo";
  if (normalized.includes("4ps")) return "4ps";

  return "certification";
};

export const mergeRealDocumentTemplates = (templates = []) => {
  const realRowsByKey = new Map();
  const realTemplateKeys = new Set(
    REAL_DOCUMENT_TEMPLATES.map((template) => getRealDocumentTemplateKey(template))
  );

  templates.forEach((template) => {
    const templateNameKey = normalizeDocumentTemplateText(template.template_name);
    const documentTypeKey = normalizeDocumentTemplateText(template.document_type);
    const isLegacyOnly =
      LEGACY_TEMPLATE_KEYS.has(templateNameKey) || LEGACY_TEMPLATE_KEYS.has(documentTypeKey);
    const key = getRealDocumentTemplateKey(template);

    if (!isLegacyOnly && realTemplateKeys.has(key)) {
      realRowsByKey.set(key, template);
    }
  });

  const mergedRealTemplates = REAL_DOCUMENT_TEMPLATES.map((template) => {
    const dbTemplate = realRowsByKey.get(getRealDocumentTemplateKey(template));

    if (!dbTemplate) return template;

    return {
      ...template,
      ...dbTemplate,
      template_file_path: getTemplateFilePath(dbTemplate) || template.template_file_path,
    };
  });

  const customTemplates = templates.filter((template) => {
    const templateNameKey = normalizeDocumentTemplateText(template.template_name);
    const documentTypeKey = normalizeDocumentTemplateText(template.document_type);
    const isLegacyOnly =
      LEGACY_TEMPLATE_KEYS.has(templateNameKey) || LEGACY_TEMPLATE_KEYS.has(documentTypeKey);

    return !isLegacyOnly && !realTemplateKeys.has(getRealDocumentTemplateKey(template));
  });

  return [...mergedRealTemplates, ...customTemplates];
};

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const unescapeHtml = (value) =>
  String(value ?? "")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");

const fieldValue = (value, fallback = "________________") => {
  const text = String(value ?? "").trim();
  return escapeHtml(text || fallback);
};

const getAddress = (fields) =>
  [fields.houseNo, fields.purok, fields.address]
    .filter(Boolean)
    .map((value) => String(value).trim())
    .filter(Boolean)
    .join(", ") || fields.purok || fields.address || "";

const getPurposePhrase = (fields) => {
  const purpose = String(fields.purpose || "").trim();
  if (!purpose) return "whatever legal purpose it may serve best";
  return purpose.replace(/^for\s+/i, "");
};

const getApprovingOfficer = (fields) => {
  const value = String(fields.approvingOfficer || "").trim();
  if (!value || normalizeDocumentTemplateText(value) === "punongbarangay") return PUNONG_BARANGAY;
  return value;
};

const formatIssueDate = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return "________";

  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const formatIssueMonthYear = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return "________";

  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
};

const getOrdinalDay = (value) => {
  const date = value ? new Date(`${value}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) return "____";
  const day = date.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";

  return `${day}${suffix}`;
};

const buildBodyParagraphs = (fields, template) => {
  const key = getRealDocumentTemplateKey(template);
  const name = fieldValue(fields.residentName, "____________________________");
  const age = fieldValue(fields.age, "____");
  const gender = fieldValue(fields.gender, "male/female");
  const purok = fieldValue(fields.purok || fields.address, "________________");
  const address = fieldValue(getAddress(fields), "____________________________");
  const purpose = fieldValue(getPurposePhrase(fields), "whatever legal purpose it may serve best");
  const issueDate = fieldValue(formatIssueDate(fields.issueDate));
  const day = fieldValue(getOrdinalDay(fields.issueDate), "____");
  const monthYear = fieldValue(formatIssueMonthYear(fields.issueDate), "________");
  const remarks = String(fields.remarks || "").trim();

  if (key === "clearance") {
    return [
      `This is to certify according to our existing records that Ms./Mr./Mrs. <strong>${name}</strong>, <strong>${age}</strong> yrs. old, Filipino, single/married/widow, whose signature and thumbmark appear below, is presently a resident of <strong>${address}</strong>, Barangay Upper Mingading, Aleosan, Cotabato.`,
      `This is to certify further that his/her character, reputation and moral standing in the community are beyond reproach and that as of the date issued there is no pending case whatsoever filed against the above-named person for <strong>${purpose}</strong>.`,
      `This is to certify furthermore that in view of the foregoing circumstances, this Barangay Clearance is issued upon request of the above-named person for <strong>${purpose}</strong>.`,
      `Issued this <strong>${day}</strong> day of <strong>${monthYear}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  if (key === "business") {
    return [
      `This is to certify that <strong>${name}</strong>, <strong>${age}</strong> yrs. old, Filipino, single/married/widow, a bona fide resident of <strong>${purok}</strong>, Barangay Upper Mingading, Aleosan, Cotabato, has requested this certification for Business Permit Application.`,
      `This certification is being issued upon the request of the above-mentioned person for <strong>${purpose}</strong> and for whatever legal purpose it may serve him/her best.`,
      `Issued this <strong>${day}</strong> day of <strong>${monthYear}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  if (key === "indigency") {
    return [
      `THIS IS TO CERTIFY that <strong>${name}</strong>, <strong>${age}</strong> yrs. old, single/married/widow, and a bona fide resident of <strong>${purok}</strong>, Upper Mingading, Aleosan, Cotabato, belongs to a low income earner family and is considered as indigent.`,
      `This certification is issued upon the request of the above-named person for <strong>${purpose}</strong>.`,
      `Issued this <strong>${day}</strong> day of <strong>${monthYear}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  if (key === "residency") {
    return [
      `THIS IS TO CERTIFY that <strong>${name}</strong>, <strong>${gender}</strong>, single/married, Filipino, is a bona fide citizen and resident of <strong>${address}</strong>, Upper Mingading, Aleosan, Cotabato.`,
      `His/Her reputation and moral standing in the community is beyond reproach and there is no pending case filed against said person whatsoever.`,
      `This certification is issued upon the request of the above-named person for <strong>${purpose}</strong>. Issued this <strong>${issueDate}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  if (key === "rsbsa") {
    return [
      `THIS IS TO CERTIFY THAT <strong>${name}</strong>, <strong>${age}</strong> y/o, residing at <strong>${address}</strong>, Upper Mingading, Aleosan, Cotabato, is tilling crop(s), farm area, or agricultural livelihood declared to this office${remarks ? `: <strong>${escapeHtml(remarks)}</strong>` : "."}`,
      `This CERTIFICATION is being issued by the Barangay solely for the purpose of the farmers and fisherfolk registration to the REGISTRY SYSTEM FOR BASIC SECTORS IN AGRICULTURE (RSBSA) of the Department of Agriculture and may not be used for other purposes not mentioned above.`,
    ];
  }

  if (key === "solo") {
    return [
      `This is to certify that <strong>${name}</strong>, of legal age, Filipino, single/married/widow/separated, is a bona fide resident of <strong>${purok}</strong>, Barangay Upper Mingading, Aleosan, Cotabato.`,
      `This certification is being issued upon the request of the above-mentioned person in support of Solo Parent application for <strong>${purpose}</strong>.`,
      `Issued this <strong>${day}</strong> day of <strong>${monthYear}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  if (key === "4ps") {
    return [
      `This is to certify that <strong>${name}</strong>, <strong>${age}</strong> yrs. old, Filipino, single/married/widow, is a bona fide resident of <strong>${purok}</strong>, Barangay Upper Mingading, Aleosan, Cotabato.`,
      `This certification is being issued upon the request of the above-mentioned person for <strong>${purpose}</strong> and for whatever legal purpose it may serve best.`,
      `Issued this <strong>${day}</strong> day of <strong>${monthYear}</strong> at Barangay Upper Mingading, Aleosan, Cotabato.`,
    ];
  }

  return [
    `This is to certify that <strong>${name}</strong>, <strong>${age}</strong> yrs. old, is a bona fide resident of <strong>${address}</strong>, Barangay Upper Mingading, Aleosan, Cotabato.`,
    `This certification is issued upon request for <strong>${purpose}</strong>.`,
  ];
};

const htmlParagraphToText = (paragraph) =>
  unescapeHtml(
    String(paragraph || "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/?strong>/gi, "")
      .replace(/<[^>]+>/g, "")
  );

export const getEditableDocumentText = (fields, template) =>
  buildBodyParagraphs(fields, template).map(htmlParagraphToText).join("\n\n");

const getDocumentBodyHtml = (fields, template) => {
  const customText = String(fields.documentText || "").trim();

  if (customText) {
    return customText
      .split(/\n\s*\n/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br />")}</p>`)
      .join("");
  }

  return buildBodyParagraphs(fields, template)
    .map((paragraph) => `<p>${paragraph}</p>`)
    .join("");
};

const clampNumber = (value, min, max, fallback) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
};

const getPrintSettings = (fields = {}) => {
  const marginMap = {
    narrow: "0.6in 0.6in 0.6in",
    wide: "1.2in 1.2in 1.2in",
    normal: "0.96in 1in 0.8in",
  };
  return {
    bodyFontSize: clampNumber(fields.printFontSize, 10, 14, 12),
    lineHeight: clampNumber(fields.printLineHeight, 1.2, 1.8, 1.38),
    paragraphGap: clampNumber(fields.printParagraphGap, 0.04, 0.16, 0.08),
    padding: marginMap[fields.printMargin] || "0.96in 1in 0.8in",
  };
};

const getDocumentTitle = (template) => {
  const key = getRealDocumentTemplateKey(template);
  if (key === "clearance") return "BARANGAY CLEARANCE";
  return "C E R T I F I C A T I O N";
};

const getEditableBodyAttributes = (editable) =>
  editable
    ? 'contenteditable="true" spellcheck="true" role="textbox" aria-multiline="true" data-editable-document-body="true" aria-label="Certificate text"'
    : "";

const getEditableFieldAttributes = (editable, field, label) =>
  editable
    ? `contenteditable="true" spellcheck="false" role="textbox" data-editable-field="${field}" aria-label="${escapeHtml(label)}"`
    : "";

const getDocumentFooter = (fields, template, editable = false) => {
  const key = getRealDocumentTemplateKey(template);
  const officer = fieldValue(getApprovingOfficer(fields));
  const issueDate = fieldValue(formatIssueDate(fields.issueDate));
  const officerEditAttrs = getEditableFieldAttributes(editable, "approvingOfficer", "Approving officer");

  if (key === "rsbsa") {
    return `
      <section class="real-doc-rsbsa-signatures">
        <div>
          <p class="real-doc-line" ${officerEditAttrs}>${officer}</p>
          <p>Name and Signature of Punong Barangay</p>
        </div>
        <div>
          <p class="real-doc-line">${issueDate}</p>
          <p>Date</p>
        </div>
        <div>
          <p class="real-doc-line">&nbsp;</p>
          <p>Name and Signature of Farmer/Fisherfolk</p>
        </div>
        <div>
          <p class="real-doc-line">${issueDate}</p>
          <p>Date</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="real-doc-signature ${key === "clearance" ? "real-doc-clearance-signature" : ""}">
      <p class="real-doc-line" ${officerEditAttrs}>${officer}</p>
      <p>Punong Barangay</p>
    </section>
  `;
};

const getDocumentExtras = (fields, template, editable = false) => {
  const key = getRealDocumentTemplateKey(template);

  if (key === "clearance") {
    const preparedByEditAttrs = getEditableFieldAttributes(editable, "preparedBy", "Prepared by");

    return `
      <section class="real-doc-clearance-staff">
        <p class="real-doc-staff-name" ${preparedByEditAttrs}>${fieldValue(fields.preparedBy || DEFAULT_PREPARED_BY)}</p>
        <p>(Signature Over Printed Name)</p>
      </section>
      <section class="real-doc-thumbmark" aria-hidden="true">
        <span></span>
      </section>
      <section class="real-doc-or">
        <p>OR No. __________</p>
        <p>Date Issued: __________</p>
        <p>CTC No. __________</p>
        <p>Date Issued: __________</p>
      </section>
    `;
  }

  if (key === "indigency") {
    return `
      <section class="real-doc-or">
        <p>Brgy. Seal/25</p>
        <p>O. R. No. __________</p>
        <p>Date Issued: __________</p>
        <p>CTC No. __________</p>
        <p>Date Issued: __________</p>
      </section>
    `;
  }

  if (key === "business" || key === "4ps") {
    return `
      <section class="real-doc-or">
        <p>OR No. __________</p>
        <p>Date Issued: __________</p>
      </section>
    `;
  }

  return "";
};

const REAL_DOCUMENT_CSS = `
  html, body { margin: 0; padding: 0; background: #fff; }
  .real-doc-shell, .real-doc-shell * { box-sizing: border-box; }
  .real-doc-shell { font-family: "Times New Roman", Times, serif; color: #000; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .real-doc-page { position: relative; width: 8.5in; min-height: 11in; margin: 0 auto; padding: var(--doc-padding, 0.96in 1in 0.8in); background: #fff; box-shadow: 0 0 0 1px #d7d7d7; }
  .real-doc-header { position: relative; min-height: 0.98in; border-bottom: 1px solid #000; padding-bottom: 0.08in; text-align: center; font-size: 10px; line-height: 1.08; }
  .real-doc-seal { position: absolute; left: 0.1in; top: -0.04in; width: 1.1in; height: 1.02in; object-fit: contain; }
  .real-doc-office { margin-top: 0.08in; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .real-doc-title { margin: 0.13in 0 0.16in; text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  .real-doc-to { margin: 0 0 0.12in; font-size: 11px; font-weight: 700; }
  .real-doc-body { font-size: var(--doc-body-font-size, 12px); line-height: var(--doc-line-height, 1.38); text-align: justify; }
  .real-doc-body p { margin: 0 0 var(--doc-paragraph-gap, 0.08in); text-indent: 0.32in; }
  .real-doc-body strong { font-weight: 700; }
  .real-doc-signature { width: 2.4in; margin: 0.26in 0 0 auto; text-align: center; font-size: 11px; line-height: 1.14; }
  .real-doc-clearance-signature { margin-top: 0.2in; }
  .real-doc-line { margin: 0; border-bottom: 1px solid #000; font-weight: 700; }
  .real-doc-clearance-staff { margin-top: 0.18in; width: 2.2in; text-align: left; font-size: 10px; font-weight: 700; line-height: 1.08; }
  .real-doc-clearance-staff p { margin: 0; }
  .real-doc-staff-name { text-decoration: underline; }
  .real-doc-thumbmark { margin-top: 0.13in; margin-left: 0.48in; width: 0.73in; height: 0.55in; border: 1px solid #000; }
  .real-doc-or { position: absolute; left: 1in; bottom: 0.82in; font-size: 10px; font-weight: 700; line-height: 1.18; }
  .real-doc-or p { margin: 0; }
  .real-doc-rsbsa-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 0.32in 0.6in; margin-top: 0.48in; text-align: center; font-size: 10px; line-height: 1.18; }
  .real-doc-shell[data-editable="true"] [contenteditable="true"] { border-radius: 2px; cursor: text; outline: 1px dashed transparent; outline-offset: 2px; transition: background-color 0.15s ease, outline-color 0.15s ease; }
  .real-doc-shell[data-editable="true"] [contenteditable="true"]:hover { background: rgba(37, 99, 235, 0.05); outline-color: rgba(37, 99, 235, 0.32); }
  .real-doc-shell[data-editable="true"] [contenteditable="true"]:focus { background: rgba(37, 99, 235, 0.08); outline-color: rgba(29, 78, 216, 0.72); }
  @page { size: letter; margin: 0; }
  @media print {
    html, body { margin: 0; padding: 0; background: #fff; }
    .real-doc-page { width: 8.5in; min-height: 11in; box-shadow: none; }
    .real-doc-shell [contenteditable="true"] { background: transparent; outline: none; }
  }
`;

export const getRealDocumentMarkup = ({ fields, template, editable = false }) => {
  const title = getDocumentTitle(template);
  const paragraphs = getDocumentBodyHtml(fields, template);
  const printSettings = getPrintSettings(fields);

  return `
    <style>${REAL_DOCUMENT_CSS}</style>
    <main class="real-doc-shell" ${editable ? 'data-editable="true"' : ""}>
      <article
        class="real-doc-page real-doc-${getRealDocumentTemplateKey(template)}"
        style="--doc-body-font-size: ${printSettings.bodyFontSize}px; --doc-line-height: ${printSettings.lineHeight}; --doc-paragraph-gap: ${printSettings.paragraphGap}in; --doc-padding: ${printSettings.padding};"
      >
        <header class="real-doc-header">
          <img class="real-doc-seal" src="${BARANGAY_SEAL_SRC}" alt="" />
          <div>Republic of the Philippines</div>
          <div>Province of Cotabato</div>
          <div>Municipality of Aleosan</div>
          <div>Barangay of Upper Mingading</div>
          <div class="real-doc-office">OFFICE OF THE PUNONG BARANGAY</div>
        </header>
        <h1 class="real-doc-title">${title}</h1>
        <p class="real-doc-to">TO WHOM IT MAY CONCERN:</p>
        <section class="real-doc-body" ${getEditableBodyAttributes(editable)}>${paragraphs}</section>
        ${getDocumentFooter(fields, template, editable)}
        ${getDocumentExtras(fields, template, editable)}
      </article>
    </main>
  `;
};

export const getRealDocumentPrintMarkup = ({ fields, template }) => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Document Print Preview</title>
  <style>
    html, body {
      min-height: 100%;
      background: #eef1f5 !important;
    }
    body {
      padding: 0 0 32px !important;
    }
    .print-preview-toolbar {
      position: sticky;
      top: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      padding: 12px 18px;
      border-bottom: 1px solid #d9dee7;
      background: #ffffff;
      box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
      color: #1d2129;
      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
    }
    .print-preview-toolbar strong {
      display: block;
      font-size: 14px;
    }
    .print-preview-toolbar span {
      color: #667085;
      font-size: 12px;
    }
    .print-preview-actions {
      display: flex;
      gap: 8px;
    }
    .print-preview-actions button {
      min-height: 38px;
      cursor: pointer;
      border: 1px solid #d9dee7;
      border-radius: 8px;
      background: #ffffff;
      padding: 8px 14px;
      color: #344054;
      font: 600 13px/1.2 "Segoe UI", Arial, sans-serif;
    }
    .print-preview-actions .primary {
      border-color: #00552e;
      background: #006633;
      color: #ffffff;
    }
    @media print {
      html, body {
        background: #ffffff !important;
      }
      body {
        padding: 0 !important;
      }
      .print-preview-toolbar {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-preview-toolbar">
    <div>
      <strong>Document Print Preview</strong>
      <span>Review the document, then select Print when ready.</span>
    </div>
    <div class="print-preview-actions">
      <button type="button" onclick="window.close()">Close Preview</button>
      <button type="button" class="primary" onclick="window.print()">Print Document</button>
    </div>
  </div>
  ${getRealDocumentMarkup({ fields, template })}
</body>
</html>`;
