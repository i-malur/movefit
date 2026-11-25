import dotenv from "dotenv";
dotenv.config();

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import mongoose, { Schema, Document } from "mongoose";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// ============================================================
// CONEXÃO AO MONGODB ATLAS
// ============================================================

const mongoURI = process.env.MONGODB_URI || process.env.DATABASE_URL;

async function connectDB() {
  if (!mongoURI) {
    console.warn("⚠️ MONGODB_URI / DATABASE_URL não configurada nas variáveis de ambiente!");
    return;
  }

  try {
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Banco de dados MongoDB conectado com sucesso!");
    await seedDatabase();
  } catch (err: any) {
    console.error("❌ Erro ao conectar ao MongoDB Atlas:", err?.message || err);
  }
}

// ============================================================
// MONGOOSE SCHEMAS & MODELS
// ============================================================

interface IUser extends Document {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  trainingLevel: string;
  weight?: number;
  height?: number;
  gender?: string;
  age?: number;
  medicalNotes: string;
  matricula: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  id: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  trainingLevel: { type: String, default: "Iniciante" },
  weight: { type: Number, default: null },
  height: { type: Number, default: null },
  gender: { type: String, default: "Não informado" },
  age: { type: Number, default: null },
  medicalNotes: { type: String, default: "Nenhuma" },
  matricula: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model<IUser>("User", UserSchema);

interface IGymClass extends Document {
  id: string;
  name: string;
  category: string;
  days: string;
  iconName: string;
  description: string;
}

const GymClassSchema = new Schema<IGymClass>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  days: { type: String, required: true },
  iconName: { type: String, required: true },
  description: { type: String, required: true },
});

const GymClass = mongoose.model<IGymClass>("GymClass", GymClassSchema);

interface IBookedClass extends Document {
  id: string;
  userId: string;
  classId: string;
  className?: string;
  time: string;
  bookedAt: Date;
}

const BookedClassSchema = new Schema<IBookedClass>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  classId: { type: String, required: true },
  className: { type: String, default: "" },
  time: { type: String, required: true },
  bookedAt: { type: Date, default: Date.now },
});

const BookedClass = mongoose.model<IBookedClass>("BookedClass", BookedClassSchema);

interface IChatSession extends Document {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true, default: "Nova conversa com a Vic" },
  createdAt: { type: Date, default: Date.now },
});

const ChatSession = mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);

interface IChatMessage extends Document {
  id: string;
  sessionId: string;
  userId: string;
  role: string;
  content: string;
  action?: any;
  timestamp: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>({
  id: { type: String, required: true, unique: true },
  sessionId: { type: String, required: true },
  userId: { type: String, required: true },
  role: { type: String, required: true },
  content: { type: String, required: true },
  action: { type: Schema.Types.Mixed, default: null },
  timestamp: { type: Date, default: Date.now },
});

const ChatMessage = mongoose.model<IChatMessage>("ChatMessage", ChatMessageSchema);

interface ISavedRecommendation extends Document {
  id: string;
  userId: string;
  title: string;
  category: string;
  content: string;
  sourceMessageId?: string;
  savedAt: string;
}

const SavedRecommendationSchema = new Schema<ISavedRecommendation>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  title: { type: String, required: true },
  category: { type: String, required: true },
  content: { type: String, required: true },
  sourceMessageId: { type: String, default: "" },
  savedAt: { type: String, default: () => new Date().toLocaleString("pt-BR") },
});

const SavedRecommendation = mongoose.model<ISavedRecommendation>("SavedRecommendation", SavedRecommendationSchema);

// ============================================================
// CONFIGURAÇÃO DAS AULAS E LIMITES DE VAGAS (6 MODALIDADES)
// ============================================================

