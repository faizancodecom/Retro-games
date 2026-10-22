/** Game speed multiplier from arcade level (1–20). */
export function levelSpeed(level: number): number {
  return 1 + (level - 1) * 0.12;
}

export function levelBonus(level: number, perLevel: number, cap = 99): number {
  return Math.min(cap, Math.floor((level - 1) * perLevel));
}

export function levelScoreGoal(level: number): number {
  return 30 + level * 25;
}
