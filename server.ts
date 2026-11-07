import dotenv from "dotenv";
dotenv.config(); // Carrega as variáveis do .env antes de qualquer instrução

import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import mongoose, { Schema, Document } from "mongoose";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "2mb" }));

// ============================================================
// CONEXÃO SEGURA AO MONGODB ATLAS & INICIALIZAÇÃO
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

// 1. Usuários
interface IUser extends Document {
  id: string;
  fullName: string;
  email: string;
  username: string;
  password?: string;
  trainingLevel: string;
  weight?: number;
  height?: number;
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
  medicalNotes: { type: String, default: "Nenhuma" },
  matricula: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model<IUser>("User", UserSchema);

// 2. Aulas Coletivas
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

// 3. Agendamentos de Aulas
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

// 4. Sessões de Chat da Vic
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

// 5. Mensagens de Chat da Vic
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

// ============================================================
// POPULAR BANCO COM DADOS INICIAIS (SEED AUTOMÁTICO)
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
        medicalNotes: "Nenhuma",
        matricula: "MF-2026-001",
      });
    }

    const classesData = [
      { id: "pilates", name: "Pilates", category: "Flexibilidade & Core", days: "Seg/Qua/Sex", iconName: "Activity", description: "Fortalecimento do core, postura e flexibilidade." },
      { id: "spinning", name: "Spinning", category: "Cardio Alta Intensidade", days: "Ter/Qui", iconName: "Bike", description: "Treino aeróbico dinâmico sobre bicicleta ergométrica." },
      { id: "fitdance", name: "FitDance", category: "Ritmo & Queima", days: "Seg/Qua", iconName: "Music", description: "Aulas de dança dinâmicas com coreografias atuais." },
      { id: "funcional", name: "Treino Funcional", category: "Condicionamento Total", days: "Ter/Qui", iconName: "Dumbbell", description: "Exercícios dinâmicos para agilidade, força e resistência." },
    ];

    for (const c of classesData) {
      const exists = await GymClass.findOne({ id: c.id });
      if (!exists) {
        await GymClass.create(c);
      }
    }

    console.log("✅ Dados padrão do MongoDB validados!");
  } catch (err) {
    console.error("⚠️ Erro no seed do MongoDB:", err);
  }
}

// ============================================================
// FUNÇÃO AUXILIAR DE USERNAME CORPORATIVO (.fit)
// ============================================================

function generateFitUsername(fullName: string): string {
  const cleanName = fullName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return `${cleanName}.fit`;
}

// ============================================================
// PARSER E PROCESSADOR DE AÇÕES DE AGENDAMENTO
// ============================================================

const CLASS_NAMES: Record<string, string> = {
  pilates: "Pilates",
  spinning: "Spinning",
  fitdance: "FitDance",
  funcional: "Treino Funcional",
};

function parseBookingIntent(text: string): { type: "BOOK_CLASS" | "CANCEL_CLASS"; classId: string; time?: string; className: string } | null {
  const lower = text.toLowerCase();

  if (lower.includes("cancela") || lower.includes("desmarca") || lower.includes("remover aula") || lower.includes("tirar minha vaga")) {
    if (lower.includes("pilates")) return { type: "CANCEL_CLASS", classId: "pilates", className: "Pilates" };
    if (lower.includes("spinning") || lower.includes("bike")) return { type: "CANCEL_CLASS", classId: "spinning", className: "Spinning" };
    if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) return { type: "CANCEL_CLASS", classId: "fitdance", className: "FitDance" };
    if (lower.includes("funcional")) return { type: "CANCEL_CLASS", classId: "funcional", className: "Treino Funcional" };
  }

  const isBooking = lower.includes("agenda") || lower.includes("marca") || lower.includes("reserva") || lower.includes("quero fazer") || lower.includes("inscrever") || lower.includes("coloca meu nome");

  if (isBooking) {
    let classId = "";
    let className = "";
    let defaultTimes: string[] = [];

    if (lower.includes("pilates")) { classId = "pilates"; className = "Pilates"; defaultTimes = ["07:00", "10:00", "18:00"]; }
    else if (lower.includes("spinning") || lower.includes("bike")) { classId = "spinning"; className = "Spinning"; defaultTimes = ["06:30", "12:00", "19:30"]; }
    else if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) { classId = "fitdance"; className = "FitDance"; defaultTimes = ["11:00", "19:00"]; }
    else if (lower.includes("funcional")) { classId = "funcional"; className = "Treino Funcional"; defaultTimes = ["07:30", "17:30", "18:30"]; }

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

async function saveChatMessageToDb(sessionId: string | undefined, userId: string | undefined, role: string, content: string, action: any) {
  if (!sessionId || !userId || !content) return;
  try {
    const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    await ChatMessage.create({ id: msgId, sessionId, userId: String(userId), role, content, action, timestamp: new Date() });

    if (role === "user") {
      const titleSnippet = content.length > 25 ? content.substring(0, 25) + "..." : content;
      await ChatSession.updateOne({ id: sessionId, title: "Nova conversa com a Vic" }, { title: titleSnippet });
    }
  } catch (err) {
    console.error("⚠️ Erro ao salvar mensagem no MongoDB:", err);
  }
}

