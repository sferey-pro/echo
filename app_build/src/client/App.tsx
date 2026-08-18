import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Toaster } from "sonner";
import "./index.css";

function App() {
  return (
    <>
      <DashboardLayout />
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
