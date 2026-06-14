/**
 * ──────────────────────────────────────────────────────────────────────────
 *  CENTRAL MANUAL TRANSLATION OVERRIDES  ←  edit THIS file by hand
 * ──────────────────────────────────────────────────────────────────────────
 *
 *  This is the ONE place to manually add or fix a translation anywhere in the
 *  sportsbook (UI labels, betting markets, match cards, bet slip, filters,
 *  sidebar, buttons, popups — everything). You never need to touch application
 *  code to change a word.
 *
 *  PRIORITY (applied everywhere in the app):
 *      1. this file (manual overrides)        ← always wins
 *      2. the bulk dictionary in `zh.ts`      ← existing translations
 *      3. automatic DeepL translation         ← fallback for anything missing
 *
 *  HOW TO EDIT
 *      • Find the English text EXACTLY as it appears in the app
 *        (capitalisation and spacing must match).
 *      • Add a line:   "English phrase": "中文翻译",
 *      • Save — changes are live immediately in the dev server.
 *      • Trailing commas are fine. Do not change the English keys (left side).
 *
 *  ADDING ANOTHER LANGUAGE (e.g. Traditional Chinese)
 *      • Add a new block keyed by the language code, e.g. "zh-TW": { … }.
 *      • Reuse the same English keys with translated values.
 *      • (Wire the new code into I18nContext when that language is launched.)
 *
 *  NOTE: "Home" stays 首页 (the homepage nav item). This is a global
 *  exact-match table, so a single English key cannot mean both 首页 (nav) and
 *  主队 (match card) — match cards already show the real team names.
 */

