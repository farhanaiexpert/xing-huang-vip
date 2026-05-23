import { Router, Route, Switch } from "wouter";
import { AdminAuthProvider, RequireAdmin } from "./hooks/useAdminAuth";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Overview from "./pages/Overview";
import Users from "./pages/Users";
import Bets from "./pages/Bets";
import Commission from "./pages/Commission";

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
                  <Route path="/commission" component={Commission} />
                  <Route>
                    <div className="text-center py-20 text-muted-foreground">
                      Page not found
                    </div>
                  </Route>
                </Switch>
              </Layout>
            </RequireAdmin>
          </Route>
        </Switch>
      </AdminAuthProvider>
    </Router>
  );
}
