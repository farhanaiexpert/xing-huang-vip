export function getGroupColor(groupId: string): string {
  switch (groupId) {
    case 'popular':       return '#FACC15';
    case 'goals':         return '#00DFA9';
    case 'result':        return '#38BDF8';
    case 'handicap':      return '#A78BFA';
    case 'eur-handicap':  return '#FB923C';
    case 'halftime':      return '#F472B6';
    case 'corners':       return '#34D399';
    case 'cleansheet':    return '#22D3EE';
    case 'correctscore':  return '#FB7185';
    case 'goalscorer':    return '#FCD34D';
    case 'sets':          return '#38BDF8';
    case 'games':         return '#00DFA9';
    case 'quarters':      return '#A78BFA';
    case 'specials':      return '#FB923C';
    case 'maps':          return '#34D399';
    case 'rounds':        return '#F472B6';
    case 'runners':       return '#FCD34D';
    default:              return '#94A3B8';
  }
}
