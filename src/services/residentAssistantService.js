import { getSystemSettings } from "./adminActivityService";
import { generateText } from "./geminiService";
import { getOrganizationOfficials } from "./organizationService";

const formatDate = (value) => {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString();
};

const includesAny = (question, terms) => {
  const lower = question.toLowerCase();
  return terms.some((term) => lower.includes(term));
};

const isTagalogQuestion = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  const wordSet = new Set(words);
  const tagalogWords = new Set([
    "ano", "ba", "bakit", "ilan", "kailangan", "ko", "kuhanin", "kumuha", "mo", "po", "pwede", "pede",
    "salamat", "dito", "diyan", "dyan", "dokumento", "gusto", "tulong", "tungkol", "kailan", "kelan", "saan",
    "sino", "magkano", "magandang", "meron", "mayroon", "natin", "namin", "inyo", "niyo", "nyo", "pangalan",
    "oras", "opisina", "bukas", "sarado", "sige", "kapitan", "kagawad", "sekretarya", "sekretaryo", "tesorero",
    "anong", "paano", "paanu", "panu", "sinong", "kayo", "tayo", "kami", "ako", "ikaw", "siya", "matanda",
    "mga", "ang", "ng", "sa", "at", "na", "o", "kay", "para", "ni", "habang", "dahil", "kasi", "noong", "nung",
    "babae", "lalaki", "ilan", "ilang", "sedula", "taga", "purok", "doon", "dun", "rito", "roon", "run"
  ]);
  
  const englishWords = new Set([
    "what", "who", "where", "when", "why", "how", "is", "are", "do", "does", "can", "could", "would",
    "the", "a", "an", "of", "to", "for", "in", "on", "at", "about", "your", "my", "me", "you", "he", "she", "it",
    "hello", "hi", "thanks", "please", "document", "documents", "certificate", "clearance", "permit"
  ]);

  const tagalogScore = words.filter(w => tagalogWords.has(w)).length;
  const englishScore = words.filter(w => englishWords.has(w)).length;

  if (tagalogScore > englishScore) return true;
  if (tagalogScore > 0 && englishScore === 0) return true;
  if (wordSet.has("po") || wordSet.has("opo")) return true;
  return tagalogScore >= 1;
};

const isViolenceOrHarmMessage = (question) => {
  const normalized = normalizeText(question);
  return includesAny(normalized, [
    "patay",
    "patayin",
    "pumatay",
    "papatayin",
    "pagpatay",
    "pinatay",
    "saktan",
    "sapakin",
    "bugbugin",
    "barilin",
    "saksakin",
    "lasunin",
    "kill",
    "murder",
    "hurt",
    "harm",
  ]);
};

const isRudeOrAbusiveMessage = (question) => {
  const normalized = normalizeText(question);
  return includesAny(normalized, [
    "asshole",
    "bitch",
    "fuck",
    "gago",
    "hayop ka",
    "idiot",
    "puta",
    "putang",
    "shit",
    "stupid",
    "tanga",
    "tangina",
    "ulol",
  ]);
};

const buildSafetyAnswer = (question) => {
  const normalized = normalizeText(question);
  const useTagalog =
    isTagalogQuestion(question) ||
    includesAny(normalized, ["patay", "patayin", "pumatay", "saktan", "biro", "joke"]);

  return useTagalog
    ? "Pasensya ka na, hindi ako makakatulong sa pananakit o pagpatay ng tao kahit biro lang. Maaari kitang tulungan sa barangay documents, announcements, livelihood/jobs, o iba pang resident assistance."
    : "Sorry, I can't help with harming or killing anyone, even as a joke. I can help with barangay documents, announcements, livelihood/jobs, or other resident assistance.";
};

const buildRespectfulAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Pakiusap po, panatilihin nating magalang ang usapan. Nandito ako para tumulong sa barangay documents, announcements, livelihood/jobs, office info, profile, at iba pang resident services."
    : "Please keep our conversation respectful. I can help with barangay documents, announcements, livelihood/jobs, office info, profile, and other resident services.";

const isGratitudeMessage = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  return (
    words.length <= 6 &&
    includesAny(normalized, ["thank you", "thanks", "salamat", "ty", "tnx"])
  );
};

const buildGratitudeAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Walang anuman! Nandito ako para tumulong sa barangay documents, announcements, livelihood/jobs, at iba pang resident assistance."
    : "You're welcome! I'm here to help with barangay documents, announcements, livelihood/jobs, and other resident assistance.";

const SERVICE_TERMS = [
  "account",
  "announcement",
  "announcements",
  "anunsyo",
  "balita",
  "barangay",
  "barangay hall",
  "barangay office",
  "babae",
  "cedula",
  "certificate",
  "clearance",
  "contact barangay",
  "document",
  "dokumento",
  "fee",
  "hours",
  "office",
  "hall",
  "female",
  "job",
  "jobs",
  "lalaki",
  "livelihood",
  "male",
  "permit",
  "population",
  "processing",
  "profile",
  "program",
  "pwd",
  "pwed",
  "resident",
  "residents",
  "senior",
  "seniors",
  "senior citizen",
  "senior citizens",
  "service",
  "services",
  "request",
  "requests",
  "requirement",
  "requirements",
  "setting",
  "settings",
  "system",
  "kaagapai",
  "opisina",
  "trabaho",
  "training",
  "purok",
  "event",
  "events",
  "schedule",
  "activity",
  "activities",
  "upper mingading",
];

const PERSONAL_SERVICE_PHRASES = [
  "my address",
  "my email",
  "my name",
  "my phone",
  "my profile",
  "my request",
  "my requests",
  "my status",
  "account status",
  "pangalan ko",
  "profile ko",
  "request ko",
  "status ko",
  "tirahan ko",
];

const isServiceQuestion = (question) => {
  const normalized = normalizeText(question);
  return includesAny(normalized, SERVICE_TERMS) || includesAny(normalized, PERSONAL_SERVICE_PHRASES);
};

const isApologyMessage = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  return (
    words.length <= 8 &&
    includesAny(normalized, ["sorry", "my bad", "pasensya", "sensya", "patawad", "patawarin", "paumanhin"]) &&
    !isServiceQuestion(normalized)
  );
};

const buildApologyAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Okay lang po, walang problema. Nandito lang ako para tumulong sa barangay documents, announcements, livelihood/jobs, at iba pang resident assistance."
    : "No worries, it's okay. I'm here to help with barangay documents, announcements, livelihood/jobs, and other resident assistance.";

const isGreetingMessage = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  return (
    words.length <= 5 &&
    includesAny(normalized, [
      "hello",
      "hi",
      "hai",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
      "kumusta",
      "kamusta",
      "magandang araw",
      "magandang umaga",
      "magandang hapon",
      "magandang gabi",
      "magandang tanghali",
    ])
  );
};

const buildGreetingAnswer = (question, resident) => {
  const normalized = normalizeText(question);
  if (includesAny(normalized, ["hai", "hello"])) {
    return "Hello what I can do for you? I'm here for you to help any barangay inquiries.";
  }
  return isTagalogQuestion(question)
    ? `Magandang araw${resident?.full_name ? `, ${resident.full_name}` : ""}! Ano pong maitutulong ko tungkol sa barangay services?`
    : `Hello${resident?.full_name ? `, ${resident.full_name}` : ""}! How can I help with barangay services today?`;
};

const isFarewellMessage = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  return words.length <= 4 && includesAny(normalized, ["goodbye", "bye", "paalam", "sige", "alis na"]);
};

const buildFarewellAnswer = () => "Goodbye. See you again.";

const isAcknowledgementMessage = (question) => {
  const normalized = normalizeText(question);
  const words = normalized.split(" ").filter(Boolean);
  return words.length <= 5 && includesAny(normalized, ["ok", "okay", "sige", "ge", "noted", "gets"]);
};

const buildAcknowledgementAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Sige po. Sabihin mo lang kung kailangan mo ng tulong sa documents, announcements, livelihood/jobs, o resident services."
    : "Okay. Just tell me if you need help with documents, announcements, livelihood/jobs, or resident services.";

