import type { Config } from "tailwindcss";
import designSystem from "./docs/design-system/project/assets/Code/karma-tailwind-v3-preset.js";

// The design system's Tailwind v3 preset, used as shipped (docs/design-system/VENDORED.md). It extends
// the default theme with every token, one class each: bg-page, text-ink, text-state-met-ink, text-title.
// Components use the semantic classes, never the palette ones. The fonts are declared in app/globals.css.
const config: Config = {
  // The preset is generated plain JS; its fontSize tuples infer as arrays, hence the cast.
  presets: [designSystem as unknown as Partial<Config>],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  plugins: [],
};

export default config;
