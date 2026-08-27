import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import mdx from "@astrojs/mdx";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  site: "https://boxhauls.com",
  output: "static",
  trailingSlash: "always",
  integrations: [react(), mdx(), tailwind({ applyBaseStyles: false })],
});
