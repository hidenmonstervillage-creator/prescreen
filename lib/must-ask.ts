// The must-ask table: facts a patient always knows about themselves. generateForTrial applies it in
// code after the criteria split and before the questions call, so a criterion such as "aged 18 or
// over" is always asked, also when the split marked it as not patient-answerable. The model still
// writes the questions for every other askable criterion.
//
// Each entry names what it asks, at least two registry phrasings it must recognise (checked by
// tests/must-ask.test.ts), the patterns that recognise them, and a builder that turns one criterion
// into one plain question (yes, no, not sure, or a number) with that criterion's rule. The rule is
// conservative: an answer confirms or denies the criterion only when the question covers everything
// the criterion says in that direction; any other answer settles nothing and maps to not found.
import { wordingProblems } from "./wording";
import { normalizeWs } from "./text";
import type { Criterion, NumberRange, Question, QuestionRule, Section } from "./types";

export type MustAskKind =
  | "age"
  | "sex"
  | "menopause"
  | "pregnancy"
  | "prior_treatment"
  | "current_medication"
  | "other_cancer"
  | "attend_visits";

/** The one fact F a table question asks. The criterion says F, or "not F" when `negated`. */
export type Fact = {
  /** Criteria whose facts share a key share one question. */
  key: string;
  text: string;
  type: "yes_no" | "number";
  /** number only: the answers for which F holds, and the side that shows it does not. */
  range?: { confirm: NumberRange; deny: NumberRange | null };
  negated: boolean;
  /** F is wider than the criterion's own fact ("any medicines" for "concomitant use of X"): "yes" settles nothing. */
  broader: boolean;
  /** With `broader`: an "or" in the criterion only joins more of what F already covers. */
  orSafe?: boolean;
  /** Text F accounts for. Whatever else the criterion says is extra. */
  spans: (RegExp | string)[];
  /** Words that only fill out this kind of criterion ("legal age of consent"). */
  filler?: readonly string[];
};

type Context = { section: Section; cancerTrial: boolean };

export type MustAskEntry = {
  kind: MustAskKind;
  /** What the patient is asked, for the report. */
  asks: string;
  /** Registry wordings this entry recognises: at least two, so a differently worded trial still gets the question. */
  phrasings: readonly string[];
  /** The section these phrasings usually sit under. */
  usual: Section;
  patterns: readonly RegExp[];
  fact: (text: string, ctx: Context) => Fact | null;
};

// ---------------------------------------------------------------------------
// Shared text analysis

const EXCEPTION_RE = /\b(?:except|excluding|exception|unless|other than|apart from)\b/i;

const FILLER = new Set(
  (
    "a an the and of with who whom that which whose is are be been being was were has have had must should will shall can may " +
    "might at in on to for by as from any all each both either their his her its they them this these those s ever also " +
    "patient patients participant participants subject subjects person persons individual individuals people known documented " +
    "history current currently time screening signing signed sign informed consent icf form visit study trial entry " +
    "enrolment enrollment randomization randomisation ability able willing willingness capable e g i note"
  ).split(" "),
);

const TIME_WORDS = "within day days week weeks month months year years half lives life prior before after since last past previous washout";

/** Words that narrow a fact: when one is left over, the fact's "yes" no longer shows the whole criterion. */
const NARROWING = new Set(
  (
    "active uncontrolled controlled severe significant significantly untreated symptomatic progressive progression unstable " +
    "ongoing requiring required clinically persistent persisting chronic recurrent refractory resistant failed failure " +
    "intolerance intolerable intolerability but setting adjuvant neoadjuvant metastatic advanced line lines dose doses more " +
    "least greater less grade moderate strong high low risk suspected planning plan intend intending " +
    TIME_WORDS
  ).split(" "),
);

const TIMED = new Set(TIME_WORDS.split(" "));

/** Time points that only say when a fact is checked ("at screening", "prior to randomisation"). */
const COMMON_SPANS: RegExp[] = [
  /\b(?:prior to|before|at the time of|at the start of|at|on the day of|during)\s+(?:the\s+)?(?:randomi[sz]ation|screening(?:\s+visit)?|enrol?ment|study entry|signing[^,.;)]*|signature[^,.;)]*|first dose[^,.;)]*|start of (?:study )?treatment|study start)/gi,
  /\b(?:signed\s+|written\s+)?informed consent(?:\s+form)?/gi,
];

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globalRe(re: RegExp): RegExp {
  return new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
}

/** The criterion with every span replaced by a marker, lower case. */
function residualText(text: string, spans: (RegExp | string)[]): string {
  let t = ` ${text.toLowerCase()} `;
  for (const s of [...spans, ...COMMON_SPANS]) {
    t = t.replace(typeof s === "string" ? new RegExp(escapeRe(s.toLowerCase()), "g") : globalRe(s), " § ");
  }
  return t;
}

