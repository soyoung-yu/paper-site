// vite.config.js (루트)
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/paper-site/", // 리포지토리명과 정확히 일치
});