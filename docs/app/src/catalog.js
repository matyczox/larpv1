/**
 * Program: działy (linie), umiejętności (stacje), katalog typowych błędów (pułapki)
 * i generatory zadań. Każda pułapka jest wykonywana kodem na konkretnym zadaniu,
 * więc wiadomo dokładnie, jaki zły wynik daje i w którym kroku się pojawia.
 *
 * Źródła błędów: typowe błędy maturzystów opisywane w sprawozdaniach CKE z egzaminu
 * maturalnego z matematyki (poziom podstawowy). Pole `source` wymaga uzupełnienia
 * o konkretny rok i numer zadania przed publikacją.
 */
import { rng, polyStr, signed, paren, parseLine, fmtSet, solvePoly } from './math.js';

export const LINES = [
  { id: 'wyrazenia', name: 'Wyrażenia', badge: 'W', skills: ['kwadrat', 'minus-nawias', 'iloczyn'] },
  { id: 'rownania', name: 'Równania', badge: 'R', skills: ['przenoszenie', 'dzielenie', 'nawias-rownanie'] },
  { id: 'nierownosci', name: 'Nierówności', badge: 'N', skills: ['zwrot', 'kwadratowa', 'ujemne-a'] },
  { id: 'funkcja', name: 'Funkcja liniowa', badge: 'F', skills: ['nachylenie', 'miejsce-zerowe', 'wzor-prostej'] },
];

/* ---------- Pułapki ---------- */
// concepts: elementy dobrego wyjaśnienia; patterns dopasowywane do tekstu bez polskich znaków, małymi literami.

