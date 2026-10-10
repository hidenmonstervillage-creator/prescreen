// Consent on the public pre-screen: the page requires the box, the server refuses a submission
// without it and stores consent_given and consent_at with it, and the anon policy requires it.
// Runs the real submit route and lib/trials.ts against an in-memory stand-in for Supabase.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { CONSENT_REQUIRED_MESSAGE, CONSENT_TEXT, consentGiven } from "@/lib/consent";
import ConsentField from "@/components/ConsentField";

const ROOT = join(__dirname, "..");

type Write = { table: string; op: "insert"; row: Record<string, unknown> };
const writes: Write[] = [];

const TRIAL = {
  id: "trial-a",
  nct_id: "NCT06380751",
  title: "A",
  slug: "nct06380751-md2jhsjd",
  questions: [{ id: "q1", text: "Yes or no?", type: "yes_no", options: null, criterion_ids: ["e1"], rules: [] }],
};

/** The subset of the Supabase query builder the submit path uses. */
function from(table: string) {
  let inserting = false;
  const b = {
    select: () => b,
    eq: () => b,
    not: () => b,
    gte: () => b,
    insert: (row: Record<string, unknown>) => {
      inserting = true;
      writes.push({ table, op: "insert", row });
      return b;
    },
    single: async () => ({ data: { id: "sub-1" }, error: null }),
    // The trial lookup finds the published trial; the map build finds nothing and is left for a rebuild.
    maybeSingle: async () => ({ data: table === "trials" ? TRIAL : null, error: null }),
    then: (resolve: (v: unknown) => unknown) => resolve(inserting ? { error: null } : { count: 0, error: null }),
  };
  return b;
}

vi.mock("@/lib/supabase", () => ({ db: () => ({ from }) }));

const { POST } = await import("@/app/api/s/[slug]/submit/route");

function post(body: unknown) {
  const req = new Request(`http://localhost/api/s/${TRIAL.slug}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": "203.0.113.8" },
    body: JSON.stringify(body),
  });
  return POST(req, { params: { slug: TRIAL.slug } });
}

const VALID = { answers: { q1: "no" }, contact: "Fictional Tester (fictional patient), +359 00 000 0000" };

beforeEach(() => {
  writes.length = 0;
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-10T12:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("consent is required to submit", () => {
  it("refuses a submission without consent with 400, and stores nothing", async () => {
    for (const consent of [undefined, false, "true", 1, "yes", null]) {
      const res = await post({ ...VALID, consent });
      expect(res.status).toBe(400);
      expect((await res.json()).error).toBe(CONSENT_REQUIRED_MESSAGE);
    }
    expect(writes.filter((w) => w.table === "submissions")).toEqual([]);
  });

  it("stores consent_given and consent_at with the submission when the box is ticked", async () => {
    const res = await post({ ...VALID, consent: true });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    const saved = writes.filter((w) => w.table === "submissions");
    expect(saved).toHaveLength(1);
    expect(saved[0].row).toMatchObject({ trial_id: "trial-a", answers: { q1: "no" }, contact: VALID.contact, consent_given: true });
    expect(saved[0].row.consent_at).toBe("2026-10-10T12:00:00.000Z");
    expect(saved[0].row).not.toHaveProperty("confirmed_by_coordinator");
  });

  it("only a literal true counts as consent", () => {
    expect(consentGiven({ consent: true })).toBe(true);
    for (const v of [false, "true", 1, "on", {}, [], null, undefined]) expect(consentGiven({ consent: v })).toBe(false);
    expect(consentGiven(null)).toBe(false);
  });
});

describe("the consent box on the public page", () => {
  it("is one required checkbox with the exact English and Bulgarian text side by side", () => {
    const html = renderToStaticMarkup(<ConsentField checked={false} onChange={() => {}} />);
    expect(html.match(/type="checkbox"/g)).toHaveLength(1);
    expect(html).toContain('required=""');
    expect(html).toContain("data-consent-input");
    expect(html).toContain(`<span lang="en" class="text-[17px] leading-7 text-ink">${CONSENT_TEXT.en}</span>`);
    expect(html).toContain(`<span lang="bg" class="text-[17px] leading-7 text-ink">${CONSENT_TEXT.bg}</span>`);
    expect(html).toContain("md:grid-cols-2");
    expect(CONSENT_TEXT.en).toBe(
      "I agree that my answers and contact details may be shared with the research organisation running this trial so that they can contact me. I can withdraw at any time by contacting the hospital.",
    );
    expect(CONSENT_TEXT.bg).toBe(
      "Съгласен/на съм отговорите ми и данните ми за контакт да бъдат споделени с изследователската организация, която провежда това проучване, за да се свърже с мен. Мога да оттегля съгласието си по всяко време, като се свържа с болницата.",
    );
  });

  it("sits above the submit button, which stays disabled until it is ticked, and the form sends it", () => {
    const f = readFileSync(join(ROOT, "components/PublicForm.tsx"), "utf8");
    expect(f.indexOf("<ConsentField")).toBeGreaterThan(-1);
    expect(f.indexOf("<ConsentField")).toBeLessThan(f.indexOf("data-submit"));
    expect(f).toContain("disabled={busy || !contact.trim() || !consent}");
    expect(f).toContain("JSON.stringify({ answers, contact, consent })");
  });

  it("the anon INSERT policy requires consent and anon cannot set the coordinator's columns", () => {
    const sql = readFileSync(join(ROOT, "supabase/migrations/0003_consent_and_confirmation.sql"), "utf8");
    expect(sql).toContain("with check (private.trial_is_published(trial_id) and consent_given and consent_at is not null)");
    expect(sql).toContain("grant insert (trial_id, answers, contact, consent_given, consent_at) on table public.submissions to anon;");
    expect(sql).toContain("revoke insert on table public.submissions from anon;");
  });
});
