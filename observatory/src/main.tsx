import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SwarmApp } from "@/components/swarm/SwarmApp";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SwarmApp />
  </StrictMode>,
);