const ASSISTANT_META_TERMS = [
  "are you ai",
  "assistant",
  "capabilities",
  "chatbot",
  "help me",
  "how can you help",
  "kaagapai",
  "purpose",
  "role",
  "what can you do",
  "what do you know",
  "what is your job",
  "who are you",
  "ano kaya mo",
  "ano ang trabaho mo",
  "ano ka",
  "paano ka makakatulong",
  "sino ka",
];

const OUT_OF_SCOPE_TERMS = [
  "basketball",
  "celebrity",
  "coding",
  "crypto",
  "essay",
  "facebook",
  "flight",
  "game",
  "gaming",
  "google",
  "homework",
  "hotel",
  "javascript",
  "movie",
  "nba",
  "president",
  "python",
  "recipe",
  "science",
  "stock",
  "stocks",
  "tiktok",
  "travel",
  "weather",
  "youtube",
  "artista",
  "pagkain",
  "pelikula",
  "presidente",
  "laro",
];

const isAssistantMetaQuestion = (question) =>
  includesAny(normalizeText(question), ASSISTANT_META_TERMS);

const hasOutsideScopeTopic = (question, relevantKnowledge = []) => {
  if (relevantKnowledge.length > 0) return false;
  const normalized = normalizeText(question);
  return includesAny(normalized, OUT_OF_SCOPE_TERMS);
};

const buildAssistantMetaAnswer = (question) =>
  isTagalogQuestion(question)
    ? [
        "Ako ang KaagapAI resident assistant ng Barangay Upper Mingading.",
        "Sumasagot ako gamit ang data na naka-save sa system: resident statistics, document requests, document templates, announcements, livelihood/jobs, resident profile, office info, at AI Knowledge Trainer records.",
        "Kung wala sa system o hindi tungkol sa barangay services, hindi ko po iyon ma-entertain.",
      ].join("\n")
    : [
        "I am the KaagapAI resident assistant for Barangay Upper Mingading.",
        "I answer using saved system data: resident statistics, document requests, document templates, announcements, livelihood/jobs, resident profile, office info, and AI Knowledge Trainer records.",
        "If it is not in the system or not related to barangay services, I am not able to entertain it.",
      ].join("\n");

const buildGeneralFallbackAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Pasensya po, ako ang Barangay Upper Mingading resident assistant. Hindi ko po ma-entertain ang tanong na wala sa system o hindi tungkol sa barangay inquiries. Maaari kitang tulungan sa documents, announcements, livelihood/jobs, events, profile, office info, at resident services."
    : "Sorry, I am the Barangay Upper Mingading resident assistant. I am not able to entertain questions that are not in the system or not related to barangay inquiries. I can help with documents, announcements, livelihood/jobs, events, profile, office info, and resident services.";

const buildConversationalFallbackAnswer = (question) =>
  isTagalogQuestion(question)
    ? "Nandito po ako. Pwede mo akong kausapin tungkol sa barangay services, documents, announcements, livelihood/jobs, events, office info, profile, at iba pang resident concerns. Ano pong kailangan ninyo?"
    : "I'm here. You can talk to me about barangay services, documents, announcements, livelihood/jobs, events, office info, profile, and other resident concerns. What do you need help with?";

const isCedulaQuestion = (question) => {
  const normalized = normalizeText(question);
  return includesAny(normalized, ["cedula", "sedula"]);
};

const buildCedulaAnswer = (question) => {
  const isTagalog = isTagalogQuestion(question);
  const wantsPrice = includesAny(normalizeText(question), ["magkano", "how much", "price", "fee", "bayad", "cost"]);
  const wantsLocation = includesAny(normalizeText(question), ["where", "saan", "kumuha", "kuhanin", "get", "location"]);

  if (wantsPrice && !wantsLocation) {
    return isTagalog
      ? "Ang bayad sa Cedula ay depende sa iyong status: asahan ang mas mataas na rate kung ikaw ay employer, mababang rate kung estudyante, at may discount kung senior citizen. Maaari mo itong makuha sa Barangay Treasurer."
      : "The cost of a Cedula depends on your status. It is expected to be a higher rate if you are an employer, a low rate for students, and discounted for senior citizens. You can get it from the Barangay Treasurer.";
  }

  if (wantsLocation && !wantsPrice) {
    return isTagalog
      ? "Maaari kang kumuha ng Cedula sa opisina ng Barangay Treasurer."
      : "You can get a Cedula at the Barangay Treasurer's office.";
  }

  return isTagalog
    ? "Maaari kang kumuha ng Cedula sa Barangay Treasurer. Ang bayad ay depende sa iyong status: mas mataas para sa mga employer, mababa para sa mga estudyante, at may discount ang mga senior citizens."
    : "You can get a Cedula from the Barangay Treasurer. The cost depends on your status: higher for employers, lower for students, and discounted for senior citizens.";
};

const isAnniversaryQuestion = (question) => {
  const normalized = normalizeText(question);
  return includesAny(normalized, ["anniversary", "anibersaryo", "foundation", "founded", "itinatag"]);
};

const buildAnniversaryAnswer = (question) => {
  return isTagalogQuestion(question)
    ? "Ang anibersaryo ng ating barangay ay tuwing December 18."
    : "The anniversary of our barangay is on December 18.";
};

const isOfficeInfoQuestion = (question) => {
  const normalized = normalizeText(question);
  const mentionsOffice = includesAny(normalized, [
    "office",
    "barangay hall",
    "barangay office",
    "hall",
    "opisina",
  ]);
  const asksContact = includesAny(normalized, ["contact", "email", "phone", "number"]);
  const asksHours = includesAny(normalized, [
    "hour",
    "hours",
    "schedule",
    "open",
    "close",
    "closed",
    "bukas",
    "sarado",
    "oras",
  ]);

  return (
    (mentionsOffice && (asksHours || asksContact)) ||
    (normalized.includes("barangay") && (asksHours || asksContact)) ||
    normalized.includes("contact barangay")
  );
};

