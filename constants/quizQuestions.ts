export interface QuizQuestion {
  id: number;
  question: string;
  answers: { id: string; text: string }[];
  correctId: string;
  explanation: string;
  xp: number;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: "Koji je idealni omjer mesa za Sarajevske ćevape?",
    answers: [
      { id: "a", text: "100% govedina" },
      { id: "b", text: "60% junetina + 40% janjetina" },
      { id: "c", text: "50% svinjetina + 50% junetina" },
      { id: "d", text: "80% janjetina + 20% junetina" },
    ],
    correctId: "b",
    explanation: "Klasični sarajevski omjer je 60% junetina i 40% janjetina. Ovaj omjer daje savršenu ravnotežu okusa i teksture.",
    xp: 10,
  },
  {
    id: 2,
    question: "Zašto se dodaje bikarbonat sode u ćevape?",
    answers: [
      { id: "a", text: "Daje ćevapima žutu boju" },
      { id: "b", text: "Ubrzava proces kuhanja" },
      { id: "c", text: "Omekšava meso i daje mekoću" },
      { id: "d", text: "Pojačava miris" },
    ],
    correctId: "c",
    explanation: "Bikarbonat sode (soda bikarbona) podiže pH mesa, što omekšava proteine i rezultira mekanim, sočnim ćevapima.",
    xp: 10,
  },
  {
    id: 3,
    question: "Na kojoj temperaturi treba biti roštilj za savršene ćevape?",
    answers: [
      { id: "a", text: "Mlak (~100°C)" },
      { id: "b", text: "Srednje vruć (~150°C)" },
      { id: "c", text: "Jako vruć (~250-300°C)" },
      { id: "d", text: "Temperatura ne utječe" },
    ],
    correctId: "c",
    explanation: "Roštilj mora biti jako vruć (250-300°C) kako bi ćevapi brzo dobili koricu i zadržali sočnost iznutra. Na hladnom roštilju se lijepe i suše.",
    xp: 15,
  },
  {
    id: 4,
    question: "Koliko komada ćevapa se poslužuje u Sarajevu 'pola porcija'?",
    answers: [
      { id: "a", text: "3 komada" },
      { id: "b", text: "5 komada" },
      { id: "c", text: "8 komada" },
      { id: "d", text: "10 komada" },
    ],
    correctId: "b",
    explanation: "U Sarajevu, 'pola porcija' je 5 ćevapa, a cijela porcija je 10 komada. Banjalučki stil obično ima 5 debljih komada po porciji.",
    xp: 10,
  },
  {
    id: 5,
    question: "Što je somun i zašto je neophodan uz ćevape?",
    answers: [
      { id: "a", text: "Vrsta mesnog umaka" },
      { id: "b", text: "Mekani bosanski kruh za posluživanje" },
      { id: "c", text: "Vrsta pikantne paprike" },
      { id: "d", text: "Naziv za porciju od 10 komada" },
    ],
    correctId: "b",
    explanation: "Somun je tradicionalni bosanski mekani kruh koji se peče na kamenu. Idealan je za ćevape jer upija sokove mesa i kajmaka, a u Sarajevu se ćevapi nikad ne poslužuju bez somuna.",
    xp: 10,
  },
  {
    id: 6,
    question: "Koji je specifičan stil Banjalučkih ćevapa u usporedbi sa Sarajevskima?",
    answers: [
      { id: "a", text: "Tanje su i kraće" },
      { id: "b", text: "Rade se od svinjetine" },
      { id: "c", text: "Deblji su, izrađeni samo od junetine, bez ovčijeg mesa" },
      { id: "d", text: "Peče se u pećnici, ne na roštilju" },
    ],
    correctId: "c",
    explanation: "Banjalučki ćevapi su karakteristično deblji i izrađuju se isključivo od junetine (bez janjetine). Imaju drugačiju teksturu i profil okusa od sarajevskih.",
    xp: 15,
  },
  {
    id: 7,
    question: "Što je kajmak u kontekstu balkanskih jela?",
    answers: [
      { id: "a", text: "Vrsta ljute papričice" },
      { id: "b", text: "Kremasti mliječni namaz od sira/vrhnja" },
      { id: "c", text: "Naziv za roštilj pripremu" },
      { id: "d", text: "Vrsta somuna s lukom" },
    ],
    correctId: "b",
    explanation: "Kajmak je bogati kremasti mliječni namaz koji se tradicionalno pravi od sirovog mlijeka. Urbana verzija koristi masni svježi sir i kiselo vrhnje. Neophodan je prilog uz ćevape.",
    xp: 10,
  },
  {
    id: 8,
    question: "Koliko dugo treba miješati meso za ćevape?",
    answers: [
      { id: "a", text: "30 sekundi — kratko je dovoljno" },
      { id: "b", text: "1-2 minute s mikserom" },
      { id: "c", text: "5+ minuta rukama dok nije glatko i ljepljivo" },
      { id: "d", text: "Ne miješati — samo oblikovati" },
    ],
    correctId: "c",
    explanation: "Ćevapi se moraju miješati rukama minimalno 5 minuta. Ovo razvija proteine (miozin) koji drže meso zajedno i daju karakterističnu teksturu. Mikser to ne može postići isto.",
    xp: 15,
  },
];

export const PASSING_SCORE = 60; // percentage to pass
export const XP_PER_QUESTION = 10;
