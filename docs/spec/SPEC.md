---
speck_version: "0.1"
mode: manual
idea_file: input_prompt.md
created_at: "2026-10-31T11:05:00Z"
category: games
slug: family-photo-quad-match
title: "FotoQuad: Il Solitario di Famiglia (Carlesso Photo 4-Match Puzzle)"
tags:
  - games
  - puzzle
  - solitaire
  - family
  - carlesso
  - pwa
  - canvas
  - mobile-web
---

# FotoQuad: Il Solitario di Famiglia 📸🧩
*(Carlesso Family Photo 4-Match Puzzle)*

## 1. Problem Statement & Vision

I giochi di solitario e puzzle match-3 per smartphone sono pieni di pubblicità spazzatura, grafiche anonime e collage insensati generati dall'intelligenza artificiale (stile il meme del pescatore col tonno e Mr. Bean su Google Play). Tuttavia, la **meccanica centrale di quel formato è geniale e ipnotica**: un tavolo da gioco verde stile solitario, un mazzo di carte in cima e una griglia di frammenti fotografici da ricomporre.

**FotoQuad** trasforma questa meccanica virale in un gioco elegante, personalizzato e affettivo per la **famiglia Carlesso**:
- Invece di immagini a caso, il mazzo è composto da **$N$ foto di famiglia** (Ale e Seby al tennis camp, le vacanze estive, ritratti, gite sul lago di Zurigo, avatar Dreamworks di Gamberone).
- Ogni foto ha formato **portrait uniforme** (es. 3:4 o 9:16) ed è tagliata in **4 quadranti esatti** (Top-Left, Top-Right, Bottom-Left, Bottom-Right).
- Quando il giocatore individua e combina i 4 pezzi corrispondenti della stessa foto:
  1. I 4 frammenti si attraggono magneticamente e si **ricompongono** nell'immagine intera a schermo.
  2. Un effetto visivo di trionfo (particelle/luce) e un suono soddisfacente celebrano il ricordo.
  3. I 4 pezzi vengono **scartati dal tavolo** (*"butta via quei 4 pezzi"*).
  4. Dal mazzo in cima **vengono distribuiti 4 nuovi frammenti** a riempire i posti vuoti, finché tutte le foto del mazzo non sono state completate!

Il gioco è concepito come **PWA (Progressive Web App) offline-first**, giocabile su smartphone (ottimizzata per uso con una sola mano in verticale), tablet o desktop, senza server, login o pubblicità.

---

## 2. Core Gameplay & Rules

### 2.1. Il Mazzo e i Frammenti
- **Deck iniziale**: $N$ fotografie di famiglia in formato portrait.
- **Scomposizione in 4**: Ogni foto $P_i$ genera esattamente 4 tessere rettangolari:
  - `TL` (Top-Left / Alto Sinistra)
  - `TR` (Top-Right / Alto Destra)
  - `BL` (Bottom-Left / Basso Sinistra)
  - `BR` (Bottom-Right / Basso Destra)
- **Dimensione totale del mazzo**: $N \times 4$ carte/tessere.

### 2.2. Il Tavolo da Gioco (Layout)
Ispirato al classico solitario su panno verde (o legno scuro moderno):

```
+-------------------------------------------------------------+
| [Deck 1]   [Deck 2]   [Deck 3]   [Deck 4]   [Deck 5]        | <- Mazzi di pesca (in alto)
+-------------------------------------------------------------+
|                                                             |
|   [ TL₁ ]   [ BR₄ ]   [ TR₇ ]   [ BL₂ ]   [ TL₉ ]           |
|   [ BL₄ ]   [ TR₁ ]   [ TL₂ ]   [ BR₇ ]   [ TR₉ ]           | <- Griglia Tableau (5x5 o 5x6)
|   [ BR₁ ]   [ BL₇ ]   [ TR₂ ]   [ TL₄ ]   [ BL₉ ]           |
|   [ BL₁ ]   ...       ...       ...       ...               |
|                                                             |
+-------------------------------------------------------------+
| [ Slot 1 ]   [ Slot 2 ]   [ Slot 3 ]   [ Slot 4 ]           | <- Assembly Tray (Ricomposizione)
+-------------------------------------------------------------+
|  Foto risolte: 12 / 30            🏆 Album Ricordi          |
+-------------------------------------------------------------+
```

