export type TabKey = 'main' | 'sot' | 'shots' | 'fouls' | 'tackles';

export interface BBPlayer {
  id: string;
  name: string;
  number: number;
  team: 'home' | 'away';
  /** last 5 results (0=blank/missed, 1=hit, 2=hit×2, 3=hit×3) */
  form: (0 | 1 | 2 | 3)[];
  /** odds per tab — null means market not offered */
  odds: {
    main:    [number | null, number | null, number | null];
    sot:     (number | null)[];
    shots:   (number | null)[];
    fouls:   (number | null)[];
    tackles: (number | null)[];
  };
}

export interface BBMatch {
  id: string;
  home: string;
  away: string;
  league: string;
  kickoff: string;
  players: BBPlayer[];
}

export const BB_MATCHES: BBMatch[] = [
  {
    id: 'bb_1',
    home: 'Bournemouth',
    away: 'Man City',
    league: 'England Premier League',
    kickoff: 'Tue 21:30',
    players: [
      {
        id: 'haaland',
        name: 'Erling Haaland',
        number: 9,
        team: 'away',
        form: [0, 1, 1, 1, 1],
        odds: {
          main:    [1.53, 1.36, 5.50],
          sot:     [1.16, 1.80, 3.50, 8.00, 19.00],
          shots:   [null, 1.36, 1.83, 2.75, 4.50, 9.00],
          fouls:   [null, null, null, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'semenyo',
        name: 'Antoine Semenyo',
        number: 22,
        team: 'home',
        form: [0, 0, 0, 0, 1],
        odds: {
          main:    [2.20, 1.72, 4.00],
          sot:     [1.61, null, 4.00, null, 13.00],
          shots:   [null, 1.30, 1.83, 3.25, 5.50, 11.00],
          fouls:   [1.30, 2.37, 5.50, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'cherki',
        name: 'Rayan Cherki',
        number: 10,
        team: 'away',
        form: [1, 0, 0, 0, 0],
        odds: {
          main:    [2.62, 1.61, 4.75],
          sot:     [1.66, 4.33, null, 15.00, null],
          shots:   [null, 1.36, 2.00, 3.50, 6.50, 13.00],
          fouls:   [null, null, null, null, null],
          tackles: [1.22, 2.10, 4.33, 8.50],
        },
      },
      {
        id: 'kroupi',
        name: 'Eli Junior Kroupi',
        number: 22,
        team: 'home',
        form: [1, 0, 1, 1, 0],
        odds: {
          main:    [3.10, 2.37, 3.25],
          sot:     [1.83, 5.50, null, 19.00, null],
          shots:   [null, 1.16, 1.72, 3.25, 6.50, 15.00],
          fouls:   [1.25, 2.20, 4.50, null, 26.00],
          tackles: [1.22, 2.00, 4.00, 8.00],
        },
      },
      {
        id: 'evanilson',
        name: 'Evanilson',
        number: 9,
        team: 'home',
        form: [0, 0, 0, 0, 0],
        odds: {
          main:    [3.20, 2.62, 4.50],
          sot:     [2.00, 6.50, null, 21.00, null],
          shots:   [null, 1.33, 2.50, 6.00, null, 17.00],
          fouls:   [1.33, 2.50, 6.00, null, 17.00],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'doku',
        name: 'Jeremy Doku',
        number: 11,
        team: 'away',
        form: [0, 0, 2, 1, 0],
        odds: {
          main:    [4.00, 2.05, 5.50],
          sot:     [1.90, 6.00, null, 21.00, null],
          shots:   [null, 1.40, 2.10, 3.75, 7.00, 15.00],
          fouls:   [1.44, 3.25, 9.00, null, 23.00],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'tavernier',
        name: 'Marcus Tavernier',
        number: 16,
        team: 'home',
        form: [3, 1, 0, 1, 0],
        odds: {
          main:    [4.50, 3.10, 2.80],
          sot:     [null, null, null, null, null],
          shots:   [null, null, null, null, null, null],
          fouls:   [1.40, 2.75, 7.00, null, 19.00],
          tackles: [1.10, 1.53, 2.50, 4.50, 8.50],
        },
      },
      {
        id: 'senesi',
        name: 'Marcos Senesi',
        number: 5,
        team: 'home',
        form: [3, 1, 0, 0, 3],
        odds: {
          main:    [null, null, 2.60],
          sot:     [null, null, null, null, null],
          shots:   [null, null, null, null, null, null],
          fouls:   [1.30, 2.37, 5.50, null, 15.00],
          tackles: [null, null, null, null],
        },
      },
    ],
  },
  {
    id: 'bb_2',
    home: 'Chelsea',
    away: 'Tottenham',
    league: 'England Premier League',
    kickoff: 'Tue 21:30',
    players: [
      {
        id: 'palmer',
        name: 'Cole Palmer',
        number: 20,
        team: 'home',
        form: [1, 1, 1, 0, 1],
        odds: {
          main:    [1.44, 1.22, 6.00],
          sot:     [1.10, 1.65, 3.00, 7.00, 16.00],
          shots:   [null, 1.20, 1.70, 2.90, 5.00, 10.00],
          fouls:   [null, null, null, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'son',
        name: 'Son Heung-min',
        number: 7,
        team: 'away',
        form: [1, 0, 1, 1, 0],
        odds: {
          main:    [1.88, 1.44, 5.00],
          sot:     [1.25, 2.10, 4.50, 10.00, null],
          shots:   [null, 1.33, 1.90, 3.50, 6.00, 12.00],
          fouls:   [null, null, null, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'jackson',
        name: 'Nicolas Jackson',
        number: 15,
        team: 'home',
        form: [0, 1, 0, 1, 1],
        odds: {
          main:    [2.10, 1.60, 4.50],
          sot:     [1.40, 2.60, 5.50, null, null],
          shots:   [null, 1.44, 2.20, 4.00, 8.00, null],
          fouls:   [null, null, null, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'johnson',
        name: 'Brennan Johnson',
        number: 22,
        team: 'away',
        form: [0, 0, 1, 0, 1],
        odds: {
          main:    [2.75, 2.00, 4.00],
          sot:     [1.55, 3.20, null, null, null],
          shots:   [null, 1.50, 2.50, 5.00, null, null],
          fouls:   [null, null, null, null, null],
          tackles: [null, null, null, null],
        },
      },
      {
        id: 'caicedo',
        name: 'Moises Caicedo',
        number: 25,
        team: 'home',
        form: [0, 0, 0, 1, 0],
        odds: {
          main:    [null, null, 3.00],
          sot:     [null, null, null, null, null],
          shots:   [null, null, null, null, null, null],
          fouls:   [1.20, 2.00, 5.00, null, null],
          tackles: [1.15, 1.70, 3.00, 6.50],
        },
      },
      {
        id: 'sarr',
        name: 'Pape Matar Sarr',
        number: 29,
        team: 'away',
        form: [0, 1, 0, 0, 0],
        odds: {
          main:    [null, null, 3.20],
          sot:     [null, null, null, null, null],
          shots:   [null, null, null, null, null, null],
          fouls:   [1.25, 2.10, 4.50, null, null],
          tackles: [1.18, 1.80, 3.50, 7.00],
        },
      },
    ],
  },
];

export const TAB_CONFIG: Record<TabKey, { label: string; cols: string[] }> = {
  main:    { label: 'Main',            cols: ['To Score', 'Score or Assist', 'To be Booked'] },
  sot:     { label: 'Shots on Target', cols: ['1+', '2+', '3+', '4+', '5+'] },
  shots:   { label: 'Shots',           cols: ['2+', '3+', '4+', '5+', '6+', '7+'] },
  fouls:   { label: 'Fouls',           cols: ['1+', '2+', '3+', '4+', '5+'] },
  tackles: { label: 'Tackles',         cols: ['1+', '2+', '3+', '4+'] },
};
