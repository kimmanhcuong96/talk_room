import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AdminApp } from "./components/admin/AdminApp";
import { getAdminPageFromPath, homePath, isKnownClientPath } from "./lib/routes";
import "./styles.css";

const knownPath = isKnownClientPath();
if (!knownPath) window.location.replace(homePath());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {knownPath ? (getAdminPageFromPath() ? <AdminApp /> : <App />) : null}
  </React.StrictMode>
);
