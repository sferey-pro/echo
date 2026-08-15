import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ThemeProvider } from "./components/theme-provider";
import "./index.css";

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DashboardLayout />
    </ThemeProvider>
  );
}

export default App;
