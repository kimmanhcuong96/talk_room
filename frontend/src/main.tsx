import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AdminApp } from "./components/admin/AdminApp";
import { getAdminPageFromPath } from "./lib/routes";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {getAdminPageFromPath() ? <AdminApp /> : <App />}
  </React.StrictMode>
);