const FULL_CLASSES_CONFIG = [
  {
    id: "pilates",
    name: "Pilates",
    category: "Flexibilidade & Core",
    days: "Seg / Qua / Sex",
    iconName: "Activity",
    description: "Fortalecimento do core, postura e flexibilidade.",
    slotsConfig: [
      { time: "07:00", maxSpots: 20 },
      { time: "09:00", maxSpots: 20 },
      { time: "10:00", maxSpots: 20 },
      { time: "16:00", maxSpots: 20 },
      { time: "18:00", maxSpots: 20 },
      { time: "19:00", maxSpots: 20 },
    ],
  },
  {
    id: "spinning",
    name: "Spinning",
    category: "Cardio Alta Intensidade",
    days: "Seg a Sex",
    iconName: "Bike",
    description: "Treino aeróbico dinâmico sobre bicicleta ergométrica.",
    slotsConfig: [
      { time: "06:30", maxSpots: 25 },
      { time: "08:00", maxSpots: 25 },
      { time: "12:00", maxSpots: 25 },
      { time: "17:30", maxSpots: 25 },
      { time: "19:30", maxSpots: 25 },
    ],
  },
  {
    id: "fitdance",
    name: "FitDance",
    category: "Ritmo & Queima",
    days: "Seg / Qua / Sex",
    iconName: "Music",
    description: "Aulas de dança dinâmicas com coreografias atuais.",
    slotsConfig: [
      { time: "09:30", maxSpots: 30 },
      { time: "11:00", maxSpots: 30 },
      { time: "18:30", maxSpots: 30 },
      { time: "19:30", maxSpots: 30 },
    ],
  },
  {
    id: "funcional",
    name: "Treino Funcional",
    category: "Condicionamento Total",
    days: "Ter / Qui / Sáb",
    iconName: "Dumbbell",
    description: "Exercícios dinâmicos para agilidade, força e resistência.",
    slotsConfig: [
      { time: "07:30", maxSpots: 18 },
      { time: "10:30", maxSpots: 18 },
      { time: "17:30", maxSpots: 18 },
      { time: "18:30", maxSpots: 18 },
    ],
  },
  {
    id: "yoga",
    name: "Yoga & Mindfulness",
    category: "Bem-estar & Mente",
    days: "Ter / Qui",
    iconName: "Activity",
    description: "Conexão entre respiração, postura corporal e relaxamento.",
    slotsConfig: [
      { time: "07:00", maxSpots: 15 },
      { time: "08:30", maxSpots: 15 },
      { time: "19:00", maxSpots: 15 },
    ],
  },
  {
    id: "boxe",
    name: "Boxe Fitness",
    category: "Luta & Cardio",
    days: "Seg / Qua / Sex",
    iconName: "Dumbbell",
    description: "Técnicas de boxe combinadas com circuito de alta intensidade.",
    slotsConfig: [
      { time: "12:00", maxSpots: 16 },
      { time: "18:00", maxSpots: 16 },
      { time: "20:00", maxSpots: 16 },
    ],
  },
];

// ============================================================
// SEED AUTOMÁTICO COM UPSERT
// ============================================================

async function seedDatabase() {
  try {
    const demoUser = await User.findOne({ id: "user-demo-1" });
    if (!demoUser) {
      await User.create({
        id: "user-demo-1",
        fullName: "Maria Luiza Queiroz",
        email: "maria@movefit.com",
        username: "marialuiza.fit",
        password: "Movefit@2026",
        trainingLevel: "Iniciante",
        weight: 65.0,
        height: 168,
        gender: "Feminino",
        age: 24,
        medicalNotes: "Nenhuma",
        matricula: "MF-2026-001",
      });
    }

    const classesData = [
      { id: "pilates", name: "Pilates", category: "Flexibilidade & Core", days: "Seg / Qua / Sex", iconName: "Activity", description: "Fortalecimento do core, postura e flexibilidade." },
      { id: "spinning", name: "Spinning", category: "Cardio Alta Intensidade", days: "Seg a Sex", iconName: "Bike", description: "Treino aeróbico dinâmico sobre bicicleta ergométrica." },
      { id: "fitdance", name: "FitDance", category: "Ritmo & Queima", days: "Seg / Qua / Sex", iconName: "Music", description: "Aulas de dança dinâmicas com coreografias atuais." },
      { id: "funcional", name: "Treino Funcional", category: "Condicionamento Total", days: "Ter / Qui / Sáb", iconName: "Dumbbell", description: "Exercícios dinâmicos para agilidade, força e resistência." },
      { id: "yoga", name: "Yoga & Mindfulness", category: "Bem-estar & Mente", days: "Ter / Qui", iconName: "Activity", description: "Conexão entre respiração, postura corporal e relaxamento." },
      { id: "boxe", name: "Boxe Fitness", category: "Luta & Cardio", days: "Seg / Qua / Sex", iconName: "Dumbbell", description: "Técnicas de boxe combinadas com circuito de alta intensidade." },
    ];

    for (const c of classesData) {
      await GymClass.findOneAndUpdate({ id: c.id }, c, { upsert: true, new: true });
    }
    console.log("✅ Todas as 6 modalidades atualizadas no MongoDB Atlas!");
  } catch (err) {
    console.error("⚠️ Erro no seed do MongoDB:", err);
  }
}

