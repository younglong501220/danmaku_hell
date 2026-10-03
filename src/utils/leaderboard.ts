import { LeaderboardEntry, ShipType } from '../types/game';

const STORAGE_KEY = 'dodonpachi_leaderboard';

export function getRankGrade(score: number, graze: number, chain: number): LeaderboardEntry['rank'] {
  if (score >= 500000 || (score >= 350000 && graze >= 120)) return 'S+';
  if (score >= 300000 || (score >= 200000 && chain >= 150)) return 'S';
  if (score >= 150000) return 'A';
  if (score >= 60000) return 'B';
  return 'C';
}

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultLeaderboard();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultLeaderboard();
  } catch {
    return getDefaultLeaderboard();
  }
}

export function saveLeaderboardEntry(
  score: number,
  ship: ShipType,
  maxChain: number,
  graze: number,
  stage: number
): LeaderboardEntry[] {
  const current = getLeaderboard();
  const rank = getRankGrade(score, graze, maxChain);
  const newEntry: LeaderboardEntry = {
    id: Date.now().toString(),
    date: new Date().toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    ship,
    score,
    maxChain,
    graze,
    stage,
    rank
  };

  const updated = [...current, newEntry]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {}

  return updated;
}

function getDefaultLeaderboard(): LeaderboardEntry[] {
  return [
    { id: '1', date: 'TOP ACE', ship: 'TYPE_A', score: 654200, maxChain: 248, graze: 185, stage: 2, rank: 'S+' },
    { id: '2', date: 'CAVE PILOT', ship: 'TYPE_C', score: 489000, maxChain: 192, graze: 142, stage: 2, rank: 'S' },
    { id: '3', date: 'DANMAKU MASTER', ship: 'TYPE_B', score: 320500, maxChain: 135, graze: 96, stage: 1, rank: 'A' },
    { id: '4', date: 'COLONEL', ship: 'TYPE_A', score: 184000, maxChain: 88, graze: 64, stage: 1, rank: 'B' },
  ];
}
