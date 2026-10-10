// The lead pack PDF. For each selected patient: contact details, consent timestamp, the counts
// line and the full criteria matrix (criterion quoted, state, answer quoted), one A4 page per
// patient, for the research team at the contracted trial site. Every page carries the trial title,
// who the pack is for, the NCT ID, the referring hospital, the date and PACK_FOOTER_TEXT. Built in memory with pdf-lib: nothing is sent anywhere.
// Each answer names its question id; the questions themselves are listed once per page, so
// every answer still quotes the question it answers without doubling the row height.
// The PDF is not a screen: StateCell stays the only renderer of a state in the UI, and the PDF
// takes its state words from STATE_LABEL and its shapes from StateCell's (circle, square,
// dashed ring, diamond), so states stay apart in greyscale too.
import { PDFDocument, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { answerLabel } from "./answers";
import { formatDate, formatDay } from "./format";
import { STATE_LABEL, countStates, countsText } from "./states";
import { summaryText } from "./summary";
import { PACK_FOOTER_TEXT } from "./wording";
import type { Criterion, MappingRow, Question, Section, State } from "./types";

export type PackPatient = {
  submission_id: string;
  contact: string;
  submitted_at: string;
  consent_at: string;
  confirmed_at: string;
  rows: MappingRow[];
};

/** Under the trial title, on every page and on the preview: who the pack is for. */
export const PACK_AUDIENCE_LINE = "For the research team at the contracted trial site.";

/** "Lead pack · <NCT ID> · Referred from: <hospital> · Date: <day>". The hospital is the referring one. */
export function packHeaderLine(pack: Pick<LeadPack, "trial" | "hospital" | "created_at">): string {
  return `Lead pack · ${pack.trial.nct_id} · Referred from: ${pack.hospital} · Date: ${formatDay(pack.created_at)}`;
}

export type LeadPack = {
  trial: { id: string; nct_id: string; title: string; criteria: Criterion[]; questions: Question[] };
  hospital: string;
  /** When the pack was built; its date is printed on every page. */
  created_at: string;
  patients: PackPatient[];
};

/** Static TrueType fonts (Geologica, OFL). The variable WOFF2 cannot be subset by fontkit. */
export type PackFontBytes = { regular: Uint8Array; semibold: Uint8Array };

/** What was drawn on one page, in order: the patient (1-based), the matrix type size, the text. */
export type PackPageSummary = { patient: number; continued: boolean; size: number; texts: string[] };

export const PACK_FONT_FILES = { regular: "Geologica-Sharp-Regular.ttf", semibold: "Geologica-Sharp-SemiBold.ttf" } as const;

/** Matrix type sizes tried in turn; the largest at which the patient fits one page wins. */
export const MATRIX_SIZES = [9, 8.5, 8, 7.5, 7, 6.75, 6.5, 6.25, 6] as const;

// ---------------------------------------------------------------------------
// Page geometry (points) and colours (Karma tokens)

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 24;
const WIDTH = A4.w - 2 * MARGIN;
const PAD_X = 4;
const COL = {
  criterion: { x: MARGIN, w: 338 },
  state: { x: MARGIN + 338, w: 76 },
  answer: { x: MARGIN + 414, w: WIDTH - 414 },
};
const LEAD = 1.2;
const COLUMN_GAP = 14;
const HEADER_GAP = 9;
const BEFORE_FOOTER = 8;

const hex = (h: string): RGB => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const INK = hex("#131313");
const SECONDARY = hex("#4A4A4A");
const LINE = hex("#DCDCDC");
const SUNKEN = hex("#E7E7E7");
const PAGE_TINT = hex("#F6F6F6");

const STATE_LOOK: Record<State, { solid: RGB; ink: RGB; edge?: RGB }> = {
  met: { solid: hex("#115E59"), ink: hex("#134E4A") },
  not_met: { solid: hex("#D6341C"), ink: hex("#7F1D1D") },
  not_found: { solid: hex("#64748B"), ink: hex("#334155") },
  needs_clinician: { solid: hex("#FBBF24"), ink: hex("#78350F"), edge: hex("#92400E") },
};

const SECTION_TITLE: Record<Section, string> = { inclusion: "Inclusion criteria", exclusion: "Exclusion criteria" };

// ---------------------------------------------------------------------------
// Text measuring and wrapping

type Fonts = { regular: PDFFont; semibold: PDFFont };

/** Line breaks kept, tabs as spaces, other control characters dropped. */
function cleanText(s: string): string {
  const text = s.replace(/\r\n?/g, "\n").replace(/[\t\f\v]/g, " ");
  return Array.from(text)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      return ch === "\n" || (code >= 32 && code !== 127);
    })
    .join("");
}

