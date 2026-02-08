import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Forms from "./pages/Forms";
import FormResponse from "./pages/FormResponse";
import FormBuilder from "./pages/FormBuilder";
import PendingQueue from "./pages/PendingQueue";
import HandoverBag from "./pages/HandoverBag";
import Changelog from "./pages/Changelog";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={MemberHome} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/river-cleaning"} component={RiverCleaning} />
      <Route path={"/inventory"} component={Inventory} />
      <Route path={"/templates"} component={Templates} />
      <Route path={"/rules"} component={Rules} />
      <Route path={"/year-log"} component={YearLog} />
      <Route path={"/faq"} component={FAQ} />
      <Route path={"/admin"} component={AdminDashboard} />
      <Route path={"/vault"} component={Vault} />
      <Route path={"/audit-logs"} component={AuditLogs} />
      <Route path={"/forms"} component={Forms} />
      <Route path={"/form-builder"} component={FormBuilder} />
      <Route path={"/form-response/:formId"} component={FormResponse} />
      <Route path={"/pending-queue"} component={PendingQueue} />
      <Route path={"/handover-bag"} component={HandoverBag} />
      <Route path={"/changelog"} component={Changelog} />
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
