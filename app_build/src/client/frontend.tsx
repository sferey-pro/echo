/**
 * This file is the entry point for the React app, it sets up the root
 * element and renders the App component to the DOM.
 *
 * It is included in `src/index.html`.
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// biome-ignore lint/style/noNonNullAssertion: DOM element is guaranteed to exist
const elem = document.getElementById("root")!;
const app = (
  <StrictMode>
    <App />
  </StrictMode>
);

// https://bun.com/docs/bundler/hot-reloading#import-meta-hot-data
// biome-ignore lint/suspicious/noAssignInExpressions: Concise assignment pattern
(import.meta.hot.data.root ??= createRoot(elem)).render(app);
