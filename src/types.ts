export type TrainingLevel = "Iniciante" | "Intermediário" | "Avançado";

export interface User {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  trainingLevel: TrainingLevel;
  medicalNotes: string;
  matricula: string;
  createdAt: string;
}

export interface GymClassSlot {
  time: string;
  totalSpots: number;
  bookedSpots: number;
}

export interface GymClass {
  id: string;
  name: string;
  days: string;
  slots: GymClassSlot[];
  category: string;
  iconName: "Activity" | "Bike" | "Music" | "Dumbbell";
  description: string;
  instructor?: string;
}

export interface BookedClass {
  bookingId: string;
  classId: string;
  className: string;
  days: string;
  time: string;
  schedule: string; // e.g., "Seg / Qua / Sex • 07:00"
  duration: string; // "50 minutos"
  iconName: "Activity" | "Bike" | "Music" | "Dumbbell";
  bookedAt: string;
}

export interface ChatAction {
  type: "BOOK_CLASS" | "CANCEL_CLASS";
  classId: string;
  className?: string;
  time?: string;
  status?: "success" | "error";
  statusMessage?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  action?: ChatAction;
}

export interface RegistrationErrors {
  fullName?: string;
  email?: string;
  username?: string;
  password?: string;
  trainingLevel?: string;
}