function generateFitUsername(fullName: string): string {
  const cleanName = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return `${cleanName}.fit`;
}

const CLASS_NAMES: Record<string, string> = {
  pilates: "Pilates",
  spinning: "Spinning",
  fitdance: "FitDance",
  funcional: "Treino Funcional",
  yoga: "Yoga & Mindfulness",
  boxe: "Boxe Fitness",
};

function parseBookingIntent(text: string): { type: "BOOK_CLASS" | "CANCEL_CLASS"; classId: string; time?: string; className: string } | null {
  const lower = text.toLowerCase();

  if (lower.includes("cancela") || lower.includes("desmarca") || lower.includes("remover aula") || lower.includes("tirar minha vaga")) {
    if (lower.includes("pilates")) return { type: "CANCEL_CLASS", classId: "pilates", className: "Pilates" };
    if (lower.includes("spinning") || lower.includes("bike")) return { type: "CANCEL_CLASS", classId: "spinning", className: "Spinning" };
    if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) return { type: "CANCEL_CLASS", classId: "fitdance", className: "FitDance" };
    if (lower.includes("funcional")) return { type: "CANCEL_CLASS", classId: "funcional", className: "Treino Funcional" };
    if (lower.includes("yoga")) return { type: "CANCEL_CLASS", classId: "yoga", className: "Yoga & Mindfulness" };
    if (lower.includes("boxe")) return { type: "CANCEL_CLASS", classId: "boxe", className: "Boxe Fitness" };
  }

  const isBooking = lower.includes("agenda") || lower.includes("marca") || lower.includes("reserva") || lower.includes("quero fazer") || lower.includes("inscrever") || lower.includes("coloca meu nome");

  if (isBooking) {
    let classId = "";
    let className = "";
    let defaultTimes: string[] = [];

    if (lower.includes("pilates")) { classId = "pilates"; className = "Pilates"; defaultTimes = ["07:00", "09:00", "10:00", "16:00", "18:00", "19:00"]; }
    else if (lower.includes("spinning") || lower.includes("bike")) { classId = "spinning"; className = "Spinning"; defaultTimes = ["06:30", "08:00", "12:00", "17:30", "19:30"]; }
    else if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) { classId = "fitdance"; className = "FitDance"; defaultTimes = ["09:30", "11:00", "18:30", "19:30"]; }
    else if (lower.includes("funcional")) { classId = "funcional"; className = "Treino Funcional"; defaultTimes = ["07:30", "10:30", "17:30", "18:30"]; }
    else if (lower.includes("yoga")) { classId = "yoga"; className = "Yoga & Mindfulness"; defaultTimes = ["07:00", "08:30", "19:00"]; }
    else if (lower.includes("boxe")) { classId = "boxe"; className = "Boxe Fitness"; defaultTimes = ["12:00", "18:00", "20:00"]; }

    if (classId) {
      let selectedTime = defaultTimes[0];
      for (const t of defaultTimes) {
        if (lower.includes(t) || lower.includes(t.replace(":", "h"))) {
          selectedTime = t;
          break;
        }
      }
      return { type: "BOOK_CLASS", classId, time: selectedTime, className };
    }
  }

  return null;
}

