// The lead pack fonts: static Geologica TTFs in public/fonts. Read from disk (traced into the
// function by next.config.mjs); if a deployment lacks them on disk, fetched from its own
// public path. Server only.
import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PACK_FONT_FILES, type PackFontBytes } from "./pack";

async function fontFile(name: string, origin: string): Promise<Uint8Array> {
  try {
    return await readFile(join(process.cwd(), "public", "fonts", name));
  } catch {
    const res = await fetch(new URL(`/fonts/${name}`, origin), { cache: "no-store" });
    if (!res.ok) throw new Error(`pack font ${name} unavailable (${res.status})`);
    return new Uint8Array(await res.arrayBuffer());
  }
}

export async function packFonts(origin: string): Promise<PackFontBytes> {
  const [regular, semibold] = await Promise.all([fontFile(PACK_FONT_FILES.regular, origin), fontFile(PACK_FONT_FILES.semibold, origin)]);
  return { regular, semibold };
}