export const customOverrides: Record<string, Record<string, string>> = {
  "zh-CN": {
    // ── Top navigation ──────────────────────────────────────────────────────
    "All Sports": "全部体育",
    Promotions: "优惠活动",
    "Predict & Win": "预测赢奖",
    "Bet History": "投注记录",
    "World Cup": "世界杯",
    Help: "帮助中心",
    LIVE: "滚球",
    "Connect Wallet": "连接钱包",
    "Top Up": "充值",
    "Bet Slip": "投注单",
    "Live Chat": "在线客服",

    // ── Left sidebar ────────────────────────────────────────────────────────
    "Live Now": "正在进行",
    Winners: "获奖用户",
    Trending: "热门赛事",
    "Most Used": "常用项目",
    "A-Z Sports": "体育项目",
    "Show Less": "收起",
    "View All": "查看全部",

    // ── Filters ─────────────────────────────────────────────────────────────
    All: "全部",
    Today: "今天",
    Tomorrow: "明天",
    Upcoming: "即将开始",
    Featured: "精选",
    "Top Matches": "热门赛事",
    "Early Payout": "提前结算",
    "Acca Boost": "串关加成",

    // ── Search ──────────────────────────────────────────────────────────────
    "Search events, teams or leagues...": "搜索赛事、球队或联赛...",
    Refresh: "刷新",
    // Number-templated so "Updated Nm ago" works for every value, not just 19.
    "Updated \u00000\u0000m ago": "\u00000\u0000分钟前更新",

    // ── Sports categories ───────────────────────────────────────────────────
    Soccer: "足球",
    Tennis: "网球",
    Basketball: "篮球",
    Cricket: "板球",
    "Ice Hockey": "冰球",
    MMA: "综合格斗",
    NFL: "美式橄榄球",
    Baseball: "棒球",
    Rugby: "橄榄球",
    Volleyball: "排球",
    Darts: "飞镖",
    Boxing: "拳击",
    Golf: "高尔夫",
    Greyhounds: "灵缇赛跑",
    Handball: "手球",
    "Horse Racing": "赛马",
    "Rugby League": "橄榄球联赛",
    "Rugby Union": "联合式橄榄球",
    Snooker: "斯诺克",
    "Table Tennis": "乒乓球",
    "American Football": "美式橄榄球",
    "Australian Rules": "澳式足球",

    // ── Competitions (verified Chinese only) ────────────────────────────────
    "FIFA World Cup": "国际足联世界杯",
    "ATP/WTA Paris": "ATP/WTA 巴黎站",
    "Italy Serie A": "意甲联赛",
    "NBA Finals": "NBA总决赛",
    "Spain La Liga": "西甲联赛",
    "MLB Season": "MLB赛季",
    "MMA Events": "MMA赛事",
    "UEFA Champions League": "欧洲冠军联赛",

    // ── Match cards ─────────────────────────────────────────────────────────
    "🏆 World Cup": "🏆 世界杯",
    "Matches With More Markets": "更多玩法赛事",
    "More Markets": "更多玩法",
    "More markets": "更多玩法",
    "Hide markets": "收起玩法",
    "Show more markets": "显示更多玩法",
    "Correct Score": "波胆",
    BTTS: "两队都进球",
    "O/U 2.5": "大小球 2.5",
    Away: "客队",
    Draw: "平局",

    // ── Bet slip ────────────────────────────────────────────────────────────
    "Slip is empty": "投注单为空",
    "Select any odds from the matches to start building your bet":
      "选择任意赔率开始投注",
    "Top Up to place bets": "充值后即可投注",
    "Click any odds button to add": "点击任意赔率加入投注单",
    "Place Bet": "确认投注",
    "Add a selection to begin": "请先选择投注项目",

    // ── Betting-market terms ────────────────────────────────────────────────
    Handicap: "让球",
    "Asian Handicap": "亚洲让球",
    "Over/Under": "大小球",
    "Both Teams To Score": "两队都进球",
    "Match Winner": "独赢",
    "Double Chance": "双重机会",
    "Half Time": "半场",
    "Full Time": "全场",
    Corners: "角球",
    Cards: "黄红牌",
    Specials: "特殊投注",
    "Special Bets": "特殊投注",
    "Live Betting": "滚球投注",
    "Cash Out": "提前结算",
    Odds: "赔率",
    Stake: "投注金额",
    "Potential Win": "预计盈利",

    // ── Match Details Page ────────────────────────────────────────────────
    "Estonia Meistriliiga": "爱沙尼亚甲级联赛",

    "All Markets": "全部玩法",
    Popular: "热门",
    "Goals / BTTS / Next Goal": "进球 / 两队都进球 / 下一粒进球",
    "Featured Combinations": "精选组合投注",
    "Time / Minute": "时间玩法",
    "Match Result": "独赢",
    "European Handicap": "欧洲让球",
    "Clean Sheet": "零封",
    "Goal Scorer": "球员进球",
    "Top Market": "热门玩法",

    "Home Win": "主胜",
    "Away Win": "客胜",

    "Match Info": "赛事信息",
    "Kicks Off": "开赛",
    Ends: "结束",
    "Win Probability": "胜率分析",
    "Over / Under": "大小球",
    "BTTS (Both Teams To Score)": "两队都进球",
    "Next Goal": "下一粒进球",
    "FIFA World Cup 2026": "2026国际足联世界杯",

    "Brazil Serie B": "巴西乙级联赛",

    "Juventude vs Ponte Preta": "Juventude 对阵 Ponte Preta",

    VS: "对阵",

    "Today, 19:00": "今天 19:00",

    "JUVENTUDE TOTAL GOALS — OVER/UNDER 1.5": "Juventude总进球数 — 大小球 1.5",

    "PONTE PRETA TOTAL GOALS — OVER/UNDER 1.5":
      "Ponte Preta总进球数 — 大小球 1.5",

    "ASIAN HANDICAP JUVENTUDE -2.5": "亚洲让球 Juventude -2.5",
    "ASIAN HANDICAP JUVENTUDE -2": "亚洲让球 Juventude -2",
    "ASIAN HANDICAP JUVENTUDE -1.5": "亚洲让球 Juventude -1.5",
    "ASIAN HANDICAP JUVENTUDE -1": "亚洲让球 Juventude -1",
    "ASIAN HANDICAP JUVENTUDE -0.5": "亚洲让球 Juventude -0.5",
    "ASIAN HANDICAP JUVENTUDE 0": "亚洲让球 Juventude 0",
    "ASIAN HANDICAP JUVENTUDE +0.5": "亚洲让球 Juventude +0.5",
    "ASIAN HANDICAP JUVENTUDE +1": "亚洲让球 Juventude +1",
    "ASIAN HANDICAP JUVENTUDE +1.5": "亚洲让球 Juventude +1.5",
    "ASIAN HANDICAP JUVENTUDE +2": "亚洲让球 Juventude +2",
    "ASIAN HANDICAP JUVENTUDE +2.5": "亚洲让球 Juventude +2.5",

    "EUROPEAN HANDICAP JUVENTUDE -2": "欧洲让球 Juventude -2",
    "EUROPEAN HANDICAP JUVENTUDE -1": "欧洲让球 Juventude -1",
    "EUROPEAN HANDICAP JUVENTUDE 0": "欧洲让球 Juventude 0",
    "EUROPEAN HANDICAP JUVENTUDE +1": "欧洲让球 Juventude +1",
    "EUROPEAN HANDICAP JUVENTUDE +2": "欧洲让球 Juventude +2",

    "CORNERS HANDICAP — JUVENTUDE -2.5": "角球让球 — Juventude -2.5",

    "JUVENTUDE — CLEAN SHEET": "Juventude 零封",
    "PONTE PRETA — CLEAN SHEET": "Ponte Preta 零封",

    "Player A (Juventude)": "球员A（Juventude）",
    "Player B (Juventude)": "球员B（Juventude）",
    "Player C (Juventude)": "球员C（Juventude）",
    "Player D (Juventude)": "球员D（Juventude）",
    "Player E (Juventude)": "球员E（Juventude）",

    "Player A (Ponte Preta)": "球员A（Ponte Preta）",
    "Player B (Ponte Preta)": "球员B（Ponte Preta）",
    "Player C (Ponte Preta)": "球员C（Ponte Preta）",
  },

  // ── Future: Traditional Chinese (uncomment + translate when launching) ─────
  // "zh-TW": {
  //   "Correct Score": "波膽",
  //   "World Cup":     "世界盃",
  // },
};

/**
 * Manual overrides for a given UI language code (empty object if none).
 * Use this to layer custom terms on top of any base dictionary.
 */
export function customFor(lang: string): Record<string, string> {
  return customOverrides[lang] ?? {};
}
