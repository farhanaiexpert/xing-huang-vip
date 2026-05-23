import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/components/protected-route";
import NotFound from "@/pages/not-found";

import Login from "@/pages/login";
import Overview from "@/pages/overview";
import Users from "@/pages/users";
import Bets from "@/pages/bets";
import Transactions from "@/pages/transactions";
import Commissions from "@/pages/commissions";

const queryClient = new QueryClient();

function Root() {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return null;
  }
  
  if (user && user.role === "admin") {
    return <Redirect to="/overview" />;
  }
  return <Redirect to="/login" />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Root} />
      <Route path="/login" component={Login} />
      
      <Route path="/overview">
        <ProtectedRoute><Overview /></ProtectedRoute>
      </Route>
      <Route path="/users">
        <ProtectedRoute><Users /></ProtectedRoute>
      </Route>
      <Route path="/bets">
        <ProtectedRoute><Bets /></ProtectedRoute>
      </Route>
      <Route path="/transactions">
        <ProtectedRoute><Transactions /></ProtectedRoute>
      </Route>
      <Route path="/commissions">
        <ProtectedRoute><Commissions /></ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthProvider>
            <Router />
          </AuthProvider>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
