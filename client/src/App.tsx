import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PublicHome from "./pages/PublicHome";
import MemberHome from "./pages/MemberHome";
import Calendar from "./pages/Calendar";
import RiverCleaning from "./pages/RiverCleaning";
import Inventory from "./pages/Inventory";
import Templates from "./pages/Templates";
import Rules from "./pages/Rules";
import YearLog from "./pages/YearLog";
import FAQ from "./pages/FAQ";
import AdminDashboard from "./pages/AdminDashboard";
import Vault from "./pages/Vault";
import AuditLogs from "./pages/AuditLogs";
import Rotation from "./pages/Rotation";
import Attendance from "./pages/Attendance";
import AttendanceForm from "./pages/AttendanceForm";
import AttendanceAdmin from "./pages/AttendanceAdmin";
import EmailSettings from "./pages/EmailSettings";
import ExemptionApplication from "./pages/ExemptionApplication";
import ExemptionAdmin from "./pages/ExemptionAdmin";
import HandoverBag from "@/pages/HandoverBag";
import InquiryForm from "@/pages/InquiryForm";
import InquiryQueue from "@/pages/InquiryQueue";
import { useAuth } from "@/_core/hooks/useAuth";

function Router() {
  const { isAuthenticated, user } = useAuth();

  return (
    <Switch>
      <Route path={"/"} component={isAuthenticated ? MemberHome : PublicHome} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/river-cleaning"} component={RiverCleaning} />
      <Route path={"/inventory"} component={Inventory} />
      <Route path={"/templates"} component={Templates} />
      <Route path={"/rules"} component={Rules} />
      <Route path={"/year-log"} component={YearLog} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/admin"} component={user?.role === "admin" ? AdminDashboard : NotFound} />
      <Route path={"/vault"} component={user?.role === "admin" ? Vault : NotFound} />
      <Route path={"/audit-logs"} component={user?.role === "admin" ? AuditLogs : NotFound} />
      <Route path={"/rotation"} component={Rotation} />
      <Route path={"/attendance"} component={Attendance} />
      <Route path={"/attendance/:id"} component={AttendanceForm} />
      <Route path={"/attendance/:id/admin"} component={user?.role === "admin" ? AttendanceAdmin : NotFound} />
      <Route path={"/email-settings"} component={EmailSettings} />
      <Route path={"/exemption"} component={ExemptionApplication} />
      <Route path={"/exemption/admin"} component={user?.role === "admin" ? ExemptionAdmin : NotFound} />
      <Route path={"/handover-bag"} component={HandoverBag} />
      <Route path={"/inquiry"} component={InquiryForm} />
      <Route path={"/inquiry-queue"} component={user?.role === "admin" ? InquiryQueue : NotFound} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
