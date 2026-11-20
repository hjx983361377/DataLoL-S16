import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 站点根在仓库根目录的 public/（英雄头像、队标等静态素材），
// 数据在仓库根目录的 data/，所以 dev server 需要允许访问上一级目录。
export default defineConfig({
  plugins: [react()],
  publicDir: "../public",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    // 允许通过隧道域名（trycloudflare 等）访问，方便临时对外演示
    allowedHosts: true,
    fs: { allow: [".."] },
    watch: { usePolling: true, interval: 300 }
  }
});