export type Analysis = {
  /** Nothing left once F and the filler are taken out (exceptions aside). */
  simpleCore: boolean;
  /** An exception clause ("except", "unless", "other than"). */
  exceptions: boolean;
  /** An "or" that joins F to something else (", or", ", and/or", a trailing "or"). */
  hasOr: boolean;
  /** Something left over narrows F ("active", "within", "uncontrolled"). */
  narrowed: boolean;
  /** A time window F does not cover. */
  timed: boolean;
  /** The words left over, for the report and the tests. */
  extra: string[];
};

export function analyse(text: string, fact: Pick<Fact, "spans" | "filler">): Analysis {
  const ex = EXCEPTION_RE.exec(text);
  const core = ex ? text.slice(0, ex.index) : text;
  const rest = residualText(core, fact.spans);
  const extraFiller = new Set(fact.filler ?? []);
  const extra = rest
    .split(/[^a-z0-9]+/)
    .filter((w) => w && !FILLER.has(w) && !extraFiller.has(w) && w !== "or" && w !== "and");
  return {
    simpleCore: extra.length === 0,
    exceptions: Boolean(ex),
    hasOr: extra.length > 0 && /(?:[,;]\s*(?:and\s*\/\s*)?or\b)|\bor\s*[.;:]?\s*$/i.test(rest.replace(/§/g, " ").trim()),
    narrowed: extra.some((w) => NARROWING.has(w)),
    timed: extra.some((w) => TIMED.has(w)),
    extra,
  };
}

/** Which answers settle the criterion: F shown true (onTrue) or F shown false (onFalse). */
export function settles(f: Pick<Fact, "negated" | "broader" | "orSafe">, a: Analysis, section: Section) {
  if (f.broader) return { onTrue: false, onFalse: !a.timed && (Boolean(f.orSafe) || a.simpleCore || !a.hasOr) };
  // Inclusion criteria read as "F and more": F false settles them. Exclusion criteria read as
  // "F or more": F true settles them, unless something left over narrows F or an exception applies.
  if (!f.negated) {
    return {
      onTrue: !a.exceptions && (a.simpleCore || (section === "exclusion" && !a.narrowed)),
      onFalse: a.simpleCore || (section === "inclusion" && !a.hasOr),
    };
  }
  return {
    onTrue: !a.exceptions && (a.simpleCore || (section === "inclusion" && !a.hasOr)),
    onFalse: a.simpleCore || (section === "exclusion" && !a.narrowed),
  };
}

/** The rule for one criterion, or null when no answer settles it. "yes" means F holds. */
export function ruleFor(criterionId: string, f: Fact, s: { onTrue: boolean; onFalse: boolean }): QuestionRule | null {
  if (f.type === "number") {
    if (f.negated || !f.range) return null;
    const confirm_range = s.onTrue ? f.range.confirm : null;
    const deny_range = s.onFalse ? f.range.deny : null;
    if (!confirm_range && !deny_range) return null;
    return { criterion_id: criterionId, confirm_answers: [], deny_answers: [], confirm_range, deny_range };
  }
  const showsTrue: string[] = [];
  const showsFalse: string[] = [];
  if (s.onTrue) (f.negated ? showsFalse : showsTrue).push("yes");
  if (s.onFalse) (f.negated ? showsTrue : showsFalse).push("no");
  if (!showsTrue.length && !showsFalse.length) return null;
  return { criterion_id: criterionId, confirm_answers: showsTrue, deny_answers: showsFalse, confirm_range: null, deny_range: null };
}

const NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };

function toNumber(s: string): number | null {
  const n = /^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s.toLowerCase()];
  return n === undefined || !Number.isFinite(n) ? null : n;
}

function unitText(n: number, unit: string): string {
  const u = unit.toLowerCase().replace(/s$/, "");
  return `${n} ${n === 1 ? u : `${u}s`}`;
}

const NUM = "(\\d+|one|two|three|four|five|six|seven|eight|nine|ten|twelve)";

/** "within 4 weeks", "in the past 5 years", "within the last 6 months": the first window in the text. */
function timeWindow(text: string, units = "days?|weeks?|months?|years?"): { n: number; unit: string; span: RegExp } | null {
  const re = new RegExp(
    `\\b(?:within|in|during)\\s+(?:the\\s+)?(?:past\\s+|last\\s+|previous\\s+|preceding\\s+)?${NUM}\\s*(?:\\(\\d+\\)\\s*)?(${units})\\b`,
    "i",
  );
  const m = re.exec(text);
  if (!m) return null;
  const n = toNumber(m[1]);
  return n === null ? null : { n, unit: m[2], span: new RegExp(escapeRe(m[0]), "i") };
}

// ---------------------------------------------------------------------------
// Age, sex and menopausal status: one question per criterion that combines them

