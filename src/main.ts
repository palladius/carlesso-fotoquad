import { APP_NAME } from './app';
import './styles/main.css';

const root = document.querySelector<HTMLDivElement>('#app');
if (root) {
  root.innerHTML = `<main class="splash"><h1>📸🧩 ${APP_NAME}</h1><p>Il Solitario di Famiglia</p></main>`;
}
