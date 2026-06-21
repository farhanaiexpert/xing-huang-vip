import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
// Home stays eagerly imported so the landing page renders synchronously on first
// paint — this is what lets the instant Chinese translation apply with no flash.
import Home from "@/pages/Home";
// Secondary routes are code-split: their JS only downloads when the user
// navigates to them, shrinking the initial bundle and speeding up first load.
const MatchDetail = lazy(() => import("@/pages/MatchDetail").then((m) => ({ default: m.MatchDetail })));
const Help = lazy(() => import("@/pages/Help").then((m) => ({ default: m.Help })));
const Promotions = lazy(() => import("@/pages/Promotions").then((m) => ({ default: m.Promotions })));
const Terms = lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })));
const Privacy = lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })));
const AMLPolicy = lazy(() => import("@/pages/AMLPolicy").then((m) => ({ default: m.AMLPolicy })));
const WinSpinPage = lazy(() => import("@/pages/WinSpinPage").then((m) => ({ default: m.WinSpinPage })));
const PredictionPools = lazy(() => import("@/pages/PredictionPools").then((m) => ({ default: m.PredictionPools })));
const LivePage = lazy(() => import("@/pages/LivePage").then((m) => ({ default: m.LivePage })));
const WorldCupPage = lazy(() => import("@/pages/WorldCupPage").then((m) => ({ default: m.WorldCupPage })));
const MoreMarkets = lazy(() => import("@/pages/MoreMarkets").then((m) => ({ default: m.MoreMarkets })));
const AccountLayout = lazy(() => import("@/pages/account/AccountLayout").then((m) => ({ default: m.AccountLayout })));
import { BetSlipProvider } from "@/hooks/useBetSlip";
import { WalletProvider } from "@/hooks/useWallet";
import { BetHistoryProvider } from "@/hooks/useBetHistory";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { OddsSimulationProvider } from "@/hooks/useOddsSimulation";
import { OddsFormatProvider } from "@/hooks/useOddsFormat";
import { OddsDataProvider } from "@/hooks/useOddsData";
import { AuthProvider } from "@/contexts/AuthContext";
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { BetSlipSidebarProvider } from "@/contexts/BetSlipSidebarContext";
import { I18nProvider } from "@/contexts/I18nContext";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PromoPopup } from "@/components/PromoPopup";
import { WorldCupCountdown } from "@/components/WorldCupCountdown";

import { ConnectFirstDialog } from "@/components/ConnectFirstDialog";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
import { Link } from "wouter";
function HomeOnlyOverlay() {
  return null;
}

function TransactionNotifier() {
  useTransactionNotifications();
  return null;
}


const queryClient = new QueryClient();

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#00DFA9] border-t-transparent" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Switch>
      <Route path="/"                  component={Home}            />
      <Route path="/match/:id"         component={MatchDetail}     />
      <Route path="/promotions"        component={Promotions}      />
      <Route path="/help"              component={Help}            />
      <Route path="/terms"             component={Terms}           />
      <Route path="/privacy"           component={Privacy}         />
      <Route path="/aml"               component={AMLPolicy}       />
      <Route path="/winspin"           component={WinSpinPage}     />
      <Route path="/prediction-pools"  component={PredictionPools} />
      <Route path="/live"              component={LivePage}        />
      <Route path="/worldcup"          component={WorldCupPage}    />
      <Route path="/more-markets"      component={MoreMarkets}     />
      {/* Legacy redirects */}
      <Route path="/bet-history">
        {() => <Redirect to="/account/bets" />}
      </Route>
      <Route path="/my-bets">
        {() => <Redirect to="/account/bets" />}
      </Route>
      {/* <Route path="/affiliate">{() => <Redirect to="/account/referrals" />}</Route> */}{/* hidden */}
      {/* Account dashboard */}
      <Route path="/account"           component={AccountLayout}   />
      <Route path="/account/:section"  component={AccountLayout}   />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <I18nProvider>
          <AuthProvider>
            <NotificationsProvider>
              <OddsFormatProvider>
                <OddsSimulationProvider>
                  <OddsDataProvider>
                    <FavoritesProvider>
                      <WalletProvider>
                        <BetHistoryProvider>
                          <BetSlipSidebarProvider>
                          <BetSlipProvider>
                            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                              <Router />
                              <PromoPopup />
                              <WorldCupCountdown />
                              <HomeOnlyOverlay />
                            </WouterRouter>
                            <MobileBottomNav />
                            <TransactionNotifier />
                            <ConnectFirstDialog />
                            <Toaster />
                            <SonnerToaster
                              position="top-left"
                              toastOptions={{
                                style: {
                                  background: '#0D1A26',
                                  border: '1px solid rgba(0,223,169,0.18)',
                                  color: '#F8FAFC',
                                },
                              }}
                            />
                          </BetSlipProvider>
                          </BetSlipSidebarProvider>
                        </BetHistoryProvider>
                      </WalletProvider>
                    </FavoritesProvider>
                  </OddsDataProvider>
                </OddsSimulationProvider>
              </OddsFormatProvider>
            </NotificationsProvider>
          </AuthProvider>
        </I18nProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