const FEMALE_RE = /\b(?:females?|wom[ae]n|girls?)\b/i;
const MALE_RE = /\b(?:males?|m[ae]n|boys?)\b/i;
const BOTH_SEXES_RE = /\b(?:either sex|both sexes|all genders|any gender|regardless of (?:sex|gender))\b/i;
const POST_RE = /\bpost[- ]?menopaus/i;
/** Also the suspended hyphen: "pre- and/or post-menopausal", "pre/peri-menopausal". */
const PRE_RE = /\b(?:pre|peri)[- ]?menopaus|\b(?:pre|peri)-\s*(?:,|and\b|or\b|\/)|\b(?:pre|peri)\//i;
const AGE_CONTEXT_RE = /\b(?:aged?|age|old|adults?|older|younger)\b/i;
/** A condition on someone else, or on part of the group: never read as the group itself. */
const CONDITIONAL_RE = /^\s*(?:for|if|in|when)\b|\b(?:if|required for|for (?:patients|participants|subjects|those) who)\b|childbearing|\bwocbp\b|contracept|partner/i;

const DEMOGRAPHIC_FILLER = (
  "adult adults aged age years year yrs old older younger over above under below between greater less than equal or least " +
  "legal minimum consent local national guidelines regulations regulatory requirements follow accordance country countries " +
  "where it that if trial participation per signature majority inclusive both sexes sex gender genders either pre peri post"
).split(" ");

const DEMOGRAPHIC_SPANS: RegExp[] = [
  /\b(?:fe)?males?\b|\bwom[ae]n\b|\bm[ae]n\b|\bgirls?\b|\bboys?\b/gi,
  /\b(?:pre|peri|post)?[- ]?menopaus\w*/gi,
  /\badults?\b|\baged?\b|\byears?\b|\byrs?\b|\bold(?:er)?\b|\byounger\b/gi,
  /\d+/g,
  /[≥≤<>=]/g,
];

type Bound = { n: number; incl: boolean };

/** Writes comparison words as symbols: "greater than or equal to (≥)18" reads "≥ 18". */
function normaliseComparisons(s: string): string {
  return s
    .replace(/\(\s*(?:≥|≤|>=|<=|=>|=<|>|<)\s*\)/g, " ")
    .replace(/\b(?:greater|more) than or equal to\b|>=|=>/gi, " ≥ ")
    .replace(/\bless than or equal to\b|<=|=</gi, " ≤ ")
    .replace(/\b(?:greater|more) than\b/gi, " > ")
    .replace(/\bless than\b/gi, " < ");
}

/** Lower and upper age bounds in the first sentence, or "conflict" when it states more than one of a side. */
export function ageBounds(sentence: string): { lo: Bound | null; hi: Bound | null } | "conflict" | null {
  // "Women and Men, ≥18 years": a bound in years next to the group is an age without the word.
  const groupBound = (FEMALE_RE.test(sentence) || MALE_RE.test(sentence)) && /[≥≤<>]\s*\d{1,3}\s*(?:years?|yrs?)\b/i.test(normaliseComparisons(sentence));
  if (!AGE_CONTEXT_RE.test(sentence) && !groupBound) return null;
  let s = sentence
    // Examples and legal-age alternatives do not set the trial's bound.
    .replace(/\([^()]*\b(?:e\.g|for example|such as)\b[^()]*\)/gi, " ")
    .replace(/\(\s*or\b[^()]*\)/gi, " ")
    .replace(/\b(?:or|and)\b(?:(?!\b(?:or|and)\b)[^.;()])*\b(?:legal|minimum)\b[^.;()]*/gi, " ");
  s = normaliseComparisons(s);
  const los: Bound[] = [];
  const his: Bound[] = [];
  const add = (side: "lo" | "hi", n: number, incl: boolean) => {
    if (n < 1 || n > 120) return;
    (side === "lo" ? los : his).push({ n, incl });
  };
  for (const m of s.matchAll(/\b(?:between\s+)?(\d{1,3})\s*(?:years?\s*)?(?:to|-|–|and)\s*(\d{1,3})\s*(?:years?|yrs?)\b/gi)) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a < b) {
      add("lo", a, true);
      add("hi", b, true);
    }
  }
  const fromSymbol = (sym: string, n: number) => {
    if (sym === "≥") add("lo", n, true);
    else if (sym === ">") add("lo", n, false);
    else if (sym === "≤") add("hi", n, true);
    else if (sym === "<") add("hi", n, false);
  };
  for (const m of s.matchAll(/([≥≤<>])\s*(\d{1,3})\s*(?:years?|yrs?)\b/gi)) fromSymbol(m[1], Number(m[2]));
  for (const m of s.matchAll(/\b(?:aged?|age|adults?)\s*(?:of\s*)?([≥≤<>])\s*(\d{1,3})\b(?!\s*(?:years?|yrs?)\b)/gi)) fromSymbol(m[1], Number(m[2]));
  for (const m of s.matchAll(/\b(\d{1,3})\s*(?:years?|yrs?)?\s*(?:of age\s*|old\s*)?(?:or|and)\s*(older|over|above|younger|under|below)\b/gi)) {
    add(/older|over|above/i.test(m[2]) ? "lo" : "hi", Number(m[1]), true);
  }
  for (const m of s.matchAll(/\bat least\s*(\d{1,3})\s*(?:years?|yrs?)\s*(?:of age|old)\b/gi)) add("lo", Number(m[1]), true);
  for (const m of s.matchAll(/\b(over|above|older than|under|below|younger than)\s+(?:the\s+)?(?:age\s+(?:of\s+)?)?(\d{1,3})\b(?!\s*(?:kg|%|mg|ml|cm|days?|weeks?|months?))/gi)) {
    add(/over|above|older/i.test(m[1]) ? "lo" : "hi", Number(m[2]), false);
  }
  const uniq = (bs: Bound[]) => bs.filter((b, i) => bs.findIndex((x) => x.n === b.n && x.incl === b.incl) === i);
  const lo = uniq(los);
  const hi = uniq(his);
  if (lo.length > 1 || hi.length > 1) return "conflict";
  if (!lo.length && !hi.length) return /\badults?\b/i.test(s) ? { lo: { n: 18, incl: true }, hi: null } : null;
  return { lo: lo[0] ?? null, hi: hi[0] ?? null };
}

