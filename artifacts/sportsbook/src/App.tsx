import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { Admin } from "@/pages/Admin";
import { AuthProvider } from "@/hooks/useAuth";
import { MatchDetail } from "@/pages/MatchDetail";
import { BetHistory } from "@/pages/BetHistory";
import { Help } from "@/pages/Help";
import { Promotions } from "@/pages/Promotions";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { AMLPolicy } from "@/pages/AMLPolicy";
import { WinSpinPage } from "@/pages/WinSpinPage";
import { PredictionPools } from "@/pages/PredictionPools";
import { Affiliate } from "@/pages/Affiliate";
import { BetSlipProvider } from "@/hooks/useBetSlip";
import { WalletProvider } from "@/hooks/useWallet";
import { BetHistoryProvider } from "@/hooks/useBetHistory";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { OddsSimulationProvider } from "@/hooks/useOddsSimulation";
import { OddsFormatProvider } from "@/hooks/useOddsFormat";
import { OddsDataProvider } from "@/hooks/useOddsData";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { PromoPopup } from "@/components/PromoPopup";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/"             component={Home}       />
      <Route path="/match/:id"    component={MatchDetail} />
      <Route path="/promotions"            component={Promotions}          />
      <Route path="/bet-history"          component={BetHistory}          />
      <Route path="/help"                 component={Help}                />
      <Route path="/terms"                component={Terms}               />
      <Route path="/privacy"              component={Privacy}             />
      <Route path="/aml"                  component={AMLPolicy}           />
      <Route path="/winspin"              component={WinSpinPage}         />
      <Route path="/prediction-pools"    component={PredictionPools}     />
      <Route path="/affiliate"           component={Affiliate}            />
      <Route path="/admin"               component={Admin}                />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
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
                        <Toaster />
                      </BetSlipProvider>
                    </BetHistoryProvider>
                  </WalletProvider>
                </FavoritesProvider>
              </OddsDataProvider>
            </OddsSimulationProvider>
          </OddsFormatProvider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
