import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Groq from "groq-sdk";
import dotenv from "dotenv";
import Database from "better-sqlite3";

dotenv.config();

const app = express();
const PORT = 3000;

// Abre/Cria o arquivo de banco de dados SQLite local na raiz do projeto
const db = new Database("dev.db");

app.use(express.json({ limit: "2mb" }));

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
// INICIALIZAÇÃO DAS TABELAS E SEED AUTOMÁTICO (SQL PURO)
// ============================================================

function initDatabase() {
  try {
    // 1. Criar Tabelas com os campos weight e height
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        title TEXT NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        userId TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        action TEXT,
        timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sessionId) REFERENCES chat_sessions(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        fullName TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        trainingLevel TEXT DEFAULT 'Iniciante',
        weight REAL,
        height REAL,
        medicalNotes TEXT DEFAULT 'Nenhuma',
        matricula TEXT UNIQUE NOT NULL,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS gym_classes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        days TEXT NOT NULL,
        iconName TEXT NOT NULL,
        description TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS class_slots (
        id TEXT PRIMARY KEY,
        classId TEXT NOT NULL,
        time TEXT NOT NULL,
        totalSpots INTEGER DEFAULT 30,
        FOREIGN KEY (classId) REFERENCES gym_classes(id),
        UNIQUE(classId, time)
      );

      CREATE TABLE IF NOT EXISTS booked_classes (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        classId TEXT NOT NULL,
        slotId TEXT NOT NULL,
        time TEXT NOT NULL,
        bookedAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(id),
        FOREIGN KEY (slotId) REFERENCES class_slots(id)
      );
    `);

    // 2. Criar Usuário Demo Padrão
    const insertUser = db.prepare(`
      INSERT OR IGNORE INTO users (id, fullName, email, username, password, trainingLevel, weight, height, medicalNotes, matricula)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertUser.run(
      "user-demo-1",
      "Maria Luiza Queiroz",
      "maria@movefit.com",
      "marialuiza.fit",
      "Movefit@2026",
      "Iniciante",
      65.0,
      168,
      "Nenhuma",
      "MF-2026-001"
    );

    // 3. Criar Turmas e Horários Padrão
    const classesData = [
      { id: "pilates", name: "Pilates", category: "Flexibilidade & Core", days: "Seg/Qua/Sex", iconName: "Activity", description: "Fortalecimento do core, postura e flexibilidade.", slots: ["07:00", "10:00", "18:00"] },
      { id: "spinning", name: "Spinning", category: "Cardio Alta Intensidade", days: "Ter/Qui", iconName: "Bike", description: "Treino aeróbico dinâmico sobre bicicleta ergométrica.", slots: ["06:30", "12:00", "19:30"] },
      { id: "fitdance", name: "FitDance", category: "Ritmo & Queima", days: "Seg/Qua", iconName: "Music", description: "Aulas de dança dinâmicas com coreografias atuais.", slots: ["11:00", "19:00"] },
      { id: "funcional", name: "Treino Funcional", category: "Condicionamento Total", days: "Ter/Qui", iconName: "Dumbbell", description: "Exercícios dinâmicos para agilidade, força e resistência.", slots: ["07:30", "17:30", "18:30"] },
    ];

    const insertClass = db.prepare(`
      INSERT OR IGNORE INTO gym_classes (id, name, category, days, iconName, description)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const insertSlot = db.prepare(`
      INSERT OR IGNORE INTO class_slots (id, classId, time, totalSpots)
      VALUES (?, ?, ?, ?)
    `);

    for (const c of classesData) {
      insertClass.run(c.id, c.name, c.category, c.days, c.iconName, c.description);
      for (const time of c.slots) {
        insertSlot.run(`${c.id}-${time}`, c.id, time, 30);
      }
    }

    console.log("✅ Banco SQLite (better-sqlite3) inicializado e populado com sucesso!");
  } catch (error) {
    console.error("⚠️ Erro ao inicializar o banco de dados:", error);
  }
}

initDatabase();

// ============================================================
// ENDPOINTS DE AUTENTICAÇÃO E USUÁRIOS
// ============================================================

app.get("/api/users", (_req: Request, res: Response) => {
  try {
    const users = db.prepare("SELECT * FROM users ORDER BY createdAt DESC").all();
    return res.json(users);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar usuários." });
  }
});

app.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const { fullName, email, password, trainingLevel, weight, height, medicalNotes, matricula } = req.body;

    if (!fullName || !email || !password || !matricula) {
      return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
    }

    // 1. Gera o username base
    let finalUsername = generateFitUsername(fullName);

    // 2. Laço WHILE para garantir um username 100% único no banco
    let userExists = db.prepare("SELECT id FROM users WHERE username = ?").get(finalUsername);

    while (userExists) {
      const baseName = generateFitUsername(fullName).replace('.fit', '');
      const randomNum = Math.floor(100 + Math.random() * 900);
      finalUsername = `${baseName}${randomNum}.fit`;

      // Checa de novo se o novo username gerado já existe
      userExists = db.prepare("SELECT id FROM users WHERE username = ?").get(finalUsername);
    }

    // 3. Cria ID único por timestamp
    const id = "user-" + Date.now();

    // 4. Insere no SQLite com os campos de peso e altura
    const stmt = db.prepare(`
      INSERT INTO users (id, fullName, email, username, password, trainingLevel, weight, height, medicalNotes, matricula, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      fullName,
      email,
      finalUsername,
      password,
      trainingLevel || "Iniciante",
      weight ? parseFloat(weight) : null,
      height ? parseFloat(height) : null,
      medicalNotes || "Nenhuma",
      matricula,
      new Date().toISOString()
    );

    const newUser = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    return res.status(201).json(newUser);

  } catch (error: any) {
    if (error.message?.includes("UNIQUE constraint failed")) {
      if (error.message.includes("users.email")) return res.status(400).json({ error: "E-mail já cadastrado." });
      if (error.message.includes("users.matricula")) return res.status(400).json({ error: "Matrícula já cadastrada." });
    }
    return res.status(500).json({ error: "Erro ao cadastrar usuário." });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const { usernameOrMatricula, password, identifier } = req.body;
    const loginKey = usernameOrMatricula || identifier;

    const user = db.prepare(`
      SELECT * FROM users 
      WHERE (username = ? OR matricula = ? OR email = ?) AND password = ?
    `).get(loginKey, loginKey, loginKey, password);

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

app.get("/api/classes", (req, res) => {
  try {
    const classes = [
      {
        id: "pilates",
        name: "Pilates",
        category: "Flexibilidade & Core",
        days: "Seg / Qua / Sex",
        description: "Fortalecimento do core, postura e flexibilidade.",
        iconName: "Activity",
        slots: [
          { time: "07:00", totalSpots: 30 },
          { time: "10:00", totalSpots: 30 },
          { time: "18:00", totalSpots: 30 },
        ],
      },
      {
        id: "fitdance",
        name: "FitDance",
        category: "Ritmo & Queima",
        days: "Seg / Qua",
        description: "Gasto calórico elevado com coreografias dinâmicas.",
        iconName: "Music",
        slots: [
          { time: "11:00", totalSpots: 30 },
          { time: "19:00", totalSpots: 30 },
        ],
      },
      {
        id: "spinning",
        name: "Spinning",
        category: "Cardio Alta Intensidade",
        days: "Ter / Qui",
        description: "Treino aeróbico de alta intensidade em bike indoor.",
        iconName: "Bike",
        slots: [
          { time: "06:30", totalSpots: 30 },
          { time: "12:00", totalSpots: 30 },
          { time: "19:30", totalSpots: 30 },
        ],
      },
      {
        id: "funcional",
        name: "Treino Funcional",
        category: "Condicionamento Total",
        days: "Ter / Qui",
        description: "Exercícios dinâmicos para força, agilidade e resistência.",
        iconName: "Dumbbell",
        slots: [
          { time: "07:30", totalSpots: 30 },
          { time: "17:30", totalSpots: 30 },
          { time: "18:30", totalSpots: 30 },
        ],
      },
    ];

    const updatedClasses = classes.map((cls) => {
      const updatedSlots = cls.slots.map((slot) => {
        const countResult = db
          .prepare(
            `
          SELECT COUNT(*) as bookedCount 
          FROM booked_classes 
          WHERE (classId = ? OR classId = ? OR classId = ?) AND time = ?
        `
          )
          .get(
            cls.id,
            cls.id === "funcional" ? "treino-funcional" : cls.id,
            cls.name,
            slot.time
          ) as { bookedCount: number };

        const bookedSpots = countResult?.bookedCount || 0;
        const availableSpots = Math.max(0, slot.totalSpots - bookedSpots);

        return {
          ...slot,
          bookedSpots,
          availableSpots,
        };
      });

      return {
        ...cls,
        slots: updatedSlots,
      };
    });

    return res.json(updatedClasses);
  } catch (error: any) {
    console.error("Erro ao buscar aulas:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/classes/book", (req, res) => {
  try {
    let { userId, classId, time } = req.body;

    if (!userId || !classId || !time) {
      return res.status(400).json({ error: "userId, classId e time são obrigatórios." });
    }

    const nameMap: Record<string, string> = {
      "treinofuncional": "Treino Funcional",
      "funcional": "Treino Funcional",
      "spinning": "Spinning",
      "fitdance": "FitDance",
      "fit-dance": "FitDance",
      "pilates": "Pilates"
    };

    const cleanInput = classId.toLowerCase().replace(/[^a-z0-9]/g, "");
    const dbClassName = nameMap[cleanInput] || classId;

    const user = db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
    if (!user) {
      db.prepare(`
        INSERT OR IGNORE INTO users (id, fullName, email, username, password, trainingLevel, medicalNotes, matricula, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        "Usuário MoveFIT",
        `${userId}@movefit.com`,
        `${userId}.fit`,
        "Movefit@2026",
        "Iniciante",
        "Nenhuma",
        "MF-2026-999",
        new Date().toISOString()
      );
    }

    let gymClass = db.prepare("SELECT id FROM gym_classes WHERE id = ? OR name = ?").get(classId, dbClassName) as { id: string } | undefined;

    const finalClassId = gymClass?.id || dbClassName;

    const slot = db.prepare(`
      SELECT id FROM class_slots 
      WHERE (classId = ? OR classId = ?) AND time = ?
    `).get(finalClassId, classId, time) as { id: string } | undefined;

    const bookingId = `book-${Date.now()}`;

    if (slot?.id) {
      db.prepare(`
        INSERT OR REPLACE INTO booked_classes (id, userId, classId, slotId, time, bookedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(bookingId, userId, finalClassId, slot.id, time, new Date().toISOString());
    } else {
      db.prepare(`
        INSERT OR REPLACE INTO booked_classes (id, userId, classId, time, bookedAt)
        VALUES (?, ?, ?, ?, ?)
      `).run(bookingId, userId, finalClassId, time, new Date().toISOString());
    }

    return res.json({
      success: true,
      message: "Vaga reservada com sucesso!",
      bookingId,
    });
  } catch (error: any) {
    console.error("Erro no agendamento:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/classes/cancel", (req: Request, res: Response) => {
  try {
    const { userId, classId } = req.body;

    const stmt = db.prepare("DELETE FROM booked_classes WHERE userId = ? AND classId = ?");
    const info = stmt.run(userId, classId);

    if (info.changes === 0) {
      return res.status(400).json({ error: "Nenhum agendamento encontrado para cancelar." });
    }

    return res.json({ success: true, message: "Agendamento cancelado com sucesso." });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao cancelar agendamento." });
  }
});

app.get("/api/users/:userId/bookings", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const bookings = db.prepare(`
      SELECT b.id, b.classId, c.name as className, b.time, b.bookedAt
      FROM booked_classes b
      JOIN gym_classes c ON b.classId = c.id
      WHERE b.userId = ?
    `).all(userId);

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
      description: "Agenda e reserva officially uma aula coletiva para o aluno na grade da MoveFIT.",
      parameters: {
        type: "object",
        properties: {
          classId: {
            type: "string",
            description: "ID da aula: 'pilates', 'spinning', 'fitdance' ou 'funcional'",
          },
          time: {
            type: "string",
            description: "Horário da aula, ex: '07:00', '10:00', '18:00'",
          },
        },
        required: ["classId", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "cancelGymClass",
      description: "Cancela a reserva/inscrição de uma aula coletiva agendada pelo aluno.",
      parameters: {
        type: "object",
        properties: {
          classId: {
            type: "string",
            description: "ID da aula a ser cancelada: 'pilates', 'spinning', 'fitdance' ou 'funcional'",
          },
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

function parseBookingIntent(text: string): {
  type: "BOOK_CLASS" | "CANCEL_CLASS";
  classId: string;
  time?: string;
  className: string;
} | null {
  const lower = text.toLowerCase();

  if (
    lower.includes("cancela") ||
    lower.includes("desmarca") ||
    lower.includes("remover aula") ||
    lower.includes("tirar minha vaga")
  ) {
    if (lower.includes("pilates")) return { type: "CANCEL_CLASS", classId: "pilates", className: "Pilates" };
    if (lower.includes("spinning") || lower.includes("bike")) return { type: "CANCEL_CLASS", classId: "spinning", className: "Spinning" };
    if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) return { type: "CANCEL_CLASS", classId: "fitdance", className: "FitDance" };
    if (lower.includes("funcional")) return { type: "CANCEL_CLASS", classId: "funcional", className: "Treino Funcional" };
  }

  const isBooking =
    lower.includes("agenda") ||
    lower.includes("marca") ||
    lower.includes("reserva") ||
    lower.includes("quero fazer") ||
    lower.includes("inscrever") ||
    lower.includes("quero aula") ||
    lower.includes("coloca meu nome");

  if (isBooking) {
    let classId = "";
    let className = "";
    let defaultTimes: string[] = [];

    if (lower.includes("pilates")) {
      classId = "pilates";
      className = "Pilates";
      defaultTimes = ["07:00", "10:00", "18:00"];
    } else if (lower.includes("spinning") || lower.includes("bike")) {
      classId = "spinning";
      className = "Spinning";
      defaultTimes = ["06:30", "12:00", "19:30"];
    } else if (lower.includes("fitdance") || lower.includes("dança") || lower.includes("danca")) {
      classId = "fitdance";
      className = "FitDance";
      defaultTimes = ["11:00", "19:00"];
    } else if (lower.includes("funcional")) {
      classId = "funcional";
      className = "Treino Funcional";
      defaultTimes = ["07:30", "17:30", "18:30"];
    }

    if (classId) {
      let selectedTime = defaultTimes[0];

      for (const t of defaultTimes) {
        const [hour, minute] = t.split(":");
        const patterns = [
          t,
          `${hour}h${minute}`,
          `${hour}h`,
          `${hour}:00`,
          `${hour} horas`,
          `${hour}:${minute}`,
          Number(hour) < 10 ? `${Number(hour)}h${minute}` : "",
          Number(hour) < 10 ? `${Number(hour)}:${minute}` : "",
          Number(hour) < 10 ? `${Number(hour)}h` : "",
        ].filter(Boolean);

        if (patterns.some((p) => lower.includes(p))) {
          selectedTime = t;
          break;
        }
      }

      return {
        type: "BOOK_CLASS",
        classId,
        time: selectedTime,
        className,
      };
    }
  }

  return null;
}

// ============================================================
// HEALTH ENDPOINT
// ============================================================

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "MoveFIT Server (SQLite Edition)" });
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

    // Extração completa dos dados biométricos e cadastrais do usuário
    const userName = user?.fullName || "Aluno(a)";
    const userMatricula = user?.matricula || "Não informada";
    const trainingLevel = user?.trainingLevel || "Iniciante";
    const weight = user?.weight ? `${user.weight} kg` : "Não informado";
    const height = user?.height ? `${user.height} cm` : "Não informada";
    const medicalNotes = user?.medicalNotes || "Nenhuma";

    const bookedClasses =
      Array.isArray(user?.bookedClasses) && user.bookedClasses.length > 0
        ? user.bookedClasses.map((c: any) => `${c.className} (${c.schedule})`).join(", ")
        : "Nenhuma aula agendada no momento";

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
        reply = `Maravilha, ${userName}! Agendei sua aula de ${parsedAction.className} para as ${parsedAction.time}. A aula dura 50 minutos! 🔥`;
      } else if (parsedAction?.type === "CANCEL_CLASS") {
        reply = `Entendido, ${userName}! A solicitação para cancelar ${parsedAction.className} foi registrada. 🌟`;
      }

      processVicActionInDatabase(parsedAction, user?.id);

      // Salvar no SQLite se houver sessionId
      saveChatMessageToDb(sessionId, user?.id, "user", message, null);
      saveChatMessageToDb(sessionId, user?.id, "assistant", reply, parsedAction);

      return res.json({ reply, action: parsedAction });
    }

    const messages: Groq.Chat.CompletionCreateParams.Message[] = [
      { role: "system", content: systemInstruction },
    ];

    const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content || ""),
      });
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
      const functionName = toolCall.function.name;
      let functionArgs: any = {};

      try {
        functionArgs = JSON.parse(toolCall.function.arguments || "{}");
      } catch (e) {
        console.error("Erro ao converter argumentos da tool:", e);
      }

      if (functionName === "bookGymClass") {
        const classId = String(functionArgs.classId || "").toLowerCase();
        const time = String(functionArgs.time || "");
        action = {
          type: "BOOK_CLASS",
          classId,
          time,
          className: CLASS_NAMES[classId] || classId,
        };
      } else if (functionName === "cancelGymClass") {
        const classId = String(functionArgs.classId || "").toLowerCase();
        action = {
          type: "CANCEL_CLASS",
          classId,
          className: CLASS_NAMES[classId] || classId,
        };
      }
    }

    if (!action) {
      action = parseBookingIntent(message);
    }

    let rawReply = responseMessage?.content || "";

    if (!rawReply || rawReply.trim() === "") {
      if (action?.type === "BOOK_CLASS") {
        rawReply = `Combinado, ${userName}! Sua aula de ${action.className} às ${action.time} foi agendada! Duração: 50 minutos. 💪🔥`;
      } else if (action?.type === "CANCEL_CLASS") {
        rawReply = `Pronto, ${userName}! Sua solicitação para cancelar ${action.className} foi processada. ✨`;
      } else {
        rawReply = `Oi, ${userName}! Como posso te ajudar com seus treinos hoje? 💪`;
      }
    }

    let cleanText = rawReply
      .replace(/\*+/g, "")
      .replace(/#/g, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      cleanText = `Perfeito, ${userName}! Já registrei aqui. Como posso te ajudar com os treinos?`;
    }

    processVicActionInDatabase(action, user?.id);

    // Salvar no SQLite se houver sessionId
    saveChatMessageToDb(sessionId, user?.id, "user", message, null);
    saveChatMessageToDb(sessionId, user?.id, "assistant", cleanText, action);

    return res.json({ reply: cleanText, action });

  } catch (error: any) {
    console.error("⚠️ [Fallback Local Acionado]:", error?.message || error);

    const userName = req.body?.user?.fullName || "Aluno(a)";
    const emergencyAction = parseBookingIntent(req.body?.message || "");

    let fallbackReply = `Oi, ${userName}! Estou te ouvindo perfeitamente. Como posso ajudar com seus treinos hoje? 💪`;

    if (emergencyAction?.type === "BOOK_CLASS") {
      fallbackReply = `Combinado, ${userName}! Agendei sua aula de ${emergencyAction.className} às ${emergencyAction.time}! Duração: 50 minutos. 💪🔥`;
    } else if (emergencyAction?.type === "CANCEL_CLASS") {
      fallbackReply = `Entendido, ${userName}! Sua aula de ${emergencyAction.className} foi cancelada com sucesso! 🌟`;
    }

    processVicActionInDatabase(emergencyAction, req.body?.user?.id);

    // Salvar no SQLite mesmo no fallback se houver sessionId
    saveChatMessageToDb(req.body?.sessionId, req.body?.user?.id, "user", req.body?.message, null);
    saveChatMessageToDb(req.body?.sessionId, req.body?.user?.id, "assistant", fallbackReply, emergencyAction);

    return res.json({
      reply: fallbackReply,
      action: emergencyAction,
    });
  }
});

// Função auxiliar para salvar a mensagem no banco SQLite
function saveChatMessageToDb(sessionId: string | undefined, userId: string | undefined, role: string, content: string, action: any) {
  if (!sessionId || !userId || !content) return;

  try {
    const msgId = "msg-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
    db.prepare(`
      INSERT INTO chat_messages (id, sessionId, userId, role, content, action, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      msgId,
      sessionId,
      userId,
      role,
      content,
      action ? JSON.stringify(action) : null,
      new Date().toISOString()
    );

    // Atualiza o título do chat se for a primeira mensagem do usuário
    if (role === "user") {
      const titleSnippet = content.length > 25 ? content.substring(0, 25) + "..." : content;
      db.prepare(`
        UPDATE chat_sessions 
        SET title = ? 
        WHERE id = ? AND title = 'Nova conversa com a Vic'
      `).run(titleSnippet, sessionId);
    }
  } catch (err) {
    console.error("⚠️ Erro ao salvar mensagem no SQLite:", err);
  }
}

// ============================================================
// FUNÇÃO AUXILIAR DE EXECUÇÃO SQL NO BANCO DE DADOS
// ============================================================
function processVicActionInDatabase(action: any, userId?: string) {
  if (!action || !userId) return;

  try {
    if (action.type === "BOOK_CLASS" && action.classId && action.time) {
      const slot = db.prepare("SELECT * FROM class_slots WHERE classId = ? AND time = ?").get(action.classId, action.time) as any;

      if (slot) {
        const { bookedCount } = db.prepare(`
          SELECT COUNT(*) as bookedCount FROM booked_classes WHERE classId = ? AND slotId = ?
        `).get(action.classId, slot.id) as { bookedCount: number };

        if (bookedCount < slot.totalSpots) {
          db.prepare(`
            INSERT OR IGNORE INTO booked_classes (id, userId, classId, slotId, time)
            VALUES (?, ?, ?, ?, ?)
          `).run("book-" + Date.now(), userId, action.classId, slot.id, action.time);
          console.log(`📌 Vic agendou ${action.className} (${action.time}) para o usuário ID: ${userId}`);
        }
      }
    } else if (action.type === "CANCEL_CLASS" && action.classId) {
      db.prepare("DELETE FROM booked_classes WHERE userId = ? AND classId = ?").run(userId, action.classId);
      console.log(`🗑️ Vic cancelou ${action.className} para o usuário ID: ${userId}`);
    }
  } catch (error) {
    console.error("⚠️ Erro ao atualizar o banco de dados via chat da Vic:", error);
  }
}

// ============================================================
// ELEVENLABS TTS ENDPOINT
// ============================================================

app.post("/api/vic/speech", async (req: Request, res: Response) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Texto inválido para síntese." });
    }

    const apiKey = process.env.ELEVENLABS_API_KEY;

    if (!apiKey) {
      console.error("❌ ELEVENLABS_API_KEY ausente no .env!");
      return res.status(500).json({ error: "ELEVENLABS_API_KEY não configurada no .env" });
    }

    const cleanText = text.replace(/\[EXERCISES:.*?\]/gi, "").trim();
    const SAFE_FREE_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

    console.log(`🎙️ Gerando áudio para Vic com a voz: ${SAFE_FREE_VOICE_ID}`);

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${SAFE_FREE_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": apiKey,
        },
        body: JSON.stringify({
          text: cleanText,
          model_id: "eleven_flash_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Erro na API da ElevenLabs:", errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const audioArrayBuffer = await response.arrayBuffer();

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audioArrayBuffer.byteLength,
    });

    return res.send(Buffer.from(audioArrayBuffer));

  } catch (error: any) {
    console.error("❌ Erro na rota /api/vic/speech:", error?.message || error);
    return res.status(500).json({ error: "Erro interno ao gerar voz." });
  }
});

// ============================================================
// EXERCISEDB ENDPOINT
// ============================================================

app.get("/api/exercises/search", async (req: Request, res: Response) => {
  try {
    const query = String(req.query.q || "").trim().toLowerCase();

    if (!query) {
      return res.status(400).json({ error: "Termo de busca não fornecido." });
    }

    const apiKey = process.env.EXERCISEDB_API_KEY;

    if (!apiKey) {
      console.error("❌ EXERCISEDB_API_KEY não configurada no .env!");
      return res.status(500).json({ error: "Chave da API de Exercícios ausente." });
    }

    const apiResponse = await fetch(
      `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(query)}?limit=3`,
      {
        method: "GET",
        headers: {
          "x-rapidapi-key": apiKey,
          "x-rapidapi-host": "exercisedb.p.rapidapi.com",
        },
      }
    );

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error("❌ Erro na ExerciseDB:", errText);
      return res.status(apiResponse.status).json({ error: "Erro ao consultar a ExerciseDB." });
    }

    const data = await apiResponse.json();
    return res.json({ exercises: data });

  } catch (error: any) {
    console.error("❌ Erro no endpoint /api/exercises/search:", error?.message || error);
    return res.status(500).json({ error: "Erro interno ao buscar exercício." });
  }
});


// Listar todas as sessões do usuário
app.get("/api/vic/sessions/:userId", (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const sessions = db
      .prepare("SELECT * FROM chat_sessions WHERE userId = ? ORDER BY createdAt DESC")
      .all(userId);
    return res.json(sessions);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao buscar histórico de conversas." });
  }
});

// Criar nova sessão de conversa
app.post("/api/vic/sessions", (req: Request, res: Response) => {
  try {
    const { userId, title } = req.body;
    if (!userId) return res.status(400).json({ error: "userId é obrigatório." });

    const sessionId = "session-" + Date.now();
    const sessionTitle = title || "Nova conversa com a Vic";

    db.prepare(`
      INSERT INTO chat_sessions (id, userId, title, createdAt)
      VALUES (?, ?, ?, ?)
    `).run(sessionId, userId, sessionTitle, new Date().toISOString());

    return res.status(201).json({ id: sessionId, userId, title: sessionTitle });
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar nova conversa." });
  }
});

// Buscar todas as mensagens de uma sessão específica
app.get("/api/vic/messages/:sessionId", (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const messages = db
      .prepare("SELECT * FROM chat_messages WHERE sessionId = ? ORDER BY timestamp ASC")
      .all(sessionId);

    // Converte a propriedade action de JSON string para objeto se existir
    const formatted = messages.map((m: any) => ({
      ...m,
      action: m.action ? JSON.parse(m.action) : undefined,
    }));

    return res.json(formatted);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao carregar mensagens." });
  }
});

// ============================================================
// VITE / SERVIDOR DE PRODUÇÃO
// ============================================================

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 MoveFIT servidor está rodando no endereço: http://localhost:${PORT}`);
  });
}

startServer();