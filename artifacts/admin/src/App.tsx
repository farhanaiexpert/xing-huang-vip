import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { isTokenStored } from "@/lib/api";
import Layout from "@/components/Layout";
import LoginPage from "@/pages/LoginPage";
import OverviewPage from "@/pages/OverviewPage";
import UsersPage from "@/pages/UsersPage";
import BetsPage from "@/pages/BetsPage";
import TransactionsPage from "@/pages/TransactionsPage";
import ReferralsPage from "@/pages/ReferralsPage";
import PromotionsPage from "@/pages/PromotionsPage";
import PoolsPage from "@/pages/PoolsPage";
import AuditLogPage from "@/pages/AuditLogPage";
import AdminAccountsPage from "@/pages/AdminAccountsPage";
import WinSpinPage from "@/pages/WinSpinPage";
import MarketsPage from "@/pages/MarketsPage";
import SettingsPage from "@/pages/SettingsPage";
import ReportsPage from "@/pages/ReportsPage";
import UserProfilePage from "@/pages/UserProfilePage";
import SettlementPage from "@/pages/SettlementPage";
import LiabilityPage from "@/pages/LiabilityPage";
import RGPlayersPage from "@/pages/RGPlayersPage";
import BookBalancePage from "@/pages/BookBalancePage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  if (!isTokenStored()) return <Redirect to="/login" />;
  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={() => <ProtectedRoute component={OverviewPage} />} />
      <Route path="/users" component={() => <ProtectedRoute component={UsersPage} />} />
      <Route path="/bets" component={() => <ProtectedRoute component={BetsPage} />} />
      <Route path="/transactions" component={() => <ProtectedRoute component={TransactionsPage} />} />
      <Route path="/referrals" component={() => <ProtectedRoute component={ReferralsPage} />} />
      <Route path="/promotions" component={() => <ProtectedRoute component={PromotionsPage} />} />
      <Route path="/pools" component={() => <ProtectedRoute component={PoolsPage} />} />
      <Route path="/audit" component={() => <ProtectedRoute component={AuditLogPage} />} />
      <Route path="/admin-accounts" component={() => <ProtectedRoute component={AdminAccountsPage} />} />
      <Route path="/winspin" component={() => <ProtectedRoute component={WinSpinPage} />} />
      <Route path="/markets" component={() => <ProtectedRoute component={MarketsPage} />} />
      <Route path="/settings" component={() => <ProtectedRoute component={SettingsPage} />} />
      <Route path="/reports" component={() => <ProtectedRoute component={ReportsPage} />} />
      <Route path="/users/:id" component={() => <ProtectedRoute component={UserProfilePage} />} />
      <Route path="/settlement" component={() => <ProtectedRoute component={SettlementPage} />} />
      <Route path="/liability"     component={() => <ProtectedRoute component={LiabilityPage}    />} />
      <Route path="/rg-players"   component={() => <ProtectedRoute component={RGPlayersPage}     />} />
      <Route path="/book-balance" component={() => <ProtectedRoute component={BookBalancePage}   />} />
      <Route component={() => <Redirect to="/" />} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster theme="dark" richColors position="top-right" />
    </QueryClientProvider>
  );
}
