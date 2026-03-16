import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  manifest: {
    name: "TabPilot",
    description: "Window & Tab Manager — see, organize, and suspend all your tabs",
    permissions: ["tabs", "tabGroups", "storage", "alarms"],
    optional_permissions: ["scripting"],
    optional_host_permissions: ["<all_urls>"],
    commands: {
      "open-dashboard": {
        suggested_key: { default: "Ctrl+Shift+M", mac: "Command+Shift+M" },
        description: "Open TabPilot Dashboard",
      },
    },
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
