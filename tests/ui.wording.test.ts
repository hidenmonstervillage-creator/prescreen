import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname, basename } from "node:path";
import { VERDICT_WORDS, FOOTER_TEXT, findVerdictWord, hasEmDash } from "@/lib/wording";

const ROOT = join(__dirname, "..");

// Directories never scanned: dependencies, build output, local-only reports, and
// verbatim ClinicalTrials.gov source text kept as test fixtures.
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "reports", "coverage"]);
const SKIP_PATHS = new Set(["tests/fixtures"]);
const SKIP_FILES = new Set(["package-lock.json", "next-env.d.ts"]);
const EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".css", ".sql", ".html", ".txt", ".yml", ".yaml",
]);

// The only files allowed to spell out the banned words: the rules and the list itself.
const VERDICT_WHITELIST = new Set(["CLAUDE.md", "lib/wording.ts"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    const rel = relative(ROOT, abs).split("\\").join("/");
    if (statSync(abs).isDirectory()) {
      if (SKIP_DIRS.has(name) || SKIP_PATHS.has(rel)) continue;
      walk(abs, out);
    } else if (EXTENSIONS.has(extname(name)) && !SKIP_FILES.has(basename(name))) {
      out.push(rel);
    }
  }
  return out;
}

const files = walk(ROOT);

describe("wording rules (CLAUDE.md rules 3 and 5)", () => {
  it("scans a real set of files", () => {
    expect(files).toContain("CLAUDE.md");
    expect(files).toContain("lib/wording.ts");
    expect(files.length).toBeGreaterThan(10);
  });

  it("the detectors catch what they are meant to catch", () => {
    for (const w of VERDICT_WORDS) expect(findVerdictWord(`you are ${w} here`)).not.toBeNull();
    expect(findVerdictWord(FOOTER_TEXT)).toBeNull();
    expect(findVerdictWord("raw_eligibility eligibilityCriteria")).toBeNull();
    expect(hasEmDash(`a ${String.fromCharCode(0x2014)} b`)).toBe(true);
    expect(hasEmDash("a - b, c: d")).toBe(false);
  });

  it("no banned verdict words outside the whitelist", () => {
    const hits: string[] = [];
    for (const f of files) {
      if (VERDICT_WHITELIST.has(f)) continue;
      readFileSync(join(ROOT, f), "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          const w = findVerdictWord(line);
          if (w) hits.push(`${f}:${i + 1} "${w}"`);
        });
    }
    expect(hits).toEqual([]);
  });

  it("no em dashes anywhere", () => {
    const hits: string[] = [];
    for (const f of files) {
      readFileSync(join(ROOT, f), "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (hasEmDash(line)) hits.push(`${f}:${i + 1}`);
        });
    }
    expect(hits).toEqual([]);
  });
});
