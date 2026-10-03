import "@fontsource/montserrat/700.css";
import "@fontsource/montserrat/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "./index.css";

import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { SiteSettingsProvider } from "./hooks/useSiteSettings";
import { router } from "./routes";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <SiteSettingsProvider>
      <RouterProvider router={router} />
    </SiteSettingsProvider>
  </React.StrictMode>,
);
