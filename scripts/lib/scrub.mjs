// Replaces every .env.local value (and the URL-decoded DB password) in a message with
// its variable name, so script errors never print a value.
export function scrub(message, values) {
  let out = message;
  const pairs = Object.entries(values).filter(([, v]) => v && v.length >= 4);
  try {
    const u = new URL(values.SUPABASE_DB_URL ?? "");
    if (u.password) pairs.push(["SUPABASE_DB_PASSWORD", decodeURIComponent(u.password)]);
    if (u.username) pairs.push(["SUPABASE_DB_USER", u.username]);
    if (u.hostname) pairs.push(["SUPABASE_DB_HOST", u.hostname]);
  } catch {
    // no parseable DB URL, nothing extra to scrub
  }
  // Longest first so a value that contains another is replaced whole.
  pairs.sort((a, b) => b[1].length - a[1].length);
  for (const [name, value] of pairs) out = out.split(value).join(`<${name}>`);
  if (values.EXPECTED_SUPABASE_REF) out = out.split(values.EXPECTED_SUPABASE_REF).join("<EXPECTED_SUPABASE_REF>");
  return out;
}
