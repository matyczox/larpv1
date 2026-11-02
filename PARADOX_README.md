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

## Co działa (frontend ErrorLab)

Aktualny frontend to **PARADOX ErrorLab**: matematyka na maturze podstawowej, zbudowana wokół katalogu typowych błędów.

- **Silnik matematyczny** (`math.js`, bez zależności): parsuje zapis ucznia, porównuje wyrażenia, wyznacza zbiory rozwiązań równań i nierówności stopnia ≤ 2. Każdy krok jest sprawdzany deterministycznie.
- **Katalog 17 pułapek** (`catalog.js`), np. (a + b)² = a² + b², brak zmiany zwrotu nierówności, odwrócone przedziały paraboli. Każda pułapka jest regułą wykonywaną na zadaniu, więc silnik rozpoznaje ją w krokach ucznia.
- **12 umiejętności w 4 działach** z generatorami zadań. Testy sprawdzają, że każdy wzorcowy krok jest równoważny, a każda pułapka psuje wynik dokładnie w zadeklarowanym kroku.
- **Tryby:** krok po kroku, „Napraw błąd” (cudze rozwiązanie z jednym błędem), „Naucz Kubę” (symulowany uczeń z kontrolowanym błędem), szybka runda.
- **Laboratorium błędu:** diagnoza → eksperyment dobrany do pułapki (5 szablonów konfigurowanych liczbami z zadania) → Kuba → zadanie sprawdzające bez podpowiedzi.
- **Model ucznia** (`learner.js`): Bayesian Knowledge Tracing, stan pułapek, powtórki w odstępach.
- **Tryb porównawczy:** losowy przydział „wskazówka tekstowa vs eksperyment” i wynik zadania sprawdzającego, z eksportem danych do pilotażu.

Ograniczenie tej wersji: Kuba ocenia wyjaśnienia na podstawie słów kluczowych (offline). Ocena przez model językowy wymaga backendu i nie jest jeszcze podłączona. Pole `source` w katalogu pułapek trzeba uzupełnić o konkretne sprawozdania CKE.

## Co pozostaje poza zakresem prototypu

- Dowolne generowanie nowych szablonów i modeli 3D na żywo.
- Import PDF i ocenianie arkuszy CKE, logowanie i chmurowa synchronizacja.
- Udowodniona skuteczność pedagogiczna (wymaga testów z uczniami).
- Samodzielna instalacja na komputerze jurora w postaci natywnego instalatora.

Nie przedstawiaj prototypu jako ukończonego „World Compilera” ani jako aplikacji, która uczy się autonomicznie. Rekomendacje w wersji offline wynikają z historii prób i reguł. Włączenie modelu lokalnego dodaje dialog tutora i klasyfikację tematu do szablonu, nie zmienia mechanizmu oceniania.

## Struktura

```text
docs/app/index.html            Punkt wejścia
docs/app/assets/style.css      Interfejs w stylu mapy metra, wersja mobilna
docs/app/assets/fonts/         Overpass (OFL), lokalnie
docs/app/src/math.js           Silnik: parser, równoważność, zbiory rozwiązań
docs/app/src/catalog.js        Działy, umiejętności, pułapki, generatory zadań
docs/app/src/check.js          Sprawdzanie kroków, poprawek i wyjaśnień
docs/app/src/learner.js        Model ucznia, powtórki, porównanie warunków
docs/app/src/experiments.js    Eksperymenty dobierane do pułapek
docs/app/src/views.js          Widoki
docs/app/src/app.js            Stan, routing, zdarzenia
docs/app/src/art.js            Mapa metra
server/server.mjs              HTTP i integracja Ollama
tests/*.test.mjs               Testy silnika, katalogu, interfejsu i serwera
```

## Weryfikacja

```bash
npm run check
```

Testy działają bez dostępu do internetu i bez zewnętrznych pakietów. To prototyp z bazą ćwiczeń — jego rozbudowa powinna następować przez kolejne, niezależnie testowane typy interakcji.
