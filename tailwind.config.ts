import type { Config } from "tailwindcss";
import karma from "./styles/karma-tailwind-v3-preset.js";

const config: Config = {
  // The preset is generated plain JS; its fontSize tuples infer as arrays, hence the cast.
  presets: [karma as unknown as Partial<Config>],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // The Karma families, loaded by next/font in app/layout.tsx, which sets these variables.
      fontFamily: {
        sans: ["var(--font-sans)", ...karma.theme.extend.fontFamily.sans],
        mono: ["var(--font-mono)", ...karma.theme.extend.fontFamily.mono],
      },
      colors: {
        // tests/matrix.render.test.tsx pins the class bg-green-50 on the met state, so it is
        // aliased to Karma's state-met-tint and StateCell keeps that class name.
        green: { 50: karma.theme.extend.colors["state-met-tint"] },
      },
    },
  },
  plugins: [],
};

export default config;