// ============================================================
// ENDPOINTS DE AUTENTICAÇÃO E USUÁRIOS
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
    const { fullName, email, password, trainingLevel, weight, height, medicalNotes, matricula } = req.body;

    if (!fullName || !email || !password || !matricula) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ 
        error: "O banco de dados ainda está inicializando. Aguarde alguns segundos e tente novamente." 
      });
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
      medicalNotes: medicalNotes || "Nenhuma",
      matricula,
    });

    return res.status(201).json(newUser);

  } catch (error: any) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === "email") return res.status(400).json({ error: "E-mail já cadastrado." });
      if (field === "matricula") return res.status(400).json({ error: "Matrícula já cadastrada." });
      if (field === "username") return res.status(400).json({ error: "Nome de usuário em uso." });
    }
    return res.status(500).json({ error: "Erro interno ao cadastrar usuário." });
  }
});

app.post("/api/auth/login", async (req: Request, res: Response) => {
  try {
    const { usernameOrMatricula, password, identifier } = req.body;
    const loginKey = usernameOrMatricula || identifier;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando. Tente novamente." });
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

// ============================================================
// ENDPOINTS DE AULAS COLETIVAS E VAGAS EM TEMPO REAL
// ============================================================

app.get("/api/classes", async (_req: Request, res: Response) => {
  const classesList = [
    { id: "pilates", name: "Pilates", category: "Flexibilidade & Core", days: "Seg / Qua / Sex", description: "Fortalecimento do core, postura e flexibilidade.", iconName: "Activity", slots: ["07:00", "10:00", "18:00"] },
    { id: "fitdance", name: "FitDance", category: "Ritmo & Queima", days: "Seg / Qua", description: "Gasto calórico elevado com coreografias dinâmicas.", iconName: "Music", slots: ["11:00", "19:00"] },
    { id: "spinning", name: "Spinning", category: "Cardio Alta Intensidade", days: "Ter / Qui", description: "Treino aeróbico de alta intensidade em bike indoor.", iconName: "Bike", slots: ["06:30", "12:00", "19:30"] },
    { id: "funcional", name: "Treino Funcional", category: "Condicionamento Total", days: "Ter / Qui", description: "Exercícios dinâmicos para força, agilidade e resistência.", iconName: "Dumbbell", slots: ["07:30", "17:30", "18:30"] },
  ];

  try {
    if (mongoose.connection.readyState === 1) {
      const updatedClasses = await Promise.all(
        classesList.map(async (cls) => {
          const slotsWithSpots = await Promise.all(
            cls.slots.map(async (time) => {
              const bookedCount = await BookedClass.countDocuments({ classId: cls.id, time });
              const totalSpots = 30;
              return {
                time,
                totalSpots,
                bookedSpots: bookedCount,
                availableSpots: Math.max(0, totalSpots - bookedCount),
              };
            })
          );
          return { ...cls, slots: slotsWithSpots };
        })
      );
      return res.json(updatedClasses);
    }

    const fallbackClasses = classesList.map((cls) => ({
      ...cls,
      slots: cls.slots.map((t) => ({ time: t, totalSpots: 30, bookedSpots: 0, availableSpots: 30 })),
    }));
    return res.json(fallbackClasses);
  } catch (error: any) {
    const fallbackClasses = classesList.map((cls) => ({
      ...cls,
      slots: cls.slots.map((t) => ({ time: t, totalSpots: 30, bookedSpots: 0, availableSpots: 30 })),
    }));
    return res.json(fallbackClasses);
  }
});

app.post("/api/classes/book", async (req: Request, res: Response) => {
  try {
    const { userId, classId, time, className } = req.body;

    if (!userId || !classId || !time) {
      return res.status(400).json({ error: "userId, classId e time são obrigatórios." });
    }

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando. Tente em instantes." });
    }

    const bookingId = `book-${Date.now()}`;

    await BookedClass.findOneAndUpdate(
      { userId, classId },
      { id: bookingId, userId, classId, className: className || CLASS_NAMES[classId] || classId, time, bookedAt: new Date() },
      { upsert: true, returnDocument: "after" }
    );

    return res.json({
      success: true,
      message: "Vaga reservada com sucesso!",
      bookingId,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message || "Erro ao efetuar reserva." });
  }
});

app.post("/api/classes/cancel", async (req: Request, res: Response) => {
  try {
    const { userId, classId } = req.body;

    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }

    const cleanUserId = String(userId);
    const result = await BookedClass.deleteOne({
      $or: [{ userId: cleanUserId }, { userId: userId }],
      classId,
    });
    
    if (result.deletedCount === 0) {
      return res.status(400).json({ error: "Nenhum agendamento encontrado para cancelar." });
    }

    return res.json({ success: true, message: "Agendamento cancelado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
});

// Busca robusta de agendamentos persistidos no MongoDB Atlas (Suporta F5 / Refresh)
app.get(["/api/users/:userId/bookings", "/api/classes/booked/:userId"], async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    if (mongoose.connection.readyState === 1 && userId) {
      const cleanUserId = String(userId);
      
      // Procura por ID direto ou por ObjectId correspondente
      const bookings = await BookedClass.find({
        $or: [
          { userId: cleanUserId },
          { userId: userId }
        ]
      }).sort({ bookedAt: -1 });

      return res.json(bookings);
    }
    return res.json([]);
  } catch (error) {
    console.error("⚠️ Erro ao carregar agendamentos do usuário:", error);
    return res.status(200).json([]);
  }
});

// ============================================================
// HEALTH ENDPOINT
// ============================================================

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "MoveFIT Server (MongoDB Edition)" });
});