const buildOfficeInfoAnswer = (question) => {
  const language = isTagalogQuestion(question) ? "tagalog" : "english";
  const settings = getSystemSettings();
  const barangayName = settings.barangayName || "Barangay Upper Mingading";
  const officeHours = settings.officeHours || "Monday to Friday, 8:00 AM - 5:00 PM";
  const officeEmail = settings.officeEmail || "";
  const officePhone = settings.officePhone || "";

  const lines =
    language === "tagalog"
      ? [`Ang office hours ng ${barangayName} ay ${officeHours}.`]
      : [`${barangayName} office hours are ${officeHours}.`];

  if (officePhone) {
    lines.push(language === "tagalog" ? `Telepono: ${officePhone}` : `Phone: ${officePhone}`);
  }

  if (officeEmail) {
    lines.push(language === "tagalog" ? `Email: ${officeEmail}` : `Email: ${officeEmail}`);
  }

  return lines.join("\n");
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const KNOWLEDGE_STOP_WORDS = new Set([
  "about",
  "ang",
  "are",
  "barangay",
  "ba",
  "can",
  "details",
  "event",
  "events",
  "for",
  "give",
  "general",
  "info",
  "is",
  "kay",
  "ko",
  "latest",
  "list",
  "me",
  "message",
  "mga",
  "mo",
  "news",
  "ng",
  "please",
  "po",
  "sa",
  "show",
  "si",
  "sino",
  "tell",
  "the",
  "what",
  "when",
  "where",
  "who",
  "you",
]);

const KNOWLEDGE_INTENT_TERMS = [
  "barangay captain",
  "captain",
  "chairman",
  "chairperson",
  "councilor",
  "councilors",
  "kagawad",
  "kapitan",
  "leader",
  "leaders",
  "official",
  "officials",
  "organization",
  "organizational",
  "organizational chart",
  "punong barangay",
  "secretary",
  "sino",
  "sk chairman",
  "sk chairperson",
  "treasurer",
  "vice chairman",
  "who",
];

const KNOWLEDGE_ROLE_WORDS = new Set([
  "captain",
  "chairman",
  "chairperson",
  "councilor",
  "councilors",
  "kagawad",
  "kapitan",
  "official",
  "officials",
  "organization",
  "organizational",
  "punong",
  "secretary",
  "treasurer",
]);

const ORGANIZATION_ROLE_ALIASES = {
  captain: ["barangay captain", "captain", "punong barangay", "kapitan", "chairman", "chairperson"],
  kagawad: ["kagawad", "barangay kagawad", "councilor", "councilors", "council member", "council members", "1st kagawad", "first kagawad", "unang kagawad"],
  secretary: ["secretary", "barangay secretary"],
  treasurer: ["treasurer", "barangay treasurer"],
  skChairperson: ["sk chairperson", "sk chairman", "sangguniang kabataan chairperson"],
};

const ORGANIZATION_ROLE_LABELS = {
  captain: "Barangay Captain",
  kagawad: "Kagawad",
  secretary: "Barangay Secretary",
  treasurer: "Barangay Treasurer",
  skChairperson: "SK Chairman",
};

const ROLE_BOUNDARY_LABELS = Object.values(ORGANIZATION_ROLE_ALIASES).flat();

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getKnowledgeWords = (question) =>
  normalizeText(question)
    .split(" ")
    .filter((word) => word.length >= 3 && !KNOWLEDGE_STOP_WORDS.has(word));

const truncateForAnswer = (value, maxLength = 220) => {
  const clean = String(value || "").replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 3).trim()}...`;
};

const includesNormalizedPhrase = (normalizedText, phrase) => {
  const normalizedPhrase = normalizeText(phrase);
  if (!normalizedPhrase) return false;
  if (!normalizedPhrase.includes(" ")) {
    return normalizedText.split(" ").includes(normalizedPhrase);
  }
  return normalizedText.includes(normalizedPhrase);
};

const getRequestedKnowledgeRole = (question) => {
  const normalizedQuestion = normalizeText(question);

  return Object.entries(ORGANIZATION_ROLE_ALIASES)
    .flatMap(([role, aliases]) =>
      aliases.map((alias) => ({
        role,
        normalizedAlias: normalizeText(alias),
      }))
    )
    .filter(({ normalizedAlias }) => includesNormalizedPhrase(normalizedQuestion, normalizedAlias))
    .sort((first, second) => second.normalizedAlias.length - first.normalizedAlias.length)[0]?.role || null;
};

const hasKnowledgeIntent = (question) => {
  const normalizedQuestion = normalizeText(question);
  return (
    Boolean(getRequestedKnowledgeRole(question)) ||
    KNOWLEDGE_INTENT_TERMS.some((term) => includesNormalizedPhrase(normalizedQuestion, term))
  );
};

const scoreKnowledgeMatch = (question, item = {}) => {
  const normalizedQuestion = normalizeText(question);
  const searchable = normalizeText(
    [item.title, item.category, item.content].filter(Boolean).join(" ")
  );
  const normalizedTitle = normalizeText(item.title);
  const requestedRole = getRequestedKnowledgeRole(question);
  const words = getKnowledgeWords(question);
  let score = 0;

  if (normalizedTitle && normalizedQuestion.includes(normalizedTitle)) score += 8;
  if (normalizedTitle && normalizedTitle.includes(normalizedQuestion) && normalizedQuestion.length >= 5) score += 4;

  if (requestedRole) {
    const roleAliases = ORGANIZATION_ROLE_ALIASES[requestedRole] || [];
    const roleAppearsInKnowledge = roleAliases.some((alias) => searchable.includes(normalizeText(alias)));
    const itemLooksOrganizational = includesAny(normalizedTitle, [
      "organization",
      "organizational",
      "organizational chart",
      "official",
      "officials",
      "council",
    ]);

    if (roleAppearsInKnowledge) score += 5;
    if (itemLooksOrganizational) score += 3;
  }

  words.forEach((word) => {
    const weight = KNOWLEDGE_ROLE_WORDS.has(word) ? 3 : 1;
    if (normalizeText(item.title).includes(word)) score += 3 + weight;
    else if (normalizeText(item.category).includes(word)) score += 2 + weight;
    else if (searchable.includes(word)) score += weight;
  });

  return score;
};

const getRelevantKnowledge = (question, knowledgeItems = []) =>
  knowledgeItems
    .map((item) => ({ item, score: scoreKnowledgeMatch(question, item) }))
    .filter(({ score }) => score >= 2 || (score >= 1 && hasKnowledgeIntent(question)))
    .sort((first, second) => second.score - first.score)
    .slice(0, 5)
    .map(({ item }) => item);

const getTemplateLabel = (template) => template?.template_name || template?.document_type || "Document";

const GENERIC_DOCUMENT_WORDS = new Set([
  "barangay",
  "certificate",
  "certificates",
  "document",
  "documents",
  "form",
  "cedula",
]);

const BROAD_DOCUMENT_WORDS = new Set([
  ...GENERIC_DOCUMENT_WORDS,
  "clearance",
  "clearances",
  "permit",
  "permits",
  "request",
  "requests",
]);

const MIN_DOCUMENT_FOCUS_SCORE = 40;

const getDocumentNames = (item) => [item?.document_type, item?.template_name].filter(Boolean);

const dedupeDocumentTemplates = (templates = []) => {
  const uniqueTemplates = new Map();

  templates.forEach((template) => {
    const key = [
      normalizeText(template.document_type || template.template_name),
      normalizeText(template.requirements),
      normalizeText(template.processing_time),
      normalizeText(template.fee),
    ].join("|");

    if (!uniqueTemplates.has(key)) {
      uniqueTemplates.set(key, template);
    }
  });

  return Array.from(uniqueTemplates.values());
};

const scoreDocumentMatch = (question, item) => {
  const normalizedQuestion = normalizeText(question);
  const questionWords = new Set(normalizedQuestion.split(" ").filter(Boolean));

  return getDocumentNames(item).reduce((bestScore, name) => {
    const normalizedName = normalizeText(name);
    if (!normalizedName) return bestScore;

    const nameWords = normalizedName.split(" ").filter(Boolean);
    const distinctWords = nameWords.filter((word) => !BROAD_DOCUMENT_WORDS.has(word));
    let score = 0;

    if (normalizedQuestion.includes(normalizedName)) {
      score = Math.max(score, 100 + nameWords.length);
    }

    if (distinctWords.length > 1) {
      const distinctPhrase = distinctWords.join(" ");
      if (normalizedQuestion.includes(distinctPhrase)) {
        score = Math.max(score, 70 + distinctWords.length);
      }
    }

    const matchedDistinctWords = distinctWords.filter((word) => questionWords.has(word));
    if (matchedDistinctWords.length > 0) {
      score = Math.max(score, 40 + matchedDistinctWords.length * 5);
    }

    return Math.max(bestScore, score);
  }, 0);
};

const getBestDocumentMatches = (question, items = []) => {
  const scoredItems = items
    .map((item) => ({ item, score: scoreDocumentMatch(question, item) }))
    .filter(({ score }) => score >= MIN_DOCUMENT_FOCUS_SCORE);

  if (!scoredItems.length) {
    return { items: [], score: 0 };
  }

  const bestScore = Math.max(...scoredItems.map(({ score }) => score));
  return {
    items: scoredItems
      .filter(({ score }) => score === bestScore)
      .map(({ item }) => item),
    score: bestScore,
  };
};

const getRequestedStatuses = (question) => {
  const normalizedQuestion = normalizeText(question);
  const statuses = [];

  if (includesAny(normalizedQuestion, ["pending", "waiting"])) statuses.push("Pending");
  if (includesAny(normalizedQuestion, ["processing"])) statuses.push("Processing");
  if (includesAny(normalizedQuestion, ["approved"])) statuses.push("Approved");
  if (includesAny(normalizedQuestion, ["completed", "released", "ready", "pickup"])) {
    statuses.push("Completed", "Released");
  }
  if (includesAny(normalizedQuestion, ["rejected", "denied"])) statuses.push("Rejected");

  return statuses;
};

const findDocumentFocus = (question, documentTemplates = [], requests = []) => {
  const uniqueTemplates = dedupeDocumentTemplates(documentTemplates);
  const templateMatches = getBestDocumentMatches(question, uniqueTemplates);
  const requestMatches = getBestDocumentMatches(question, requests);
  const bestScore = Math.max(templateMatches.score, requestMatches.score);
  if (bestScore < MIN_DOCUMENT_FOCUS_SCORE) return null;

  const templates = templateMatches.score === bestScore ? templateMatches.items : [];
  const matchingRequests = requestMatches.score === bestScore ? requestMatches.items : [];
  const label =
    (templates[0] ? getTemplateLabel(templates[0]) : "") ||
    matchingRequests[0]?.document_type ||
    "Document";

  return {
    label,
    matchingRequests,
    templates,
  };
};

const stripSuggestedQuestions = (answer) =>
  String(answer || "")
    .replace(/\n*\s*Suggested next questions?:\s*[\s\S]*$/i, "")
    .trim();

const formatRequest = (request, index, language = "english") =>
  language === "tagalog"
    ? `${index + 1}. ${request.document_type} - Status: ${request.status}, Na-request noong: ${formatDate(request.created_at)}`
    : `${index + 1}. ${request.document_type} - Status: ${request.status}, Requested: ${formatDate(request.created_at)}`;

const formatTemplate = (template, index) =>
  `${index + 1}. ${template.template_name || template.document_type} - Requirements: ${template.requirements || "Not listed"}, Processing: ${template.processing_time || "Not set"}, Fee: ${template.fee || "Not set"}`;

const formatOpportunity = (post, index, language = "english") =>
  language === "tagalog"
    ? `${index + 1}. ${post.title} - ${post.category}, ${post.status}, Deadline: ${formatDate(post.deadline)}, Lugar: ${post.location || "Not set"}`
    : `${index + 1}. ${post.title} - ${post.category}, ${post.status}, Deadline: ${formatDate(post.deadline)}, Location: ${post.location || "Not set"}`;

const formatAnnouncement = (announcement, index, language = "english") =>
  language === "tagalog"
    ? `${index + 1}. ${announcement.title} - ${announcement.category}, Na-publish: ${formatDate(announcement.publish_date)}`
    : `${index + 1}. ${announcement.title} - ${announcement.category}, Published: ${formatDate(announcement.publish_date)}`;

const formatKnowledgeItem = (item, index, language = "english") => {
  const summary = item.content;
  return language === "tagalog"
    ? `${index + 1}. ${item.title} - ${truncateForAnswer(summary)}`
    : `${index + 1}. ${item.title} - ${truncateForAnswer(summary)}`;
};

const formatKnowledgeContextItem = (item, index) =>
  `Knowledge item ${index + 1}