async function processVicActionInDatabase(action: any, userId: string) {
  if (!action || !userId) return null;
  try {
    const cleanUserId = String(userId);
    if (action.type === "BOOK_CLASS" && action.classId && action.time) {
      const bookingId = `book-${Date.now()}`;
      await BookedClass.findOneAndUpdate(
        { userId: cleanUserId, classId: action.classId },
        {
          id: bookingId,
          userId: cleanUserId,
          classId: action.classId,
          className: action.className || CLASS_NAMES[action.classId] || action.classId,
          time: action.time,
          bookedAt: new Date()
        },
        { upsert: true, returnDocument: "after" }
      );
      return {
        type: action.type,
        classId: action.classId,
        className: action.className,
        time: action.time,
        bookingId,
        status: "success",
        statusMessage: `Reserva confirmada na aula de ${action.className} às ${action.time}!`
      };
    } else if (action.type === "CANCEL_CLASS" && action.classId) {
      await BookedClass.deleteOne({ userId: cleanUserId, classId: action.classId });
      return {
        type: action.type,
        classId: action.classId,
        className: action.className,
        status: "success",
        statusMessage: `Reserva cancelada com sucesso.`
      };
    }
  } catch (error) {
    console.error("⚠️ Erro ao gravar no MongoDB via Vic:", error);
  }
  return null;
}

async function saveChatMessageToDb(
  sessionId: string | undefined,
  userId: string | undefined,
  role: "user" | "assistant",
  content: string,
  action: any = null
) {
  if (!sessionId || !userId || !content) return;
  try {
    const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    await ChatMessage.create({
      id: msgId,
      sessionId,
      userId,
      role,
      content,
      action,
      timestamp: new Date(),
    });

    if (role === "user") {
      const titleSnippet = content.length > 25 ? content.substring(0, 25) + "..." : content;
      await ChatSession.updateOne(
        { id: sessionId, title: "Nova conversa com a Vic" },
        { title: titleSnippet }
      );
    }
  } catch (err) {
    console.error(`⚠️ Erro ao salvar mensagem (${role}) no MongoDB:`, err);
  }
}

// ============================================================
// ENDPOINTS DA API
// ============================================================

app.get("/api/users", async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const users = await User.find().sort({ createdAt: -1 });
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/auth/register", async (req: Request, res: Response) => {
  try {
    const { fullName, email, password, trainingLevel, weight, height, gender, age, medicalNotes, matricula } = req.body;

    if (!fullName || !email || !password || !matricula) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: "E-mail já cadastrado." });

    const existingMatricula = await User.findOne({ matricula });
    if (existingMatricula) return res.status(400).json({ error: "Matrícula já cadastrada." });

    let finalUsername = generateFitUsername(fullName);
    let userExists = await User.findOne({ username: finalUsername });

    while (userExists) {
      const baseName = generateFitUsername(fullName).replace(".fit", "");
      const randomNum = Math.floor(100 + Math.random() * 900);
      finalUsername = `${baseName}${randomNum}.fit`;
      userExists = await User.findOne({ username: finalUsername });
    }

    const id = "user-" + Date.now();

    const newUser = await User.create({
      id,
      fullName,
      email,
      username: finalUsername,
      password,
      trainingLevel: trainingLevel || "Iniciante",
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
      gender: gender || "Não informado",
      age: age ? parseInt(age) : null,
      medicalNotes: medicalNotes || "Nenhuma",
      matricula,
    });

    return res.status(201).json(newUser);

  } catch (error: any) {
    return res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { usernameOrMatricula, password, identifier } = req.body;
    const loginKey = usernameOrMatricula || identifier;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }

    const user = await User.findOne({
      $or: [{ username: loginKey }, { matricula: loginKey }, { email: loginKey }],
      password,
    });

    if (!user) return res.status(401).json({ error: "Credenciais inválidas." });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao autenticar." });
  }
});

