import { Toaster } from "sonner";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { DebugPage } from "./DebugPage";
import "./index.css";

function App() {
  const isDebug = window.location.pathname === "/debug";

  return (
    <>
      {isDebug ? <DebugPage /> : <DashboardLayout />}
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "bg-white border border-border text-foreground",
            error: "bg-red-50 text-red-600 border-red-200",
            success: "bg-green-50 text-green-600 border-green-200",
          },
        }}
      />
    </>
  );
}

export default App;
