import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@speedread/reader-ui/reader.css";
import "./sidepanel.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
