import { Router, Route, Switch } from "wouter";
import { Toaster } from "sonner";
import { AdminAuthProvider, RequireAdmin } from "./hooks/useAdminAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Bets from "./pages/Bets";
import Transactions from "./pages/Transactions";
import Commission from "./pages/Commission";
import Settings from "./pages/Settings";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function App() {
  return (
    <Router base={base}>
      <AdminAuthProvider>
        <Switch>
          <Route path="/login" component={Login} />
          <Route>
            <RequireAdmin>
              <Layout>
                <Switch>
                  <Route path="/" component={Overview} />
                  <Route path="/users" component={Users} />
                  <Route path="/bets" component={Bets} />
                  <Route path="/transactions" component={Transactions} />
                  <Route path="/commission" component={Commission} />
                  <Route path="/settings" component={Settings} />
                  <Route>
                    <div className="flex flex-col items-center justify-center py-32 text-muted-foreground">
                      <span className="text-6xl mb-4 opacity-20">404</span>
                      <p className="text-sm">Page not found</p>
                    </div>
                  </Route>
                </Switch>
              </Layout>
            </RequireAdmin>
          </Route>
        </Switch>
        <Toaster theme="dark" position="bottom-right" richColors />
      </AdminAuthProvider>
    </Router>
  );
}
