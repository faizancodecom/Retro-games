import type { EngineContext, EngineType, GameEngine } from '../types';

export async function loadEngine(
  type: EngineType,
  ctx: EngineContext
): Promise<GameEngine> {
  switch (type) {
    case 'flappy': {
      const { FlappyEngine } = await import('./flappy');
      return new FlappyEngine(ctx);
    }
    case 'maze': {
      const { MazeEngine } = await import('./maze');
      return new MazeEngine(ctx);
    }
    case 'pacman': {
      const { PacmanEngine } = await import('./pacman');
      return new PacmanEngine(ctx);
    }
    case 'wanted': {
      const { WantedEngine } = await import('./wanted');
      return new WantedEngine(ctx);
    }
    case 'tictactoe': {
      const { TicTacToeEngine } = await import('./tictactoe');
      return new TicTacToeEngine(ctx);
    }
    case 'blackjack': {
      const { BlackjackEngine } = await import('./blackjack');
      return new BlackjackEngine(ctx);
    }
    case 'uno': {
      const { UnoEngine } = await import('./uno');
      return new UnoEngine(ctx);
    }
    case 'racecareer': {
      const { RaceCareerEngine } = await import('./racecareer');
      return new RaceCareerEngine(ctx);
    }
    case 'chess': {
      const { ChessEngine } = await import('./chess');
      return new ChessEngine(ctx);
    }
    case 'gallery': {
      const { GalleryEngine } = await import('./gallery');
      return new GalleryEngine(ctx);
    }
    case 'zombie': {
      const { ZombieEngine } = await import('./zombie');
      return new ZombieEngine(ctx);
    }
    case 'asteroids': {
      const { AsteroidsEngine } = await import('./asteroids');
      return new AsteroidsEngine(ctx);
    }
    case 'frogger': {
      const { FroggerEngine } = await import('./frogger');
      return new FroggerEngine(ctx);
    }
    case 'whack': {
      const { WhackEngine } = await import('./whack');
      return new WhackEngine(ctx);
    }
    case 'story': {
      const { StoryEngine } = await import('./story');
      return new StoryEngine(ctx);
    }
    case 'pixelminer': {
      const { PixelMinerEngine } = await import('./pixelminer');
      return new PixelMinerEngine(ctx);
    }
    case 'dungeon': {
      const { DungeonEngine } = await import('./dungeon');
      return new DungeonEngine(ctx);
    }
    case 'defender': {
      const { DefenderEngine } = await import('./defender');
      return new DefenderEngine(ctx);
    }
    case 'archer': {
      const { ArcherEngine } = await import('./archer');
      return new ArcherEngine(ctx);
    }
    case 'toprace': {
      const { TopRaceEngine } = await import('./toprace');
      return new TopRaceEngine(ctx);
    }
    case 'war': {
      const { WarEngine } = await import('./war');
      return new WarEngine(ctx);
    }
    case 'snake': {
      const { SnakeEngine } = await import('./snake');
      return new SnakeEngine(ctx);
    }
    case 'tetris': {
      const { TetrisEngine } = await import('./tetris');
      return new TetrisEngine(ctx);
    }
    case 'breakout': {
      const { BreakoutEngine } = await import('./breakout');
      return new BreakoutEngine(ctx);
    }
    case 'shooter': {
      const { ShooterEngine } = await import('./shooter');
      return new ShooterEngine(ctx);
    }
    case 'runner': {
      const { RunnerEngine } = await import('./runner');
      return new RunnerEngine(ctx);
    }
    case 'pong': {
      const { PongEngine } = await import('./pong');
      return new PongEngine(ctx);
    }
    case 'puzzle': {
      const { PuzzleEngine } = await import('./puzzle');
      return new PuzzleEngine(ctx);
    }
    case 'platformer': {
      const { PlatformerEngine } = await import('./platformer');
      return new PlatformerEngine(ctx);
    }
    case 'card': {
      const { CardEngine } = await import('./card');
      return new CardEngine(ctx);
    }
    case 'racing': {
      const { RacingEngine } = await import('./racing');
      return new RacingEngine(ctx);
    }
    default:
      throw new Error(`Unknown engine: ${type}`);
  }
}
