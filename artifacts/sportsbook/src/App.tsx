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
import { MessageCircle } from "lucide-react";

function LiveChatButton() {
  function openLiveChat() {
    const w = window as any;
    if (!w.__lc_xh_loaded) {
      w.__lc = w.__lc || {};
      w.__lc.license = 19768913;
      w.__lc.integration_name = 'manual_channels';
      w.__lc.product_name = 'livechat';
      w.__lc_xh_loaded = true;
      (function(n: any, t: Document, c: any) {
        function i(n: any) { return e._h ? e._h.apply(null, n) : e._q.push(n); }
        const e: any = {
          _q: [], _h: null, _v: '2.0',
          on:   function() { i(['on',   c.call(arguments)]); },
          once: function() { i(['once', c.call(arguments)]); },
          off:  function() { i(['off',  c.call(arguments)]); },
          get:  function() { if (!e._h) throw new Error("[LiveChatWidget] You can't use getters before load."); return i(['get', c.call(arguments)]); },
          call: function() { i(['call', c.call(arguments)]); },
          init: function() { const s = t.createElement('script'); s.async = true; s.type = 'text/javascript'; s.src = 'https://cdn.livechatinc.com/tracking.js'; t.head.appendChild(s); },
        };
        if (!n.__lc.asyncInit) e.init();
        n.LiveChatWidget = n.LiveChatWidget || e;
      })(window, document, [].slice);
      w.LiveChatWidget.on('ready', () => w.LiveChatWidget.call('maximize'));
    } else {
      w.LiveChatWidget?.call('maximize');
    }
  }

  return (
    <button
      onClick={openLiveChat}
      className="fixed bottom-6 left-6 z-[9999] flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,223,169,0.25)] transition-all duration-200 hover:scale-105 hover:shadow-[0_12px_40px_rgba(0,0,0,0.55),0_0_0_1px_rgba(0,223,169,0.50)]"
      style={{ background: 'linear-gradient(135deg,#0D1E2B 0%,#0A1A26 100%)', border: '1px solid rgba(0,223,169,0.30)' }}
      title="Live Chat Support"
    >
      <span className="relative shrink-0">
        <MessageCircle className="h-5 w-5 text-[#00DFA9]" />
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,0.9)] animate-pulse" />
      </span>
      <span className="text-[13px] font-bold text-[#F8FAFC] leading-none">Live Chat</span>
    </button>
  );
}

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
                            <LiveChatButton />
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
