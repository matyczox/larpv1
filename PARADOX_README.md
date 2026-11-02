# PARADOX — interaktywne laboratorium nauki (prototyp)

Działająca aplikacja edukacyjna przygotowana w ramach projektu konkursowego UwB „Sztuczna inteligencja wśród nas”. Buduje na idei zestawu **weryfikowalnych szablonów ćwiczeń**, które mogą później współpracować z modelem AI. Obecna wersja zawiera 12 autorskich misji w 4 dziedzinach, historię prób, dobór szablonu po wpisaniu tematu oraz lokalnego tutora przez Ollama.

To samodzielne repozytorium pierwszej działającej wersji PARADOX. Aplikacja nie importuje jeszcze automatycznie arkuszy CKE ani nie ocenia otwartych odpowiedzi egzaminacyjnych.

## Uruchomienie (Windows / macOS / Linux)

Wymagany **Node.js 20+**. Bez `npm install`, bez konta w usługach AI, bez klucza API:

```bash
npm start
```

Otwórz **http://127.0.0.1:4173**. Komenda musi zostać wykonana z katalogu głównego repozytorium (tam, gdzie jest `package.json`).

Można także otworzyć aplikację przez GitHub Pages, jeśli Pages publikuje katalog `docs`: ścieżka `/app/`. Wersja statyczna działa bez AI, zapisuje postępy w pamięci przeglądarki.

## Lokalny tutor AI — bez opłat za API

Zainstaluj [Ollama](https://ollama.com/). W drugim terminalu uruchom:

```bash
ollama pull qwen3.5:9b
ollama serve
```

Gdy Ollama działa, `npm start` automatycznie wykrywa lokalny model. Jeśli Ollama jest uruchomiona jako usługa systemowa, dodatkowe `ollama serve` może być zbędne.

Aby wybrać inny model, ustaw zmienną środowiskową `OLLAMA_MODEL` (np. PowerShell: `$env:OLLAMA_MODEL='qwen3.5:9b'`), a następnie ponownie uruchom aplikację. Dodatkowe opcje są w `.env.example` (plik nie jest automatycznie wczytywany; wartości należy przekazać jako zmienne środowiskowe).

**Ważne:** model językowy tłumaczy i podpowiada, ale *nie ocenia* odpowiedzi. Poprawność sprawdzają deterministyczne moduły z `engine.js`. Gdy Ollama nie działa, ćwiczenia, wskazówki i zapis postępów nadal działają. Wersja udostępniona przez GitHub Pages nie może korzystać bezpośrednio z lokalnej Ollama innego użytkownika — potrzebuje własnego backendu.

## Co działa

- Matematyka: regulowany wykres funkcji liniowej, trzy zadania, dokładna weryfikacja współczynników.
- Biologia: interaktywna mapa dwóch obiegów krwi; sprawdzanie kolejności struktur.
- Angielski: trzy oryginalne sceny śledztwa do ćwiczenia Past Perfect / Continuous.
- Informatyka: trzy grafy ważone, samodzielne układanie trasy, sprawdzanie przez algorytm Dijkstry.
- Pulpit, katalog, ścieżki tematyczne, adaptacyjne proponowanie powtórek po błędnych próbach, statystyki oraz trwała historia w `localStorage`.
- Dobór szablonu nauki na podstawie wpisanego tematu: przez lokalne AI lub jawne reguły offline. Nieobsługiwane tematy nie są pozorowane jako działające.
- Opcjonalny lokalny tutor (Qwen/Ollama) przez bezpieczny serwer HTTP w Node.js; bez umieszczania kluczy w frontendzie.

## Co pozostaje poza zakresem prototypu

- Dowolne generowanie nowych szablonów i modeli 3D na żywo.
- Import PDF i ocenianie arkuszy CKE, logowanie i chmurowa synchronizacja.
- Udowodniona skuteczność pedagogiczna (wymaga testów z uczniami).
- Samodzielna instalacja na komputerze jurora w postaci natywnego instalatora.

Nie przedstawiaj prototypu jako ukończonego „World Compilera” ani jako aplikacji, która uczy się autonomicznie. Rekomendacje w wersji offline wynikają z historii prób i reguł. Włączenie modelu lokalnego dodaje dialog tutora i klasyfikację tematu do szablonu, nie zmienia mechanizmu oceniania.

## Struktura

```text
docs/app/index.html       Frontend bez zewnętrznych zależności
docs/app/assets/style.css  Interfejs responsywny
docs/app/src/data.js      Autorskie zadania i grafy
docs/app/src/engine.js    Sprawdzanie, Dijkstra, postęp
docs/app/src/app.js       Widoki i interakcje
server/server.mjs         HTTP i integracja Ollama
tests/engine.test.mjs     Testy logiki
```

## Weryfikacja

```bash
npm run check
```

Testy działają bez dostępu do internetu i bez zewnętrznych pakietów. To prototyp z bazą ćwiczeń — jego rozbudowa powinna następować przez kolejne, niezależnie testowane typy interakcji.
