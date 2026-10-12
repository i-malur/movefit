import { GymClass } from "../types";


export const INITIAL_CLASSES: GymClass[] = [
  {
    id: "pilates",
    name: "Pilates",
    category: "Flexibilidade & Core",
    days: "Seg/Qua/Sex",
    iconName: "Activity",
    description: "Fortalecimento do core, postura e flexibilidade.",
    slots: [
      { time: "07:00", totalSpots: 30, bookedSpots: 0 },
      { time: "10:00", totalSpots: 30, bookedSpots: 0 },
      { time: "18:00", totalSpots: 30, bookedSpots: 0 },
    ],
  },
  {
    id: "spinning",
    name: "Spinning",
    category: "Cardio Alta Intensidade",
    days: "Ter/Qui",
    iconName: "Bike",
    description: "Treino aeróbico dinâmico sobre bicicleta ergométrica.",
    slots: [
      { time: "06:30", totalSpots: 30, bookedSpots: 0 },
      { time: "12:00", totalSpots: 30, bookedSpots: 0 },
      { time: "19:30", totalSpots: 30, bookedSpots: 0 },
    ],
  },
  {
    id: "fitdance",
    name: "FitDance",
    category: "Ritmo & Queima",
    days: "Seg/Qua",
    iconName: "Music",
    description: "Aulas de dança dinâmicas com coreografias atuais.",
    slots: [
      { time: "11:00", totalSpots: 30, bookedSpots: 0 },
      { time: "19:00", totalSpots: 30, bookedSpots: 0 },
    ],
  },
  {
    id: "funcional",
    name: "Treino Funcional",
    category: "Condicionamento Total",
    days: "Ter/Qui",
    iconName: "Dumbbell",
    description: "Exercícios dinâmicos para agilidade, força e resistência.",
    slots: [
      { time: "07:30", totalSpots: 30, bookedSpots: 0 },
      { time: "17:30", totalSpots: 30, bookedSpots: 0 },
      { time: "18:30", totalSpots: 30, bookedSpots: 0 },
    ],
  },
];