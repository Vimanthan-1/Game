
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export enum MovementMode {
  STILL = 'STILL',
  SLOW = 'SLOW',
  WALK = 'WALK',
  SPRINT = 'SPRINT'
}

export interface GameEventData {
  noiseLevel: number;
  gameState: GameState;
  targetObject: string;
  found: boolean;
}

export const ROOM_SIZE = 400;
export const NOISE_MAX = 100;
export const HEARING_THRESHOLD = 30;