Title: ${item.title || "Untitled"}
Category: ${item.category || "General"}
Audience: ${item.audience || "All Residents"}
Status: ${item.status || "Active"}
Content:
${item.content || "No content saved."}`;

const formatCounts = (counts = {}) =>
  Object.entries(counts)
    .filter(([, count]) => Number(count) > 0)
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([label, count]) => `${label}: ${count}`)
    .join(", ") || "None";

const isResidentStatsQuestion = (question) => {
  const normalized = normalizeText(question);
  const asksCount = includesAny(normalized, [
    "how many",
    "ilan",
    "count",
    "number of",
    "total",
    "kabuuan",
    "population",
  ]);
  const mentionsStatsTarget = includesAny(normalized, [
    "resident",
    "residents",
    "residente",
    "population",
    "senior",
    "senior citizen",
    "senior citizens",
    "pwd",
    "pwed",
    "disability",
    "disabled",
    "male",
    "female",
    "gender",
    "lalaki",
    "babae",
    "purok",
  ]);
  const mentionsSpecificStats = includesAny(normalized, [
    "population",
    "senior",
    "senior citizen",
    "senior citizens",
    "pwd",
    "pwed",
    "disability",
    "disabled",
    "male",
    "female",
    "gender",
    "lalaki",
    "babae",
    "purok",
  ]);

  return mentionsStatsTarget && (asksCount || mentionsSpecificStats);
};

const buildResidentStatsAnswer = (question, stats, language = "english") => {
  if (!stats?.loaded) {
    return language === "tagalog"
      ? "Hindi pa naka-load ang barangay resident statistics sa assistant. Paki-refresh ang dashboard at subukan ulit."
      : "Barangay resident statistics are not loaded in the assistant yet. Please refresh the dashboard and try again.";
  }

  const normalized = normalizeText(question);
  const asksTotal = includesAny(normalized, ["resident", "residents", "residente", "population", "total", "kabuuan"]);
  const asksSenior = includesAny(normalized, ["senior", "senior citizen", "senior citizens", "elderly", "matanda"]);
  const asksPwd = includesAny(normalized, ["pwd", "pwed", "disability", "disabled"]);
  const asksMale = includesAny(normalized, ["male", "lalaki"]);
  const asksFemale = includesAny(normalized, ["female", "babae"]);
  const asksGender = includesAny(normalized, ["gender", "sex", "male and female", "lalaki at babae"]);
  const asksPurok = includesAny(normalized, ["purok"]);
  const wantsFullSummary = !asksSenior && !asksPwd && !asksMale && !asksFemale && !asksGender && !asksPurok;
  const lines = [];

  if (language === "tagalog") {
    if (asksTotal || wantsFullSummary) {
      lines.push(`Kabuuang current residents: ${stats.currentResidents}`);
      lines.push(`Total resident records kasama archived: ${stats.totalRecords}`);
      lines.push(`Active: ${stats.activeResidents}, Pending: ${stats.pendingResidents}, Archived: ${stats.archivedResidents}`);
    }
    if (asksSenior || wantsFullSummary) lines.push(`Senior citizens: ${stats.seniorCitizens}`);
    if (asksPwd || wantsFullSummary) lines.push(`PWD/PWED residents: ${stats.pwdResidents}`);
    if (asksMale || asksGender || wantsFullSummary) lines.push(`Lalaki: ${stats.maleResidents}`);
    if (asksFemale || asksGender || wantsFullSummary) lines.push(`Babae: ${stats.femaleResidents}`);
    if (stats.unknownGenderResidents && (asksGender || wantsFullSummary)) {
      lines.push(`Hindi naka-set ang gender: ${stats.unknownGenderResidents}`);
    }
    if (asksPurok || wantsFullSummary) lines.push(`By purok: ${formatCounts(stats.purokCounts)}`);
  } else {
    if (asksTotal || wantsFullSummary) {
      lines.push(`Total current residents: ${stats.currentResidents}`);
      lines.push(`Total resident records including archived: ${stats.totalRecords}`);
      lines.push(`Active: ${stats.activeResidents}, Pending: ${stats.pendingResidents}, Archived: ${stats.archivedResidents}`);
    }
    if (asksSenior || wantsFullSummary) lines.push(`Senior citizens: ${stats.seniorCitizens}`);
    if (asksPwd || wantsFullSummary) lines.push(`PWD/PWED residents: ${stats.pwdResidents}`);
    if (asksMale || asksGender || wantsFullSummary) lines.push(`Male residents: ${stats.maleResidents}`);
    if (asksFemale || asksGender || wantsFullSummary) lines.push(`Female residents: ${stats.femaleResidents}`);
    if (stats.unknownGenderResidents && (asksGender || wantsFullSummary)) {
      lines.push(`Gender not set: ${stats.unknownGenderResidents}`);
    }
    if (asksPurok || wantsFullSummary) lines.push(`By purok: ${formatCounts(stats.purokCounts)}`);
  }

  lines.unshift(
    language === "tagalog"
      ? "Base sa kasalukuyang barangay records, ito ang resident summary na naka-load sa dashboard."
      : "Based on the current barangay records loaded in the dashboard, here is the resident summary."
  );

  return lines.join("\n\n");
};

const isDocumentHowToQuestion = (question) =>
  includesAny(question, [
    "how",
    "apply",
    "get",
    "request",
    "paano",
    "paanu",
    "panu",
    "kuhanin",
    "kumuha",
    "kuha",
    "mag request",
    "magrequest",
    "magrerequest",
  ]);

const isDocumentStatusQuestion = (question) =>
  includesAny(question, [
    "status",
    "track",
    "pending",
    "processing",
    "approved",
    "completed",
    "released",
    "rejected",
    "ready",
    "pickup",
    "nasaan",
    "saan na",
  ]);

const isDocumentRequestCountQuestion = (question) => {
  const normalized = normalizeText(question);

  return (
    isCountQuestion(normalized) &&
    includesAny(normalized, [
      "document request",
      "document requests",
      "request",
      "requests",
      "requested",
      "my document",
      "my documents",
      "aking dokumento",
      "dokumento ko",
    ])
  );
};

const isDocumentDetailQuestion = (question) =>
  includesAny(question, [
    "requirements",
    "requirement",
    "fee",
    "fees",
    "processing",
    "kailangan",
    "magkano",
    "bayad",
    "singil",
    "requirements",
  ]);

const buildGenericDocumentHowToAnswer = (templates, language = "english") => {
  const lines =
    language === "tagalog"
      ? [
          "Para kumuha o mag-request ng barangay certificate:",
          "1. Buksan ang Document Requests sa resident dashboard.",
          "2. Piliin ang certificate/document type na kailangan mo.",
          "3. Ihanda ang requirements na nakalista sa napiling document.",
          "4. I-click ang Request. Magsisimula ang request bilang Pending at ia-update ng barangay staff ang status.",
          "",
          "Tandaan: Kailangan mong magpakita ng valid I.D. at Cedula bago makuha ang dokumento. Ang bawat certificate ay nagkakahalaga ng 50 pesos.",
          "",
          "Available certificates/documents:",
        ]
      : [
          "To request a barangay certificate:",
          "1. Open Document Requests in your resident dashboard.",
          "2. Choose the certificate/document type you need.",
          "3. Prepare the requirements listed for that document.",
          "4. Click Request. Your request starts as Pending and barangay staff will update the status.",
          "",
          "Note: You will need to present a valid I.D. and Cedula before claiming any documents. Certificates cost 50 pesos per document.",
          "",
          "Available certificates/documents:",
        ];

  lines.push(
    templates.slice(0, 6).map(formatTemplate).join("\n") ||
      (language === "tagalog"
        ? "Wala pang available document templates."
        : "No document templates are available yet.")
  );

  return lines.join("\n");
};

const extractGeminiText = (result) => {
  if (!result) return "";
  if (typeof result.text === "string") return result.text.trim();

  const parts = result.candidates?.[0]?.content?.parts || [];
  return parts
    .map((part) => part.text)
    .filter(Boolean)
    .join("\n")
    .trim();
};

const normalizeExtractedPerson = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/^(and|at)\s+/i, "")
    .replace(/^[\s:;,.()-]+|[\s:;,.()-]+$/g, "")
    .trim();

const splitRolePeople = (value) => {
  const clean = normalizeExtractedPerson(value);
  if (!clean) return [];

  if (/\d+\s*[).]/.test(clean)) {
    return clean
      .split(/\s*\d+\s*[).]\s*/)
      .map(normalizeExtractedPerson)
      .filter(Boolean);
  }

  return clean
    .split(/\s*(?:,|;|\band\b|\bat\b)\s*/i)
    .map(normalizeExtractedPerson)
    .filter(Boolean);
};

const extractRolePeopleFromKnowledge = (role, knowledgeItems = []) => {
  const aliases = ORGANIZATION_ROLE_ALIASES[role] || [];
  if (!aliases.length) return [];

  const labelPattern = aliases.map(escapeRegExp).join("|");
  const boundaryPattern = ROLE_BOUNDARY_LABELS.map(escapeRegExp).join("|");
  const rolePattern = new RegExp(
    `(?:${labelPattern})\\s*[:\\-]\\s*([\\s\\S]*?)(?=(?:\\s|\\n)+(?:${boundaryPattern})\\s*[:\\-]|$)`,
    "i"
  );

  for (const item of knowledgeItems) {
    const sourceText = [item.title, item.content].filter(Boolean).join("\n");
    const match = sourceText.match(rolePattern);
    if (match?.[1]) {
      return splitRolePeople(match[1]);
    }
  }

  return [];
};

const getRequestedOfficialIndex = (question) => {
  const normalized = normalizeText(question);
  if (includesAny(normalized, ["1st", "first", "unang", "una"])) return 0;
  if (includesAny(normalized, ["2nd", "second", "ikalawa", "pangalawa"])) return 1;
  if (includesAny(normalized, ["3rd", "third", "ikatlo", "pangatlo"])) return 2;
  if (includesAny(normalized, ["4th", "fourth", "ikaapat", "pang apat", "pangapat"])) return 3;
  if (includesAny(normalized, ["5th", "fifth", "ikalima", "pang lima", "panglima"])) return 4;
  if (includesAny(normalized, ["6th", "sixth", "ikaanim", "pang anim", "panganim"])) return 5;
  if (includesAny(normalized, ["7th", "seventh", "ikapito", "pang pito", "pangpito"])) return 6;
  return null;
};

const isCountQuestion = (question) =>
  includesAny(normalizeText(question), ["how many", "ilan", "count", "number of", "total"]);

const formatPeopleList = (people) =>
  people.map((person, index) => `${index + 1}. ${person}`).join("\n");

const formatOrdinal = (index) => {
  const value = index + 1;
  if (value === 1) return "1st";
  if (value === 2) return "2nd";
  if (value === 3) return "3rd";
  return `${value}th`;
};

const getOfficialRole = (official = {}) => {
  const level = normalizeText(official.level);
  const position = normalizeText(official.position);
  const id = normalizeText(official.id);

  if (level === "captain" || includesAny(position, ["punong barangay", "captain", "kapitan"])) return "captain";
  if (level === "sk" || includesAny(`${position} ${id}`, ["sk chairman", "sk chairperson", "sangguniang kabataan"])) return "skChairperson";
  if (level === "kagawad" || includesAny(position, ["kagawad", "councilor"])) return "kagawad";
  if (includesAny(`${position} ${id}`, ["secretary"])) return "secretary";
  if (includesAny(`${position} ${id}`, ["treasurer"])) return "treasurer";

  return level || "official";
};

const getActiveOrganizationOfficials = (officials = []) =>
  (Array.isArray(officials) ? officials : [])
    .filter((official) => official?.name)
    .filter((official) => {
      const status = normalizeText(official.status || "active");
      return !["inactive", "archived", "former official"].includes(status);
    });

const getOrganizationOfficialsForRole = (officials, role) =>
  getActiveOrganizationOfficials(officials).filter((official) => getOfficialRole(official) === role);

const formatOfficialName = (official) =>
  [official?.name, official?.position].filter(Boolean).join(" - ");

const formatOfficialSummaryLine = (official) => {
  const summary = formatOfficialName(official);
  const details = [official?.committee, official?.focusArea].filter(Boolean).join(", ");
  return details ? `${summary}. ${details}.` : summary;
};

const formatOfficialDetail = (official, language = "english") => {
  const lines = [
    `${language === "tagalog" ? "Pangalan" : "Name"}: ${official.name}`,
    `${language === "tagalog" ? "Posisyon" : "Position"}: ${official.position || "Not set"}`,
  ];

  if (official.committee) lines.push(`Committee: ${official.committee}`);
  if (official.focusArea) lines.push(`${language === "tagalog" ? "Focus" : "Focus area"}: ${official.focusArea}`);
  if (official.background) lines.push(`Background: ${official.background}`);
  if (official.contact) lines.push(`Contact: ${official.contact}`);
  if (official.email) lines.push(`Email: ${official.email}`);

  return lines.join("\n");
};

const formatOrganizationContext = (officials = []) =>
  getActiveOrganizationOfficials(officials)
    .map((official) => `${official.name} (${official.position || ORGANIZATION_ROLE_LABELS[getOfficialRole(official)] || "Official"})`)
    .join("; ");

const hasOrganizationChartIntent = (question) => {
  const normalized = normalizeText(question);

  return (
    Boolean(getRequestedKnowledgeRole(question)) ||
    includesAny(normalized, [
      "barangay council",
      "council member",
      "council members",
      "leader",
      "leaders",
      "official",
      "officials",
      "organization",
      "organizational",
      "organizational chart",
    ])
  );
};

const buildOrganizationAnswer = (question, officials = [], language = "english") => {
  if (!hasOrganizationChartIntent(question)) return "";

  const activeOfficials = getActiveOrganizationOfficials(officials);
  if (!activeOfficials.length) return "";

  const normalized = normalizeText(question);
  const role = getRequestedKnowledgeRole(question);
  const wantsCount = isCountQuestion(question);
  const requestedIndex = getRequestedOfficialIndex(question);
  const wantsDetails = includesAny(normalized, [
    "background",
    "bio",
    "committee",
    "contact",
    "details",
    "email",
    "focus",
    "image",
    "info",
    "information",
    "phone",
    "photo",
    "picture",
    "profile",
  ]);

  if (role) {
    const matchingOfficials = getOrganizationOfficialsForRole(activeOfficials, role);
    if (!matchingOfficials.length) return "";

    const label = ORGANIZATION_ROLE_LABELS[role] || "Barangay official";
    const selectedOfficial =
      requestedIndex !== null ? matchingOfficials[requestedIndex] : matchingOfficials[0];

    if (requestedIndex !== null) {
      if (!selectedOfficial) {
        return language === "tagalog"
          ? `Walang ${formatOrdinal(requestedIndex)} ${label} na naka-save para sa Barangay Upper Mingading.`
          : `There is no saved ${formatOrdinal(requestedIndex)} ${label} for Barangay Upper Mingading.`;
      }

      return wantsDetails
        ? formatOfficialDetail(selectedOfficial, language)
        : language === "tagalog"
          ? `Ang ${formatOrdinal(requestedIndex)} ${label} ng Barangay Upper Mingading ay ${selectedOfficial.name}.`
          : `The ${formatOrdinal(requestedIndex)} ${label} of Barangay Upper Mingading is ${selectedOfficial.name}.`;
    }

    if (wantsCount) {
      return language === "tagalog"
        ? `May ${matchingOfficials.length} ${label} na naka-save para sa Barangay Upper Mingading:\n${matchingOfficials.map(formatOfficialSummaryLine).join("\n")}`
        : `There ${matchingOfficials.length === 1 ? "is" : "are"} ${matchingOfficials.length} Barangay Upper Mingading ${label}${matchingOfficials.length === 1 ? "" : "s"}:\n${matchingOfficials.map(formatOfficialSummaryLine).join("\n")}`;
    }

    if (matchingOfficials.length === 1) {
      return wantsDetails
        ? formatOfficialDetail(matchingOfficials[0], language)
        : language === "tagalog"
          ? `Ang ${label} ng Barangay Upper Mingading ay ${matchingOfficials[0].name}.`
          : `The ${label} of Barangay Upper Mingading is ${matchingOfficials[0].name}.`;
    }

    return language === "tagalog"
      ? `Ang mga ${label} ng Barangay Upper Mingading ay:\n${matchingOfficials.map(formatOfficialSummaryLine).join("\n")}`
      : `The Barangay Upper Mingading ${label} members are:\n${matchingOfficials.map(formatOfficialSummaryLine).join("\n")}`;
  }

  if (wantsCount) {
    return language === "tagalog"
      ? `May ${activeOfficials.length} active official profile(s) para sa Barangay Upper Mingading.`
      : `There are ${activeOfficials.length} active Barangay Upper Mingading official profile(s).`;
  }

  const captain = activeOfficials.find((official) => getOfficialRole(official) === "captain");
  const secretary = activeOfficials.find((official) => getOfficialRole(official) === "secretary");
  const treasurer = activeOfficials.find((official) => getOfficialRole(official) === "treasurer");
  const skChairperson = activeOfficials.find((official) => getOfficialRole(official) === "skChairperson");
  const kagawads = getOrganizationOfficialsForRole(activeOfficials, "kagawad");
  const lines = [
    language === "tagalog"
      ? "Batay sa editable official roster ng Barangay Upper Mingading, ito ang kasalukuyang barangay officials:"
      : "Based on the admin editable Barangay Upper Mingading official roster, these are the current barangay officials:",
  ];

  if (captain) lines.push(`Captain: ${formatOfficialName(captain)}`);
  if (secretary) lines.push(`Secretary: ${formatOfficialName(secretary)}`);
  if (treasurer) lines.push(`Treasurer: ${formatOfficialName(treasurer)}`);
  if (skChairperson) lines.push(`SK Chairman: ${formatOfficialName(skChairperson)}`);
  if (kagawads.length) lines.push(`Kagawad: ${kagawads.map((official) => official.name).join(", ")}`);

  return lines.join("\n\n");
};

const buildRoleKnowledgeAnswer = (question, relevantKnowledge, language) => {
  const role = getRequestedKnowledgeRole(question);
  if (!role) return "";

  const people = extractRolePeopleFromKnowledge(role, relevantKnowledge);
  if (!people.length) return "";

  const label = ORGANIZATION_ROLE_LABELS[role] || "Barangay official";
  const wantsCount = isCountQuestion(question);
  const requestedIndex = getRequestedOfficialIndex(question);

  if (requestedIndex !== null && people[requestedIndex]) {
    const ordinal = formatOrdinal(requestedIndex);
    return language === "tagalog"
      ? `Ang ${ordinal} ${label} na naka-save ay ${people[requestedIndex]}.`
      : `The saved ${ordinal} ${label} is ${people[requestedIndex]}.`;
  }

  if (wantsCount) {
    return language === "tagalog"
      ? `May ${people.length} ${label} na naka-save sa barangay knowledge:\n${formatPeopleList(people)}`
      : `There ${people.length === 1 ? "is" : "are"} ${people.length} ${label}${people.length === 1 ? "" : "s"} saved in barangay knowledge:\n${formatPeopleList(people)}`;
  }

  if (people.length === 1) {
    return language === "tagalog"
      ? `Ang ${label} ay ${people[0]}.`
      : `The ${label} is ${people[0]}.`;
  }

  return language === "tagalog"
    ? `Ang mga ${label} na naka-save ay:\n${formatPeopleList(people)}`
    : `The saved ${label} members are:\n${formatPeopleList(people)}`;
};

const buildKnowledgeSummaryAnswer = (relevantKnowledge, language) => {
  const lines = [
    language === "tagalog"
      ? "Batay sa saved barangay knowledge:"
      : "Based on the saved barangay knowledge:",
    relevantKnowledge.map((item, index) => formatKnowledgeItem(item, index, language)).join("\n"),
  ];

  return stripSuggestedQuestions(lines.join("\n"));
};

const buildMissingKnowledgeAnswer = (question, language) => {
  const role = getRequestedKnowledgeRole(question);
  const label = role ? ORGANIZATION_ROLE_LABELS[role] || "official" : "barangay information";

  return language === "tagalog"
    ? `Wala pa pong naka-save na sagot para sa ${label} sa AI Knowledge Trainer. I-save muna ito sa admin AI Knowledge para masagot ko nang eksakto.`
    : `There is no saved answer for ${label} in the AI Knowledge Trainer yet. Save it first in admin AI Knowledge so I can answer it exactly.`;
};

const answerFromKnowledge = async (question, relevantKnowledge, context, language) => {
  const roleAnswer = buildRoleKnowledgeAnswer(question, relevantKnowledge, language);
  if (roleAnswer) return roleAnswer;

  const fallback = buildKnowledgeSummaryAnswer(relevantKnowledge, language);

  try {
    const prompt = `Saved system knowledge:
${relevantKnowledge.map(formatKnowledgeContextItem).join("\n\n")}

Resident dashboard context:
- Resident name: ${context?.resident?.full_name || "Resident"}
- Current residents: ${context?.residentStats?.currentResidents ?? "Not loaded"}
- Senior citizens: ${context?.residentStats?.seniorCitizens ?? "Not loaded"}
- PWD/PWED residents: ${context?.residentStats?.pwdResidents ?? "Not loaded"}
- Male residents: ${context?.residentStats?.maleResidents ?? "Not loaded"}
- Female residents: ${context?.residentStats?.femaleResidents ?? "Not loaded"}
- Document requests: ${context?.requests?.length || 0}
- Published announcements: ${context?.announcements?.length || 0}
- Open livelihood/jobs: ${context?.opportunities?.length || 0}
- Available document types: ${context?.documentTemplates?.length || 0}
- Organizational chart officials: ${formatOrganizationContext(context?.organizationOfficials) || "Not loaded"}

Resident question:
${question}

Answer directly from the saved knowledge:`;

    const result = await generateText(prompt, {
      systemInstruction:
        "You are KaagapAI, a resident assistant for Barangay Upper Mingading. Use only the saved system knowledge and dashboard context provided. Extract the specific fact being asked, even if the saved knowledge is a long note. Do not invent names, dates, roles, counts, or policies. If the answer is not present in the saved data, say it is not saved in the system yet. Match the resident's Tagalog, English, or Taglish style. Keep the answer short and do not include suggested questions.",
      temperature: 0.1,
      maxOutputTokens: 360,
    });

    return stripSuggestedQuestions(extractGeminiText(result) || fallback);
  } catch (error) {
    console.warn("AI knowledge answer unavailable, using local knowledge summary:", error.message);
    return fallback;
  }
};

async function buildLocalAnswer(question, context = {}) {
  const {
    announcements = [],
    documentTemplates = [],
    knowledgeItems = [],
    opportunities = [],
    organizationOfficials = getOrganizationOfficials(),
    requests = [],
    resident,
    residentStats,
  } = context;
  const language = isTagalogQuestion(question) ? "tagalog" : "english";
  const documentFocus = findDocumentFocus(question, documentTemplates, requests);
  const relevantKnowledge = getRelevantKnowledge(question, knowledgeItems);
  const organizationAnswer = buildOrganizationAnswer(question, organizationOfficials, language);
  const wantsResidentStats = isResidentStatsQuestion(question);
  const wantsDocuments = Boolean(documentFocus) || includesAny(question, [
    "document",
    "dokumento",
    "clearance",
    "cedula",
    "certificate",
    "permit",
    "request",
    "status",
    "requirements",
    "requirement",
    "fee",
    "processing",
    "kuhanin",
    "kumuha",
    "paano",
  ]);
  const wantsLivelihood = includesAny(question, ["job", "jobs", "livelihood", "training", "program", "opportunity", "trabaho"]);
  const wantsAnnouncements = includesAny(question, ["announcement", "announcements", "news", "update", "event", "events", "activity", "anunsyo", "balita"]);
  const wantsProfile = includesAny(question, ["profile", "address", "purok", "name", "account", "email", "pangalan", "tirahan"]);
  const wantsOfficeInfo = isOfficeInfoQuestion(question);
  const wantsCedula = isCedulaQuestion(question);
  const wantsAnniversary = isAnniversaryQuestion(question);
  const wantsKnowledge = hasKnowledgeIntent(question);
  const requestedStatuses = getRequestedStatuses(question);

  const lines = [];

  if (wantsCedula) {
    return buildCedulaAnswer(question);
  } else if (wantsAnniversary) {
    return buildAnniversaryAnswer(question);
  } else if (wantsOfficeInfo) {
    return buildOfficeInfoAnswer(question);
  } else if (wantsResidentStats) {
    return buildResidentStatsAnswer(question, residentStats, language);
  } else if (organizationAnswer) {
    return organizationAnswer;
  } else if (relevantKnowledge.length > 0 && !wantsDocuments) {
    return answerFromKnowledge(question, relevantKnowledge, context, language);
  } else if (wantsDocuments) {
    const uniqueTemplates = dedupeDocumentTemplates(documentTemplates);
    const filteredRequests = documentFocus ? documentFocus.matchingRequests : requests;
    const statusFilteredRequests = requestedStatuses.length
      ? filteredRequests.filter((request) => requestedStatuses.includes(request.status))
      : filteredRequests;
    const filteredTemplates = documentFocus ? documentFocus.templates : uniqueTemplates;
    const wantsCount = isDocumentRequestCountQuestion(question);
    const wantsStatus = requestedStatuses.length > 0 || isDocumentStatusQuestion(question) || wantsCount;
    const wantsHowTo = isDocumentHowToQuestion(question) && !wantsStatus;
    const wantsDetails = isDocumentDetailQuestion(question);

    if (documentFocus) {
      if (wantsStatus && !wantsDetails) {
        lines.push(
          requestedStatuses.length
            ? language === "tagalog"
              ? `Mayroon kang ${statusFilteredRequests.length} ${requestedStatuses.join("/")} ${documentFocus.label} request(s).`
              : `You have ${statusFilteredRequests.length} ${requestedStatuses.join("/")} ${documentFocus.label} request(s).`
            : language === "tagalog"
              ? `Mayroon kang ${statusFilteredRequests.length} ${documentFocus.label} request(s).`
              : `You have ${statusFilteredRequests.length} ${documentFocus.label} request(s).`
        );
        lines.push(
          statusFilteredRequests.slice(0, 6).map((request, index) => formatRequest(request, index, language)).join("\n") ||
            (language === "tagalog"
              ? `Wala ka pang ${documentFocus.label} request${requestedStatuses.length ? ` na may ${requestedStatuses.join("/")} status` : ""}.`
              : `You have no ${documentFocus.label} request${requestedStatuses.length ? ` with ${requestedStatuses.join("/")} status` : ""} yet.`)
        );
      } else if (wantsHowTo || wantsDetails) {
        if (language === "tagalog") {
          lines.push(`Para mag-request ng ${documentFocus.label}:`);
          lines.push(`1. Buksan ang Document Requests sa resident dashboard.`);
          lines.push(`2. Piliin ang ${documentFocus.label} sa Document type.`);
          lines.push(`3. I-click ang Request. Magsisimula ang request bilang Pending.`);
        } else {
          lines.push(`To request ${documentFocus.label}:`);
          lines.push(`1. Open Document Requests in your resident dashboard.`);
          lines.push(`2. Select ${documentFocus.label} from Document type.`);
          lines.push(`3. Click Request. Your request will start as Pending.`);
        }
      } else {
        lines.push(
          language === "tagalog"
            ? `Impormasyon para sa ${documentFocus.label}:`
            : `${documentFocus.label} information:`
        );
      }

      if (!(wantsStatus && !wantsDetails)) {
        lines.push("");
        lines.push(language === "tagalog" ? "Requirements at fees:" : "Requirements and fees:");
        lines.push(
          filteredTemplates.slice(0, 3).map(formatTemplate).join("\n") ||
            (language === "tagalog"
              ? `Wala pang template details para sa ${documentFocus.label}.`
              : `No ${documentFocus.label} template details are available yet.`)
        );
        lines.push("");
        lines.push(
          requestedStatuses.length
            ? language === "tagalog"
              ? `Iyong ${requestedStatuses.join("/")} ${documentFocus.label} request(s):`
              : `Your ${requestedStatuses.join("/")} ${documentFocus.label} request(s):`
            : language === "tagalog"
              ? `Status ng iyong ${documentFocus.label} request:`
              : `Your ${documentFocus.label} request status:`
        );
        lines.push(
          statusFilteredRequests.slice(0, 4).map((request, index) => formatRequest(request, index, language)).join("\n") ||
            (language === "tagalog"
              ? `Wala ka pang ${documentFocus.label} request${requestedStatuses.length ? ` na may ${requestedStatuses.join("/")} status` : ""}.`
              : `You have no ${documentFocus.label} request${requestedStatuses.length ? ` with ${requestedStatuses.join("/")} status` : ""} yet.`)
        );
      }
    } else {
      if (wantsStatus) {
        lines.push(
          requestedStatuses.length
            ? language === "tagalog"
              ? `Mayroon kang ${statusFilteredRequests.length} ${requestedStatuses.join("/")} document request(s).`
              : `You have ${statusFilteredRequests.length} ${requestedStatuses.join("/")} document request(s).`
            : language === "tagalog"
              ? `Mayroon kang ${requests.length} document request(s).`
              : `You have ${requests.length} document request(s).`
        );
        lines.push(
          statusFilteredRequests.slice(0, 6).map((request, index) => formatRequest(request, index, language)).join("\n") ||
            (language === "tagalog"
              ? "Wala ka pang tugmang document request."
              : "You have no matching document requests yet.")
        );
        lines.push("");
      } else if (wantsHowTo) {
        return stripSuggestedQuestions(buildGenericDocumentHowToAnswer(uniqueTemplates, language));
      }

      if (!wantsStatus) {
        lines.push(language === "tagalog" ? "Available document types:" : "Available document types:");
        lines.push(
          uniqueTemplates.slice(0, 6).map(formatTemplate).join("\n") ||
            (language === "tagalog"
              ? "Wala pang available document templates."
              : "No document templates are available yet.")
        );
      }
    }
  } else if (wantsLivelihood) {
    lines.push(
      language === "tagalog"
        ? `May ${opportunities.length} open livelihood/job opportunity record(s).`
        : `There are ${opportunities.length} open livelihood/job opportunity record(s).`
    );
    lines.push(
      opportunities.slice(0, 8).map((post, index) => formatOpportunity(post, index, language)).join("\n") ||
        (language === "tagalog"
          ? "Walang open livelihood o job opportunities ngayon."
          : "No open livelihood or job opportunities are posted right now.")
    );
  } else if (wantsAnnouncements) {
    lines.push(
      language === "tagalog"
        ? `May ${announcements.length} published announcement(s).`
        : `There are ${announcements.length} published announcement(s).`
    );
    lines.push(
      announcements.slice(0, 8).map((announcement, index) => formatAnnouncement(announcement, index, language)).join("\n") ||
        (language === "tagalog"
          ? "Walang published announcements ngayon."
          : "No published announcements right now.")
    );
  } else if (wantsProfile) {
    lines.push(
      language === "tagalog"
        ? `Profile summary para kay ${resident?.full_name || "Resident"}:`
        : `Profile summary for ${resident?.full_name || "Resident"}:`
    );
    lines.push(`Purok: ${resident?.purok || "Not set"}`);
    lines.push(`Username: ${resident?.username || resident?.portal_username || "Not set"}`);
    lines.push(`${language === "tagalog" ? "Address" : "Address"}: ${resident?.address || "Not set"}`);
    lines.push(`Status: ${resident?.status || "Not set"}`);
  } else if (wantsKnowledge) {
    return buildMissingKnowledgeAnswer(question, language);
  } else {
    lines.push(
      language === "tagalog"
        ? `Hello ${resident?.full_name || "Resident"}, ito ang current dashboard summary mo:`
        : `Hello ${resident?.full_name || "Resident"}, here is your current dashboard summary:`
    );
    lines.push(`Document requests: ${requests.length}`);
    lines.push(`${language === "tagalog" ? "Published announcements" : "Published announcements"}: ${announcements.length}`);
    lines.push(`Open livelihood/jobs: ${opportunities.length}`);
    lines.push(`Available document types: ${documentTemplates.length}`);
    lines.push(`AI knowledge items: ${knowledgeItems.length}`);
  }

  return stripSuggestedQuestions(lines.join("\n"));
}

export async function askResidentAssistant(question, context) {
  const trimmedQuestion = question.trim();
  if (!trimmedQuestion) return "";

  if (isViolenceOrHarmMessage(trimmedQuestion)) {
    return buildSafetyAnswer(trimmedQuestion);
  }

  if (isRudeOrAbusiveMessage(trimmedQuestion)) {
    return buildRespectfulAnswer(trimmedQuestion);
  }

  if (isGratitudeMessage(trimmedQuestion)) {
    return buildGratitudeAnswer(trimmedQuestion);
  }

  if (isApologyMessage(trimmedQuestion)) {
    return buildApologyAnswer(trimmedQuestion);
  }

  if (isGreetingMessage(trimmedQuestion)) {
    return buildGreetingAnswer(trimmedQuestion, context?.resident);
  }

  if (isFarewellMessage(trimmedQuestion)) {
    return buildFarewellAnswer();
  }

  if (isAcknowledgementMessage(trimmedQuestion)) {
    return buildAcknowledgementAnswer(trimmedQuestion);
  }

  if (isAssistantMetaQuestion(trimmedQuestion)) {
    return buildAssistantMetaAnswer(trimmedQuestion);
  }

  return queryGeminiWithRichContext(trimmedQuestion, context);
}

async function queryGeminiWithRichContext(question, context = {}) {
  try {
    const {
      announcements = [],
      documentTemplates = [],
      knowledgeItems = [],
      opportunities = [],
      organizationOfficials = [],
      requests = [],
      resident,
      residentStats,
    } = context;

    // Formatting statistics
    const statsStr = residentStats?.loaded
      ? `Total Residents: ${residentStats.currentResidents}