1. **Top Bar (I 5 Mazzi di Pesca)**:
   - 5 pile di carte coperte (o semi-coperte).
   - Mostrano il dorso della carta (es. pattern con il gamberetto di Gamberone o stemma di famiglia).
   - Indicano il numero di tessere rimanenti nel mazzo.
2. **Tableau Grid (La Griglia di Gioco)**:
   - 5 colonne × 5 o 6 righe di tessere scoperte (25–30 tessere visibili contemporaneamente).
3. **Assembly Tray (Vassoio di Assemblaggio)**:
   - 4 alloggiamenti posti in basso che rappresentano la forma 2x2 della foto finita.

### 2.3. Il Ciclo di Gioco (The Match-4 Loop)
1. **Selezione delle Tessere**:
   - Il giocatore tocca una tessera sulla griglia.
   - La tessera si solleva con una leggera animazione di pop e si sposta nel vassoio di assemblaggio nella sua posizione naturale (es. se è un `TL`, va nello slot in alto a sinistra).
   - In alternativa (modalità **Direct Tap**): toccando semplicemente 4 pezzi dello stesso soggetto sulla griglia, il gioco li evidenzia con un bordo colorato luminoso dello stesso colore.
2. **Completamento del Quadro**:
   - Non appena il 4° pezzo corrispondente alla stessa foto viene posizionato:
     - Le 4 tessere si fondono istantaneamente rimuovendo le linee di taglio.
     - L'immagine completa si solleva al centro dello schermo in popup celebrativo per 1.5 secondi con il titolo/didascalia della foto (es. *"Ale & Seby al Sonnenberg Tennis Camp 2026"*).
     - Effetto sonoro trionfale (chime/accordo musicale) e micro-coriandoli.
3. **Scarto e Ricarica (Refill)**:
   - Le 4 tessere usate scompaiono con un effetto dissolve/poof verso l'icona dell'Album.
   - Dai 5 mazzi in alto cadono **4 nuove tessere** a cascata per riempire gli spazi rimasti vuoti sulla griglia.
4. **Vittoria Finale**:
   - Quando tutti i mazzi sono esauriti e l'ultima foto viene ricomposta:
     - **Grand Finale Screen**: fuochi d'artificio e sblocco dell'intero **Album Fotografico Interattivo** sfogliabile a tutto schermo.

---

## 3. Gestione e Pipeline delle Foto di Famiglia

Uno dei requisiti chiave è la **massima semplicità per Riccardo** nell'aggiungere le proprie foto senza dover usare Photoshop o tagliare i file a mano.

### 3.1. Auto-Slicing Dinamico lato Client (HTML5 Canvas)
Il motore del gioco riceve semplicemente un elenco di foto intere:
```json
[
  {
    "id": "tennis_2026",
    "src": "assets/photos/kids_tennis.jpg",
    "title": "Campioni al Sonnenberg",
    "year": 2026,
    "tags": ["ale", "sebi", "tennis"]
  },
  {
    "id": "zurich_tram",
    "src": "assets/photos/boys_tram.jpg",
    "title": "In tram per Zurigo",
    "year": 2026,
    "tags": ["ale", "sebi"]
  }
]
```

All'avvio, una funzione JavaScript legge ogni immagine via `<canvas>` e genera istantaneamente 4 ritagli `ImageBitmap` in memoria:
- `quadrant_TL`: `ctx.drawImage(img, 0, 0, w/2, h/2, 0, 0, tw, th)`
- `quadrant_TR`: `ctx.drawImage(img, w/2, 0, w/2, h/2, 0, 0, tw, th)`
- `quadrant_BL`: `ctx.drawImage(img, 0, h/2, w/2, h/2, 0, 0, tw, th)`
- `quadrant_BR`: `ctx.drawImage(img, w/2, h/2, w/2, h/2, 0, 0, tw, th)`