// Endpoint ÚNICO para /api/classes com 6 modalidades
app.get("/api/classes", async (_req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState === 1) {
      const updatedClasses = await Promise.all(
        FULL_CLASSES_CONFIG.map(async (cls) => {
          const slotsWithSpots = await Promise.all(
            cls.slotsConfig.map(async (slot) => {
              const bookedCount = await BookedClass.countDocuments({ classId: cls.id, time: slot.time });
              const totalSpots = slot.maxSpots;
              return {
                time: slot.time,
                totalSpots,
                bookedSpots: bookedCount,
                availableSpots: Math.max(0, totalSpots - bookedCount),
              };
            })
          );
          return {
            id: cls.id,
            name: cls.name,
            category: cls.category,
            days: cls.days,
            description: cls.description,
            iconName: cls.iconName,
            slots: slotsWithSpots,
          };
        })
      );
      return res.json(updatedClasses);
    }

    // Fallback sem banco de dados
    return res.json(
      FULL_CLASSES_CONFIG.map((cls) => ({
        id: cls.id,
        name: cls.name,
        category: cls.category,
        days: cls.days,
        description: cls.description,
        iconName: cls.iconName,
        slots: cls.slotsConfig.map((s) => ({
          time: s.time,
          totalSpots: s.maxSpots,
          bookedSpots: 0,
          availableSpots: s.maxSpots,
        })),
      }))
    );
  } catch (error) {
    return res.status(500).json({ error: "Erro ao carregar lista de aulas." });
  }
});