export const BUGS = {
  B01: {
    name: 'Kwadrat sumy jako suma kwadratów', example: '(x + 3)² = x² + 9',
    why: 'Kwadrat nawiasu to mnożenie nawiasu przez siebie: (a + b)² = (a + b)(a + b) = a² + 2ab + b². Wyraz 2ab znika, gdy „rozdzielamy” potęgę na składniki, a tego robić nie wolno.',
    concepts: [
      { label: 'kwadrat to mnożenie nawiasu przez ten sam nawias', patterns: ['razy (siebie|ten sam|to samo)', 'przez (siebie|ten sam|to samo)', 'dwa (razy )?nawias', 'pomnoz', 'mnoz.*nawias', 'nawias.*nawias', '\\)\\s*\\(', '\\)\\*\\('] },
      { label: 'brakuje wyrazu 2ab (podwojonego iloczynu)', patterns: ['2ab', '2 ?\\* ?a ?\\* ?b', 'podwoj', 'srod', 'iloczyn', '\\b\\d+x\\b', 'wzor.*skrocon', 'skrocon'] },
    ],
    kuba: {
      intro: 'Rozwinąłem to tak, jak potęgę iloczynu: każdy składnik do kwadratu. Wyszło {wrong}. Chyba dobrze?',
      pushback: 'Nie przekonuje mnie to. Przecież (2 · 3)² = 2² · 3², więc z sumą powinno być tak samo.',
      followups: ['Dobrze, ale co właściwie znaczy podnieść nawias do kwadratu?', 'Czyli mnożę nawias przez nawias… i co wychodzi w środku?'],
      success: 'Aha! (x + a)² to (x + a)(x + a), więc dochodzi jeszcze podwojony iloczyn. Poprawiam: {correct}.',
    },
  },
  B02: {
    name: 'Zapomniane podwojenie', example: '(x + 3)² = x² + 3x + 9',
    why: 'Przy mnożeniu (x + a)(x + a) iloczyn x · a pojawia się dwa razy, dlatego we wzorze jest 2ab, a nie ab.',
    concepts: [
      { label: 'iloczyn x·a pojawia się dwa razy', patterns: ['dwa razy', 'dwukrotnie', 'podwoj', 'dwa wyrazy', 'ax \\+ ax', '\\b2ab\\b', 'dwa iloczyny', 'razy dwa', '\\* ?2'] },
    ],
    kuba: {
      intro: 'Pamiętałem o wyrazie środkowym! Wyszło {wrong}.',
      pushback: 'No ale przecież jest x razy a, to wpisałem raz.',
      followups: ['Ile razy przy mnożeniu nawiasu przez nawias pojawia się x razy a?'],
      success: 'Rzeczywiście, x·a wychodzi z obu stron, więc jest 2ax. Poprawiam: {correct}.',
    },
  },
  B03: {
    name: 'Minus przy kwadracie liczby', example: '(x − 3)² = x² − 6x − 9',
    why: 'W (a − b)² ostatni wyraz to (−b)·(−b) = +b². Minus razy minus daje plus.',
    concepts: [
      { label: 'ostatni wyraz to (−b)·(−b), czyli plus', patterns: ['minus (razy|\\*) minus', 'ujemn.*(razy|\\*).*ujemn', 'minus.*minus.*plus', '\\(-\\d+\\) ?\\*? ?\\(-\\d+\\)', 'dodatn', 'plus \\d+', '\\+ ?b', 'kwadrat.*(zawsze )?(dodatn|nieujemn)', 'kwadrat liczby'] },
    ],
    kuba: {
      intro: 'W nawiasie jest minus, więc wszystko, co z niego wychodzi, ma minus: {wrong}.',
      pushback: 'Nadal uważam, że minus po prostu „przechodzi” dalej.',
      followups: ['A ile to jest (−3) · (−3)?'],
      success: 'Minus razy minus to plus, więc na końcu jest +b². Poprawiam: {correct}.',
    },
  },
  B04: {
    name: 'Minus tylko przy pierwszym wyrazie nawiasu', example: '5x − (2x − 3) = 3x − 3',
    why: 'Minus przed nawiasem zmienia znaki wszystkich wyrazów w nawiasie: −(2x − 3) = −2x + 3.',
    concepts: [
      { label: 'minus zmienia znak każdego wyrazu w nawiasie', patterns: ['wszystk', 'kazd', 'oba', 'obu', 'caly nawias', 'calego nawiasu', 'drugi(ego)? wyraz', '-1 ?\\*', 'razy ?-1', 'razy minus jeden'] },
      { label: '−(−b) daje +b', patterns: ['minus (razy|\\*) minus', 'minus minus', '\\+ ?\\d', 'na plus', 'plus', 'dodatn'] },
    ],
    kuba: {
      intro: 'Opuściłem nawias, zmieniając znak pierwszego wyrazu. Wyszło {wrong}.',
      pushback: 'Przecież minus stoi tuż przed pierwszym wyrazem, to jego dotyczy.',
      followups: ['Których wyrazów w nawiasie dotyczy ten minus?', 'A co się stanie z ujemnym wyrazem w nawiasie?'],
      success: 'Minus działa na cały nawias, więc −(−b) daje +b. Poprawiam: {correct}.',
    },
  },
  B05: {
    name: 'Mnożenie tylko skrajnych wyrazów', example: '(x + 2)(x + 5) = x² + 10',
    why: 'Każdy wyraz pierwszego nawiasu mnożymy przez każdy wyraz drugiego. Iloczyny „mieszane” dają wyraz z x.',
    concepts: [
      { label: 'każdy wyraz mnożymy przez każdy', patterns: ['kazd.*kazd', 'wszystk', 'kazdy (wyraz )?z kazdym', 'cztery', '4 iloczyn', 'kazdy przez kazdy'] },
      { label: 'brakuje wyrazów z x (iloczynów mieszanych)', patterns: ['brakuje', 'srod', 'mieszan', 'wyraz(y|ow)? z x', '\\bbx\\b', '\\bax\\b', '\\b\\d+x\\b', 'x razy', 'x \\* ?\\d'] },
    ],
    kuba: {
      intro: 'Pomnożyłem pierwsze przez pierwsze i drugie przez drugie: {wrong}.',
      pushback: 'Tak się przecież mnoży, element po elemencie.',
      followups: ['Ile mnożeń trzeba zrobić przy dwóch nawiasach po dwa wyrazy?', 'Co wyjdzie z x razy liczba z drugiego nawiasu?'],
      success: 'Każdy przez każdy! Wychodzą jeszcze wyrazy z x. Poprawiam: {correct}.',
    },
  },
  B06: {
    name: 'Przeniesienie bez zmiany znaku', example: '3x + 5 = 11 → 3x = 16',
    why: 'Przeniesienie wyrazu na drugą stronę to odjęcie go od obu stron, więc zmienia się jego znak.',
    concepts: [
      { label: 'przeniesienie to odjęcie (dodanie) tej samej liczby po obu stronach', patterns: ['obu stron', 'obie strony', 'z obu', 'odejm', 'odjac', 'dodaj', 'dodac'] },
      { label: 'przy przenoszeniu zmienia się znak', patterns: ['zmien.*znak', 'znak.*zmien', 'przeciwn', 'na minus', 'na plus', 'odwrotn'] },
    ],
    kuba: {
      intro: 'Przeniosłem liczbę na drugą stronę i wyszło {wrong}.',
      pushback: 'Liczba po prostu przechodzi za znak równości, nic się z nią nie dzieje.',
      followups: ['Co właściwie robimy z obiema stronami, gdy „przenosimy” liczbę?', 'A co wtedy dzieje się ze znakiem tej liczby?'],
      success: 'Rozumiem: odejmuję tę samą liczbę po obu stronach, więc znak się zmienia. Poprawiam: {correct}.',
    },
  },
  B07: {
    name: 'Odejmowanie zamiast dzielenia', example: '−4x = 12 → x = 16',
    why: 'Współczynnik przy x mnoży niewiadomą, więc pozbywamy się go dzieląc obie strony przez niego, a nie odejmując.',
    concepts: [
      { label: 'współczynnik mnoży x, więc trzeba dzielić', patterns: ['dziel', 'podziel', 'iloraz', 'mnoz', 'razy x', 'iloczyn', 'przez (wspolczynnik|liczbe)', ':'] },
    ],
    kuba: {
      intro: 'Żeby zostało samo x, odjąłem współczynnik: {wrong}.',
      pushback: 'Przecież po lewej jest liczba i x, to liczbę się odejmuje.',
      followups: ['Jakie działanie łączy tę liczbę z x?'],
      success: 'To jest mnożenie, więc dzielę obie strony. Poprawiam: {correct}.',
    },
  },
  B08: {
    name: 'Zgubiony znak przy dzieleniu przez liczbę ujemną', example: '−4x = 12 → x = 3',
    why: 'Dzieląc przez liczbę ujemną, trzeba uwzględnić jej znak: 12 : (−4) = −3.',
    concepts: [
      { label: 'dzielimy przez liczbę ujemną, więc wynik zmienia znak', patterns: ['ujemn', 'minus', 'znak', '\\(-\\d+\\)', 'plus przez minus', 'przeciwn'] },
    ],
    kuba: {
      intro: 'Podzieliłem przez współczynnik i wyszło {wrong}.',
      pushback: 'Podzieliłem dobrze, liczby się zgadzają.',
      followups: ['Przez jaką dokładnie liczbę dzielisz, razem ze znakiem?'],
      success: 'Zapomniałem o minusie przy współczynniku. Poprawiam: {correct}.',
    },
  },
  B09: {
    name: 'Mnożenie tylko pierwszego wyrazu w nawiasie', example: '3(x − 2) = 9 → 3x − 2 = 9',
    why: 'Liczba przed nawiasem mnoży każdy wyraz w nawiasie: 3(x − 2) = 3x − 6.',
    concepts: [
      { label: 'liczba przed nawiasem mnoży każdy wyraz', patterns: ['kazd', 'wszystk', 'oba', 'obu', 'caly nawias', 'drugi(ego)? wyraz', 'rozdziel', 'tez (razy|przez)'] },
    ],
    kuba: {
      intro: 'Wymnożyłem nawias: {first}. Potem już prosto, wyszło {wrong}.',
      pushback: 'Liczba stoi obok x, więc mnożę x.',
      followups: ['Przez co jeszcze trzeba pomnożyć liczbę sprzed nawiasu?'],
      success: 'Mnożę każdy wyraz w nawiasie! Poprawiam: {correct}.',
    },
  },
  B10: {
    name: 'Brak zmiany zwrotu nierówności', example: '−2x > 6 → x > −3',
    why: 'Mnożąc lub dzieląc nierówność przez liczbę ujemną, zmieniamy jej zwrot. Sprawdź: 3 > 1, ale −3 < −1.',
    concepts: [
      { label: 'dzielimy (mnożymy) przez liczbę ujemną', patterns: ['ujemn', 'minus', '\\(-\\d+\\)', 'przez -'] },
      { label: 'zmienia się zwrot (kierunek) nierówności', patterns: ['zwrot', 'kierun', 'odwrac', 'odwroc', 'obrac', 'znak nierownosci', 'na mniejsz', 'na wieksz', 'zmien.*(<|>|znak)'] },
    ],
    kuba: {
      intro: 'Podzieliłem obie strony przez współczynnik, tak jak w równaniu: {wrong}.',
      pushback: 'W równaniach tak robię i działa, czemu tu miałoby nie działać?',
      followups: ['Przez jaką liczbę dzieliłem i jaki ma znak?', 'Co się dzieje z nierównością 3 > 1, gdy obie strony pomnożysz przez −1?'],
      success: 'Dzielenie przez liczbę ujemną odwraca zwrot nierówności. Poprawiam: {correct}.',
    },
  },
  B11: {
    name: 'Odwrócone przedziały paraboli', example: '(x − 1)(x − 4) > 0 → x ∈ (1; 4)',
    why: 'Dla a > 0 parabola ma ramiona w górę: wartości są dodatnie na zewnątrz pierwiastków, a ujemne między nimi.',
    concepts: [
      { label: 'ramiona paraboli skierowane w górę (a > 0)', patterns: ['ramion', 'w gore', 'do gory', 'a ?> ?0', 'dodatni (wspolczynnik|a)', 'wspolczynnik.*dodatn', 'usmiech'] },
      { label: 'dodatnie wartości są na zewnątrz miejsc zerowych', patterns: ['na zewnatrz', 'poza', 'po bokach', 'z boku', 'mniejsze od.*(lub|albo).*wieksze', 'nad osia', 'ponad osia', 'pod osia', 'miedzy'] },
    ],
    kuba: {
      intro: 'Miejsca zerowe znalazłem, więc rozwiązanie to przedział między nimi: {wrong}.',
      pushback: 'Rozwiązanie zawsze jest między pierwiastkami, tak zapamiętałem.',
      followups: ['Jak wygląda ta parabola, w którą stronę ma ramiona?', 'Gdzie ta parabola jest nad osią x, a gdzie pod nią?'],
      success: 'Ramiona w górę, więc nad osią jest na zewnątrz pierwiastków, a pod osią między nimi. Poprawiam: {correct}.',
    },
  },
  B12: {
    name: 'Pomylone końce przedziału', example: '(x − 1)(x − 4) ≥ 0 → x ∈ (−∞; 1) ∪ (4; +∞)',
    why: 'Przy ≤ i ≥ miejsca zerowe spełniają nierówność, więc należą do rozwiązania (nawias domknięty). Przy < i > nie należą.',
    concepts: [
      { label: 'przy ≥/≤ miejsca zerowe spełniają nierówność', patterns: ['rowne zero', '= ?0', 'zero (tez|rowniez)', 'spelnia', 'nalez', 'wlicz', 'nieostr', 'lub rown'] },
      { label: 'nawias domknięty dla miejsc zerowych', patterns: ['domkni', 'otwart', 'nawias', 'kwadratow', 'ostry', '⟨', '<'] },
    ],
    kuba: {
      intro: 'Przedziały wziąłem dobre, ale z nawiasami nie kombinowałem: {wrong}.',
      pushback: 'Nawiasy to szczegół, przecież przedział się zgadza.',
      followups: ['Czy miejsca zerowe spełniają tę nierówność?', 'Jaki nawias pokazuje, że koniec należy do zbioru?'],
      success: 'Jeśli nierówność jest nieostra, miejsca zerowe należą do rozwiązania i nawias jest domknięty, a przy ostrej otwarty. Poprawiam: {correct}.',
    },
  },
  B13: {
    name: 'Zignorowany minus przy x²', example: '−(x − 1)(x − 4) > 0 → x ∈ (−∞; 1) ∪ (4; +∞)',
    why: 'Gdy a < 0, parabola ma ramiona w dół: wartości dodatnie są między miejscami zerowymi, nie na zewnątrz.',
    concepts: [
      { label: 'współczynnik a jest ujemny', patterns: ['a ?< ?0', 'ujemn', 'minus (przed|przy) x', '-x\\^?2', 'minus x'] },
      { label: 'ramiona paraboli w dół, więc przedziały się odwracają', patterns: ['ramion', 'w dol', 'na dol', 'odwrac', 'odwroc', 'miedzy', 'smutn', 'zmienia (sie )?(przedzial|odpowiedz)'] },
    ],
    kuba: {
      intro: 'Zrobiłem jak zawsze: dla > biorę na zewnątrz pierwiastków. Wyszło {wrong}.',
      pushback: 'Zawsze tak robię i zwykle wychodzi.',
      followups: ['Jaki znak ma współczynnik przy x²?', 'Jak wtedy wygląda parabola?'],
      success: 'Przy a < 0 ramiona są w dół, więc jest odwrotnie niż zwykle. Poprawiam: {correct}.',
    },
  },
  B14: {
    name: 'Odwrócony iloraz przy nachyleniu', example: 'a = (x₂ − x₁)/(y₂ − y₁)',
    why: 'Współczynnik kierunkowy mówi, o ile zmienia się y, gdy x rośnie o 1: a = (y₂ − y₁)/(x₂ − x₁). Zmiana y jest w liczniku.',
    concepts: [
      { label: 'zmiana y jest w liczniku, zmiana x w mianowniku', patterns: ['y.*licznik', 'licznik.*y', 'roznica y', 'zmiana y', 'przyrost y', 'y przez x', 'y ?/ ?x', 'odwrotn', 'na odwrot', 'zamien'] },
    ],
    kuba: {
      intro: 'Policzyłem różnicę x-ów przez różnicę y-ów: {wrong}.',
      pushback: 'Kolejność dzielenia chyba nie ma znaczenia, liczby są te same.',
      followups: ['Co mówi współczynnik a: o ile zmienia się y, gdy x wzrośnie o 1, czy odwrotnie?'],
      success: 'a to zmiana y podzielona przez zmianę x. Poprawiam: {correct}.',
    },
  },
  B15: {
    name: 'Różnice w różnej kolejności', example: 'a = (y₂ − y₁)/(x₁ − x₂)',
    why: 'W liczniku i mianowniku trzeba odejmować w tej samej kolejności punktów, inaczej zmienia się znak wyniku.',
    concepts: [
      { label: 'ta sama kolejność odejmowania w liczniku i mianowniku', patterns: ['kolejnos', 'ta sama', 'tak samo', 'zamienion', 'odwrotnie', 'punkt (b|drugi) minus', 'drugi minus pierwszy'] },
      { label: 'inna kolejność zmienia znak wyniku', patterns: ['znak', 'minus', 'ujemn', 'przeciwn'] },
    ],
    kuba: {
      intro: 'Odjąłem y-ki i x-y, wyszło {wrong}.',
      pushback: 'Odejmowanie to odejmowanie, wszystko się zgadza.',
      followups: ['Od którego punktu odejmujesz w liczniku, a od którego w mianowniku?', 'Co się stanie ze znakiem, jeśli kolejność będzie różna?'],
      success: 'W liczniku i mianowniku musi być ta sama kolejność, inaczej zmienia się znak. Poprawiam: {correct}.',
    },
  },
  B16: {
    name: 'Miejsce zerowe pomylone z wyrazem wolnym', example: 'f(x) = 2x − 6 → x₀ = −6',
    why: 'Wyraz wolny b to wartość funkcji dla x = 0 (punkt przecięcia z osią y). Miejsce zerowe to x, dla którego f(x) = 0.',
    concepts: [
      { label: 'miejsce zerowe to x, dla którego f(x) = 0', patterns: ['f\\(x\\) ?= ?0', 'rowna (sie )?zero', 'wartosc (funkcji )?(jest )?(rowna )?0', 'przyrown', '= ?0', 'zeruje'] },
      { label: 'b to punkt przecięcia z osią y', patterns: ['os(ia|i)? y', 'oy', 'x ?= ?0', 'przeciec.*y', 'wyraz wolny'] },
    ],
    kuba: {
      intro: 'Miejsce zerowe to wyraz wolny, więc {wrong}.',
      pushback: 'Wyraz wolny to przecież to miejsce, gdzie wykres „zaczyna się”.',
      followups: ['Co znaczy „miejsce zerowe”, co ma być równe zero?', 'A gdzie wykres przecina oś y?'],
      success: 'Miejsce zerowe to rozwiązanie f(x) = 0, a b to przecięcie z osią y. Poprawiam: {correct}.',
    },
  },
  B18: {
    name: 'Wyraz wolny wzięty z dowolnego punktu', example: 'A = (2; 5) → b = 5',
    why: 'Wyraz wolny b to wartość y tylko w punkcie o x = 0. Dla innych punktów trzeba podstawić je do y = ax + b i wyliczyć b.',
    concepts: [
      { label: 'b to wartość y tylko dla x = 0', patterns: ['x ?= ?0', 'zero', 'os(ia|i)? y', 'oy', 'przeciec'] },
      { label: 'trzeba podstawić punkt do wzoru i wyliczyć b', patterns: ['podstaw', 'wylicz', 'oblicz b', 'rownanie', 'y ?= ?ax ?\\+ ?b', 'wzor'] },
    ],
    kuba: {
      intro: 'a policzyłem z dwóch punktów, a b wziąłem z punktu A. Wyszło {wrong}.',
      pushback: 'Punkt leży na prostej, więc jego y to właśnie b.',
      followups: ['Dla jakiego x wartość funkcji jest równa b?', 'Jak inaczej wyznaczyć b, mając punkt i a?'],
      success: 'b to y dla x = 0, a w innym punkcie trzeba je wyliczyć z równania. Poprawiam: {correct}.',
    },
  },
};

