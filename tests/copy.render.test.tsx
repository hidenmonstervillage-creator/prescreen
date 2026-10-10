// User-facing copy on the screens this rework touched, as rendered: the role wording (hospital,
// research team, hospital inbox), the landing hero, the pricing cards, the inbox flag and
// checkbox, and the lead pack preview. None may use a banned word; the two footers and the
// Karma label are the named exceptions.
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Home from "@/app/page";
import PricingPage from "@/app/pricing/page";
import InboxTable, { type InboxViewRow } from "@/components/InboxTable";
import LeadPackPreview from "@/components/LeadPackPreview";
import FinderResultList from "@/components/FinderResultList";
import PublicForm, { CONFIRMATION_TEXT } from "@/components/PublicForm";
import { emptyUsage } from "@/lib/openai";
import { mapDeterministic } from "@/lib/mapping";
import { PRINCIPLE_LINE } from "@/lib/copy";
import { FOOTER_TEXT, PACK_FOOTER_TEXT, hasEmDash } from "@/lib/wording";
import type { LeadPack } from "@/lib/pack";
import type { Answers, Criterion, Question } from "@/lib/types";

const FIX = JSON.parse(readFileSync(join(__dirname, "fixtures", "NCT06380751.generated.json"), "utf8")) as {
  criteria: Criterion[];
  questions: Question[];
};

/** The banned words for user-facing copy, in any form. */
const BANNED = /\b(in)?eligib\w*|\bviab\w*|\bqualif\w*|\b\w*likel\w*|\bscor\w*|\bfinder\w*|\bmatch\w*/i;
const KARMA_LABEL = "Request records for a full match";

/** The only phrases that may say "site" (CLAUDE.md): the contracted trial site a patient is referred to. */
const SITE_PHRASES = ["contracted trial site", "trial site", "site network"];

/** Visible text: tags dropped, the allowed footers and the Karma label taken out. */
function visible(html: string): string {
  return html
    .replace(/<!-- -->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .split(PACK_FOOTER_TEXT)
    .join(" ")
    .split(FOOTER_TEXT)
    .join(" ")
    .split(KARMA_LABEL)
    .join(" ")
    .replace(/\s+/g, " ");
}

function clean(html: string) {
  const text = visible(html);
  expect(text.match(BANNED)?.[0] ?? null).toBeNull();
  const withoutSitePhrases = SITE_PHRASES.reduce((t, p) => t.split(p).join(" "), text);
  expect(withoutSitePhrases.match(/\bsites?\b/i)?.[0] ?? null).toBeNull();
  expect(hasEmDash(html)).toBe(false);
  return text;
}

const CLEAN: Answers = { q1: "Adult female, post-menopausal", q2: "yes" };
for (let k = 3; k <= 12; k++) CLEAN[`q${k}`] = "no";
const rows = mapDeterministic(FIX.criteria, FIX.questions, CLEAN).rows;

function inboxRow(id: string, over: Partial<InboxViewRow>): InboxViewRow {
  return {
    id,
    created_at: "2026-10-10T12:02:49Z",
    submitted: "10 Oct 2026, 15:02",
    contact: `Fictional ${id} (fictional patient), +359 00 000 0000`,
    trial: { id: "t", nct_id: "NCT06380751", title: "Saruparib study" },
    consent_given: true,
    consent_at: "2026-10-10T12:02:49Z",
    confirmed_by_coordinator: false,
    confirmed_at: null,
    counts: { met: 12, not_met: 0, not_found: 7, needs_clinician: 15 },
    referral_ready: true,
    packable: false,
    ...over,
  };
}

describe("landing hero", () => {
  it("headline and sub-line are exact, and staff sign in names the hospital", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Trials run through a dozen hospitals. Patients are everywhere else.");
    expect(visible(html)).toContain(
      "Atlas lets a doctor at any hospital pre-screen a patient against a trial’s criteria and refer them, consented and referral-ready, to a contracted trial site. CROs get patients their site network never sees.",
    );
    expect(html).toContain("Hospital sign in");
    clean(html);
  });
});

describe("pricing", () => {
  const html = renderToStaticMarkup(<PricingPage />);
  const text = visible(html);

  it("three cards: CRO, hospital, patient, with the placeholders as written", () => {
    expect(html.match(/data-plan=/g)).toHaveLength(3);
    expect(text).toContain("CRO Per trial or per country. €[X] per pre-screened lead delivered, plus €[Z] when the patient enrols.");
    expect(text).toContain("Trial plan: €990 per trial per month, [N] leads included, success fee on top.");
    expect(text).toContain("Referring hospital Pays nothing. Earns [Y]% of every fee. Trial setup free.");
    expect(text).toContain("Patient Free.");
  });

  it("the principle line under all three, then the free leads line under the cards", () => {
    expect(PRINCIPLE_LINE).toBe("No verdicts. Every line cited. Missing means not found, never guessed.");
    expect(text.indexOf(PRINCIPLE_LINE)).toBeGreaterThan(text.indexOf("Patient Free."));
    expect(text.indexOf("First 10 leads per trial free to the CRO.")).toBeGreaterThan(text.indexOf(PRINCIPLE_LINE));
    clean(html);
  });
});

