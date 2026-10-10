// Pure text helpers shared by generation, mapping and the UI.

/** Collapses every run of whitespace to one space and trims. */
export function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * ClinicalTrials.gov criteria are markdown and escape punctuation with a backslash
 * ("LVEF \<50%"); the text a reader sees has no backslash. Escapes are markup, not text.
 */
export function unescapeMarkdown(s: string): string {
  return s.replace(/\\([\\`*_{}[\]()#+\-.!<>|~=])/g, "$1");
}

/** The visible text: markdown escapes removed, whitespace normalised. Quotes are checked against this. */
export function visibleText(s: string): string {
  return normalizeWs(unescapeMarkdown(s));
}
