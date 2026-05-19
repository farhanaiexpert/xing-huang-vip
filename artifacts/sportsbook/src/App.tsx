import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { MatchDetail } from "@/pages/MatchDetail";
import { BetHistory } from "@/pages/BetHistory";
import { Help } from "@/pages/Help";
import { Promotions } from "@/pages/Promotions";
import { Terms } from "@/pages/Terms";
import { Privacy } from "@/pages/Privacy";
import { AMLPolicy } from "@/pages/AMLPolicy";
import { WinSpinPage } from "@/pages/WinSpinPage";
import { BetSlipProvider } from "@/hooks/useBetSlip";
import { WalletProvider } from "@/hooks/useWallet";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { OddsSimulationProvider } from "@/hooks/useOddsSimulation";
import { OddsFormatProvider } from "@/hooks/useOddsFormat";
import { OddsDataProvider } from "@/hooks/useOddsData";
import { OnboardingGuide } from "@/components/OnboardingGuide";
import { MobileBottomNav } from "@/components/MobileBottomNav";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <OddsFormatProvider>
          <OddsSimulationProvider>
            <OddsDataProvider>
              <FavoritesProvider>
                <WalletProvider>
                  <BetSlipProvider>
                    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                      <Router />
                    </WouterRouter>
                    <MobileBottomNav />
                    <OnboardingGuide />
                    <Toaster />
                  </BetSlipProvider>
                </WalletProvider>
              </FavoritesProvider>
            </OddsDataProvider>
          </OddsSimulationProvider>
        </OddsFormatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