describe("hospital inbox", () => {
  const ready = inboxRow("a", {});
  const red = inboxRow("c", { counts: { met: 11, not_met: 1, not_found: 7, needs_clinician: 15 }, referral_ready: false });

  it("each row shows the four counts, the referral-ready label when it applies, and the coordinator checkbox", () => {
    const html = renderToStaticMarkup(<InboxTable rows={[ready, red]} />);
    expect(html.match(/data-submission-id=/g)).toHaveLength(2);
    expect(html).toContain("12 met · 0 not met · 7 not found · 15 need a clinician");
    expect(html).toContain("11 met · 1 not met · 7 not found · 15 need a clinician");
    expect(html.match(/data-referral-ready/g)).toHaveLength(1);
    expect(html.match(/>referral-ready</g)).toHaveLength(1);
    expect(html.match(/data-confirm/g)).toHaveLength(2);
    expect(html.match(/>Confirmed by coordinator<\/label>/g)).toHaveLength(2);
    // The readiness filter replaced the "Referral-ready only" toggle and keeps its data-filter-ready hook.
    expect(html).toMatch(/<select[^>]*data-filter-ready[^>]*>/);
    expect(html).toContain("Referral-ready and confirmed");
    clean(html);
  });

  it("phone numbers in the contact column stay on one line, and the contact text is unchanged", () => {
    const html = renderToStaticMarkup(<InboxTable rows={[ready]} />);
    expect(html).toMatch(/<span class="whitespace-nowrap" data-phone="true">\+359 00 000 0000<\/span>/);
    expect(visible(html)).toContain("Fictional a (fictional patient), +359 00 000 0000");
  });

  it("Build lead pack is disabled until a referral-ready row is confirmed, then opens the preview", () => {
    const none = renderToStaticMarkup(<InboxTable rows={[ready, red]} />);
    expect(none).toMatch(/<button[^>]*disabled=""[^>]*data-build-pack[^>]*>Build lead pack</);
    const confirmed = { ...ready, confirmed_by_coordinator: true, confirmed_at: "2026-10-10T18:40:00Z", packable: true };
    const one = renderToStaticMarkup(<InboxTable rows={[confirmed, red]} />);
    const link = one.match(/<a [^>]*>Build lead pack</)?.[0] ?? "";
    expect(link).toContain("data-build-pack");
    expect(link).toContain('href="/site/inbox/pack"');
  });
});

describe("lead pack preview", () => {
  const pack: LeadPack = {
    trial: { id: "t", nct_id: "NCT06380751", title: "Saruparib study", criteria: FIX.criteria, questions: FIX.questions },
    hospital: "[Hospital name]",
    created_at: "2026-10-10T18:45:00Z",
    patients: [
      {
        submission_id: "s1",
        contact: "Lora Primerna (fictional patient), +359 00 000 0001",
        submitted_at: "2026-10-10T12:02:49Z",
        consent_at: "2026-10-10T12:02:49Z",
        confirmed_at: "2026-10-10T18:40:00Z",
        rows,
      },
    ],
  };

  it("shows what the PDF holds, with the pack footer, and downloads only", () => {
    const html = renderToStaticMarkup(<LeadPackPreview pack={pack} downloadHref="/api/site/pack?trial=t&amp;ids=s1" />);
    expect(html).toContain("Lora Primerna (fictional patient), +359 00 000 0001");
    expect(html).toContain("Consent given: 10 Oct 2026, 15:02");
    expect(html).toContain("For the research team at the contracted trial site.");
    expect(visible(html)).toContain("Lead pack · NCT06380751 · Referred from: [Hospital name] · Date: 10 Oct 2026");
    expect(html).toContain(PACK_FOOTER_TEXT);
    expect(html.match(/data-criterion-id=/g)).toHaveLength(FIX.criteria.length);
    expect(html).toContain("Download PDF");
    expect(html).toContain("Download only. Nothing is sent.");
    clean(html);
  });
});

describe("public page and /find", () => {
  it("the public form names the research team, and the thank-you is exact", () => {
    expect(CONFIRMATION_TEXT).toBe("Thank you. The research team will contact you.");
    const html = renderToStaticMarkup(
      <PublicForm slug="nct06380751-md2jhsjd" questions={FIX.questions.map(({ id, text, type, options }) => ({ id, text, type, options }))} />,
    );
    expect(html).toContain(
      "Answer these questions with your doctor, or on your own. You can choose “Not sure” or leave a question blank. The research team at the trial site reads your answers and contacts you.",
    );
    clean(html);
  });

  it("/find says hospitals and its button is Pre-screen patients", () => {
    const html = renderToStaticMarkup(
      <FinderResultList
        outcome={{
          input: { condition: "breast cancer", markers: "", city: "Plovdiv" },
          widened: true,
          searches: [{ locn: "Plovdiv, Bulgaria", returned: 1, total: 1 }],
          results: [
            {
              nctId: "NCT06380751",
              title: "Saruparib study",
              phase: "Phase 3",
              status: "Recruiting",
              sites: [{ facility: "Plovdiv Hospital (fictional)", city: "Plovdiv" }],
              cities: ["Plovdiv"],
              lines: [],
              linesStatus: "unavailable",
              prescreenHref: "/s/nct06380751-md2jhsjd",
            },
          ],
          usage: emptyUsage(),
          modelCalls: 0,
          cacheHits: 0,
        }}
      />,
    );
    expect(html).toContain(">Pre-screen patients<");
    expect(html).toContain("Recruiting hospitals in Bulgaria");
    clean(html);
    const page = readFileSync(join(__dirname, "..", "app/find/page.tsx"), "utf8");
    expect(page).toContain("Find a recruiting trial for a patient");
  });
});
