import { Switch, Route, Router as WouterRouter, Redirect, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { MatchDetail } from "@/pages/MatchDetail";
import { Help } from "@/pages/Help";
import { Promotions } from "@/pages/Promotions";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { AMLPolicy } from "@/pages/AMLPolicy";
import { WinSpinPage } from "@/pages/WinSpinPage";
import { PredictionPools } from "@/pages/PredictionPools";
import { LivePage } from "@/pages/LivePage";
import { WorldCupPage } from "@/pages/WorldCupPage";
import { MoreMarkets } from "@/pages/MoreMarkets";
import { AccountLayout } from "@/pages/account/AccountLayout";
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
import { ProfileSetupModal } from "@/components/ProfileSetupModal";
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

function Router() {
  return (
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
                            <ProfileSetupModal />
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