function firstSentence(text: string): string {
  return text.split(/\.\s+(?=[A-Z])/)[0];
}

function demographicFact(text: string, ctx: Context): Fact | null {
  const s = firstSentence(text);
  if (CONDITIONAL_RE.test(s)) return null;
  const bounds = ageBounds(s);
  if (bounds === "conflict") return null;
  const female = FEMALE_RE.test(s);
  const male = MALE_RE.test(s);
  const both = BOTH_SEXES_RE.test(s) || (female && male);
  const sex = both ? null : female ? "F" : male ? "M" : null;
  const post = POST_RE.test(s);
  const pre = PRE_RE.test(s);
  const meno = post && !pre ? "post" : pre && !post ? "pre" : null;
  if (meno && sex === "M") return null;
  // A sex word decides the group only when it opens the criterion ("Female patients", "Women aged ...").
  const sexLeads = /^\s*(?:adult\s+)?(?:fe)?males?\b|^\s*(?:adult\s+)?wom[ae]n\b|^\s*(?:adult\s+)?m[ae]n\b|^\s*(?:participants?|patients?|subjects?)\s+(?:must be|who are)\s+(?:fe)?male/i.test(s);
  const age = bounds && (bounds.lo || bounds.hi) ? bounds : null;
  if (!age && !meno && !(sex && sexLeads)) return null;
  // An upper bound alone at or under 18 in an inclusion criterion is about minors, not the trial's group.
  if (age && !age.lo && age.hi && age.hi.n <= 18 && ctx.section === "inclusion") return null;

  const lo = age?.lo ? (age.lo.incl ? age.lo.n : age.lo.n + 1) : null;
  const hi = age?.hi ? (age.hi.incl ? age.hi.n : age.hi.n - 1) : null;
  const base = { negated: false, broader: false, spans: DEMOGRAPHIC_SPANS, filler: DEMOGRAPHIC_FILLER };

  if (both && meno) {
    if (age) return null;
    const text = meno === "post" ? "Are you a man, or a woman who has been through the menopause?" : "Are you a man, or a woman who has not yet been through the menopause?";
    return { ...base, key: `demographic:${text}`, text, type: "yes_no" };
  }
  if (!sex && !meno && age) {
    if (lo !== null && hi !== null) {
      // "How old are you?": the range confirms; the side a patient here more often falls on denies.
      const deny: NumberRange = lo <= 18 ? { min: hi + 1, max: null } : { min: null, max: lo - 1 };
      const text = "How old are you? Answer in years.";
      return { ...base, key: `demographic:age:${lo}-${hi}`, text, type: "number", range: { confirm: { min: lo, max: hi }, deny } };
    }
    const text = age.lo
      ? age.lo.incl
        ? `Are you ${age.lo.n} or older?`
        : `Are you older than ${age.lo.n}?`
      : age.hi!.incl
        ? `Are you ${age.hi!.n} or younger?`
        : `Are you younger than ${age.hi!.n}?`;
    return { ...base, key: `demographic:${text}`, text, type: "yes_no" };
  }
  const noun = sex === "M" ? "a man" : "a woman";
  let agePart = "";
  if (lo !== null && hi !== null) agePart = ` aged between ${lo} and ${hi}`;
  else if (age?.lo) agePart = age.lo.incl ? ` aged ${age.lo.n} or older` : ` older than ${age.lo.n}`;
  else if (age?.hi) agePart = age.hi.incl ? ` aged ${age.hi.n} or younger` : ` younger than ${age.hi.n}`;
  const menoPart = meno === "post" ? " who has been through the menopause" : meno === "pre" ? " who has not yet been through the menopause" : "";
  const q = `Are you ${noun}${agePart}${menoPart}?`;
  return { ...base, key: `demographic:${q}`, text: q, type: "yes_no" };
}

// ---------------------------------------------------------------------------
// Pregnancy and breastfeeding

const PREGNANT_RE = /\bpregnan(?:t|cy)\b(?!\s*tests?\b)/i;
const FEEDING_RE = /\bbreast[- ]?\s?feeding\b|\blactat(?:ing|ion)\b|\bnursing\b/i;

