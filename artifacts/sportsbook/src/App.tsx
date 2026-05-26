import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
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
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PromoPopup } from "@/components/PromoPopup";
import { useTransactionNotifications } from "@/hooks/useTransactionNotifications";
import { Link } from "wouter";

function TransactionNotifier() {
  useTransactionNotifications();
  return null;
}

function RGFooterBanner() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0F14]/95 border-t border-white/8 py-2 px-4 flex items-center justify-center gap-3 text-[11px] text-[#64748B] md:pb-2 pb-[calc(0.5rem+56px)]">
      <span className="text-[#FACC15]">18+</span>
      <span>Play responsibly.</span>
      <Link href="/account/responsible-gambling"
        className="text-[#00DFA9] hover:underline">
        Set limits &amp; self-exclude
      </Link>
      <span className="hidden sm:inline">·</span>
      <a href="https://www.begambleaware.org" target="_blank" rel="noopener noreferrer"
        className="hidden sm:inline hover:text-white transition-colors">
        BeGambleAware.org
      </a>
      <a href="https://www.gamstop.co.uk" target="_blank" rel="noopener noreferrer"
        className="hidden sm:inline hover:text-white transition-colors">
        GamStop
      </a>
    </div>
  );
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
      {/* Legacy redirects */}
      <Route path="/bet-history">
        {() => <Redirect to="/account/bets" />}
      </Route>
      <Route path="/my-bets">
        {() => <Redirect to="/account/bets" />}
      </Route>
      <Route path="/affiliate">
        {() => <Redirect to="/account/referrals" />}
      </Route>
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
        <AuthProvider>
          <NotificationsProvider>
            <OddsFormatProvider>
              <OddsSimulationProvider>
                <OddsDataProvider>
                  <FavoritesProvider>
                    <WalletProvider>
                      <BetHistoryProvider>
                        <BetSlipProvider>
                          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                            <Router />
                          </WouterRouter>
                          <MobileBottomNav />
                          <OnboardingGuide />
                          <PromoPopup />
                          <TransactionNotifier />
                          <RGFooterBanner />
                          <Toaster />
                        </BetSlipProvider>
                      </BetHistoryProvider>
                    </WalletProvider>
                  </FavoritesProvider>
                </OddsDataProvider>
              </OddsSimulationProvider>
            </OddsFormatProvider>
          </NotificationsProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
