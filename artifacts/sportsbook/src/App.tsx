import { lazy, Suspense, Component } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

// ErrorBoundary catches render errors and shows them instead of a blank screen
interface EBState { error: Error | null }
class ErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null };
  static getDerivedStateFromError(error: Error): EBState { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[CupBett] Render error:", error, info.componentStack);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ background: "#0B0F14", color: "#F8FAFC", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem", fontFamily: "Inter, sans-serif" }}>
          <div style={{ color: "#00DFA9", fontSize: "2rem", marginBottom: "1rem" }}>⚠</div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#94A3B8", fontSize: "0.875rem", marginBottom: "1.5rem", textAlign: "center", maxWidth: 480 }}>{this.state.error.message}</p>
          <button onClick={() => window.location.reload()} style={{ background: "#00DFA9", color: "#0B0F14", border: "none", borderRadius: "0.5rem", padding: "0.625rem 1.5rem", fontWeight: 600, cursor: "pointer" }}>
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Home loads eagerly — it's the landing page
import Home from "@/pages/Home";

// All other pages are lazy — only downloaded when the user navigates there
const MatchDetail     = lazy(() => import("@/pages/MatchDetail").then(m => ({ default: m.MatchDetail })));
const BetHistory      = lazy(() => import("@/pages/BetHistory").then(m => ({ default: m.BetHistory })));
const Help            = lazy(() => import("@/pages/Help").then(m => ({ default: m.Help })));
const Promotions      = lazy(() => import("@/pages/Promotions").then(m => ({ default: m.Promotions })));
const Terms           = lazy(() => import("@/pages/Terms").then(m => ({ default: m.Terms })));
const Privacy         = lazy(() => import("@/pages/Privacy").then(m => ({ default: m.Privacy })));
const AMLPolicy       = lazy(() => import("@/pages/AMLPolicy").then(m => ({ default: m.AMLPolicy })));
const WinSpinPage     = lazy(() => import("@/pages/WinSpinPage").then(m => ({ default: m.WinSpinPage })));
const PredictionPools = lazy(() => import("@/pages/PredictionPools").then(m => ({ default: m.PredictionPools })));
const Affiliate       = lazy(() => import("@/pages/Affiliate").then(m => ({ default: m.Affiliate })));
const NotFound        = lazy(() => import("@/pages/not-found"));

// Minimal skeleton shown while a lazy page chunk loads
function PageSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 rounded-full border-2 border-[#00DFA9]/30 border-t-[#00DFA9] animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/"                 component={Home}           />
        <Route path="/match/:id"        component={MatchDetail}    />
        <Route path="/promotions"       component={Promotions}     />
        <Route path="/bet-history"      component={BetHistory}     />
        <Route path="/help"             component={Help}           />
        <Route path="/terms"            component={Terms}          />
        <Route path="/privacy"          component={Privacy}        />
        <Route path="/aml"              component={AMLPolicy}      />
        <Route path="/winspin"          component={WinSpinPage}    />
        <Route path="/prediction-pools" component={PredictionPools}/>
        <Route path="/affiliate"        component={Affiliate}      />
        <Route                          component={NotFound}       />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
