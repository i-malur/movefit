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
// CONEXÃO SEGUIRA AO MONGODB ATLAS & INICIALIZAÇÃO
// ============================================================

const mongoURI = process.env.MONGODB_URI;

async function connectDB() {
  if (!mongoURI) {
    console.warn("⚠️ MONGODB_URI não configurada nas variáveis de ambiente do Render!");
    return;
  }

  try {
    // Define timeout de seleção de servidor para evitar buffering infinito
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ Banco de dados MongoDB conectado com sucesso!");

    // Executa o seed APENAS após a conexão estar 100% estabelecida
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
  time: string;
  bookedAt: Date;
}

const BookedClassSchema = new Schema<IBookedClass>({
  id: { type: String, required: true, unique: true },
  userId: { type: String, required: true },
  classId: { type: String, required: true },
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
    // 1. Criar Usuário Demo Padrão se não existir
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

    // 2. Criar Aulas Padrão se não existirem
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

seedDatabase();

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
// ENDPOINTS DE AUTENTICAÇÃO E USUÁRIOS
// ============================================================

app.get("/api/users", async (_req: Request, res: Response) => {
  try {
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

    // 1. Verifica se a conexão com o MongoDB está ativa
    if (mongoose.connection.readyState !== 1) {
      console.warn("⚠️ Tentativa de cadastro com MongoDB desconectado.");
      return res.status(503).json({ 
        error: "O banco de dados ainda está inicializando. Aguarde alguns segundos e tente novamente." 
      });
    }

    // 2. Checar se e-mail ou matrícula já existem
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({ error: "E-mail já cadastrado." });
    }

    const existingMatricula = await User.findOne({ matricula });
    if (existingMatricula) {
      return res.status(400).json({ error: "Matrícula já cadastrada." });
    }

    // 3. Gera o username base e garante unicidade (.fit)
    let finalUsername = generateFitUsername(fullName);
    let userExists = await User.findOne({ username: finalUsername });

    while (userExists) {
      const baseName = generateFitUsername(fullName).replace(".fit", "");
      const randomNum = Math.floor(100 + Math.random() * 900);
      finalUsername = `${baseName}${randomNum}.fit`;
      userExists = await User.findOne({ username: finalUsername });
    }

    const id = "user-" + Date.now();

    // 4. Salva o usuário no MongoDB Atlas
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

    console.log(`✅ Novo usuário cadastrado: ${newUser.username} (${newUser.email})`);
    return res.status(201).json(newUser);

  } catch (error: any) {
    console.error("❌ Erro ao cadastrar usuário:", error?.message || error);

    // Trata erro de duplicidade do MongoDB se passar da validação manual
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

    const user = await User.findOne({
      $or: [{ username: loginKey }, { matricula: loginKey }, { email: loginKey }],
      password,
    });

    if (!user) {
      return res.status(401).json({ error: "Credenciais inválidas." });
    }

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
    {
      id: "pilates",
      name: "Pilates",
      category: "Flexibilidade & Core",
      days: "Seg / Qua / Sex",
      description: "Fortalecimento do core, postura e flexibilidade.",
      iconName: "Activity",
      slots: ["07:00", "10:00", "18:00"],
    },
    {
      id: "fitdance",
      name: "FitDance",
      category: "Ritmo & Queima",
      days: "Seg / Qua",
      description: "Gasto calórico elevado com coreografias dinâmicas.",
      iconName: "Music",
      slots: ["11:00", "19:00"],
    },
    {
      id: "spinning",
      name: "Spinning",
      category: "Cardio Alta Intensidade",
      days: "Ter / Qui",
      description: "Treino aeróbico de alta intensidade em bike indoor.",
      iconName: "Bike",
      slots: ["06:30", "12:00", "19:30"],
    },
    {
      id: "funcional",
      name: "Treino Funcional",
      category: "Condicionamento Total",
      days: "Ter / Qui",
      description: "Exercícios dinâmicos para força, agilidade e resistência.",
      iconName: "Dumbbell",
      slots: ["07:30", "17:30", "18:30"],
    },
  ];

  try {
    // Se o MongoDB estiver conectado (readyState === 1), consulta as vagas reservadas no banco
    if (mongoose.connection.readyState === 1) {
      const updatedClasses = await Promise.all(
        classesList.map(async (cls) => {
          const slotsWithSpots = await Promise.all(
            cls.slots.map(async (time) => {
              const bookedCount = await BookedClass.countDocuments({
                classId: cls.id,
                time,
              });
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

    // Se o MongoDB estiver ainda conectando ou offline, retorna a grade padrão com vagas cheias
    const fallbackClasses = classesList.map((cls) => ({
      ...cls,
      slots: cls.slots.map((t) => ({
        time: t,
        totalSpots: 30,
        bookedSpots: 0,
        availableSpots: 30,
      })),
    }));

    return res.json(fallbackClasses);
  } catch (error: any) {
    console.error("⚠️ Erro na rota /api/classes:", error?.message || error);

    // Fallback de segurança para não retornar 500 no frontend
    const fallbackClasses = classesList.map((cls) => ({
      ...cls,
      slots: cls.slots.map((t) => ({
        time: t,
        totalSpots: 30,
        bookedSpots: 0,
        availableSpots: 30,
      })),
    }));

    return res.json(fallbackClasses);
  }
});

app.post("/api/classes/book", async (req: Request, res: Response) => {
  try {
    const { userId, classId, time } = req.body;

    if (!userId || !classId || !time) {
      return res.status(400).json({ error: "userId, classId e time são obrigatórios." });
    }

    const bookingId = `book-${Date.now()}`;

    // Insere ou atualiza agendamento no MongoDB
    await BookedClass.findOneAndUpdate(
      { userId, classId },
      { id: bookingId, userId, classId, time, bookedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      message: "Vaga reservada com sucesso!",
      bookingId,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/classes/cancel", async (req: Request, res: Response) => {
  try {
    const { userId, classId } = req.body;

    const result = await BookedClass.deleteOne({ userId, classId });

    if (result.deletedCount === 0) {
      return res.status(400).json({ error: "Nenhum agendamento encontrado para cancelar." });
    }

    return res.json({ success: true, message: "Agendamento cancelado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
});

app.get("/api/users/:userId/bookings", async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const bookings = await BookedClass.find({ userId });
    return res.json(bookings);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar agendamentos do usuário." });
  }
});

// ============================================================
// CONFIGURAÇÃO DO GROQ CLIENT & FERRAMENTAS DE IA
// ============================================================

const apiKey = process.env.GROQ_API_KEY;
let groq: Groq | null = null;

if (apiKey) {
  groq = new Groq({ apiKey });
}

const tools: Groq.Chat.CompletionCreateParams.Tool[] = [
  {
    type: "function",
    function: {
      name: "bookGymClass",
      description: "Agenda e reserva oficialmente uma aula coletiva para o aluno na grade da MoveFIT.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "ID da aula: 'pilates', 'spinning', 'fitdance' ou 'funcional'" },
          time: { type: "string", description: "Horário da aula, ex: '07:00', '10:00', '18:00'" },
        },
        required: ["classId", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelGymClass",
      description: "Cancela a reserva de uma aula coletiva agendada pelo aluno.",
      parameters: {
        type: "object",
        properties: {
          classId: { type: "string", description: "ID da aula a ser cancelada: 'pilates', 'spinning', 'fitdance' ou 'funcional'" },
        },
        required: ["classId"],
      },
    },
  },
];

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

async function processVicActionInDatabase(action: any, userId?: string) {
  if (!action || !userId) return;
  try {
    if (action.type === "BOOK_CLASS" && action.classId && action.time) {
      await BookedClass.findOneAndUpdate(
        { userId, classId: action.classId },
        { id: `book-${Date.now()}`, userId, classId: action.classId, time: action.time, bookedAt: new Date() },
        { upsert: true }
      );
    } else if (action.type === "CANCEL_CLASS" && action.classId) {
      await BookedClass.deleteOne({ userId, classId: action.classId });
    }
  } catch (error) {
    console.error("⚠️ Erro ao atualizar o MongoDB via Vic:", error);
  }
}

async function saveChatMessageToDb(sessionId: string | undefined, userId: string | undefined, role: string, content: string, action: any) {
  if (!sessionId || !userId || !content) return;
  try {
    const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    await ChatMessage.create({ id: msgId, sessionId, userId, role, content, action, timestamp: new Date() });

    if (role === "user") {
      const titleSnippet = content.length > 25 ? content.substring(0, 25) + "..." : content;
      await ChatSession.updateOne({ id: sessionId, title: "Nova conversa com a Vic" }, { title: titleSnippet });
    }
  } catch (err) {
    console.error("⚠️ Erro ao salvar mensagem no MongoDB:", err);
  }
}

// ============================================================
// HEALTH ENDPOINT
// ============================================================

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "MoveFIT Server (MongoDB Edition)" });
});

// ============================================================
// VIC CHAT ASSISTANT ENDPOINT (GROQ)
// ============================================================

app.post("/api/vic/chat", async (req: Request, res: Response) => {
  try {
    const { message, history = [], user, sessionId } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Mensagem inválida." });
    }

    const userName = user?.fullName || "Aluno(a)";
    const userMatricula = user?.matricula || "Não informada";
    const trainingLevel = user?.trainingLevel || "Iniciante";
    const weight = user?.weight ? `${user.weight} kg` : "Não informado";
    const height = user?.height ? `${user.height} cm` : "Não informada";
    const medicalNotes = user?.medicalNotes || "Nenhuma";

    const systemInstruction = `
Você é a "Vic", a assistente virtual e personal trainer digital da MoveFIT.

IDENTIDADE:
- Nome: Vic | Idade: 24 anos | Gênero: Feminino.
- Personalidade: Energética, motivadora, empática e acolhedora.
- Idioma: Português do Brasil estritamente (NUNCA utilize termos em espanhol como "brazos", "piernas", etc.).

PERFIL COMPLETO DO ALUNO:
- Nome: ${userName}
- Matrícula: ${userMatricula}
- Nível de Treino: ${trainingLevel}
- Peso: ${weight}
- Altura: ${height}
- Restrições/Observações Médicas: ${medicalNotes}
- Aulas Agendadas: ${bookedClasses}

REGRAS DE ADAPTAÇÃO DE TREINO E SEGURANÇA:
1. RESTRIÇÕES MÉDICAS: Respeite estritamente qualquer restrição registrada (${medicalNotes}). NUNCA recomende exercícios que sobrecarreguem regiões lesionadas ou apresentem risco à saúde do aluno.
2. ADAPTAÇÃO POR NÍVEL: Ajuste o volume, cargas, variações e intensidade ao nível ${trainingLevel}.
   - Iniciante: foco em execução, técnica e menor impacto.
   - Moderado/Avançado: pode sugerir maior intensidade, métodos avançados ou maior volume.
3. ADAPTAÇÃO BIOMÉTRICA: Leve em consideração o peso (${weight}) e altura (${height}) para calcular/estimar desgaste energético, ajustar mecânica de movimento e orientar ergonomia de aparelhos.

REGRA OBRIGATÓRIA DE MATRÍCULA:
- O número de matrícula é ESTRITAMENTE OBRIGATÓRIO (Estrutura MF-202X-00X).
- Se perguntarem sobre como obter uma matrícula, oriente a ir presencialmente à recepção física da MoveFIT.

REGRAS DE RESPOSTA E ÁUDIO:
- Respostas curtas e diretas (máximo 2 a 3 frases concisas).
- NUNCA utilize formatação Markdown (como *, #, _ ou negritos).
- Limite o uso de emojis.

REGRA OBRIGATÓRIA DE EXERCÍCIOS E TAGS:
- Sempre que sugerir um treino, aquecimento ou exercício, você DEVE obrigatoriamente incluir ao final da resposta a tag no formato exato: [EXERCISES: exercicio_1, exercicio_2].
- Escreva os nomes dos exercícios na tag sempre em PORTUGUÊS DO BRASIL.
- Exemplos válidos: [EXERCISES: polichinelo, agachamento livre, flexao de braco, prancha abdominal].

AGENDAMENTO:
- Use a função bookGymClass para agendar e cancelGymClass para cancelar quando solicitado.
- Todas as aulas duram 50 minutos.
`;

    if (!groq) {
      const parsedAction = parseBookingIntent(message);
      let reply = `Oi, ${userName}! Sou a Vic da MoveFIT! 💪✨`;

      if (parsedAction?.type === "BOOK_CLASS") {
        reply = `Maravilha, ${userName}! Agendei sua aula de ${parsedAction.className} para as ${parsedAction.time}. 💪🔥`;
      } else if (parsedAction?.type === "CANCEL_CLASS") {
        reply = `Entendido, ${userName}! Cancelei seu agendamento em ${parsedAction.className}. 🌟`;
      }

      await processVicActionInDatabase(parsedAction, user?.id);
      await saveChatMessageToDb(sessionId, user?.id, "user", message, null);
      await saveChatMessageToDb(sessionId, user?.id, "assistant", reply, parsedAction);

      return res.json({ reply, action: parsedAction });
    }

    const messages: Groq.Chat.CompletionCreateParams.Message[] = [{ role: "system", content: systemInstruction }];
    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];

    for (const msg of recentHistory) {
      messages.push({ role: msg.role === "assistant" ? "assistant" : "user", content: String(msg.content || "") });
    }
    messages.push({ role: "user", content: message });

    const completion = await groq.chat.completions.create({
      messages,
      model: "openai/gpt-oss-20b",
      temperature: 0.7,
      tools,
      tool_choice: "auto",
    });

    const responseMessage = completion.choices[0]?.message;
    let action: any = null;

    if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0) {
      const toolCall = responseMessage.tool_calls[0];
      const functionArgs = JSON.parse(toolCall.function.arguments || "{}");
      const functionName = toolCall.function.name;

      if (functionName === "bookGymClass") {
        action = { type: "BOOK_CLASS", classId: functionArgs.classId, time: functionArgs.time, className: CLASS_NAMES[functionArgs.classId] || functionArgs.classId };
      } else if (functionName === "cancelGymClass") {
        action = { type: "CANCEL_CLASS", classId: functionArgs.classId, className: CLASS_NAMES[functionArgs.classId] || functionArgs.classId };
      }
    }

    if (!action) action = parseBookingIntent(message);

    let rawReply = responseMessage?.content || `Perfeito, ${userName}! Como posso te ajudar com os treinos?`;
    let cleanText = rawReply.replace(/\*+/g, "").replace(/#/g, "").replace(/\s+/g, " ").trim();

    await processVicActionInDatabase(action, user?.id);
    await saveChatMessageToDb(sessionId, user?.id, "user", message, null);
    await saveChatMessageToDb(sessionId, user?.id, "assistant", cleanText, action);

    return res.json({ reply: cleanText, action });
  } catch (error: any) {
    return res.status(500).json({ error: "Erro interno no chat da Vic." });
  }
});

// ============================================================
// ELEVENLABS TTS ENDPOINT
// ============================================================

app.post("/api/vic/speech", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) return res.status(500).json({ error: "ELEVENLABS_API_KEY ausente." });

    const cleanText = text.replace(/\[EXERCISES:.*?\]/gi, "").trim();
    const SAFE_FREE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${SAFE_FREE_VOICE_ID}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "xi-api-key": apiKey },
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
    const sessions = await ChatSession.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    return res.json(sessions);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar conversas." });
  }
});

app.post("/api/vic/sessions", async (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;
    const sessionId = "session-" + Date.now();
    const session = await ChatSession.create({ id: sessionId, userId, title: title || "Nova conversa com a Vic" });
    return res.status(201).json(session);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar conversa." });
  }
});

app.get("/api/vic/messages/:sessionId", async (req: Request, res: Response) => {
  try {
    const messages = await ChatMessage.find({ sessionId: req.params.sessionId }).sort({ timestamp: 1 });
    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar mensagens." });
  }
});

// ============================================================
// VITE / SERVIDOR DE PRODUÇÃO
// ============================================================

async function startServer() {
  // Conecta ao MongoDB
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