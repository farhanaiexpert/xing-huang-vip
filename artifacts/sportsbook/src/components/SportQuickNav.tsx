import { useRef } from 'react';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { cn } from '../lib/utils';
import { SportName } from './SportName';
import { MessageCircle } from 'lucide-react';

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

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: 'live' | 'hot' | 'new';
  /** If true, rendered with a special "featured" highlight */
  featured?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'soccer',       label: 'Soccer',                  icon: '⚽' },
  { id: 'tennis',       label: 'Tennis',                  icon: '🎾' },
  { id: 'nba',          label: 'NBA',                     icon: '🏀' },
  { id: 'ucl-final',   label: 'Europa League Final',      icon: '🏆', featured: true, badge: 'hot' },
  { id: 'esports',      label: 'Esoccer',                 icon: '🎮' },
  { id: 'horse-racing', label: 'Upcoming Races - Horses', icon: '🏇' },
];

interface Props {
  selectedId: string | null;
  liveCount?: number;
  onSelect: (id: string | null) => void;
}

export function SportQuickNav({ selectedId, liveCount = 0, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      className="relative flex items-stretch border-b border-[#253241]/50"
      style={{ background: 'linear-gradient(180deg, #0E1520 0%, #0B0F14 100%)' }}
    >
      {/* Scrollable tabs — takes all remaining space */}
      <ScrollArea className="flex-1 min-w-0">
        <div ref={scrollRef} className="flex items-stretch gap-0 px-3 w-max min-w-full">
          {NAV_ITEMS.map(item => {
            const isActive = selectedId === item.id;
            const isLive   = item.badge === 'live';
            const isHot    = item.badge === 'hot';
            const isFeat   = item.featured;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(isActive ? null : item.id)}
                className={cn(
                  'relative group flex items-center gap-1.5 px-3 sm:px-3.5 py-2 sm:py-3 text-[11px] sm:text-[12px] font-semibold whitespace-nowrap transition-all duration-150 select-none outline-none',
                  isActive
                    ? isFeat
                      ? 'text-[#FACC15]'
                      : isLive
                        ? 'text-[#EF4444]'
                        : 'text-[#00DFA9]'
                    : 'text-[#94A3B8] hover:text-[#F8FAFC]'
                )}
              >
                {/* Active underline bar */}
                <span
                  className={cn(
                    'absolute bottom-0 left-3 right-3 h-[2px] rounded-full transition-all duration-200',
                    isActive
                      ? isFeat
                        ? 'bg-[#FACC15] opacity-90'
                        : isLive
                          ? 'bg-[#EF4444] opacity-90'
                          : 'bg-[#00DFA9] opacity-90'
                      : 'opacity-0 bg-[#00DFA9]'
                  )}
                />

                {/* Hover underline (for non-active) */}
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-[#253241] opacity-0 group-hover:opacity-100 transition-opacity duration-150" />

                {/* Icon */}
                <span className="text-[13px] leading-none">
                  {isLive
                    ? <span className="relative flex items-center justify-center w-4 h-4">
                        <span className={cn(
                          'absolute w-2.5 h-2.5 rounded-full',
                          liveCount > 0 ? 'bg-[#EF4444] animate-ping opacity-50' : 'bg-[#EF4444]/30'
                        )} />
                        <span className={cn(
                          'relative w-2 h-2 rounded-full',
                          liveCount > 0 ? 'bg-[#EF4444]' : 'bg-[#EF4444]/50'
                        )} />
                      </span>
                    : item.icon
                  }
                </span>

                {/* Label */}
                <span className={cn(
                  isActive ? 'font-bold' : 'font-semibold'
                )}>
                  <SportName name={item.label} />
                </span>

                {/* Badge chips */}
                {isHot && !isActive && (
                  <span className="px-1 py-0.5 rounded text-[8px] font-black tracking-wider bg-[#FACC15]/15 text-[#FACC15] leading-none uppercase">
                    HOT
                  </span>
                )}
                {isLive && liveCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#EF4444]/15 text-[#EF4444] leading-none tabular-nums">
                    {liveCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" className="invisible" />
      </ScrollArea>

      {/* Pinned Live Chat button — always visible at right edge */}
      <div className="shrink-0 flex items-center px-2.5" style={{ borderLeft: '1px solid rgba(37,50,65,0.6)' }}>
        <button
          onClick={openLiveChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all duration-150 hover:scale-[1.04] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgba(0,223,169,0.18) 0%, rgba(0,223,169,0.08) 100%)',
            border: '1px solid rgba(0,223,169,0.35)',
            color: '#00DFA9',
            boxShadow: '0 0 12px rgba(0,223,169,0.15)',
          }}
          title="Live Chat Support"
        >
          <span className="relative shrink-0">
            <MessageCircle className="h-3.5 w-3.5" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#00DFA9] shadow-[0_0_6px_rgba(0,223,169,1)] animate-pulse" />
          </span>
          <span className="text-[11px] hidden sm:inline whitespace-nowrap">Live Chat</span>
        </button>
      </div>
    </div>
  );
}
