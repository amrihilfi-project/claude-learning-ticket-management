import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";

const container = document.getElementById("root")!;
createRoot(container).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