app.post("/api/classes/book", async (req: Request, res: Response) => {
  try {
    const { userId, classId, time, className } = req.body;

    if (!userId || !classId || !time) {
      return res.status(400).json({ error: "userId, classId e time são obrigatórios." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }

    const bookingId = `book-${Date.now()}`;

    await BookedClass.findOneAndUpdate(
      { userId, classId },
      { id: bookingId, userId, classId, className: className || CLASS_NAMES[classId] || classId, time, bookedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    return res.json({ success: true, message: "Vaga reservada com sucesso!", bookingId });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao efetuar reserva." });
  }
});

app.post("/api/classes/cancel", async (req: Request, res: Response) => {
  try {
    const { userId, classId } = req.body;
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Banco de dados inicializando." });

    const result = await BookedClass.deleteOne({ userId, classId });
    if (result.deletedCount === 0) return res.status(400).json({ error: "Nenhum agendamento encontrado." });

    return res.json({ success: true, message: "Agendamento cancelado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
});

app.get(["/api/users/:userId/bookings", "/api/classes/booked/:userId", "/api/classes/user/:userId"], async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (mongoose.connection.readyState === 1 && userId) {
      const bookings = await BookedClass.find({ $or: [{ userId }, { userId: String(userId) }] });
      return res.json(bookings);
    }
    return res.json([]);
  } catch (error) {
    return res.status(200).json([]);
  }
});

app.get("/api/recommendations/:userId", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (mongoose.connection.readyState === 1 && userId) {
      const recs = await SavedRecommendation.find({
        $or: [{ userId }, { userId: String(userId) }]
      }).sort({ _id: -1 });
      return res.json(recs);
    }
    return res.json([]);
  } catch (error) {
    return res.status(200).json([]);
  }
});

app.post("/api/recommendations", async (req: Request, res: Response) => {
  try {
    const { userId, title, category, content, sourceMessageId } = req.body;
    if (!userId || !title || !content) {
      return res.status(400).json({ error: "Campos obrigatórios ausentes." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }

    const recId = `rec-${Date.now()}`;
    const newRec = await SavedRecommendation.create({
      id: recId,
      userId: String(userId),
      title,
      category: category || "geral",
      content,
      sourceMessageId: sourceMessageId || "",
      savedAt: new Date().toLocaleString("pt-BR"),
    });

    return res.status(201).json(newRec);
  } catch (error: any) {
    return res.status(500).json({ error: "Erro ao salvar recomendação." });
  }
});

app.delete("/api/recommendations/:recId", async (req: Request, res: Response) => {
  try {
    const { recId } = req.params;
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Banco de dados inicializando." });

    await SavedRecommendation.deleteOne({ $or: [{ id: recId }, { _id: recId }] });
    return res.json({ success: true, message: "Recomendação removida." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao remover recomendação." });
  }
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "MoveFIT Server" });
});

// ============================================================
// CHAT DA VIC (IA GROQ + CONTEXTO BIOLÓGICO COMPLETO)
// ============================================================

app.post("/api/vic/chat", async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não informada." });
    }

    const cleanUserId = userId ? String(userId) : "";

    if (sessionId && cleanUserId && mongoose.connection.readyState === 1) {
      await saveChatMessageToDb(sessionId, cleanUserId, "user", message);
    }

    let executedAction: any = null;
    const detectedAction = parseBookingIntent(message);
    if (detectedAction && cleanUserId && mongoose.connection.readyState === 1) {
      executedAction = await processVicActionInDatabase(detectedAction, cleanUserId);
    }

    let userContext = "Aluno participante da MoveFIT.";
    if (mongoose.connection.readyState === 1 && cleanUserId) {
      try {
        let user = await User.findOne({ id: cleanUserId });
        if (!user && mongoose.Types.ObjectId.isValid(cleanUserId)) {
          user = await User.findById(cleanUserId);
        }
        if (user) {
          const formattedAge = user.age ? `${user.age} anos` : "Idade não informada";
          const formattedWeight = user.weight ? `${user.weight} kg` : "Peso não informado";
          const formattedHeight = user.height ? `${user.height} cm` : "Altura não informada";

          userContext = `Nome: ${user.fullName}, Nível: ${user.trainingLevel}, Idade: ${formattedAge}, Gênero: ${user.gender || "Não informado"}, Peso: ${formattedWeight}, Altura: ${formattedHeight}, Dificuldades/Obs Médicas: ${user.medicalNotes}`;
        }
      } catch (e) {
        console.warn("⚠️ Erro ao buscar perfil:", e);
      }
    }

    let replyText = "";
    if (executedAction && executedAction.type === "BOOK_CLASS") {
      replyText = `Com certeza! Agendei a sua aula de ${executedAction.className} às ${executedAction.time} com sucesso! 🏋️‍♀️`;
    } else if (executedAction && executedAction.type === "CANCEL_CLASS") {
      replyText = `Prontinho! Cancelei a sua reserva na aula de ${executedAction.className}.`;
    }

    const groqKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    const systemPrompt = `Você é a Vic, personal trainer virtual em 3D e assistente oficial da academia MoveFIT.
Personalidade: extremamente motivadora, profissional, empática, didática, atenta à segurança física e descontraída.

DADOS DE CONTEXTO DO ALUNO CARREGADOS DO PERFIL:
${userContext}

============================================================
1. PROTOCOLO RÍGIDO DE SEGURANÇA, DOR E RESTRIÇÕES MÉDICAS (PRIORIDADE MÁXIMA)
============================================================
- Antes de prescrever qualquer exercício, analise TANTO as "Dificuldades/Obs Médicas" do perfil do aluno QUANTO qualquer dor, incômodo, cirurgia ou lesão relatada na mensagem atual do chat.
- Se houver QUALQUER restrição médica, dor aguda ou lesão (no chat ou no perfil):
  1. PROIBIÇÃO ABSOLUTA: Nunca prescreva movimentos que gerem impacto, compressão, torção ou sobrecarga na região afetada.
  2. Matriz obrigatória de bloqueio e substituição:
     * JOELHO (condromalácia, menisco, ligamento, dor articular): PROIBIDO polichinelos (jumping_jacks), agachamentos (bodyweight_squat), afundos (lunges), saltos (burpees, jump_squat), corrida ou step. Foque em membros superiores (wall_push_up, push_up, dumbbell_shoulder_raise, bicep_curl), core sem impacto (plank, dead_bug) ou elevação pélvica isométrica somente se indolor.
     * LOMBAR / COLUNA (hérnia, protrusão, lombalgia, ciático): PROIBIDO abdominal tradicional (sit_ups, crunches), levantamento terra (deadlift), remada curvada livre ou hiperextensão lombar. Priorize estabilidade neutra (bird_dog, glute_bridge, wall_push_up, dead_bug).
     * OMBRO / PUNHO / COTOVELO (bursite, tendinite, manguito): PROIBIDO flexões (push_up), prancha apoiada nas mãos (plank), desenvolvimento acima da cabeça (shoulder_press) ou mergulho. Priorize membros inferiores e core sem apoio nos braços (bodyweight_squat, lunges, glute_bridge).
     * HIPERTENSÃO / CARDÍACO / GESTANTE: Evite isometria prolongada (bloqueio respiratório/manobra de Valsalva) e saltos de altíssima intensidade. Oriente respiração contínua e ritmo moderado.
  3. Acolhimento e Aviso Clínico: Demonstre empatia, cite explicitamente quais exercícios foram evitados para proteger a articulação/região mencionada e recomende avaliação com médico ou fisioterapeuta caso a dor persista.

============================================================
2. PERSONALIZAÇÃO BIOMÉTRICA E ESTRUTURA DO TREINO
============================================================
- Cruze sempre idade, gênero, peso, altura e nível de treino (Iniciante, Moderado, Intermediário, Avançado) para ajustar volume (séries/repetições), descanso e cadência.
- Ao prescrever um treino completo, organize sempre em 3 blocos claros:
  1. Aquecimento e Mobilidade (3 a 5 minutos para preparar articulações).
  2. Parte Principal (exercícios detalhados com séries, repetições/tempo, intervalo de descanso e dica de postura/respiração).
  3. Volta à Calma (alongamento leve final).
- Coloque sempre um título descritivo na primeira linha da resposta para que o aluno possa salvar a rotina facilmente no perfil.

============================================================
3. CONHECIMENTO INSTITUCIONAL E AULAS COLETIVAS DA MOVEFIT
============================================================
- Endereço oficial da unidade: Rua Frederico Grotte, 322 - Jardim São Luís, São Paulo - SP, CEP 05818-270.
- Telefone/WhatsApp da recepção: (11) 4002-8922.
- Regra oficial de duração: Todas as aulas coletivas duram rigorosamente 50 minutos.
- Grade oficial completa das 6 modalidades (com limite de vagas por turma):
  * Pilates (Seg / Qua / Sex - 07:00, 09:00, 10:00, 16:00, 18:00, 19:00 - até 20 vagas): foco em flexibilidade, postura e core.
  * Spinning (Seg a Sex - 06:30, 08:00, 12:00, 17:30, 19:30 - até 25 vagas): cardio de alta intensidade em bike.
  * FitDance (Seg / Qua / Sex - 09:30, 11:00, 18:30, 19:30 - até 30 vagas): ritmo, dança e queima calórica.
  * Treino Funcional (Ter / Qui / Sáb - 07:30, 10:30, 17:30, 18:30 - até 18 vagas): agilidade, força e condicionamento total.
  * Yoga & Mindfulness (Ter / Qui - 07:00, 08:30, 19:00 - até 15 vagas): respiração, equilíbrio e relaxamento.
  * Boxe Fitness (Seg / Qua / Sex - 12:00, 18:00, 20:00 - até 16 vagas): luta, coordenação e cardio intenso.
- Se o aluno perguntar qual aula coletiva combina com seu objetivo ou restrição, recomende a modalidade mais adequada da grade acima (ex: Yoga ou Pilates para flexibilidade/bem-estar; Spinning ou Boxe para alto gasto calórico).

============================================================
4. REGRAS OBRIGATÓRIAS DE TAGS PARA VÍDEOS DEMONSTRATIVOS
============================================================
- Sempre que sugerir treinos, séries ou exercícios específicos, INCLUA OBRIGATORIAMENTE na última linha da resposta a tag:
  [EXERCISES: exercicio_1, exercicio_2, exercicio_3]
- Use nomes em inglês com underline (snake_case) e inclua SOMENTE exercícios 100% seguros para a condição do aluno (ex: wall_push_up, dumbbell_shoulder_raise, plank, glute_bridge, bird_dog, bodyweight_squat, lunges, jumping_jacks, bicep_curl).
- Se a conversa for apenas uma dúvida geral, saudação ou informação sobre horários/endereço sem prescrição de exercícios, NÃO inclua a tag [EXERCISES: ...].

============================================================
5. ESCOPO, FORMATAÇÃO E POSTURA DE ATENDIMENTO
============================================================
- Escopo estrito: Você atua exclusivamente como personal trainer e assistente da MoveFIT (treinos, exercícios, bem-estar físico, nutrição básica ligada ao treino e informações da academia). Se o aluno perguntar sobre assuntos totalmente fora disso (programação, política, finanças, etc.), recuse com simpatia e traga o foco de volta para a saúde e os treinos.
- Formatação limpa: NUNCA use asteriscos (**), hashtags (#) ou sintaxe Markdown, pois o texto também é lido em voz alta pelo sistema de áudio (TTS). Use apenas texto limpo, quebras de linha e numeração simples (1., 2., 3.).
- Seja direta e objetiva em dúvidas simples, e completa/detalhada quando montar treinos.
- Seu nome é Vic. Se chamada por outro nome, corrija educadamente. Se o usuário for desrespeitoso, peça educação com firmeza e serenidade.`;

    if (!replyText && groqKey) {
      try {
        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-oss-120b",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
            temperature: 0.7,
            max_tokens: 1000,
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          replyText = data.choices[0]?.message?.content || "";
        } else {
          console.warn("⚠️ Erro HTTP na API Groq:", aiResponse.status);
        }
      } catch (err) {
        console.warn("⚠️ Exceção ao chamar Groq:", err);
      }
    }

    if (!replyText) {
      const lower = message.toLowerCase();
      if (lower.includes("treino") || lower.includes("exercicio") || lower.includes("rotina") || lower.includes("facil") || lower.includes("fáceis") || lower.includes("casa")) {
        replyText = `Rotina de Treinos Leves para Fazer em Casa

Aqui está uma rotina simples, segura e bastante eficiente:

1. Polichinelos: 3 séries de 30 segundos para aquecimento corporal e ativação vascular.
2. Agachamento Livre: 3 séries de 10 repetições. Mantenha os pés afastados na largura dos ombros e projete o quadril para trás.
3. Flexão na Parede: 3 séries de 10 repetições. Apoie as mãos na parede na altura dos ombros e faça a flexão mantendo o corpo alinhado.
4. Prancha Abdominal: 3 séries de 20 segundos para fortalecimento do core.

[EXERCISES: jumping_jacks, bodyweight_squat, wall_push_up, plank]`;
      } else {
        replyText = "Olá! Sou a Vic. Posso criar rotinas de treino adaptadas para você, explicar a postura correta de exercícios ou agendar suas aulas coletivas. Como posso ajudar?";
      }
    }

    if (sessionId && cleanUserId && mongoose.connection.readyState === 1) {
      await saveChatMessageToDb(sessionId, cleanUserId, "assistant", replyText, executedAction);
    }

    return res.json({ response: replyText, action: executedAction });

  } catch (error: any) {
    console.error("❌ Erro no endpoint do chat da Vic:", error?.message || error);
    return res.status(200).json({
      response: "Rotina de Treino Leve em Casa\n\n1. Polichinelo: 3x30s\n2. Agachamento: 3x10\n\n[EXERCISES: jumping_jacks, bodyweight_squat]",
      action: null,
    });
  }
});

// ============================================================
// ELEVENLABS TTS & SESSÕES DE CHAT
// ============================================================

app.post("/api/vic/speech", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const elevenKey = process.env.ELEVENLABS_API_KEY;

    if (!elevenKey) return res.status(500).json({ error: "ELEVENLABS_API_KEY ausente." });

    const cleanText = text.replace(/\[EXERCISES:.*?\]/gi, "").trim();
    const SAFE_FREE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SAFE_FREE_VOICE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": elevenKey },
      body: JSON.stringify({
        text: cleanText,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) return res.status(response.status).json({ error: await response.text() });

    const audioArrayBuffer = await response.arrayBuffer();
    res.set({ "Content-Type": "audio/mpeg", "Content-Length": audioArrayBuffer.byteLength });
    return res.send(Buffer.from(audioArrayBuffer));
  } catch (error: any) {
    return res.status(500).json({ error: "Erro na síntese de voz." });
  }
});

app.get("/api/vic/sessions/:userId", async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const sessions = await ChatSession.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    return res.json(sessions);
  } catch (error) {
    return res.status(200).json([]);
  }
});

app.post("/api/vic/sessions", async (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;
    const sessionId = "session-" + Date.now();
    if (mongoose.connection.readyState !== 1) return res.status(503).json({ error: "Banco de dados inicializando." });
    const session = await ChatSession.create({ id: sessionId, userId, title: title || "Nova conversa com a Vic" });
    return res.status(201).json(session);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar conversa." });
  }
});

app.get("/api/vic/messages/:sessionId", async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    return res.json(messages);
  } catch (error) {
    return res.status(200).json([]);
  }
});

// ============================================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================================

async function startServer() {
  await connectDB();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, () => {
    console.log(`🚀 MoveFIT rodando na porta: ${PORT}`);
  });
}

startServer();