import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Shipping Tickets Snippet 2",
  version: "1.0.0",
  description: "Открывает свою страницу настроек по клику на иконку.",
  action: {
    default_title: "Открыть настройки",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  icons: {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png",
  },
  permissions: ["storage"],
  host_permissions: ["https://dinchedope.atlassian.net/*"],
  web_accessible_resources: [
    {
      resources: ["index.html"],
      matches: ["<all_urls>"],
    },
  ],
});
