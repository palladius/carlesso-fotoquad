import { createGame } from '../engine/game';
import { reduce } from '../engine/reducer';
import {
  DEFAULT_OPTIONS,
  UNLIMITED,
  type Action,
  type GameOptions,
  type GameState,
  type Photo,
} from '../engine/types';
import type { Difficulty } from '../platform/storage';
import type { GameAudio } from '../platform/audio';
import type { Pack } from '../platform/packs';
import { buildPacks } from '../platform/packs';
import type { SlicedPhoto } from '../platform/slicer';
import type { GameStorage } from '../platform/storage';
import { albumScreen, loadingScreen, startScreen, victoryScreen } from './screens';
import { TableView } from './table';

export interface AppDeps {
  root: HTMLElement;
  photos: Photo[];
  storage: GameStorage;
  audio: GameAudio;
  slice(photos: Photo[]): Promise<SlicedPhoto[]>;
  now(): number;
  seed(): number;
}

/** Facile = tap-to-tray (small kids); Medio/Difficile = in-grid drag & drop with ≤3 / exactly 1 doable photo. */
export function optionsFor(d: Difficulty): GameOptions {
  if (d === 'facile') return { ...DEFAULT_OPTIONS, mode: 'tray', maxCompletable: UNLIMITED };
  return { ...DEFAULT_OPTIONS, mode: 'grid', maxCompletable: d === 'medio' ? 3 : 1 };
}

/** Orchestrates screens, engine and persistence. */
export class App {
  private readonly packs: Pack[];
  private readonly photosById: Map<string, Photo>;
  private readonly sliced = new Map<string, SlicedPhoto>();
  private table: TableView | null = null;
  private state: GameState | null = null;
  private packId = 'all';

  constructor(private readonly d: AppDeps) {
    this.packs = buildPacks(d.photos);
    this.photosById = new Map(d.photos.map((p) => [p.id, p]));
    d.audio.setMuted(d.storage.muted());
    // Web Audio must be unlocked by a user gesture
    d.root.addEventListener('pointerdown', () => d.audio.unlock(), { capture: true });
    d.root.addEventListener('keydown', () => d.audio.unlock(), { capture: true });
  }

  /** Current game state (read-only, for tests and debugging). */
  get currentState(): GameState | null {
    return this.state;
  }

  showStart(): void {
    this.table?.destroy();
    this.table = null;
    const saved = this.d.storage.loadGame();
    const savedPack = saved && this.packs.find((p) => p.id === saved.packId);
    const resumable =
      saved && savedPack && saved.state.photoIds.every((id) => this.photosById.has(id)) ? saved : null;
    this.d.root.replaceChildren(
      startScreen({
        packs: this.packs,
        records: Object.fromEntries(this.packs.map((p) => [p.id, this.d.storage.record(p.id)])),
        resume: resumable
          ? {
              packName: savedPack?.name ?? '',
              solved: resumable.state.solved.length,
              total: resumable.state.photoIds.length,
            }
          : null,
        albumCount: this.unlockedPhotos().length,
        difficulty: this.d.storage.difficulty(),
        onDifficulty: (d) => this.d.storage.setDifficulty(d),
        onStart: (pack) => void this.newGame(pack),
        onResume: () => resumable && void this.openGame(resumable.packId, resumable.state),
        onAlbum: () => this.openAlbum(),
      }),
    );
  }

  async newGame(pack: Pack): Promise<void> {
    const photos = pack.photoIds.map((id) => this.photosById.get(id)).filter((p): p is Photo => !!p);
    const ready = await this.ensureSliced(photos);
    if (!ready.length) return;
    const state = createGame(ready, this.d.seed(), this.gameOptions(), this.d.now());
    await this.openGame(pack.id, state);
  }

  private gameOptions(): GameOptions {
    return optionsFor(this.d.storage.difficulty());
  }

  private async ensureSliced(photos: Photo[]): Promise<Photo[]> {
    const missing = photos.filter((p) => !this.sliced.has(p.id));
    if (missing.length) {
      this.d.root.replaceChildren(loadingScreen('✂️ Taglio le foto in 4…'));
      for (const s of await this.d.slice(missing)) this.sliced.set(s.photo.id, s);
    }
    return photos.filter((p) => this.sliced.has(p.id));
  }

  async openGame(packId: string, state: GameState): Promise<void> {
    const photos = state.photoIds.map((id) => this.photosById.get(id)).filter((p): p is Photo => !!p);
    const ready = await this.ensureSliced(photos);
    if (ready.length !== state.photoIds.length) {
      // some photo could not be loaded: start a fresh game with what we have
      this.d.storage.clearGame();
      if (!ready.length) return this.showStart();
      state = createGame(ready, this.d.seed(), this.gameOptions(), this.d.now());
    }
    this.packId = packId;
    this.state = state;
    this.d.storage.saveGame(packId, state);
    this.table?.destroy();
    this.table = new TableView(
      state,
      {
        onSwap: (from, to) => void this.dispatch({ type: 'SWAP', from, to, now: this.d.now() }),
        onGridTap: (i) => void this.dispatch({ type: 'PLACE_TILE', gridIndex: i, now: this.d.now() }),
        onTrayTap: (q) => void this.dispatch({ type: 'RETURN_TILE', quadrant: q }),
        onHint: () => void this.dispatch({ type: 'HINT' }),
        onAlbum: () => this.openAlbum(),
        onMenu: () => this.showStart(),
        onToggleMute: () => {
          const m = !this.d.audio.muted;
          this.d.audio.setMuted(m);
          this.d.storage.setMuted(m);
          return m;
        },
      },
      { muted: this.d.audio.muted, photosById: this.sliced, tapSound: () => this.d.audio.play('tap') },
    );
    this.d.root.replaceChildren(this.table.root);
    this.table.layout();
  }

  async dispatch(action: Action): Promise<void> {
    if (!this.state || !this.table || this.table.busy) return;
    const { state, events } = reduce(this.state, action);
    if (!events.length) return;
    this.state = state;
    const matched = events.filter((e) => e.type === 'matched').map((e) => (e as { photoId: string }).photoId);
    if (matched.length) this.d.storage.unlock(matched);
    const won = events.find((e) => e.type === 'won');
    if (won) this.d.storage.clearGame();
    else this.d.storage.saveGame(this.packId, state);
    await this.table.play(events, state, (s) => this.d.audio.play(s));
    if (won && won.type === 'won') {
      this.d.audio.play('victory');
      const newRecord = this.d.storage.submitRecord(this.packId, won.moves);
      const pack = this.packs.find((p) => p.id === this.packId);
      this.d.root.append(
        victoryScreen({
          photos: state.photoIds.length,
          moves: won.moves,
          hints: won.hintsUsed,
          durationMs: won.durationMs,
          newRecord,
          onAgain: () => pack && void this.newGame(pack),
          onAlbum: () => this.openAlbum(),
          onMenu: () => this.showStart(),
        }),
      );
    }
  }

  private unlockedPhotos(): Photo[] {
    return this.d.storage
      .unlocked()
      .map((id) => this.photosById.get(id))
      .filter((p): p is Photo => !!p);
  }

  openAlbum(): void {
    const el = albumScreen(this.unlockedPhotos(), () => {
      if (!this.table) this.showStart();
    });
    document.body.append(el);
  }
}