function pregnancyFact(text: string, ctx: Context): Fact | null {
  const pregnant = PREGNANT_RE.test(text);
  const feeding = FEEDING_RE.test(text);
  if (!pregnant && !feeding) return null;
  // Contraception and test criteria are about something else.
  if (/contracept|birth control|\bavoid\w*|\bprevent\w*|\bagree\w*|childbearing potential must/i.test(text)) return null;
  const negated = /\b(?:not|non-?|no)\b[^.;]{0,20}\b(?:pregnan|breast|lactat)/i.test(text);
  if (ctx.section === "inclusion" && !negated) return null;
  const q = pregnant && feeding ? "Are you pregnant or breastfeeding at the moment?" : pregnant ? "Are you pregnant at the moment?" : "Are you breastfeeding at the moment?";
  return {
    key: `pregnancy:${q}`,
    text: q,
    type: "yes_no",
    negated,
    broader: false,
    spans: [
      /\((?:confirmed|as confirmed|documented|as determined)[^)]*\)/gi,
      /\bpregnan\w*/gi,
      /\bbreast[- ]?\s?feeding\b|\blactat\w*|\bnursing\b/gi,
      /\b(?:currently|presently|now|not|non|no)\b/gi,
      /\b(?:fe)?males?\b|\bwom[ae]n\b|\bgirls?\b/gi,
    ],
  };
}

// ---------------------------------------------------------------------------
// Other cancers, in the past N years or ever

const CANCER_WORD = "(?:malignanc(?:y|ies)|cancers?|tumou?rs?)";
const NOT_A_TREATMENT = "(?!\\s*(?:therap|treatment|drug|medic|surg))";
const OTHER_CANCER_PATTERNS: RegExp[] = [
  new RegExp(`\\b(?:another|other|second|secondary|additional|concurrent|concomitant|synchronous)\\s+(?:primary\\s+|invasive\\s+|active\\s+)?${CANCER_WORD}\\b${NOT_A_TREATMENT}`, "i"),
  new RegExp(`\\bhistory\\s+of\\s+(?:a\\s+|an\\s+|any\\s+)?(?:prior\\s+|previous\\s+|other\\s+|another\\s+)?(?:invasive\\s+)?${CANCER_WORD}\\b${NOT_A_TREATMENT}`, "i"),
  new RegExp(`\\b(?:prior|previous)\\s+(?:invasive\\s+)?${CANCER_WORD}\\b${NOT_A_TREATMENT}`, "i"),
  new RegExp(`\\b${CANCER_WORD}\\s+(?:within|in)\\s+the\\s+(?:past|last|previous|preceding)\\b`, "i"),
];

const CANCER_TRIAL_RE = /\b(?:cancer|carcinoma|malignan\w*|tumou?r|lymphoma|leuka?emia|myeloma|sarcoma|melanoma|glioma|neoplasm|metasta\w*)\b/i;

function otherCancerFact(text: string, ctx: Context): Fact | null {
  const ex = EXCEPTION_RE.exec(text);
  const core = ex ? text.slice(0, ex.index) : text;
  const m = OTHER_CANCER_PATTERNS.map((re) => re.exec(core)).find(Boolean);
  if (!m) return null;
  const other = /\b(?:another|other|second|secondary|additional|concurrent|concomitant|synchronous|prior|previous)\b/i.test(m[0]) || ctx.cancerTrial;
  const window = timeWindow(core, "years?");
  const spans: (RegExp | string)[] = [m[0], ...OTHER_CANCER_PATTERNS.map(globalRe)];
  let text_: string;
  let broader = false;
  if (window) {
    spans.push(window.span);
    const span = unitText(window.n, window.unit);
    text_ = other ? `Apart from the cancer you have now, have you had another cancer in the past ${span}?` : `Have you had cancer in the past ${span}?`;
  } else {
    text_ = other ? "Apart from the cancer you have now, have you ever had another cancer?" : "Have you ever had cancer?";
    // "Ever" covers any time window the criterion names: "no" still settles it, "yes" does not.
    if (/\b(?:within|years?|months?)\b/i.test(core)) {
      broader = true;
      spans.push(/\b(?:within|in)\s+(?:the\s+)?(?:past|last|previous|preceding)?[^,.;()]*?\b(?:years?|months?)\b(?:\s+(?:prior to|before|of)\b)?/gi);
    }
  }
  spans.push(/\b(?:diagnosed|diagnosis)\b/gi);
  return { key: `other_cancer:${text_}`, text: text_, type: "yes_no", negated: /^\s*(?:no|without|free of|absence of)\b/i.test(core), broader, spans };
}

// ---------------------------------------------------------------------------
// Prior treatment by drug name or class

const PRIOR_TREATMENT_PATTERNS: RegExp[] = [
  /\b(?:prior|previous)\s+(?:treatment|therapy|exposure)(?:\s+within\s+(\d+)\s+(days?|weeks?|months?))?\s+(?:with|to)\s+/i,
  /\b(?:previously|has|have|had)\s+(?:been\s+)?(treated with|received)\s+/i,
];