class Measure {
  private cache = new Map<string, number>();
  constructor(private fonts: Fonts) {}

  width(text: string, font: PDFFont, size: number): number {
    const key = `${font === this.fonts.semibold ? "b" : "r"}|${size}|${text}`;
    let w = this.cache.get(key);
    if (w === undefined) {
      w = font.widthOfTextAtSize(text, size);
      this.cache.set(key, w);
    }
    return w;
  }

  /**
   * Word wrap to `width`, the first line `indent` narrower. A word wider than the line breaks
   * between characters. Never drops text.
   */
  wrap(text: string, font: PDFFont, size: number, width: number, indent = 0): string[] {
    const out: string[] = [];
    const space = this.width(" ", font, size);
    const room = () => (out.length === 0 ? width - indent : width);
    for (const para of cleanText(text).split("\n")) {
      let line = "";
      let lineW = 0;
      for (const word of para.split(" ").filter(Boolean)) {
        const w = this.width(word, font, size);
        if (line && lineW + space + w <= room()) {
          line += ` ${word}`;
          lineW += space + w;
          continue;
        }
        if (line) out.push(line);
        let rest = word;
        while (this.width(rest, font, size) > room() && rest.length > 1) {
          let n = rest.length - 1;
          while (n > 1 && this.width(rest.slice(0, n), font, size) > room()) n--;
          out.push(rest.slice(0, n));
          rest = rest.slice(n);
        }
        line = rest;
        lineW = this.width(rest, font, size);
      }
      out.push(line);
    }
    return out;
  }
}

/** A block of text in one font, size and colour, wrapped; `prefix` sits in grey before line one. */
type Para = { text: string; lines: string[]; font: PDFFont; size: number; color: RGB; gapAfter: number; prefix?: string };

function para(m: Measure, text: string, font: PDFFont, size: number, color: RGB, width: number, gapAfter = 0, prefix?: string): Para {
  const indent = prefix ? m.width(`${prefix} `, font, size) : 0;
  return { text, lines: m.wrap(text, font, size, width, indent), font, size, color, gapAfter, prefix };
}

const paraHeight = (p: Para) => p.lines.length * p.size * LEAD + p.gapAfter;
const parasHeight = (ps: Para[]) => ps.reduce((h, p) => h + paraHeight(p), 0);

// ---------------------------------------------------------------------------
// Layout

type Block =
  | { kind: "section"; title: string; height: number }
  | { kind: "row"; row: MappingRow; criterion: Para; state: Para; answer: Para; height: number };

const padY = (s: number) => s * 0.25;
const iconRoom = (s: number) => s * 1.25;
const colHeaderHeight = (s: number) => s * 0.9 * LEAD + 2 * padY(s);

/** The answer quoted, after its question id; or why there is none. */
function answerPara(m: Measure, f: Fonts, r: MappingRow, c: Criterion | undefined, questions: Question[], s: number): Para {
  const w = COL.answer.w - 2 * PAD_X;
  if (c && !c.askable) return para(m, `Not asked: ${c.not_askable_reason ?? "for the research team"}`, f.regular, s, SECONDARY, w);
  if (!r.question_id && !r.quoted_answer) return para(m, "No question covers this criterion.", f.regular, s, SECONDARY, w);
  const q = questions.find((x) => x.id === r.question_id);
  const prefix = r.question_id ?? undefined;
  return r.quoted_answer
    ? para(m, `“${answerLabel(q, r.quoted_answer)}”`, f.semibold, s, INK, w, 0, prefix)
    : para(m, "No answer given.", f.regular, s, SECONDARY, w, 0, prefix);
}