In questo modo basta inserire 20 o 50 foto in una cartella per avere subito un livello completo da 80 o 200 tessere!

### 3.2. Filtri Album & Pacchetti Tematici
Il giocatore può scegliere all'inizio il mazzo con cui giocare:
- **"I Bimbi"**: Solo foto di Alessandro e Sebastian.
- **"Vacanze & Viaggi"**: Foto di viaggi di famiglia.
- **"Gamberone & Dreamworks"**: Tutte le creazioni artistiche generate con Nano Banana.
- **"Tutto l'Archivio"**: Mazzo maratona con tutte le foto caricate.

---

## 4. Modalità di Gioco (Game Modes)

1. **Modalità Solitario Zen (Default)**:
   - Nessun timer, nessuna pressione.
   - Punteggio basato su quante foto sono state completate e numero di mosse.
   - Possibilità di usare un tasto *"Aiuto / Lente d'ingrandimento"* che evidenzia una coppia di pezzi compatibili se si rimane bloccati.
2. **Modalità Shuffle / Pesca Tattica**:
   - I pezzi sulla griglia possono essere spostati o scambiati di posto, oppure si può cliccare su una pila in alto per distribuire nuove carte sopra quelle esistenti come nel Solitario Spider.
3. **Modalità Cronometro & Combo (Party Mode)**:
   - Trova quante più foto possibili in 3 minuti.
   - Combo moltiplicatore se trovi due foto dello stesso soggetto di fila (es. Seby x2, Ale x3).

---

## 5. Architettura Tecnica

- **Frontend Core**: Vanilla TypeScript / ES Modules + HTML5 Canvas o DOM CSS Grid con animazioni FLIP (senza framework pesanti, avvio in < 200ms).
- **Styling**: Tailwind CSS o CSS puro con tema dark / panno verde feltro da casinò o legno teak elegante.
- **Audio Engine**: Web Audio API sintetico (suoni di carte scattanti, click tattili, jingle di vittoria a 8-bit o accordi d'arpa).
- **Storage Locale**: `localStorage` per salvare:
  - Album delle foto già sbloccate.
  - Record personali e stato della partita in corso (se chiudi la tab, la partita riprende esattamente da dove eri).
- **PWA & Offline First**:
  - `manifest.json` per installazione su homescreen Android / iOS.
  - Service Worker per memorizzare sia il codice che tutte le immagini locali nella cache del browser. Zero connessione richiesta in treno o in aereo.

---

## 6. Criteri di Accettazione (Definition of Done)

1. Caricando un set di $N$ foto portrait (da JSON o cartella `assets/photos/`), il gioco le divide correttamente in 4 quadranti geometrici.
2. La griglia mostra le tessere mescolate in modo casuale senza rivelare subito la soluzione banale.
3. Selezionando i 4 quadranti corretti di una foto, questi si uniscono, riproducono l'animazione di completamento e spariscono dal tavolo.
4. I 4 slot vuoti vengono rimpiazzati da 4 nuove tessere pescate dai mazzi fino a esaurimento scorte.
5. Quando tutte le foto sono completate, compare la schermata di vittoria con il riepilogo dell'album e la possibilità di ricominciare.
6. Il gioco è responsive al 100% su mobile portrait (schermo smartphone standard) e desktop.
7. Funziona offline via PWA.

---

## 7. Backlog & Prossimi Passi

- [ ] **Scaffolding Progetto**: Creare la cartella del progetto (`palladius/fotoquad` o sotto `giochi/fotoquad`).
- [ ] **Canvas Slicer Engine**: Script modulare in JS che prende un'immagine e restituisce i 4 canvas ritagliati.
- [ ] **Asset Pack Demo**: Inserire 10 foto campione dei Carlesso (es. bimbi al tennis camp, bici d'autunno, selfie DevFest, tram di Zurigo).
- [ ] **Audio Soundboard**: Aggiungere effetti sonori di carte e jingle vittoria.