Seniors: ${residentStats.seniorCitizens}
PWDs: ${residentStats.pwdResidents}
Male: ${residentStats.maleResidents}
Female: ${residentStats.femaleResidents}
By Purok: ${formatCounts(residentStats.purokCounts)}`
      : "Not Loaded";

    // Formatting officials
    const activeOfficials = getActiveOrganizationOfficials(organizationOfficials);
    const officialsStr = activeOfficials
      .map(o => `- Name: ${o.name}, Position: ${o.position}, Committee: ${o.committee || 'None'}`)
      .join("\n") || "No officials loaded.";

    // Formatting templates
    const templatesStr = dedupeDocumentTemplates(documentTemplates)
      .map(t => `- Document: ${t.template_name || t.document_type}, Requirements: ${t.requirements || 'Valid ID'}, Processing Time: ${t.processing_time || '1 day'}, Fee: 50 pesos (Note: All document requests require a valid ID and Cedula before claiming. Cedula is acquired from the Treasurer.)`)
      .join("\n") || "No templates loaded.";

    // Formatting resident requests
    const requestsStr = requests
      .map((r, i) => `- ${r.document_type} (Status: ${r.status}, Requested: ${formatDate(r.created_at)})`)
      .join("\n") || "No requests submitted yet.";

    // Formatting custom knowledge
    const knowledgeStr = knowledgeItems
      .map((k, i) => `- Title: ${k.title}\n  Content: ${k.content}`)
      .join("\n\n") || "No custom knowledge items.";

    // Settings (Office hours, email, phone)
    const settings = getSystemSettings();
    const officeHours = settings.officeHours || "Monday to Friday, 8:00 AM - 5:00 PM";
    const contactEmail = settings.officeEmail || "not set";
    const contactPhone = settings.officePhone || "not set";

    const prompt = `System Settings:
