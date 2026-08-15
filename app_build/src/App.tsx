import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "sonner";
import "./index.css";

export function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <DashboardLayout />
      <Toaster 
        position="bottom-right"
        toastOptions={{
          className: 'bg-white dark:bg-slate-800 border-2 border-neo-border shadow-[4px_4px_0px_black] rounded-none font-bold text-foreground',
        }}
      />
    </ThemeProvider>
  );
}

export default App;