function matrixBlocks(m: Measure, f: Fonts, pack: LeadPack, p: PackPatient, s: number): Block[] {
  const byId = new Map(pack.trial.criteria.map((c) => [c.id, c]));
  const perSection: Record<Section, number> = { inclusion: 0, exclusion: 0 };
  for (const r of p.rows) {
    const sec = byId.get(r.criterion_id)?.section;
    if (sec) perSection[sec] += 1;
  }
  const blocks: Block[] = [];
  let prev: Section | undefined;
  for (const r of p.rows) {
    const c = byId.get(r.criterion_id);
    if (c && c.section !== prev) {
      blocks.push({ kind: "section", title: `${SECTION_TITLE[c.section]} (${perSection[c.section]})`, height: s * LEAD + 2 * padY(s) });
      prev = c.section;
    }
    const criterion = para(m, `“${r.quoted_criterion}”`, f.regular, s, INK, COL.criterion.w - 2 * PAD_X - 6, 0, r.criterion_id);
    const state = para(m, STATE_LABEL[r.state], f.semibold, s, STATE_LOOK[r.state].ink, COL.state.w - 2 * PAD_X - iconRoom(s));
    const answer = answerPara(m, f, r, c, pack.trial.questions, s);
    const height = Math.max(paraHeight(criterion), paraHeight(state), paraHeight(answer)) + 2 * padY(s);
    blocks.push({ kind: "row", row: r, criterion, state, answer, height });
  }
  return blocks;
}

/**
 * The questions this patient's answers cite, worded as the patient read them: a title, then
 * two columns balanced by height. Returns the title, the columns and the total height.
 */
type QuestionList = { title: Para; columns: [Para[], Para[]]; height: number } | null;

function questionList(m: Measure, f: Fonts, pack: LeadPack, p: PackPatient, s: number): QuestionList {
  const cited = new Set(p.rows.map((r) => r.question_id).filter(Boolean));
  const qs = pack.trial.questions.filter((q) => cited.has(q.id));
  if (!qs.length) return null;
  const size = s * 0.9;
  const colW = (WIDTH - COLUMN_GAP) / 2;
  const title = para(m, "Questions asked, as the patient read them", f.semibold, size, SECONDARY, WIDTH, size * 0.3);
  const items = qs.map((q) => para(m, q.text, f.regular, size, SECONDARY, colW, size * 0.15, q.id));
  const total = parasHeight(items);
  let split = items.length;
  for (let k = 1, h = 0; k <= items.length; k++) {
    h += paraHeight(items[k - 1]);
    if (h >= total / 2) {
      split = k;
      break;
    }
  }
  const columns: [Para[], Para[]] = [items.slice(0, split), items.slice(split)];
  return { title, columns, height: paraHeight(title) + Math.max(parasHeight(columns[0]), parasHeight(columns[1])) };
}

function headerParas(m: Measure, f: Fonts, pack: LeadPack): Para[] {
  return [
    para(m, pack.trial.title, f.semibold, 12, INK, WIDTH, 2),
    para(m, PACK_AUDIENCE_LINE, f.regular, 9, INK, WIDTH, 2),
    para(m, packHeaderLine(pack), f.regular, 8.5, SECONDARY, WIDTH),
  ];
}

function patientParas(m: Measure, f: Fonts, p: PackPatient, n: number, total: number, continued: boolean): Para[] {
  const meta = [
    `Consent given: ${formatDate(p.consent_at)}`,
    `Submitted: ${formatDate(p.submitted_at)}`,
    `Confirmed by coordinator: ${formatDate(p.confirmed_at)}`,
  ].join(" · ");
  return [
    para(m, `PATIENT ${n} OF ${total}${continued ? " (CONTINUED)" : ""}`, f.semibold, 7.5, SECONDARY, WIDTH, 3),
    para(m, p.contact, f.semibold, 11.5, INK, WIDTH, 3),
    para(m, meta, f.regular, 8, SECONDARY, WIDTH, 4),
    para(m, countsText(countStates(p.rows)), f.semibold, 10, INK, WIDTH, 2),
    para(m, summaryText(p.rows) ?? "", f.regular, 7.5, INK, WIDTH),
  ];
}

