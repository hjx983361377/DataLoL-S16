import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

// 只有 JS 可用时才启用滚动入场动效，避免脚本异常/静态渲染时内容不可见。
document.documentElement.classList.add("js");

// 站点可能部署在子路径（GitHub Pages 项目页），路由需带上同一段前缀。
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename || "/"}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
