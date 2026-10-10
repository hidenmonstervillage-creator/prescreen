import { describe, it, expect } from "vitest";
import { checkSupabaseEnv, assertSupabaseEnv, refFromSupabaseUrl, REFUSED_REFS } from "@/lib/env-guard";

const REF = "abcdefghijklmnopqrst";
const OTHER = "tsrqponmlkjihgfedcba";

function fakeJwt(payload: Record<string, unknown>): string {
  const enc = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${enc({ alg: "HS256", typ: "JWT" })}.${enc(payload)}.signature`;
}

const good = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${REF}.supabase.co`,
  EXPECTED_SUPABASE_REF: REF,
  SUPABASE_SERVICE_ROLE_KEY: fakeJwt({ iss: "supabase", ref: REF, role: "service_role" }),
  SUPABASE_DB_URL: `postgresql://postgres.${REF}:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
  SUPABASE_ANON_KEY: fakeJwt({ iss: "supabase", ref: REF, role: "anon" }),
};

describe("env guard", () => {
  it("passes for the pinned project", () => {
    expect(checkSupabaseEnv(good, { requireDbUrl: true, requireServiceKey: true })).toEqual([]);
    expect(() => assertSupabaseEnv(good)).not.toThrow();
  });

  it("parses the project ref from the URL", () => {
    expect(refFromSupabaseUrl(`https://${REF}.supabase.co`)).toBe(REF);
    expect(refFromSupabaseUrl(`https://${REF}.supabase.co/`)).toBe(REF);
    expect(refFromSupabaseUrl(`http://${REF}.supabase.co`)).toBeNull();
    expect(refFromSupabaseUrl(`https://${REF}.example.com`)).toBeNull();
  });

  it("refuses a URL that does not match EXPECTED_SUPABASE_REF", () => {
    const errs = checkSupabaseEnv({ ...good, NEXT_PUBLIC_SUPABASE_URL: `https://${OTHER}.supabase.co` });
    expect(errs).toContain("NEXT_PUBLIC_SUPABASE_URL does not match EXPECTED_SUPABASE_REF");
  });

  it("refuses when either value is missing", () => {
    expect(checkSupabaseEnv({ ...good, EXPECTED_SUPABASE_REF: "" })).toContain("EXPECTED_SUPABASE_REF is not set");
    expect(checkSupabaseEnv({ ...good, NEXT_PUBLIC_SUPABASE_URL: undefined })).toContain(
      "NEXT_PUBLIC_SUPABASE_URL is not set",
    );
  });

  it.each(REFUSED_REFS)("refuses the project %s even when it is the expected ref", (ref) => {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
      EXPECTED_SUPABASE_REF: ref,
    };
    const errs = checkSupabaseEnv(env);
    expect(errs).toContain("EXPECTED_SUPABASE_REF names a refused project");
    expect(errs).toContain("NEXT_PUBLIC_SUPABASE_URL points at a refused project");
    expect(() => assertSupabaseEnv(env)).toThrow(/refused to start/);
  });

  it.each(REFUSED_REFS)("refuses a DB URL or key that mentions %s", (ref) => {
    const errs = checkSupabaseEnv({
      ...good,
      SUPABASE_DB_URL: `postgresql://postgres.${ref}:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres`,
      SUPABASE_SERVICE_ROLE_KEY: fakeJwt({ ref, role: "service_role" }),
    });
    expect(errs).toContain("SUPABASE_DB_URL points at a refused project");
    expect(errs).toContain("SUPABASE_SERVICE_ROLE_KEY points at a refused project");
  });

  it("refuses a DB URL for another project", () => {
    const errs = checkSupabaseEnv({ ...good, SUPABASE_DB_URL: good.SUPABASE_DB_URL.replace(REF, OTHER) });
    expect(errs).toContain("SUPABASE_DB_URL does not name EXPECTED_SUPABASE_REF");
  });

  it("refuses swapped or foreign keys", () => {
    expect(checkSupabaseEnv({ ...good, SUPABASE_SERVICE_ROLE_KEY: good.SUPABASE_ANON_KEY })).toContain(
      "SUPABASE_SERVICE_ROLE_KEY is not a service_role key",
    );
    expect(
      checkSupabaseEnv({ ...good, SUPABASE_SERVICE_ROLE_KEY: fakeJwt({ ref: OTHER, role: "service_role" }) }),
    ).toContain("SUPABASE_SERVICE_ROLE_KEY belongs to another project");
    expect(checkSupabaseEnv({ ...good, SUPABASE_SERVICE_ROLE_KEY: "sb_publishable_x" })).toContain(
      "SUPABASE_SERVICE_ROLE_KEY holds a publishable key, not the service_role or secret key",
    );
    expect(checkSupabaseEnv({ ...good, SUPABASE_SERVICE_ROLE_KEY: "sb_secret_x" })).toEqual([]);
  });

  it("never puts a value in an error message", () => {
    const secret = fakeJwt({ ref: OTHER, role: "service_role" });
    const errs = checkSupabaseEnv({ ...good, SUPABASE_SERVICE_ROLE_KEY: secret, EXPECTED_SUPABASE_REF: "nope" });
    for (const e of errs) {
      expect(e).not.toContain(secret);
      expect(e).not.toContain(OTHER);
      expect(e).not.toContain("nope");
    }
  });
});