// ---------------------------------------------------------------------------
// Drawing

class PageWriter {
  readonly summary: PackPageSummary;
  constructor(
    readonly page: PDFPage,
    patient: number,
    continued: boolean,
    size: number,
    private m: Measure,
  ) {
    this.summary = { patient, continued, size, texts: [] };
  }

  /** Draws a paragraph with its top at y; returns the y below it. */
  para(p: Para, x: number, y: number): number {
    let top = y;
    let indent = 0;
    if (p.prefix) {
      this.summary.texts.push(p.prefix);
      this.page.drawText(p.prefix, { x, y: top - p.size, size: p.size, font: p.font, color: SECONDARY });
      indent = this.m.width(`${p.prefix} `, p.font, p.size);
    }
    this.summary.texts.push(p.text);
    p.lines.forEach((line, i) => {
      if (line) this.page.drawText(line, { x: x + (i === 0 ? indent : 0), y: top - p.size, size: p.size, font: p.font, color: p.color });
      top -= p.size * LEAD;
    });
    return top - p.gapAfter;
  }

  rule(y: number, color = LINE, thickness = 0.6) {
    this.page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + WIDTH, y }, thickness, color });
  }

  band(yTop: number, height: number, color: RGB) {
    this.page.drawRectangle({ x: MARGIN, y: yTop - height, width: WIDTH, height, color });
  }

  /** The state shape, as in StateCell: circle, square, dashed ring, diamond. */
  icon(state: State, cx: number, cy: number, s: number) {
    const r = s * 0.4;
    const look = STATE_LOOK[state];
    if (state === "met") this.page.drawCircle({ x: cx, y: cy, size: r, color: look.solid });
    else if (state === "not_met") this.page.drawRectangle({ x: cx - r, y: cy - r, width: 2 * r, height: 2 * r, color: look.solid });
    else if (state === "not_found")
      this.page.drawCircle({ x: cx, y: cy, size: r * 0.9, borderColor: look.solid, borderWidth: s * 0.12, borderDashArray: [s * 0.3, s * 0.2] });
    else
      this.page.drawSvgPath(`M 0 ${-r * 1.15} L ${r * 1.15} 0 L 0 ${r * 1.15} L ${-r * 1.15} 0 Z`, {
        x: cx,
        y: cy,
        color: look.solid,
        borderColor: look.edge,
        borderWidth: s * 0.08,
      });
  }
}

function drawColumnHeader(w: PageWriter, f: Fonts, m: Measure, y: number, s: number): number {
  const h = colHeaderHeight(s);
  w.band(y, h, SUNKEN);
  const at = (text: string, x: number) => w.para(para(m, text, f.semibold, s * 0.9, SECONDARY, 400), x, y - padY(s));
  at("Criterion (quoted)", COL.criterion.x + PAD_X);
  at("State", COL.state.x + PAD_X);
  at("Answer (quoted)", COL.answer.x + PAD_X);
  return y - h;
}

function drawBlock(w: PageWriter, f: Fonts, m: Measure, b: Block, y: number, s: number): number {
  if (b.kind === "section") {
    w.band(y, b.height, PAGE_TINT);
    w.rule(y);
    w.para(para(m, b.title, f.semibold, s, INK, WIDTH), COL.criterion.x + PAD_X, y - padY(s));
    return y - b.height;
  }
  w.rule(y);
  const top = y - padY(s);
  w.para(b.criterion, COL.criterion.x + PAD_X, top);
  w.icon(b.row.state, COL.state.x + PAD_X + s * 0.42, top - s * 0.62, s);
  w.para(b.state, COL.state.x + PAD_X + iconRoom(s), top);
  w.para(b.answer, COL.answer.x + PAD_X, top);
  return y - b.height;
}