/** Words that mean the phrase runs on into a clause, not a drug name or class. */
const CLAUSE_WORDS =
  /\b(?:who|which|that|whose|where|when|could|can|may|might|should|must|will|would|is|are|was|were|be|been|being|has|have|had|permitted|allowed|considered|documented|status|patients?|participants?|subjects?|defined|unless)\b/i;

/** The drug name or class after "prior treatment with": up to the end of the clause, examples dropped. */
function drugPhrase(after: string): string {
  let x = after
    .replace(/\s*\((?:e\.g\.?|eg|i\.e\.?|ie|see|as defined|including|such as)[^()]*\)/gi, "")
    .split(/\.(?=\s|$)|[;:]|\s+(?:but|unless|except|apart from|other than|excluding|before|prior to|within)\b/i)[0];
  // An opening bracket that does not close in the phrase ends it.
  const open = x.indexOf("(");
  if (open >= 0 && x.indexOf(")", open) < 0) x = x.slice(0, open);
  return x
    .replace(/[,\s]+$/, "")
    .replace(/\s+(?:is|are)\s+not\s+(?:permitted|allowed)$/i, "")
    .replace(/\s+(?:is|are)\s+excluded$/i, "")
    .replace(/^(?:prior|previous)\s+/i, "")
    .replace(/[,\s]+$/, "")
    .trim();
}

function priorTreatmentFact(text: string): Fact | null {
  let m: RegExpExecArray | null = null;
  let which = -1;
  for (let k = 0; k < PRIOR_TREATMENT_PATTERNS.length && !m; k++) {
    m = PRIOR_TREATMENT_PATTERNS[k].exec(text);
    which = k;
  }
  if (!m) return null;
  // "In countries where ...", "if ...": a condition this question cannot carry.
  if (/\b(?:in countries where|where applicable|if)\b/i.test(text)) return null;
  const after = text.slice(m.index + m[0].length);
  let x = drugPhrase(after);
  // "Prior treatment with any of the following: CDK2 inhibitors": the sub-item names the drug.
  if (/^(?:any|one|all)?\s*(?:of\s+)?the following(?:\s+\w+)?$/i.test(x)) {
    const colon = after.indexOf(":");
    x = colon >= 0 ? drugPhrase(after.slice(colon + 1)) : "";
  }
  if (x.split(/\s+/).length > 16) {
    // A long list: ask the first item only, and only when it is a phrase of its own.
    const first = x.split(",")[0].trim();
    x = first.split(/\s+/).length >= 2 ? first : "";
  }
  x = x.replace(/\btheir\b/gi, "your");
  const words = x.split(/\s+/).filter(Boolean);
  if (!words.length || words.length > 16 || !/[a-z]/i.test(x) || /[<>≥≤]/.test(x) || CLAUSE_WORDS.test(x)) return null;
  // Counts of earlier lines, and lists the criterion spells out elsewhere, are not one drug or class.
  if (/^\d|\blines?\s+of\b|\bregimens?\b|\bfollowing\b|\bexceptions?\b/i.test(x)) return null;
  let window = which === 0 && m[1] ? { n: Number(m[1]), unit: m[2] } : null;
  const spans: (RegExp | string)[] = [m[0], x, /\b(?:prior|previous|previously)\b/gi];
  if (!window) {
    const w = /^\s*within\s+(\d+)\s+(days?|weeks?|months?)\b/i.exec(after.slice(after.indexOf(x) + x.length));
    if (w) {
      window = { n: Number(w[1]), unit: w[2] };
      spans.push(w[0].trim());
    }
  }
  const received = which === 1 && /received/i.test(m[1] ?? "");
  const verb = received ? "received" : "been treated with";
  const q = window ? `In the past ${unitText(window.n, window.unit)}, have you ${verb} ${x}?` : `Have you ever ${verb} ${x}?`;
  // "No prior treatment with", "not previously treated with", "cannot have received": the criterion says "not F".
  const before = text.slice(Math.max(0, m.index - 30), m.index);
  // "May have received ...": a permission, not a fact the criterion states.
  if (/\b(?:may|can|could|might)\s*$/i.test(before) || /\b(?:is|are|be)\s+(?:allowed|permitted)\b/i.test(text.slice(m.index))) return null;
  const negated = /^\s*(?:no|without)\b/i.test(text) || /\b(?:not|never|no|cannot|without)\b[^,.;]*$/i.test(before) || /\bnot\b/i.test(m[0]);
  spans.push(/\b(?:not|never|cannot|no)\b/gi);
  return { key: `prior_treatment:${q}`, text: q, type: "yes_no", negated, broader: false, spans };
}

// ---------------------------------------------------------------------------
// Current medications

const CURRENT_MEDICATION_PATTERNS: RegExp[] = [
  /\b(?:concomitant|concurrent)\b[^.;]{0,60}?\b(?:use|therapy|treatment|medications?|drugs?|supplements?|administration)\b/i,
  /\bcurrently\s+(?:taking|using|receiving|on|treated with)\b/i,
  /\b(?:current|ongoing|chronic|regular)\s+(?:use|treatment|therapy)\s+(?:of|with)\b/i,
];

