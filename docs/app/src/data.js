/** Autorskie, przykładowe zadania. Nie zawierają treści arkuszy CKE. */
export const SUBJECTS = [
  { id: 'math', name: 'Matematyka', subtitle: 'Funkcja liniowa', icon: 'function', color: '#77b9ff', category: 'Ścisłe', summary: 'Przesuwaj wykres i odkrywaj zależności między współczynnikami.' },
  { id: 'biology', name: 'Biologia', subtitle: 'Układ krążenia', icon: 'heart', color: '#f2a2b6', category: 'Przyrodnicze', summary: 'Odtwórz drogę krwi w żywym, interaktywnym schemacie.' },
  { id: 'english', name: 'Angielski', subtitle: 'Past tenses', icon: 'languages', color: '#c8b5ff', category: 'Języki', summary: 'Rozwiąż zagadkę, dobierając poprawne formy czasów przeszłych.' },
  { id: 'algorithms', name: 'Informatyka', subtitle: 'Algorytm Dijkstry', icon: 'network', color: '#9de2cb', category: 'Ścisłe', summary: 'Odkryj najkrótszą trasę w grafie z prawdziwym algorytmem.' },
];

export const BIO_NODES = [
  { id: 'right_ventricle', label: 'Prawa komora', x: 152, y: 250, kind: 'heart' },
  { id: 'pulmonary_artery', label: 'Tętnice płucne', x: 92, y: 157, kind: 'vessel' },
  { id: 'lungs', label: 'Płuca', x: 182, y: 62, kind: 'organ' },
  { id: 'pulmonary_vein', label: 'Żyły płucne', x: 295, y: 137, kind: 'vessel' },
  { id: 'left_atrium', label: 'Lewy przedsionek', x: 271, y: 250, kind: 'heart' },
  { id: 'left_ventricle', label: 'Lewa komora', x: 269, y: 340, kind: 'heart' },
  { id: 'aorta', label: 'Aorta', x: 382, y: 375, kind: 'vessel' },
  { id: 'body', label: 'Tkanki ciała', x: 250, y: 470, kind: 'organ' },
  { id: 'vena_cava', label: 'Żyły główne', x: 84, y: 399, kind: 'vessel' },
  { id: 'right_atrium', label: 'Prawy przedsionek', x: 69, y: 303, kind: 'heart' },
];

export const BIO_LINKS = [
  ['right_ventricle', 'pulmonary_artery'], ['pulmonary_artery', 'lungs'],
  ['lungs', 'pulmonary_vein'], ['pulmonary_vein', 'left_atrium'],
  ['left_atrium', 'left_ventricle'], ['left_ventricle', 'aorta'],
  ['aorta', 'body'], ['body', 'vena_cava'],
  ['vena_cava', 'right_atrium'], ['right_atrium', 'right_ventricle'],
];

export const GRAPHS = {
  town: {
    nodes: [
      { id: 'A', x: 75, y: 180 }, { id: 'B', x: 200, y: 73 },
      { id: 'C', x: 210, y: 280 }, { id: 'D', x: 370, y: 170 },
      { id: 'E', x: 390, y: 330 }, { id: 'F', x: 535, y: 206 },
    ],
    edges: [
      ['A','B',4], ['A','C',2], ['B','C',1], ['B','D',5],
      ['C','D',8], ['C','E',10], ['D','E',2], ['D','F',6], ['E','F',3]
    ],
  },
  metro: {
    nodes: [
      { id: 'A', x: 65, y: 198 }, { id: 'B', x: 188, y: 87 },
      { id: 'C', x: 185, y: 296 }, { id: 'D', x: 335, y: 87 },
      { id: 'E', x: 360, y: 284 }, { id: 'F', x: 533, y: 195 }
    ],
    edges: [
      ['A','B',6], ['A','C',3], ['B','C',2], ['B','D',4],
      ['C','E',5], ['D','E',1], ['D','F',7], ['E','F',4], ['B','E',8]
    ],
  },
  mountain: {
    nodes: [
      { id: 'A', x: 68, y: 208 }, { id: 'B', x: 200, y: 94 },
      { id: 'C', x: 196, y: 312 }, { id: 'D', x: 348, y: 94 },
      { id: 'E', x: 361, y: 304 }, { id: 'F', x: 534, y: 195 }
    ],
    edges: [
      ['A','B',2], ['A','C',4], ['B','C',3], ['B','D',9],
      ['B','E',6], ['C','E',2], ['D','E',1], ['D','F',3], ['E','F',7]
    ],
  },
};

