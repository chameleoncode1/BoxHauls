import typography from "@tailwindcss/typography";

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        border: "var(--color-border)",
        text: "var(--color-text)",
        "text-muted": "var(--color-text-muted)",
        primary: "var(--color-primary)",
        "primary-foreground": "var(--color-primary-foreground)",
        accent: "var(--color-accent)",
        "accent-foreground": "var(--color-accent-foreground)",
        "accent-hover": "var(--color-accent-hover)",
        "inverse-bg": "var(--color-inverse-bg)",
        "inverse-text": "var(--color-inverse-text)",
        "inverse-text-muted": "var(--color-inverse-text-muted)",
        "inverse-border": "var(--color-inverse-border)",
        success: "var(--color-success)",
        danger: "var(--color-danger)",
        todo: "var(--color-todo)",
        "todo-bg": "var(--color-todo-bg)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        sans: "var(--font-sans)",
      },
      maxWidth: {
        container: "var(--container-max)",
      },
      typography: {
        // Points at the same token-backed colors as everywhere else —
        // no new hardcoded values (CLAUDE.md: colors live in tokens.css
        // only).
        DEFAULT: {
          css: {
            "--tw-prose-body": "var(--color-text)",
            "--tw-prose-headings": "var(--color-text)",
            "--tw-prose-links": "var(--color-accent)",
            "--tw-prose-bold": "var(--color-text)",
            "--tw-prose-counters": "var(--color-text-muted)",
            "--tw-prose-bullets": "var(--color-border)",
            "--tw-prose-hr": "var(--color-border)",
            "--tw-prose-quotes": "var(--color-text)",
            "--tw-prose-quote-borders": "var(--color-border)",
            "--tw-prose-captions": "var(--color-text-muted)",
            "--tw-prose-code": "var(--color-text)",
            "--tw-prose-th-borders": "var(--color-border)",
            "--tw-prose-td-borders": "var(--color-border)",
            maxWidth: "none",
          },
        },
      },
    },
  },
  plugins: [typography],
};
