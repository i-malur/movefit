import { GymClass } from "../types";

export const INITIAL_CLASSES: GymClass[] = [
  {
    id: "pilates",
    name: "Pilates",
    days: "Seg / Qua / Sex",
    category: "Flexibilidade & Postura",
    iconName: "Activity",
    description: "Fortalecimento do core, controle postural e respiração consciente com foco em equilíbrio e flexibilidade.",
    slots: [
      { time: "07:00", totalSpots: 15, bookedSpots: 4 },
      { time: "10:00", totalSpots: 15, bookedSpots: 7 },
      { time: "18:00", totalSpots: 15, bookedSpots: 11 },
    ],
  },
  {
    id: "spinning",
    name: "Spinning",
    days: "Ter / Qui",
    category: "Cardio de Alta Intensidade",
    iconName: "Bike",
    description: "Ciclismo indoor dinâmico com simulação de subidas e tiros em ritmo musical para queima calórica intensa.",
    slots: [
      { time: "06:30", totalSpots: 12, bookedSpots: 6 },
      { time: "12:00", totalSpots: 12, bookedSpots: 3 },
      { time: "19:30", totalSpots: 12, bookedSpots: 10 },
    ],
  },
  {
    id: "fitdance",
    name: "FitDance",
    days: "Seg / Qua",
    category: "Ritmo & Queima Calórica",
    iconName: "Music",
    description: "Coreografias empolgantes e hits contagiantes que combinam diversão, coordenação motora e alto gasto calórico.",
    slots: [
      { time: "11:00", totalSpots: 20, bookedSpots: 9 },
      { time: "19:00", totalSpots: 20, bookedSpots: 16 },
    ],
  },
  {
    id: "funcional",
    name: "Treino Funcional",
    days: "Ter / Qui",
    category: "Condicionamento Total",
    iconName: "Dumbbell",
    description: "Movimentos integrados, circuitos de resistência, agilidade e força aplicados à biomecânica do corpo humano.",
    slots: [
      { time: "07:30", totalSpots: 15, bookedSpots: 5 },
      { time: "17:30", totalSpots: 15, bookedSpots: 8 },
      { time: "18:30", totalSpots: 15, bookedSpots: 14 },
    ],
  },
];
