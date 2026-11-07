export type TrainingLevel = "Iniciante" | "Moderado" | "Intermediário" | "Avançado";

export type RecommendationCategory = "treino" | "aquecimento" | "exercicio" | "geral";

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  trainingLevel: TrainingLevel;
  weight?: number;
  height?: number;
  gender?: string;
  age?: number;
  medicalNotes: string;
  matricula: string;
  createdAt: string;
}

export interface GymClassSlot {
  time: string;
  totalSpots: number;
  bookedSpots: number;
  availableSpots: number;
}

export interface GymClass {
  id: string;
  name: string;
  category: string;
  days: string;
  description: string;
  iconName: string;
  slots: GymClassSlot[];
}

export interface BookedClass {
  bookingId: string;
  classId: string;
  className: string;
  time: string;
  schedule?: string;
  duration?: string;
  bookedAt?: string;
}

export interface SavedRecommendation {
  id: string;
  userId: string;
  title: string;
  category: RecommendationCategory;
  content: string;
  sourceMessageId?: string;
  savedAt: string;
}

export interface ChatAction {
  type: "BOOK_CLASS" | "CANCEL_CLASS";
  classId: string;
  className: string;
  time?: string;
  bookingId?: string;
  status: "success" | "error";
  statusMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  action?: ChatAction;
}