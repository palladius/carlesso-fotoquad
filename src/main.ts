import { createAudio } from './platform/audio';
import { loadPhotos } from './platform/manifest';
import { sliceAll } from './platform/slicer';
import { createStorage } from './platform/storage';
import { App } from './ui/app';
import { loadingScreen } from './ui/screens';
import './styles/main.css';

async function boot(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#app');
  if (!root) return;
  root.replaceChildren(loadingScreen('📸 Carico le foto di famiglia…'));
  const base = new URL(import.meta.env.BASE_URL, window.location.href).href;
  const photos = await loadPhotos(fetch.bind(window), base);
  if (!photos.length) {
    root.replaceChildren(loadingScreen('😢 Nessuna foto trovata in photos/photos.json'));
    return;
  }
  const app = new App({
    root,
    photos,
    storage: createStorage(window.localStorage),
    audio: createAudio(),
    slice: sliceAll,
    now: () => Date.now(),
    seed: () => crypto.getRandomValues(new Uint32Array(1))[0] ?? Date.now(),
  });
  app.showStart();
}

void boot();