- Barangay Name: Barangay Upper Mingading
- Barangay Anniversary: December 18
- Office Hours: ${officeHours}
- Contact Email: ${contactEmail}
- Contact Phone: ${contactPhone}

Current Resident Profile:
- Name: ${resident?.full_name || "Resident"}
- Purok: ${resident?.purok || "Not set"}
- Address: ${resident?.address || "Not set"}
- Status: ${resident?.status || "Not set"}

Barangay Statistics:
${statsStr}

Barangay Officials:
${officialsStr}

Available Document Templates:
${templatesStr}

Resident's Document Requests:
${requestsStr}

Barangay Announcements:
${announcements.slice(0, 5).map((a, i) => `- Title: ${a.title}\n  Body: ${a.body}\n  Category: ${a.category}`).join("\n\n")}

Livelihoods and Jobs Opportunities:
${opportunities.slice(0, 5).map((o, i) => `- Title: ${o.title}\n  Details: ${o.description}\n  Deadline: ${formatDate(o.deadline)}`).join("\n\n")}

AI Trained Custom Knowledge Records:
${knowledgeStr}

Resident's Question:
${question}

Instructions:
1. You are KaagapAI, the pro AI Chatbot Assistant for the residents of Barangay Upper Mingading.
2. Answer the resident's question using ONLY the provided context. Be professional, direct, normal, and highly specific. Do not answer generally.
3. If they ask about document requests, remind them: "You will need to present a valid ID and Cedula before claiming any documents." All certificates/documents cost 50 pesos.
4. If they ask about Cedula: It is obtained from the Barangay Treasurer. The fee depends on their status (high rate for employers, low rate for students, and discounted for senior citizens).
5. If they ask about Barangay Anniversary, it is December 18.
6. Language Matching: Answer in the same language as the question. If they ask in English, answer in English. If in Tagalog, answer in Tagalog. If in Taglish, answer in Taglish.
7. If you cannot find the answer in the provided context, state politely that the information is not currently saved in the system, but do not hallucinate details.
8. Keep your response concise, specific, and directly helpful. Do not include signature blocks, greetings/farewells, or suggested next questions. Just answer their query.`;

    const result = await generateText(prompt, {
      systemInstruction: "You are KaagapAI Concierge. Speak directly, match the resident's language (Tagalog/English/Taglish), and only use the provided context to answer questions.",
      temperature: 0.2,
      maxOutputTokens: 500,
    });

    const ans = extractGeminiText(result);
    if (ans) return ans;
    
    // fallback if response is empty
    return buildLocalAnswer(question, context);
  } catch (error) {
    console.error("Gemini AI query failed, falling back to local heuristic mapping:", error);
    return buildLocalAnswer(question, context);
  }
}