for (const [id, b] of Object.entries(BUGS)) b.id = id;

/* ---------- Pomocnicze zapisy ---------- */

const cx = (a, v = 'x') => (a === 1 ? v : a === -1 ? `-${v}` : `${a}${v}`);
const term = (c, v) => (c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 && v ? '' : Math.abs(c)}${v}`);
function frac(n, d) {
  if (d < 0) { n = -n; d = -d; }
  const g = (a, b) => (b ? g(b, a % b) : Math.abs(a));
  const k = g(n, d);
  n /= k; d /= k;
  return d === 1 ? String(n) : `${n}/${d}`;
}
const flip = op => ({ '<': '>', '>': '<', '≤': '≥', '≥': '≤' })[op];
const swapSide = op => ({ '<': '>', '>': '<', '≤': '≥', '≥': '≤' })[op]; // ta sama „ostrość”, przeciwny kierunek
const toggleStrict = op => ({ '<': '≤', '≤': '<', '>': '≥', '≥': '>' })[op];
const lin = (p, q) => `(x${signed(-p)})(x${signed(-q)})`;

function bug(id, steps, idx) {
  return { id, steps, idx, answer: parseLine(steps.at(-1)) };
}

/* ---------- Generatory zadań ---------- */
// Każdy generator zwraca: statement (zapis zadania), prompt (polecenie), kind ('expr' | 'set'),
// steps (wzorcowe kroki; pierwszy to zadanie), bugs (warianty z jednym typowym błędem), opcjonalnie plot.

const isExpanded = line => !/[()]/.test(line);
const isNumber = line => /^\s*-?\s*\d+(\s*\/\s*\d+)?\s*$/.test(line.replace(/^a\s*=\s*/i, ''));

export const SKILLS = {
  kwadrat: {
    name: 'Kwadrat sumy', line: 'wyrazenia', kind: 'expr', final: isExpanded,
    hint: 'Zapisz kwadrat jako iloczyn dwóch takich samych nawiasów i wymnóż każdy wyraz przez każdy.',
    gen(r) {
      const a = r.int(2, 7), minus = r.next() < 0.5, s = minus ? '-' : '+';
      const st = `(x ${s} ${a})^2`;
      const steps = [st, `(x ${s} ${a})(x ${s} ${a})`, `x^2 ${s} ${a}x ${s} ${a}x + ${a * a}`, polyStr([1, (minus ? -2 : 2) * a, a * a])];
      const bugs = [
        bug('B01', [st, `x^2 + ${a * a}`], 1),
        bug('B02', [st, `(x ${s} ${a})(x ${s} ${a})`, polyStr([1, (minus ? -1 : 1) * a, a * a])], 2),
      ];
      if (minus) bugs.push(bug('B03', [st, `(x - ${a})(x - ${a})`, `x^2 - ${a}x - ${a}x - ${a * a}`, polyStr([1, -2 * a, -a * a])], 2));
      return { prompt: 'Rozwiń i uprość wyrażenie.', statement: st, steps, bugs };
    },
  },
  'minus-nawias': {
    name: 'Minus i nawias', line: 'wyrazenia', kind: 'expr', final: isExpanded,
    hint: 'Minus przed nawiasem to mnożenie przez −1. Zmień znak każdego wyrazu w nawiasie.',
    gen(r) {
      const p = r.int(2, 9), q = r.int(1, 8, [p]), c = r.int(1, 9);
      const st = `${p}x - (${cx(q)} - ${c})`;
      return {
        prompt: 'Uprość wyrażenie.', statement: st,
        steps: [st, `${p}x - ${cx(q)} + ${c}`, polyStr([0, p - q, c])],
        bugs: [bug('B04', [st, `${p}x - ${cx(q)} - ${c}`, polyStr([0, p - q, -c])], 1)],
      };
    },
  },
  iloczyn: {
    name: 'Iloczyn nawiasów', line: 'wyrazenia', kind: 'expr', final: isExpanded,
    hint: 'Pomnóż każdy wyraz pierwszego nawiasu przez każdy wyraz drugiego, a potem zredukuj wyrazy podobne.',
    gen(r) {
      let a, b;
      do { a = r.int(-6, 6, [0]); b = r.int(-6, 6, [0, a]); } while (a + b === 0);
      const st = `(x${signed(a)})(x${signed(b)})`;
      return {
        prompt: 'Wymnóż nawiasy i uprość.', statement: st,
        steps: [st, `x^2${term(b, 'x')}${term(a, 'x')}${signed(a * b)}`, polyStr([1, a + b, a * b])],
        bugs: [bug('B05', [st, `x^2${signed(a * b)}`], 1)],
      };
    },
  },
  przenoszenie: {
    name: 'Przenoszenie', line: 'rownania', kind: 'set', final: (l, p) => p.final,
    hint: 'Odejmij (albo dodaj) tę samą liczbę po obu stronach, tak żeby po lewej został tylko wyraz z x.',
    gen(r) {
      const a = r.int(2, 6), x0 = r.int(-6, 6), b = r.int(-9, 9, [0]), c = a * x0 + b;
      const st = `${a}x${signed(b)} = ${c}`;
      return {
        prompt: 'Rozwiąż równanie.', statement: st,
        steps: [st, `${a}x = ${c - b}`, `x = ${x0}`],
        bugs: [bug('B06', [st, `${a}x = ${c + b}`, `x = ${frac(c + b, a)}`], 1)],
      };
    },
  },
  dzielenie: {
    name: 'Dzielenie przez a', line: 'rownania', kind: 'set', final: (l, p) => p.final,
    hint: 'Liczba przy x mnoży niewiadomą. Podziel obie strony przez tę liczbę, razem z jej znakiem.',
    gen(r) {
      let a, x0;
      do { a = r.int(-7, -2); x0 = r.int(-6, 6, [0]); } while (a * x0 - a === x0 || a * x0 - a === -x0);
      const c = a * x0, st = `${a}x = ${c}`;
      return {
        prompt: 'Rozwiąż równanie.', statement: st,
        steps: [st, `x = ${c}/(${a})`, `x = ${x0}`],
        bugs: [
          bug('B07', [st, `x = ${c} - (${a})`, `x = ${c - a}`], 1),
          bug('B08', [st, `x = ${c}/${-a}`, `x = ${-x0}`], 1),
        ],
      };
    },
  },
  'nawias-rownanie': {
    name: 'Nawias w równaniu', line: 'rownania', kind: 'set', final: (l, p) => p.final,
    hint: 'Najpierw wymnóż liczbę przez każdy wyraz w nawiasie, potem przenieś liczby na prawą stronę.',
    gen(r) {
      const a = r.int(2, 5), b = r.int(1, 6), x0 = r.int(-4, 8), c = a * (x0 - b);
      const st = `${a}(x - ${b}) = ${c}`;
      return {
        prompt: 'Rozwiąż równanie.', statement: st,
        steps: [st, `${a}x - ${a * b} = ${c}`, `${a}x = ${c + a * b}`, `x = ${x0}`],
        bugs: [bug('B09', [st, `${a}x - ${b} = ${c}`, `${a}x = ${c + b}`, `x = ${frac(c + b, a)}`], 1)],
      };
    },
  },
  zwrot: {
    name: 'Zmiana zwrotu', line: 'nierownosci', kind: 'set', final: (l, p) => p.final,
    hint: 'Przenieś liczby na prawą stronę. Gdy dzielisz przez liczbę ujemną, odwróć znak nierówności.',
    gen(r) {
      const a = r.int(2, 5), x0 = r.int(-5, 5), b = r.int(1, 9), c = b - a * x0, op = r.pick(['>', '<', '≥', '≤']);
      const st = `${b} - ${a}x ${op} ${c}`;
      return {
        prompt: 'Rozwiąż nierówność.', statement: st,
        steps: [st, `-${a}x ${op} ${c - b}`, `x ${flip(op)} ${x0}`],
        bugs: [bug('B10', [st, `-${a}x ${op} ${c - b}`, `x ${op} ${x0}`], 2)],
      };
    },
  },
  kwadratowa: {
    name: 'Kwadratowa, a > 0', line: 'nierownosci', kind: 'set', final: (l, p) => p.final,
    hint: 'Znajdź miejsca zerowe i naszkicuj parabolę. Przy a > 0 ramiona idą w górę: nad osią jest na zewnątrz pierwiastków.',
    gen(r) {
      const p = r.int(-5, 4, [0]), q = r.int(p + 1, 6, [0]), op = r.pick(['>', '<', '≥', '≤']);
      const st = `${lin(p, q)} ${op} 0`, c = [1, -(p + q), p * q];
      const ans = fmtSet(solvePoly(op, c));
      return {
        prompt: 'Rozwiąż nierówność.', statement: st,
        steps: [st, `${polyStr(c)} ${op} 0`, ans],
        bugs: [
          bug('B11', [st, `${polyStr(c)} ${op} 0`, fmtSet(solvePoly(swapSide(op), c))], 2),
          bug('B12', [st, `${polyStr(c)} ${op} 0`, fmtSet(solvePoly(toggleStrict(op), c))], 2),
        ],
      };
    },
  },
  'ujemne-a': {
    name: 'Kwadratowa, a < 0', line: 'nierownosci', kind: 'set', final: (l, p) => p.final,
    hint: 'Wyłącz minus przed nawias albo pomnóż przez −1 (zmieniając zwrot). Pamiętaj: przy a < 0 ramiona paraboli idą w dół.',
    gen(r) {
      const p = r.int(-5, 4, [0]), q = r.int(p + 1, 6, [0]), op = r.pick(['>', '<', '≥', '≤']);
      const c = [-1, p + q, -p * q], st = `${polyStr(c)} ${op} 0`;
      const ans = fmtSet(solvePoly(op, c));
      return {
        prompt: 'Rozwiąż nierówność.', statement: st,
        steps: [st, `-${lin(p, q)} ${op} 0`, ans],
        bugs: [
          bug('B13', [st, `-${lin(p, q)} ${op} 0`, fmtSet(solvePoly(op, [1, -(p + q), p * q]))], 2),
          bug('B12', [st, `-${lin(p, q)} ${op} 0`, fmtSet(solvePoly(toggleStrict(op), c))], 2),
        ],
      };
    },
  },
  nachylenie: {
    name: 'Nachylenie', line: 'funkcja', kind: 'expr', final: isNumber, prefix: /^\s*a\s*=\s*/i,
    hint: 'Współczynnik kierunkowy to zmiana y podzielona przez zmianę x: a = (y₂ − y₁)/(x₂ − x₁).',
    gen(r) {
      const a = r.pick([-3, -2, 2, 3]), b = r.int(-4, 4), x1 = r.int(-3, 1), x2 = x1 + r.int(1, 3);
      const y1 = a * x1 + b, y2 = a * x2 + b, dy = y2 - y1, dx = x2 - x1;
      return {
        prompt: `Oblicz współczynnik kierunkowy prostej przechodzącej przez punkty A = (${x1}; ${y1}) i B = (${x2}; ${y2}).`,
        statement: String(a), hideStatement: true, points: [[x1, y1, 'A'], [x2, y2, 'B']],
        steps: [`(${y2} - ${paren(y1)})/(${x2} - ${paren(x1)})`, `${dy}/${dx}`, String(a)],
        bugs: [
          bug('B14', [`(${x2} - ${paren(x1)})/(${y2} - ${paren(y1)})`, `${dx}/${dy}`, frac(dx, dy)], 0),
          bug('B15', [`(${y2} - ${paren(y1)})/(${x1} - ${paren(x2)})`, `${dy}/${-dx}`, frac(dy, -dx)], 0),
        ],
      };
    },
  },
  'miejsce-zerowe': {
    name: 'Miejsce zerowe', line: 'funkcja', kind: 'set', final: (l, p) => p.final,
    hint: 'Miejsce zerowe to x, dla którego f(x) = 0. Przyrównaj wzór do zera i rozwiąż równanie.',
    gen(r) {
      let a, x0, b;
      do { a = r.int(-5, 5, [0, 1]); x0 = r.int(-6, 6, [0]); b = -a * x0; } while (b === x0);
      const f = polyStr([0, a, b]), st = `${f} = 0`;
      return {
        prompt: `Wyznacz miejsce zerowe funkcji f(x) = ${f}.`, statement: st, line: { a, b },
        steps: [st, `${cx(a)} = ${-b}`, `x = ${x0}`],
        bugs: [
          bug('B06', [st, `${cx(a)} = ${b}`, `x = ${frac(b, a)}`], 1),
          bug('B16', [st, `x = ${b}`], 1),
        ],
      };
    },
  },
  'wzor-prostej': {
    name: 'Wzór prostej', line: 'funkcja', kind: 'expr', answerOnly: true, final: line => /^\s*(y|f\(x\))\s*=/i.test(line) || !/[()]/.test(line),
    hint: 'Policz a = (y₂ − y₁)/(x₂ − x₁), a potem podstaw jeden z punktów do y = ax + b i wylicz b.',
    gen(r) {
      let a, b, x1, x2;
      do { a = r.pick([-3, -2, 2, 3]); b = r.int(-5, 5); x1 = r.int(1, 3); x2 = x1 + r.int(1, 2); } while (a * x1 + b === b);
      const y1 = a * x1 + b, y2 = a * x2 + b, inv = frac(x2 - x1, y2 - y1);
      const invB = `${y1} - (${inv})*${x1}`;
      return {
        prompt: `Wyznacz wzór funkcji liniowej, której wykres przechodzi przez punkty A = (${x1}; ${y1}) i B = (${x2}; ${y2}).`,
        statement: `${polyStr([0, a, b])}`, hideStatement: true, points: [[x1, y1, 'A'], [x2, y2, 'B']], plotAnswer: true,
        steps: [`a = (${y2} - ${paren(y1)})/(${x2} - ${x1}) = ${a}`, `${y1} = ${a}·${x1} + b, więc b = ${b}`, `y = ${polyStr([0, a, b])}`],
        bugs: [
          { ...bug('B18', [`y = ${polyStr([0, a, y1])}`], 0), narrative: [`a = (${y2} − ${y1})/(${x2} − ${x1}) = ${a}`, `b = ${y1}, bo punkt A ma y = ${y1}`, `y = ${polyStr([0, a, y1])}`] },
          { ...bug('B14', [`y = (${inv})x + ${invB}`], 0), narrative: [`a = (${x2} − ${x1})/(${y2} − ${y1}) = ${inv}`, `${y1} = ${inv} · ${x1} + b`, `y = (${inv})x + (${invB})`] },
        ],
      };
    },
  },
};

for (const [id, s] of Object.entries(SKILLS)) s.id = id;

export const lineOf = skillId => LINES.find(l => l.id === SKILLS[skillId]?.line);
export const bugsOfSkill = skillId => [...new Set(SKILLS[skillId].bugIds || [])];

/** Tworzy konkretne zadanie z ziarna. Gwarantuje, że każda pułapka daje inny wynik niż poprawny. */
export function makeTask(skillId, seed = 1, forcedBug = null) {
  const skill = SKILLS[skillId];
  if (!skill) throw new Error(`Nieznana umiejętność: ${skillId}`);
  for (let attempt = 0; attempt < 60; attempt++) {
    const r = rng(seed * 7919 + attempt * 104729 + 13);
    const t = skill.gen(r);
    const answer = parseLine(t.statement);
    const ok = t.bugs.every(b => b.answer.kind !== answer.kind || !(b.answer.kind === 'set'
      ? JSON.stringify(b.answer.set) === JSON.stringify(answer.set)
      : sameExpr(b.answer.f, answer.f)));
    const distinct = t.bugs.every((b, i) => t.bugs.every((c, j) => j <= i || b.answer.kind !== c.answer.kind || !(b.answer.kind === 'set'
      ? JSON.stringify(b.answer.set) === JSON.stringify(c.answer.set) : sameExpr(b.answer.f, c.answer.f))));
    if (!ok || !distinct) continue;
    if (forcedBug && !t.bugs.some(b => b.id === forcedBug)) continue;
    return { ...t, skill: skillId, seed, kind: skill.kind, answer, answerOnly: !!skill.answerOnly };
  }
  throw new Error(`Nie udało się wygenerować zadania dla ${skillId}`);
}

function sameExpr(f, g) {
  return [-2.3, 0.7, 1.9, 4.1].every(x => Math.abs(f(x) - g(x)) < 1e-9);
}

// Indeks: które pułapki mogą wystąpić w której umiejętności (z przykładowego zadania).
for (const id of Object.keys(SKILLS)) {
  const ids = new Set();
  for (let s = 1; s <= 12; s++) for (const b of SKILLS[id].gen(rng(s)).bugs) ids.add(b.id);
  SKILLS[id].bugIds = [...ids];
}
export const skillsOfBug = bugId => Object.keys(SKILLS).filter(id => SKILLS[id].bugIds.includes(bugId));