/** Builds the pack. Returns the PDF bytes and, per page, the patient and the text drawn. */
export async function buildPackPdf(pack: LeadPack, fontBytes: PackFontBytes): Promise<{ bytes: Uint8Array; pages: PackPageSummary[] }> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const fonts: Fonts = {
    regular: await doc.embedFont(fontBytes.regular, { subset: true }),
    semibold: await doc.embedFont(fontBytes.semibold, { subset: true }),
  };
  const m = new Measure(fonts);
  doc.setTitle(`Lead pack ${pack.trial.nct_id}`);
  doc.setAuthor(pack.hospital);
  doc.setSubject(PACK_FOOTER_TEXT);
  doc.setCreator("Pre-screen");
  doc.setProducer("Pre-screen");
  doc.setLanguage("en");
  doc.setCreationDate(new Date(pack.created_at));
  doc.setModificationDate(new Date(pack.created_at));

  const header = headerParas(m, fonts, pack);
  const footer = para(m, PACK_FOOTER_TEXT, fonts.regular, 7, SECONDARY, WIDTH - 64);
  const headerH = parasHeight(header) + HEADER_GAP;
  const bottom = MARGIN + paraHeight(footer) + BEFORE_FOOTER;
  const writers: PageWriter[] = [];

  pack.patients.forEach((p, i) => {
    const n = i + 1;
    const total = pack.patients.length;
    const room = A4.h - MARGIN - headerH - parasHeight(patientParas(m, fonts, p, n, total, false)) - HEADER_GAP - bottom;
    // The largest size at which the whole matrix and its questions fit this one page; else the
    // smallest, continued on further pages.
    let size: number = MATRIX_SIZES[MATRIX_SIZES.length - 1];
    for (const s of MATRIX_SIZES) {
      const need = colHeaderHeight(s) + matrixBlocks(m, fonts, pack, p, s).reduce((h, b) => h + b.height, 0) + s + (questionList(m, fonts, pack, p, s)?.height ?? 0);
      if (need <= room) {
        size = s;
        break;
      }
    }
    const blocks = matrixBlocks(m, fonts, pack, p, size);
    const questions = questionList(m, fonts, pack, p, size);

    let w!: PageWriter;
    let y = 0;
    const newPage = (continued: boolean, withColumns: boolean) => {
      w = new PageWriter(doc.addPage([A4.w, A4.h]), n, continued, size, m);
      writers.push(w);
      y = A4.h - MARGIN;
      for (const h of header) y = w.para(h, MARGIN, y);
      w.rule(y - HEADER_GAP / 2, INK, 1);
      y -= HEADER_GAP;
      for (const x of patientParas(m, fonts, p, n, total, continued)) y = w.para(x, MARGIN, y);
      y -= HEADER_GAP;
      if (withColumns) y = drawColumnHeader(w, fonts, m, y, size);
    };
    newPage(false, true);
    for (const b of blocks) {
      if (y - b.height < bottom) newPage(true, true);
      y = drawBlock(w, fonts, m, b, y, size);
    }
    w.rule(y);
    y -= size;
    if (questions) {
      if (y - questions.height < bottom) newPage(true, false);
      y = w.para(questions.title, MARGIN, y);
      const colX = [MARGIN, MARGIN + (WIDTH + COLUMN_GAP) / 2];
      questions.columns.forEach((col, k) => {
        let cy = y;
        for (const q of col) cy = w.para(q, colX[k], cy);
      });
    }
  });

  writers.forEach((w, i) => {
    const y = MARGIN + paraHeight(footer);
    w.rule(y + BEFORE_FOOTER / 2);
    w.para(footer, MARGIN, y);
    const label = `Page ${i + 1} of ${writers.length}`;
    w.para(para(m, label, fonts.regular, 7, SECONDARY, 64), MARGIN + WIDTH - m.width(label, fonts.regular, 7), y);
  });

  return { bytes: await doc.save(), pages: writers.map((w) => w.summary) };
}

/** "lead-pack-NCT06380751-2026-10-10.pdf", dated in the hospital's time zone like the pages. */
export function packFileName(pack: { trial: Pick<LeadPack["trial"], "nct_id">; created_at: string }): string {
  const day = new Date(pack.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Sofia" });
  return `lead-pack-${pack.trial.nct_id}-${day}.pdf`;
}