export const MISSIONS = [
  {
    id: 'math-1', subject: 'math', skill: 'Współczynnik kierunkowy', level: 1, type: 'linear',
    title: 'Przechwyć prostą', eyebrow: 'Misja 01 / Funkcje',
    prompt: 'Ustaw wykres tak, aby przechodził przez punkty A = (0, 1) i B = (2, 5).',
    params: { a: 2, b: 1, points: [[0,1],[2,5]] },
    hint: 'Współczynnik a mówi, o ile rośnie y, gdy x zwiększy się o 1. Zacznij od punktu A.',
    explanation: 'a = (5 − 1) / (2 − 0) = 2. Punkt (0,1) pokazuje b = 1. Zatem y = 2x + 1.',
    diagnose: 'Przelicz zmianę y w stosunku do zmiany x. Pamiętaj, że b to wartość dla x = 0.',
  },
  {
    id: 'math-2', subject: 'math', skill: 'Współczynnik kierunkowy', level: 2, type: 'linear',
    title: 'Trasa malejąca', eyebrow: 'Misja 02 / Funkcje',
    prompt: 'Dopasuj prostą przechodzącą przez P = (0, 3) oraz Q = (3, 0).',
    params: { a: -1, b: 3, points: [[0,3],[3,0]] },
    hint: 'Jeśli wraz ze wzrostem x wartości y spadają, współczynnik a musi być ujemny.',
    explanation: 'a = (0 − 3) / (3 − 0) = −1, a b = 3. Otrzymujemy y = −x + 3.',
    diagnose: 'Zwróć uwagę na znak współczynnika kierunkowego i przecięcie osi OY.',
  },
  {
    id: 'math-3', subject: 'math', skill: 'Współczynnik kierunkowy', level: 3, type: 'linear',
    title: 'Przesunięcie układu', eyebrow: 'Misja 03 / Funkcje',
    prompt: 'Prosta przechodzi przez A = (−1, −5) i B = (2, 4). Odtwórz ją.',
    params: { a: 3, b: -2, points: [[-1,-5],[2,4]] },
    hint: 'Najpierw oblicz a z dwóch punktów. Następnie podstaw jeden punkt do y = ax + b.',
    explanation: 'a = (4 − (−5))/(2 − (−1)) = 3. Z 4 = 3·2 + b mamy b = −2.',
    diagnose: 'Nie zakładaj, że b jest dowolną wartością y z danych punktów; podstaw je do wzoru.',
  },
  {
    id: 'biology-1', subject: 'biology', skill: 'Krążenie płucne', level: 1, type: 'path',
    title: 'Droga do płuc', eyebrow: 'Misja 01 / Układ krążenia',
    prompt: 'Klikaj w odpowiedniej kolejności miejsca, którymi płynie krew w krążeniu małym — od prawej komory do lewego przedsionka.',
    params: { path: ['right_ventricle','pulmonary_artery','lungs','pulmonary_vein','left_atrium'] },
    hint: 'Krążenie małe prowadzi krew z prawej części serca do płuc i z powrotem do lewej części serca.',
    explanation: 'Prawa komora → tętnice płucne → płuca → żyły płucne → lewy przedsionek.',
    diagnose: 'Rozróżnij tętnice (od serca) i żyły (do serca). W krążeniu płucnym tętnice przenoszą krew odtlenowaną.',
  },
  {
    id: 'biology-2', subject: 'biology', skill: 'Krążenie ustrojowe', level: 2, type: 'path',
    title: 'Droga przez organizm', eyebrow: 'Misja 02 / Układ krążenia',
    prompt: 'Ułóż drogę krwi w krążeniu dużym od lewej komory do prawego przedsionka.',
    params: { path: ['left_ventricle','aorta','body','vena_cava','right_atrium'] },
    hint: 'Z lewej komory krew wypływa największą tętnicą, a wraca do serca żyłami głównymi.',
    explanation: 'Lewa komora → aorta → tkanki ciała → żyły główne → prawy przedsionek.',
    diagnose: 'Pomyśl, skąd wypływa krew utlenowana, a do której części serca wraca odtlenowana.',
  },
  {
    id: 'biology-3', subject: 'biology', skill: 'Połączenie krążeń', level: 3, type: 'path',
    title: 'Pełna pętla', eyebrow: 'Misja 03 / Układ krążenia',
    prompt: 'Zaczynając od prawej komory, przeprowadź krew przez płuca i tkanki ciała aż z powrotem do prawej komory.',
    params: { path: ['right_ventricle','pulmonary_artery','lungs','pulmonary_vein','left_atrium','left_ventricle','aorta','body','vena_cava','right_atrium','right_ventricle'] },
    hint: 'Po dotarciu do lewego przedsionka przejdź do lewej komory i dopiero wtedy do aorty.',
    explanation: 'Układ krążenia człowieka jest podwójny: mały obieg przez płuca i duży obieg przez tkanki ciała.',
    diagnose: 'Sprawdź miejsce, w którym obieg płucny przechodzi w obieg ustrojowy.',
  },
  {
    id: 'english-1', subject: 'english', skill: 'Past Perfect', level: 1, type: 'choice',
    title: 'The missing laptop', eyebrow: 'Misja 01 / Detektyw',
    prompt: 'By the time I arrived at the classroom, someone ___ the laptop.',
    params: { options: ['took','had taken','was taking','has taken'], answer: 1, scene: 'Sala jest pusta. Na biurku brakuje laptopa. Pierwszy świadek składa zeznanie.' },
    hint: 'Która czynność wydarzyła się wcześniej — przyjście do sali czy zabranie laptopa?',
    explanation: 'Had taken to Past Perfect: zabranie laptopa nastąpiło wcześniej niż przybycie świadka.',
    diagnose: 'Masz trudność z rozróżnieniem wydarzenia wcześniejszego i późniejszego w przeszłości.',
  },
  {
    id: 'english-2', subject: 'english', skill: 'Past Perfect', level: 2, type: 'choice',
    title: 'Alibi świadka', eyebrow: 'Misja 02 / Detektyw',
    prompt: 'By the time the teacher entered, we ___ all the evidence.',
    params: { options: ['collected','were collecting','had collected','have collected'], answer: 2, scene: 'Nauczyciel wraca. Musicie ustalić, co wydarzyło się, zanim wszedł.' },
    hint: 'By the time często wprowadza punkt w przeszłości, przed którym coś już się wydarzyło.',
    explanation: 'Had collected podkreśla zakończenie zbierania dowodów przed wejściem nauczyciela.',
    diagnose: 'Zwróć uwagę na wyrażenie „by the time” i kolejność zdarzeń.',
  },
  {
    id: 'english-3', subject: 'english', skill: 'Past Continuous', level: 3, type: 'choice',
    title: 'Ostatnia wskazówka', eyebrow: 'Misja 03 / Detektyw',
    prompt: 'While Tom ___ home, he noticed a suspicious car.',
    params: { options: ['walked','had walked','has walked','was walking'], answer: 3, scene: 'Na nagraniu widać Toma idącego ulicą. Wtedy zauważa samochód.' },
    hint: 'While opisuje trwającą czynność w tle, którą przerwało krótsze zdarzenie.',
    explanation: 'Was walking to Past Continuous: czynność trwała, gdy nastąpiło noticed.',
    diagnose: 'Potrzebujesz rozróżniać czynność trwającą od pojedynczego wydarzenia w przeszłości.',
  },
  {
    id: 'algorithms-1', subject: 'algorithms', skill: 'Najkrótsza ścieżka', level: 1, type: 'graph',
    title: 'Kurier w mieście', eyebrow: 'Misja 01 / Grafy',
    prompt: 'Znajdź najkrótszą trasę z A do F. Klikaj węzły po kolei. Liczby na krawędziach oznaczają koszt przejazdu.',
    params: { graph: 'town', start: 'A', end: 'F' },
    hint: 'Najkrótsza droga nie zawsze ma najmniej krawędzi. Porównuj sumy wag.',
    explanation: 'Algorytm Dijkstry wybiera kolejny węzeł o najniższym znanym koszcie i aktualizuje koszty sąsiadów.',
    diagnose: 'Zsumuj wagi wszystkich wybranych połączeń i porównaj wynik z trasą optymalną.',
  },
  {
    id: 'algorithms-2', subject: 'algorithms', skill: 'Najkrótsza ścieżka', level: 2, type: 'graph',
    title: 'Sieć metra', eyebrow: 'Misja 02 / Grafy',
    prompt: 'Wybierz najtańszą trasę między stacjami A i F w nowej sieci metra.',
    params: { graph: 'metro', start: 'A', end: 'F' },
    hint: 'Sprawdź, czy pozorny objazd przez C i E nie ma mniejszej sumy wag.',
    explanation: 'W Dijkstrze ważna jest suma wag, nie fizyczna długość linii na rysunku.',
    diagnose: 'Nie oceniaj kosztu położeniem węzłów na ekranie. To wagi określają koszt.',
  },
  {
    id: 'algorithms-3', subject: 'algorithms', skill: 'Najkrótsza ścieżka', level: 3, type: 'graph',
    title: 'Droga przez góry', eyebrow: 'Misja 03 / Grafy',
    prompt: 'Dotrzyj z A do F możliwie najniższym kosztem. Spróbuj uniknąć kosztownych skrótów.',
    params: { graph: 'mountain', start: 'A', end: 'F' },
    hint: 'Długa trasa z większą liczbą etapów może mieć mniejszy łączny koszt.',
    explanation: 'Ścieżka minimalizuje sumę nieujemnych wag, a nie liczbę odwiedzonych węzłów.',
    diagnose: 'Porównaj sumy na kilku różnych ścieżkach zamiast wybierać najkrótszą wizualnie.',
  },
];

export const getSubject = id => SUBJECTS.find(x => x.id === id);
export const getMission = id => MISSIONS.find(x => x.id === id);
export const subjectMissions = id => MISSIONS.filter(x => x.subject === id);
