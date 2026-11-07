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
// SEED AUTOMÁTICO
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

    return res.json(classesList.map((cls) => ({ ...cls, slots: cls.slots.map((t) => ({ time: t, totalSpots: 30, bookedSpots: 0, availableSpots: 30 })) })));
  } catch (error) {
    return res.json(classesList.map((cls) => ({ ...cls, slots: cls.slots.map((t) => ({ time: t, totalSpots: 30, bookedSpots: 0, availableSpots: 30 })) })));
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
Personalidade: extremamente motivadora, profissional, acolhedora e descontraída.

DADOS DE CONTEXTO DO ALUNO CARREGADOS:
${userContext}

REGRAS DE APRESENTAÇÃO E PERSPECTIVA DE TREINO:
1. Sempre leve em conta as características individuais (idade, gênero, peso, altura, nível de treino e restrições médicas) ao prescrever exercícios.
2. Seja encorajadora e extremamente respeitosa quanto a limites físicos ou lesões informadas.

REGRAS OBRIGATÓRIAS DE EXERCÍCIOS E VÍDEOS DEMONSTRATIVOS:
1. Sempre que o aluno pedir treinos, séries, orientações de execução ou exercícios específicos, forneça uma explicação clara sobre postura/execução e INCLUA OBRIGATORIAMENTE no final da resposta a tag [EXERCISES: nome_do_exercicio1, nome_do_exercicio2].
2. Use nomes em inglês com underline para os exercícios na tag, ex:
   - [EXERCISES: jumping_jacks, bodyweight_squat]
   - [EXERCISES: push_up, plank]
   - [EXERCISES: dumbbell_shoulder_raise, lunges]
3. Estruture as respostas de treino com títulos claros para que a recomendação possa ser salva no perfil.

REGRAS DE CONVERSAÇÃO:
1. Não use formato markdown (sem asteriscos para negrito).
2. Traga respostas diretas e resumidas para dúvidas simples. Para treinos e exercícios, explique detalhadamente.
3. Tom calmo, acolhedor e sereno.
4. Se o usuário for agressivo, peça educação com firmeza e delicadeza.
5. Seu nome é Vic. Se chamada por outro nome, corrija educadamente.`;

    if (!replyText && groqKey) {
      try {
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