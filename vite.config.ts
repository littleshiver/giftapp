import { defineConfig } from "vite";

export default defineConfig(({ command, isPreview }) => ({
  // Keep local development at /; production assets and preview use the Pages path.
  base: command === "serve" && !isPreview ? "/" : "/giftapp/",
}));
