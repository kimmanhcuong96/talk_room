import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { AdminApp } from "./components/admin/AdminApp";
import { getAdminPageFromPath, homePath, isKnownClientPath } from "./lib/routes";
import { ThemeProvider } from "./lib/theme";
import "./styles.css";

const knownPath = isKnownClientPath();
if (!knownPath) window.location.replace(homePath());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      {knownPath ? (getAdminPageFromPath() ? <AdminApp /> : <App />) : null}
    </ThemeProvider>
  </React.StrictMode>
);
