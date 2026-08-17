import { DashboardLayout } from "./components/layout/DashboardLayout";
import { Toaster } from "sonner";
import "./index.css";

export function App() {
 return (
 <>
 <DashboardLayout />
 <Toaster 
 position="bottom-right"
 toastOptions={{
 className: 'bg-white border text-foreground',
 }}
 />
 </>
 );
}

export default App;
