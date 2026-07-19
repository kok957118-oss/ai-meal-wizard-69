import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.mealmate.mobile",
  appName: "MealMate",
  webDir: "dist",
  server: {
    androidScheme: "https",
    // For hot-reload against the running Lovable preview, set:
    //   url: "https://<your-preview>.lovable.app",
    //   cleartext: true,
  },
  ios: {
    contentInset: "always",
  },
  android: {
    backgroundColor: "#0F172A",
  },
};

export default config;
