import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import { MatchDetail } from "@/pages/MatchDetail";
import MyBets from "@/pages/MyBets";
import { BetSlipProvider } from "@/hooks/useBetSlip";
import { WalletProvider } from "@/hooks/useWallet";
import { FavoritesProvider } from "@/hooks/useFavorites";
import { OddsSimulationProvider } from "@/hooks/useOddsSimulation";
import { OddsFormatProvider } from "@/hooks/useOddsFormat";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/match/:id" component={MatchDetail} />
      <Route path="/my-bets" component={MyBets} />
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
          <FavoritesProvider>
            <WalletProvider>
              <BetSlipProvider>
                <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                  <Router />
                </WouterRouter>
                <Toaster />
              </BetSlipProvider>
            </WalletProvider>
          </FavoritesProvider>
        </OddsSimulationProvider>
        </OddsFormatProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