function currentMedicationFact(text: string): Fact | null {
  const m = CURRENT_MEDICATION_PATTERNS.map((re) => re.exec(text)).find(Boolean);
  if (!m) return null;
  const window = timeWindow(text, "days?|weeks?|months?");
  const q = window
    ? `Have you taken or received any medicines or treatments in the past ${unitText(window.n, window.unit)}, including supplements?`
    : "Are you taking or receiving any medicines or treatments at the moment, including supplements?";
  const spans: (RegExp | string)[] = [m[0], ...CURRENT_MEDICATION_PATTERNS.map(globalRe)];
  if (window) spans.push(window.span, /\b(?:prior to|before|of)\b/gi);
  return {
    key: `current_medication:${q}`,
    text: q,
    type: "yes_no",
    negated: /^\s*(?:no|not|without)\b/i.test(text),
    broader: true,
    orSafe: true,
    spans,
  };
}

// ---------------------------------------------------------------------------
// Attending visits at the trial site

const VISIT_PATTERNS: RegExp[] = [
  /\b(?:attend|come to|travel to|return to)\b[^.;]{0,40}?\b(?:visits?|appointments?|follow-?up|clinic|site|hospital|centre|center)\b/i,
  /\b(?:comply|compliance|adhere|adherence)\s+(?:with|to)\s+(?:the\s+|all\s+)?(?:scheduled\s+)?(?:study\s+|trial\s+)?(?:protocol|visits?|schedule|requirements|procedures|follow-?up)(?:\s+(?:requirements|procedures|visits))?/i,
  /\bgeographic(?:al(?:ly)?)?\b[^.;]{0,30}?\b(?:proximity|accessib\w*|access|close|follow-?up)\b/i,
  /\b(?:willing|able|ability)\b[^.;]{0,40}?\b(?:visits?|follow-?up|appointments?)\b/i,
];

function attendVisitsFact(text: string): Fact | null {
  const m = VISIT_PATTERNS.map((re) => re.exec(text)).find(Boolean);
  if (!m) return null;
  const q = "Would you be able to come to the trial site for regular visits during the trial?";
  return {
    key: "attend_visits",
    text: q,
    type: "yes_no",
    negated: /\b(?:unable|inability|not able|unwilling|not willing)\b/i.test(text),
    broader: false,
    spans: [m[0], /\b(?:unable|inability|unwilling|not able|not willing|and|willing|able)\b/gi],
  };
}

// ---------------------------------------------------------------------------
// The table. Order matters: the first entry that builds a rule for a criterion asks it.

export const MUST_ASK_TABLE: readonly MustAskEntry[] = [
  {
    kind: "pregnancy",
    usual: "exclusion",
    asks: "Are you pregnant or breastfeeding at the moment? (or the one the criterion names)",
    phrasings: ["Female participants who are pregnant or breastfeeding", "Pregnant or lactating women", "Currently pregnant (confirmed with positive serum pregnancy test) or breastfeeding"],
    patterns: [PREGNANT_RE, FEEDING_RE],
    fact: pregnancyFact,
  },
  {
    kind: "age",
    usual: "inclusion",
    asks: "Are you N or older? (one bound) or How old are you? (a range), with sex and menopause folded in when the criterion names them",
    phrasings: ["Males and females at least 18 years of age.", "Adults of ≥ 18 years of age at the time of signing the informed consent.", "Male or female aged ≥ 18 years and < 75 years", "Age 18 years or older"],
    patterns: [/\b(?:aged?|age)\b[^.;]{0,20}\d/i, /\d+\s*(?:years?|yrs?)\s*(?:of age|old)/i, /\badults?\b/i, /\b\d+\s*(?:years?\s*)?(?:or|and)\s*(?:older|over)\b/i],
    fact: demographicFact,
  },
  {
    kind: "sex",
    usual: "inclusion",
    asks: "Are you a woman? / Are you a man? (only when the criterion names one sex)",
    phrasings: ["Female patients", "Male participants aged ≥18 years (or the minimum age of consent in accordance with local regulations) at screening."],
    patterns: [FEMALE_RE, MALE_RE],
    fact: demographicFact,
  },
  {
    kind: "menopause",
    usual: "inclusion",
    asks: "Are you a woman who has been through the menopause? (or who has not yet)",
    phrasings: ["Postmenopausal women", "Pre- or perimenopausal women aged 18 years or older"],
    patterns: [POST_RE, PRE_RE],
    fact: demographicFact,
  },
  {
    kind: "other_cancer",
    usual: "exclusion",
    asks: "Apart from the cancer you have now, have you had another cancer in the past N years? (or ever)",
    phrasings: ["History of another primary malignancy", "History of prior malignancy within 2 years prior to randomization", "History of cancer within the past 5 years"],
    patterns: OTHER_CANCER_PATTERNS,
    fact: otherCancerFact,
  },
  {
    kind: "current_medication",
    usual: "exclusion",
    asks: "Are you taking or receiving any medicines or treatments at the moment? (or in the past N days, weeks or months)",
    phrasings: ["Concomitant use of strong CYP3A4 inhibitors", "Any systemic concurrent anti-cancer treatment", "Participants currently receiving immunoglobulin replacement therapy"],
    patterns: CURRENT_MEDICATION_PATTERNS,
    fact: (text) => currentMedicationFact(text),
  },
  {
    kind: "prior_treatment",
    usual: "exclusion",
    asks: "Have you ever been treated with <the drug or class the criterion names>? (or in the past N days, weeks or months)",
    phrasings: ["Previous treatment with camizestrant, investigational SERDs/investigational ER targeting agents, or fulvestrant", "Previous exposure to IM-101", "Has been treated with any complement inhibitor"],
    patterns: PRIOR_TREATMENT_PATTERNS,
    fact: (text) => priorTreatmentFact(text),
  },
  {
    kind: "attend_visits",
    usual: "inclusion",
    asks: "Would you be able to come to the trial site for regular visits during the trial?",
    phrasings: ["Ability to give written informed consent and comply with protocol requirements", "Willing and able to attend scheduled study visits", "Geographical proximity allowing follow-up"],
    patterns: VISIT_PATTERNS,
    fact: (text) => attendVisitsFact(text),
  },
];

