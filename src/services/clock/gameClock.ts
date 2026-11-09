export interface GameClock {
  now(): number
  elapsedSince(startedAt: number): number
}

export const gameClock: GameClock = {
  now: () => Date.now(),
  elapsedSince: (startedAt) => Date.now() - startedAt,
}