// ============================================================
// VIC CHAT ASSISTANT ENDPOINT (VERSÃO DEFINITIVA & BLINDADA)
// ============================================================

app.post("/api/vic/chat", async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mensagem não informada." });
    }

    const cleanUserId = userId ? String(userId) : "";

    // 1. Processa agendamento/cancelamento no MongoDB se a intenção for clara
    let executedAction: any = null;
    const detectedAction = parseBookingIntent(message);
    if (detectedAction && cleanUserId && mongoose.connection.readyState === 1) {
      executedAction = await processVicActionInDatabase(detectedAction, cleanUserId);
    }

    // 2. Busca perfil e contexto do utilizador de forma segura (sem forçar cast de _id)
    let userContext = "Aluno participante da MoveFIT.";
    if (mongoose.connection.readyState === 1 && cleanUserId) {
      try {
        let user = await User.findOne({ id: cleanUserId });

        // Se não achou pelo campo id e cleanUserId tem exatamente 24 hex chars, tenta por _id
        if (!user && mongoose.Types.ObjectId.isValid(cleanUserId)) {
          user = await User.findById(cleanUserId);
        }

        if (user) {
          userContext = `Nome: ${user.fullName}, Nível: ${user.trainingLevel}, Restrições: ${user.medicalNotes}`;
        }
      } catch (e) {
        console.warn("⚠️ Aviso ao buscar usuário para contexto da Vic:", e);
      }
    }

    // 3. Monta a resposta de confirmação se um agendamento direto ocorreu
    let replyText = "";
    if (executedAction && executedAction.type === "BOOK_CLASS") {
      replyText = `Com certeza! Agendei a sua aula de ${executedAction.className} às ${executedAction.time} com sucesso! 🏋️‍♀️`;
    } else if (executedAction && executedAction.type === "CANCEL_CLASS") {
      replyText = `Prontinho! Cancelei a sua reserva na aula de ${executedAction.className}.`;
    }

    // 4. Se não for agendamento direto, consulta a API da IA (Groq / Gemini)
    const groqKey = process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY;

    if (!replyText && groqKey) {
      try {
        const systemPrompt = `Você é a Vic, personal trainer virtual em 3D da academia MoveFIT.
Personalidade: motivadora, descontraída e acolhedora.
Contexto do aluno: ${userContext}`;

        const aiResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${groqKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: message },
            ],
          }),
        });

        if (aiResponse.ok) {
          const data = await aiResponse.json();
          replyText = data.choices[0]?.message?.content || "";
        }
      } catch (err) {
        console.warn("⚠️ Exceção na API do Groq:", err);
      }
    }

    if (!replyText) {
      replyText = "Bora focar nos treinos! Como posso ajudar você hoje?";
    }

    // 5. Salva no histórico de forma segura
    if (sessionId && cleanUserId && mongoose.connection.readyState === 1) {
      try {
        await saveChatMessageToDb(sessionId, cleanUserId, "assistant", replyText, executedAction);
      } catch (e) {
        console.warn("⚠️ Não foi possível guardar a mensagem no histórico do DB:", e);
      }
    }

    return res.json({ response: replyText, action: executedAction });

  } catch (error: any) {
    console.error("❌ Erro no endpoint do chat da Vic:", error?.message || error);
    
    return res.status(200).json({
      response: "Recebi seu pedido! Verifique se a sua vaga já está ativa na aba de agendamentos.",
      action: null,
    });
  }
});

// ============================================================
// ELEVENLABS TTS ENDPOINT
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

// ============================================================
// HISTÓRICO DE SESSÕES E MENSAGENS
// ============================================================

app.get("/api/vic/sessions/:userId", async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) return res.json([]);
    const sessions = await ChatSession.find({ userId: String(req.params.userId) }).sort({ createdAt: -1 });
    return res.json(sessions);
  } catch (error) {
    return res.status(200).json([]);
  }
});

app.post("/api/vic/sessions", async (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;
    const sessionId = "session-" + Date.now();
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ error: "Banco de dados inicializando." });
    }
    const session = await ChatSession.create({ id: sessionId, userId: String(userId), title: title || "Nova conversa com a Vic" });
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
// VITE / SERVIDOR DE PRODUÇÃO
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