// ---------------------------------------------------------------------------

export type MustAskTag = {
  criterion_id: string;
  kind: MustAskKind;
  /** The table question that serves the criterion, or null when it is left to the model. */
  question_id: string | null;
  /** The split had marked it as not patient-answerable. */
  made_askable: boolean;
  /** Why it is left to the model. */
  note?: string;
};

export type MustAskResult = { criteria: Criterion[]; questions: Question[]; tags: MustAskTag[] };

function criterionText(c: Criterion): string {
  return normalizeWs(c.parent_quote ? `${c.parent_quote} ${c.quote}` : c.quote);
}

/** Applies the table: the questions it guarantees, and the criteria with those it serves made askable. */
export function applyMustAsk(criteria: Criterion[], maxQuestions = 12): MustAskResult {
  const cancerTrial = criteria.some((c) => c.section === "inclusion" && CANCER_TRIAL_RE.test(criterionText(c)));
  const byKey = new Map<string, Question>();
  const order: string[] = [];
  const tags: MustAskTag[] = [];
  const served = new Map<string, string>(); // criterion id -> fact key

  for (const c of criteria) {
    const text = criterionText(c);
    const ctx: Context = { section: c.section, cancerTrial };
    let firstKind: MustAskKind | null = null;
    let done = false;
    for (const entry of MUST_ASK_TABLE) {
      if (!entry.patterns.some((p) => p.test(text))) continue;
      firstKind ??= entry.kind;
      const fact = entry.fact(text, ctx);
      if (!fact || wordingProblems(fact.text).length) continue;
      let rule = ruleFor(c.id, fact, settles(fact, analyse(text, fact), c.section));
      if (!rule) continue;
      const existing = byKey.get(fact.key);
      if (existing && fact.type === "yes_no") {
        // One answer never confirms two criteria of one yes or no question; keep only its deny.
        const taken = new Set(existing.rules.flatMap((r) => r.confirm_answers));
        if (rule.confirm_answers.some((a) => taken.has(a))) {
          rule = { ...rule, confirm_answers: rule.confirm_answers.filter((a) => !taken.has(a)) };
          if (!rule.confirm_answers.length && !rule.deny_answers.length) continue;
        }
      }
      if (!existing && byKey.size >= maxQuestions) {
        tags.push({ criterion_id: c.id, kind: entry.kind, question_id: null, made_askable: false, note: `over the ${maxQuestions} question limit` });
        done = true;
        break;
      }
      const q: Question = existing ?? { id: "", text: fact.text, type: fact.type, options: null, criterion_ids: [], rules: [] };
      q.criterion_ids.push(c.id);
      q.rules.push(rule);
      if (!existing) {
        byKey.set(fact.key, q);
        order.push(fact.key);
      }
      served.set(c.id, fact.key);
      tags.push({ criterion_id: c.id, kind: entry.kind, question_id: fact.key, made_askable: !c.askable });
      done = true;
      break;
    }
    if (!done && firstKind) {
      tags.push({
        criterion_id: c.id,
        kind: firstKind,
        question_id: null,
        made_askable: false,
        note: "no plain answer settles it either way; left to the model",
      });
    }
  }

  const ids = new Map(order.map((key, k) => [key, `q${k + 1}`]));
  const questions = order.map((key) => ({ ...byKey.get(key)!, id: ids.get(key)! }));
  return {
    criteria: criteria.map((c) => (served.has(c.id) ? { ...c, askable: true, not_askable_reason: null } : c)),
    questions,
    tags: tags.map((t) => (t.question_id ? { ...t, question_id: ids.get(t.question_id) ?? null } : t)),
  };
}
