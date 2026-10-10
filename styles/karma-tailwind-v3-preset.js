/**
 * Karma: Tailwind v3 preset. Generated from the design system's tokens.json by karma-tailwind-build.mjs.
 * Copied unchanged from the Karma design system except this comment (house rule: no em dashes).
 * Use: module.exports = { presets: [require('./karma-tailwind-v3-preset.js')], content: [...] }
 * It EXTENDS the default theme, so today's slate-50 / emerald-600 classes keep working in the frozen
 * demo screens. New screens use only the Karma names below (bg-page, text-state-met-ink, ...).
 * Aliases are resolved to their final colour here; v4 keeps them as variables.
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        carbon: "#131313",
        navy: "#132774",
        cobalt: "#2443B8",
        accent: "#4965EB",
        periwinkle: "#818FF2",
        lavender: "#B2B9F7",
        mist: "#E7E7E7",
        white: "#FFFFFF",
        page: "#F6F6F6",
        fog: "#DCDCDC",
        cloud: "#BDBDBD",
        pewter: "#6E6E6E",
        graphite: "#4A4A4A",
        ice: "#EFF1FE",
        highlight: "#DBE0FC",
        surface: "#FFFFFF",
        "surface-sunken": "#E7E7E7",
        line: "#DCDCDC",
        "line-strong": "#BDBDBD",
        control: "#6E6E6E",
        "control-hover": "#4A4A4A",
        ink: "#131313",
        "ink-secondary": "#4A4A4A",
        "ink-muted": "#6E6E6E",
        action: "#131313",
        "action-hover": "#132774",
        "action-ink": "#FFFFFF",
        "disabled-fill": "#DCDCDC",
        "disabled-ink": "#6E6E6E",
        link: "#2443B8",
        "link-hover": "#132774",
        "focus-ring": "#4965EB",
        "selected-tint": "#EFF1FE",
        "selected-line": "#4965EB",
        "evidence-tint": "#DBE0FC",
        "evidence-mark": "#B2B9F7",
        "evidence-line": "#4965EB",
        "brand-ground": "#131313",
        "brand-glow": "#132774",
        "brand-ink": "#E7E7E7",
        "brand-action": "#E7E7E7",
        "brand-action-ink": "#131313",
        "brand-dot-1": "#2443B8",
        "brand-dot-2": "#4965EB",
        "brand-dot-3": "#818FF2",
        "brand-dot-4": "#B2B9F7",
        "brand-dot-5": "#E7E7E7",
        "fictional-ink": "#5B21B6",
        "fictional-tint": "#F5F3FF",
        "fictional-line": "#C4B5FD",
        "frozen-ink": "#334155",
        "frozen-tint": "#F1F5F9",
        "frozen-line": "#94A3B8",
        "state-met-solid": "#115E59",
        "state-met-glyph": "#FFFFFF",
        "state-met-ink": "#134E4A",
        "state-met-tint": "#EFF8F6",
        "state-met-line": "#A7CFC9",
        "state-not-met-solid": "#D6341C",
        "state-not-met-glyph": "#FFFFFF",
        "state-not-met-ink": "#7F1D1D",
        "state-not-met-tint": "#FEF2F2",
        "state-not-met-line": "#FECACA",
        "state-not-found-solid": "#64748B",
        "state-not-found-ink": "#334155",
        "state-not-found-tint": "#FFFFFF",
        "state-not-found-line": "#64748B",
        "state-clinician-solid": "#FBBF24",
        "state-clinician-glyph": "#451A03",
        "state-clinician-edge": "#92400E",
        "state-clinician-ink": "#78350F",
        "state-clinician-tint": "#FFFBEB",
        "state-clinician-line": "#FDE68A"
      },
      fontFamily: {
        sans: [
          "Geologica",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "\"Segoe UI\"",
          "Roboto",
          "\"Helvetica Neue\"",
          "Arial",
          "sans-serif"
        ],
        mono: [
          "\"Overpass Mono\"",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "\"Liberation Mono\"",
          "\"Courier New\"",
          "monospace"
        ]
      },
      fontSize: {
        hero: [
          "96px",
          {
            lineHeight: "102px",
            letterSpacing: "-0.035em",
            fontWeight: "700"
          }
        ],
        display: [
          "40px",
          {
            lineHeight: "48px",
            letterSpacing: "-0.03em",
            fontWeight: "700"
          }
        ],
        title: [
          "28px",
          {
            lineHeight: "36px",
            letterSpacing: "-0.01em",
            fontWeight: "700"
          }
        ],
        heading: [
          "20px",
          {
            lineHeight: "28px",
            letterSpacing: "-0.01em",
            fontWeight: "600"
          }
        ],
        body: [
          "15px",
          {
            lineHeight: "22px"
          }
        ],
        quote: [
          "16px",
          {
            lineHeight: "26px"
          }
        ],
        small: [
          "14px",
          {
            lineHeight: "20px"
          }
        ],
        label: [
          "14px",
          {
            lineHeight: "20px",
            letterSpacing: "0.06em",
            fontWeight: "600"
          }
        ]
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(19, 19, 19, 0.05)",
        raised: "0 4px 12px -2px rgba(19, 19, 19, 0.12), 0 2px 4px -2px rgba(19, 19, 19, 0.08)",
        panel: "-16px 0 40px -16px rgba(19, 19, 19, 0.28)"
      },
      maxWidth: {
        content: "1400px"
      },
      width: {
        panel: "520px"
      }
    }
  }
};
