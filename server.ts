import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, FunctionDeclaration, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "2mb" }));

// ============================================================
// GEMINI
// ============================================================

const apiKey = process.env.GEMINI_API_KEY;

let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ============================================================
// CONFIGURAÇÃO DE VOZ DA VIC
// ============================================================

/*
  Vozes disponíveis no Gemini TTS.

  A escolha da voz muda a personalidade sonora da Vic.
  O sotaque/estilo também pode ser controlado através
  da instrução enviada ao modelo.
*/

// ============================================================
// CONFIGURAÇÃO DE VOZ DA VIC
// ============================================================

// Substitui o objeto VIC_VOICES no server.ts por este:

const VIC_VOICES: Record<
  string,
  {
    name: "AOEDE" | "KORE";
    label: string;
    description: string;
    style: string;
  }
> = {
  // Mapeia todas as variações para a voz feminina vibrante (AOEDE)
  jovem: {
    name: "AOEDE",
    label: "Vic Energética",
    description: "Jovem e energética",
    style: "Você é a Vic. Responda em tom de voz feminino super animado, motivador e jovem.",
  },
  energetica: {
    name: "AOEDE",
    label: "Vic Energética",
    description: "Jovem e energética",
    style: "Você é a Vic. Responda em tom de voz feminino super animado, motivador e jovem.",
  },
  amigavel: {
    name: "AOEDE",
    label: "Vic Natural",
    description: "Amigável e descontraída",
    style: "Você é a Vic. Responda em tom de voz feminino amigável e natural.",
  },
  natural: {
    name: "AOEDE",
    label: "Vic Natural",
    description: "Amigável e descontraída",
    style: "Você é a Vic. Responda em tom de voz feminino amigável e natural.",
  },
  motivadora: {
    name: "AOEDE",
    label: "Vic Motivadora",
    description: "Animada e dinâmica",
    style: "Você é a Vic. Responda em tom de voz feminino muito animado e motivador.",
  },
  animada: {
    name: "AOEDE",
    label: "Vic Motivadora",
    description: "Animada e dinâmica",
    style: "Você é a Vic. Responda em tom de voz feminino muito animado e motivador.",
  },

  // Apenas a opção Tranquila usa a voz KORE (suave)
  tranquila: {
    name: "KORE",
    label: "Vic Tranquila",
    description: "Calma e atenciosa",
    style: "Você é a Vic. Responda em tom de voz feminino calmo e atencioso.",
  },
  calorosa: {
    name: "KORE",
    label: "Vic Tranquila",
    description: "Calma e atenciosa",
    style: "Você é a Vic. Responda em tom de voz feminino calmo e atencioso.",
  },
};

// ============================================================
// CONFIGURAÇÕES DE IDIOMA / SOTAQUE
// ============================================================

const VIC_ACCENTS: Record<
  string,
  {
    label: string;
    instruction: string;
  }
> = {
  "pt-BR": {
    label: "Português do Brasil",
    instruction:
      "Fale em português brasileiro natural, com pronúncia brasileira clara e espontânea. Evite pronúncia de português europeu.",
  },

  "pt-BR-natural": {
    label: "Português brasileiro natural",
    instruction:
      "Fale como uma brasileira jovem conversando naturalmente com outra pessoa. Use entonação brasileira espontânea, ritmo confortável e pronúncia natural.",
  },

  "pt-PT": {
    label: "Português de Portugal",
    instruction:
      "Fale em português europeu natural, com pronúncia e ritmo característicos de Portugal.",
  },
};

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function normalizeVoice(voice?: string): string {
  if (!voice) {
    return "jovem";
  }

  const normalized = voice.toLowerCase().trim();

  if (VIC_VOICES[normalized]) {
    return normalized;
  }

  // Permite também enviar diretamente o nome da voz do Gemini
  const directVoice = Object.entries(VIC_VOICES).find(
    ([, config]) =>
      config.name.toLowerCase() === normalized
  );

  if (directVoice) {
    return directVoice[0];
  }

  return "jovem";
}

function normalizeAccent(accent?: string): string {
  if (!accent) {
    return "pt-BR-natural";
  }

  const normalized = accent.trim();

  if (VIC_ACCENTS[normalized]) {
    return normalized;
  }

  return "pt-BR-natural";
}

// ============================================================
// CONVERSÃO PCM -> WAV
// ============================================================

/*
  O Gemini TTS retorna áudio PCM.

  O navegador consegue tocar WAV diretamente.
  Portanto, adicionamos um cabeçalho WAV ao PCM
  antes de enviar o áudio para o frontend.
*/

function pcmToWav(
  pcmData: Buffer,
  sampleRate = 24000,
  channels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate =
    sampleRate * channels * (bitsPerSample / 8);

  const blockAlign =
    channels * (bitsPerSample / 8);

  const buffer = Buffer.alloc(44 + pcmData.length);

  // RIFF
  buffer.write("RIFF", 0);

  // Tamanho do arquivo
  buffer.writeUInt32LE(
    36 + pcmData.length,
    4
  );

  // WAVE
  buffer.write("WAVE", 8);

  // fmt
  buffer.write("fmt ", 12);

  // Tamanho do subchunk fmt
  buffer.writeUInt32LE(16, 16);

  // PCM
  buffer.writeUInt16LE(1, 20);

  // Canais
  buffer.writeUInt16LE(channels, 22);

  // Sample rate
  buffer.writeUInt32LE(sampleRate, 24);

  // Byte rate
  buffer.writeUInt32LE(byteRate, 28);

  // Block align
  buffer.writeUInt16LE(blockAlign, 32);

  // Bits por sample
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data
  buffer.write("data", 36);

  // Tamanho do áudio
  buffer.writeUInt32LE(
    pcmData.length,
    40
  );

  // PCM
  pcmData.copy(buffer, 44);

  return buffer;
}

// ============================================================
// TOOL: AGENDAR AULA
// ============================================================

const bookGymClassDeclaration: FunctionDeclaration = {
  name: "bookGymClass",

  description:
    "Agenda e reserva oficialmente uma aula coletiva para o aluno na grade da MoveFIT.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      classId: {
        type: Type.STRING,

        description:
          "ID da aula: 'pilates', 'spinning', 'fitdance' ou 'funcional'",
      },

      time: {
        type: Type.STRING,

        description:
          "Horário da aula, ex: '07:00', '10:00', '18:00'",
      },
    },

    required: ["classId", "time"],
  },
};

// ============================================================
// TOOL: CANCELAR AULA
// ============================================================

const cancelGymClassDeclaration: FunctionDeclaration = {
  name: "cancelGymClass",

  description:
    "Cancela a reserva/inscrição de uma aula coletiva agendada pelo aluno.",

  parameters: {
    type: Type.OBJECT,

    properties: {
      classId: {
        type: Type.STRING,

        description:
          "ID da aula a ser cancelada: 'pilates', 'spinning', 'fitdance' ou 'funcional'",
      },
    },

    required: ["classId"],
  },
};

// ============================================================
// NOMES DAS AULAS
// ============================================================

const CLASS_NAMES: Record<string, string> = {
  pilates: "Pilates",
  spinning: "Spinning",
  fitdance: "FitDance",
  funcional: "Treino Funcional",
};

// ============================================================
// FALLBACK DE INTENÇÃO
// ============================================================

function parseBookingIntent(
  text: string
): {
  type: "BOOK_CLASS" | "CANCEL_CLASS";
  classId: string;
  time?: string;
  className: string;
} | null {
  const lower = text.toLowerCase();

  // ==========================================================
  // CANCELAMENTO
  // ==========================================================

  if (
    lower.includes("cancela") ||
    lower.includes("desmarca") ||
    lower.includes("remover aula") ||
    lower.includes("tirar minha vaga")
  ) {
    if (lower.includes("pilates")) {
      return {
        type: "CANCEL_CLASS",
        classId: "pilates",
        className: "Pilates",
      };
    }

    if (
      lower.includes("spinning") ||
      lower.includes("bike")
    ) {
      return {
        type: "CANCEL_CLASS",
        classId: "spinning",
        className: "Spinning",
      };
    }

    if (
      lower.includes("fitdance") ||
      lower.includes("dança") ||
      lower.includes("danca")
    ) {
      return {
        type: "CANCEL_CLASS",
        classId: "fitdance",
        className: "FitDance",
      };
    }

    if (lower.includes("funcional")) {
      return {
        type: "CANCEL_CLASS",
        classId: "funcional",
        className: "Treino Funcional",
      };
    }
  }

  // ==========================================================
  // AGENDAMENTO
  // ==========================================================

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
    }

    else if (
      lower.includes("spinning") ||
      lower.includes("bike")
    ) {
      classId = "spinning";
      className = "Spinning";
      defaultTimes = ["06:30", "12:00", "19:30"];
    }

    else if (
      lower.includes("fitdance") ||
      lower.includes("dança") ||
      lower.includes("danca")
    ) {
      classId = "fitdance";
      className = "FitDance";
      defaultTimes = ["11:00", "19:00"];
    }

    else if (lower.includes("funcional")) {
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

          Number(hour) < 10
            ? `${Number(hour)}h${minute}`
            : "",

          Number(hour) < 10
            ? `${Number(hour)}:${minute}`
            : "",

          Number(hour) < 10
            ? `${Number(hour)}h`
            : "",
        ].filter(Boolean);

        if (
          patterns.some((p) =>
            lower.includes(p)
          )
        ) {
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
// HEALTH CHECK
// ============================================================

app.get(
  "/api/health",
  (_req: Request, res: Response) => {
    res.json({
      status: "ok",
      service: "MoveFIT Server",
    });
  }
);

// ============================================================
// VOICES API
// ============================================================

/*
  O frontend pode chamar esse endpoint para descobrir
  quais vozes estão disponíveis.

  GET /api/vic/voices
*/

app.get(
  "/api/vic/voices",
  (_req: Request, res: Response) => {
    res.json({
      voices: Object.entries(VIC_VOICES).map(
        ([id, config]) => ({
          id,
          name: config.name,
          description: config.description,
          style: config.style,
        })
      ),

      accents: Object.entries(VIC_ACCENTS).map(
        ([id, config]) => ({
          id,
          label: config.label,
        })
      ),
    });
  }
);

// ============================================================
// VIC TTS
// ============================================================

/*
  POST /api/vic/speech

  Body:

  {
    "text": "Oi! Bora começar seu treino?",
    "voice": "jovem",
    "accent": "pt-BR-natural"
  }

  Retorna:

  audio/wav
*/

app.post(
  "/api/vic/speech",
  async (req: Request, res: Response) => {
    try {
      const {
        text,
        voice = "jovem",
        accent = "pt-BR-natural",
      } = req.body;

      // --------------------------------------------------------
      // VALIDAÇÃO
      // --------------------------------------------------------

      if (
        !text ||
        typeof text !== "string"
      ) {
        return res.status(400).json({
          error:
            "Texto inválido para geração de voz.",
        });
      }

      if (text.trim().length === 0) {
        return res.status(400).json({
          error:
            "Não é possível gerar áudio de um texto vazio.",
        });
      }

      if (text.length > 8000) {
        return res.status(400).json({
          error:
            "O texto é muito longo para geração de voz.",
        });
      }

      if (!ai) {
        return res.status(503).json({
          error:
            "Gemini não está configurado. Verifique GEMINI_API_KEY.",
        });
      }

      // --------------------------------------------------------
      // CONFIGURAÇÃO DA VOZ
      // --------------------------------------------------------

      const selectedVoiceId =
        normalizeVoice(voice);

      const selectedAccentId =
        normalizeAccent(accent);

      const selectedVoice =
        VIC_VOICES[selectedVoiceId];

      const selectedAccent =
        VIC_ACCENTS[selectedAccentId];

      // --------------------------------------------------------
      // PROMPT DE PERFORMANCE
      // --------------------------------------------------------

      // Limpeza de emojis e marcações markdown para síntese rápida e sem ruídos
      const cleanText = text
        .replace(/[*_~`#]/g, "")
        .replace(
          /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
          ""
        )
        .replace(/\s+/g, " ")
        .trim();

      // Limita a 500 caracteres para garantir geração ágil (baixa latência)
      const speechInput = cleanText.length > 500 
        ? cleanText.substring(0, 497) + "..." 
        : cleanText;

      // --------------------------------------------------------
      // GEMINI TTS (Model generateContent + Interactions fallback)
      // --------------------------------------------------------

      let audioBase64: string | null = null;
      let mimeType = "audio/wav";

      try {
        const genResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: speechInput }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: selectedVoice.name },
              },
            },
          },
        });

        const part = genResponse.candidates?.[0]?.content?.parts?.[0] as any;
        if (part?.inlineData?.data) {
          audioBase64 = part.inlineData.data;
          if (part.inlineData.mimeType) {
            mimeType = part.inlineData.mimeType;
          }
        }
      } catch (genError: any) {
        console.warn(
          "ai.models.generateContent TTS tentou mas falhou, tentando fallback interactions:",
          genError?.message
        );
      }

      // Se generateContent não retornou áudio, tenta via Interactions
      if (!audioBase64) {
        try {
          const interaction: any = await (ai.interactions as any).create({
            model: "gemini-3.1-flash-tts-preview",
            input: speechInput,
            response_modalities: ["AUDIO"],
            generation_config: {
              speech_config: {
                voice: selectedVoice.name,
              },
            },
          });

          for (const step of interaction?.steps || []) {
            if (step.type === "model_output") {
              const audioContent = step.content?.find(
                (c: any) => c.type === "audio"
              );
              if (audioContent && (audioContent as any).data) {
                audioBase64 = (audioContent as any).data;
                if ((audioContent as any).mime_type) {
                  mimeType = (audioContent as any).mime_type;
                }
                break;
              }
            }
          }
        } catch (interactErr: any) {
          console.warn("Interactions TTS também falhou:", interactErr?.message);
        }
      }

      if (!audioBase64) {
        console.warn("Nenhum motor Gemini TTS retornou áudio para o texto");
        return res.status(500).json({
          error: "O modelo não retornou dados de áudio.",
        });
      }

      const rawAudioBuffer = Buffer.from(audioBase64, "base64");

      if (rawAudioBuffer.length === 0) {
        return res.status(500).json({
          error: "O buffer de áudio retornado está vazio.",
        });
      }

      // Se já vier com cabeçalho RIFF / WAV, usa diretamente; caso contrário converte PCM para WAV
      const isWav =
        rawAudioBuffer.length >= 4 &&
        rawAudioBuffer.subarray(0, 4).toString("ascii") === "RIFF";

      const wavBuffer = isWav
        ? rawAudioBuffer
        : pcmToWav(rawAudioBuffer, 24000, 1, 16);

      // --------------------------------------------------------
      // RETORNO
      // --------------------------------------------------------

      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", wavBuffer.length);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

      return res.send(wavBuffer);

    } catch (error: any) {
      console.error(
        "Erro no TTS da Vic:",
        error
      );

      return res.status(500).json({
        error:
          "Não foi possível gerar a voz da Vic.",
        details:
          error?.message ||
          "Erro desconhecido",
      });
    }
  }
);

// ============================================================
// VIC AI ASSISTANT
// ============================================================

app.post(
  "/api/vic/chat",
  async (req: Request, res: Response) => {
    try {
      const {
        message,
        history = [],
        user,
      } = req.body;

      // --------------------------------------------------------
      // VALIDAÇÃO
      // --------------------------------------------------------

      if (
        !message ||
        typeof message !== "string"
      ) {
        return res.status(400).json({
          error: "Mensagem inválida.",
        });
      }

      // --------------------------------------------------------
      // DADOS DO ALUNO
      // --------------------------------------------------------

      const userName =
        user?.fullName || "Aluno(a)";

      const userMatricula =
        user?.matricula || "Não informada";

      const trainingLevel =
        user?.trainingLevel || "Iniciante";

      const medicalNotes =
        user?.medicalNotes || "Nenhuma";

      const bookedClasses =
        Array.isArray(user?.bookedClasses) &&
        user.bookedClasses.length > 0
          ? user.bookedClasses
              .map(
                (c: any) =>
                  `${c.className} (${c.schedule})`
              )
              .join(", ")
          : "Nenhuma aula agendada no momento";

      // --------------------------------------------------------
      // SYSTEM INSTRUCTION
      // --------------------------------------------------------

      const systemInstruction = `
Você é a "Vic", a assistente virtual de inteligência artificial
oficial da academia MoveFIT.

IDENTIDADE:
- Seu nome é Vic.
- Você tem 24 anos.
- Você é feminina.
- Você é energética, empática, acolhedora e motivadora.
- Você fala português do Brasil de maneira natural.
- Você usa emojis com moderação.
- Você nunca deve parecer robótica ou repetir respostas genéricas.

PERSONALIDADE:
- Seja amigável.
- Seja direta.
- Seja natural.
- Seja acolhedora.
- Seja motivadora.
- Responda exatamente ao que o aluno perguntou.
- Não repita sua apresentação em todas as mensagens.
- Não comece toda resposta com "Claro, posso te ajudar".
- Evite respostas genéricas.
- Se o aluno fizer uma pergunta específica, responda especificamente.

CONTEXTO DO ALUNO:
- Nome: ${userName}
- Matrícula: ${userMatricula}
- Nível de treino: ${trainingLevel}
- Observações médicas: ${medicalNotes}
- Aulas agendadas: ${bookedClasses}

REGRA OBRIGATÓRIA DE MATRÍCULA:
- O número de matrícula é ESTRITAMENTE OBRIGATÓRIO para todos os alunos da MoveFIT poderem utilizar o aplicativo e agendar aulas coletivas.
- A matrícula segue estritamente a estrutura MF-202X-00X (onde MF é a sigla MoveFIT, 202X é o ano de cadastro e 00X é o número sequencial do aluno, ex: MF-2026-001).
- Se o aluno ou visitante perguntar sobre matrícula, disser que não tem número de matrícula ou perguntar como se matricular, informe com simpatia, energia positiva e clareza que o número de matrícula é obrigatório na estrutura MF-202X-00X e que ele deve comparecer presencialmente à unidade da Academia MoveFIT para se matricular na recepção física com a equipe.

AULAS COLETIVAS OFICIAIS:

1. Pilates
ID: pilates
Dias: segunda, quarta e sexta
Horários oficiais:
06:30
07:00
07:30
08:00
08:30
09:00
10:00
11:00
12:00
13:00
14:00
15:00
16:00
17:00
18:00
18:30
19:00
19:30
20:00
20:30

2. Spinning
ID: spinning
Dias: terça e quinta
Horários oficiais:
06:30
07:00
07:30
08:00
08:30
09:00
10:00
11:00
12:00
13:00
14:00
15:00
16:00
17:00
17:30
18:00
18:30
19:00
19:30
20:00

3. Yoga & Funcional
ID: yoga-funcional
Dia: sábado
Horários oficiais:
08:00
09:30
11:00
14:00
15:30
17:00

4. FitDance / Ritmos
ID: fitdance
Dias: segunda e quarta
Horários oficiais:
08:00
09:00
10:00
11:00
12:00
13:00
14:00
15:00
16:00
17:00
17:30
18:00
18:30
19:00
19:30
20:00
20:30
21:00
21:30
22:00

5. Treino Funcional
ID: funcional
Dias: terça e quinta
Horários oficiais:
06:30
07:00
07:30
08:00
09:00
10:00
11:00
12:00
13:00
14:00
15:00
16:00
17:00
17:30
18:00
18:30
19:00
19:30
20:00
20:30

6. Body Pump
ID: body-pump
Dias: quarta e sexta
Horários oficiais:
07:00
07:30
08:00
08:30
09:00
10:00
11:00
12:00
13:00
14:00
15:00
16:00
17:00
17:30
18:00
18:30
19:00
19:30
20:00
20:30

7. Mat Pilates & Alongamento
ID: mat-pilates-alongamento
Dia: sábado
Horários oficiais:
10:30
12:00
14:00
15:30
17:00
18:30

DURAÇÃO:
- Todas as aulas duram exatamente 50 minutos.
- Nunca diga que uma aula dura outro período.

REGRAS DE AGENDAMENTO:
- Nunca invente uma modalidade.
- Nunca invente um dia.
- Nunca invente um horário.
- Nunca arredonde horários.
- Se o aluno pedir um horário que não existe, informe que ele não está disponível na grade oficial.
- Se possível, ofereça horários válidos próximos.
- A existência de um horário na grade não significa que ainda exista vaga.
- A disponibilidade real deve ser confirmada pelo sistema.

QUANDO O ALUNO QUISER AGENDAR:
- Identifique a modalidade.
- Identifique a data/dia quando necessário.
- Identifique o horário.
- Se faltar informação essencial, pergunte.
- Quando tiver informações suficientes, use bookGymClass.
- Nunca diga que uma aula foi agendada antes da confirmação da ferramenta.

QUANDO O ALUNO QUISER CANCELAR:
- Identifique a modalidade.
- Identifique a reserva.
- Use cancelGymClass.
- Nunca diga que cancelou antes da confirmação da ferramenta.

SAÚDE:
- Nunca forneça diagnóstico médico definitivo.
- Para dores agudas, lesões ou sintomas preocupantes, recomende avaliação de um profissional de saúde.
- Não ignore restrições médicas informadas pelo aluno.

RESPOSTAS:
- Seja concisa.
- Prefira frases naturais.
- Use listas curtas quando necessário.
- Não repita informações desnecessariamente.
- Responda primeiro à pergunta do aluno.

OBJETIVO:
Ser a personal trainer digital da MoveFIT e ajudar o aluno com:
- aulas;
- horários;
- agendamentos;
- cancelamentos;
- treinos;
- aquecimento;
- exercícios;
- orientações gerais de treino.
`;

      // ======================================================
      // FALLBACK SEM GEMINI
      // ======================================================

      if (!ai) {
        const lowerMsg = message.toLowerCase();
        if (
          lowerMsg.includes("matrícula") ||
          lowerMsg.includes("matricula") ||
          lowerMsg.includes("presencial") ||
          lowerMsg.includes("se matricular") ||
          lowerMsg.includes("fazer matrícula") ||
          lowerMsg.includes("fazer matricula") ||
          lowerMsg.includes("não tenho matrícula") ||
          lowerMsg.includes("nao tenho matricula") ||
          lowerMsg.includes("como me matricular")
        ) {
          return res.json({
            reply: `O número de matrícula é obrigatório para todos os alunos da MoveFIT e deve seguir a estrutura MF-202X-00X (ex: MF-2026-001)! 💪 Se você ainda não possui sua matrícula, é necessário comparecer presencialmente à recepção da Academia MoveFIT para se matricular e retirar seu número oficial de acesso. Estamos te esperando de braços abertos! 💗`,
          });
        }

        const parsedAction =
          parseBookingIntent(message);

        let reply = `Oi, ${userName}! Sou a Vic da MoveFIT! 💪✨`;

        if (
          parsedAction?.type ===
          "BOOK_CLASS"
        ) {
          reply =
            `Maravilha, ${userName}! ` +
            `Agendei sua aula de ` +
            `${parsedAction.className} ` +
            `para as ${parsedAction.time}. ` +
            `A aula dura 50 minutos! 🔥`;
        }

        else if (
          parsedAction?.type ===
          "CANCEL_CLASS"
        ) {
          reply =
            `Entendido, ${userName}! ` +
            `A solicitação para cancelar ` +
            `${parsedAction.className} ` +
            `foi identificada. 🌟`;
        }

        return res.json({
          reply,
          action: parsedAction,
        });
      }

      // ======================================================
      // HISTÓRICO
      // ======================================================

      const contents: any[] = [];

      const recentHistory =
        Array.isArray(history)
          ? history.slice(-10)
          : [];

      for (const msg of recentHistory) {
        contents.push({
          role:
            msg.role === "assistant"
              ? "model"
              : "user",

          parts: [
            {
              text: String(
                msg.content || ""
              ),
            },
          ],
        });
      }

      contents.push({
        role: "user",

        parts: [
          {
            text: message,
          },
        ],
      });

      // ======================================================
      // GEMINI
      // ======================================================

      const response =
        await ai.models.generateContent({
          model: "gemini-3.8-flash",

          contents,

          config: {
            systemInstruction,

            temperature: 0.7,

            tools: [
              {
                functionDeclarations: [
                  bookGymClassDeclaration,
                  cancelGymClassDeclaration,
                ],
              },
            ],
          },
        });

      // ======================================================
      // ACTION
      // ======================================================

      let action: any = null;

      if (
        response.functionCalls &&
        response.functionCalls.length > 0
      ) {
        const call =
          response.functionCalls[0];

        if (
          call.name ===
          "bookGymClass"
        ) {
          const classId =
            String(
              (call.args as any)
                ?.classId || ""
            ).toLowerCase();

          const time =
            String(
              (call.args as any)
                ?.time || ""
            );

          action = {
            type: "BOOK_CLASS",
            classId,
            time,
            className:
              CLASS_NAMES[classId] ||
              classId,
          };
        }

        else if (
          call.name ===
          "cancelGymClass"
        ) {
          const classId =
            String(
              (call.args as any)
                ?.classId || ""
            ).toLowerCase();

          action = {
            type: "CANCEL_CLASS",
            classId,
            className:
              CLASS_NAMES[classId] ||
              classId,
          };
        }
      }

      // ======================================================
      // FALLBACK DE INTENÇÃO
      // ======================================================

      if (!action) {
        const fallbackAction =
          parseBookingIntent(message);

        if (fallbackAction) {
          action = fallbackAction;
        }
      }

      // ======================================================
      // RESPOSTA
      // ======================================================

      let reply =
        response.text;

      if (!reply) {
        if (
          action?.type ===
          "BOOK_CLASS"
        ) {
          reply =
            `Combinado, ${userName}! ` +
            `Sua aula de ${action.className} ` +
            `às ${action.time} foi processada. ` +
            `A aula dura 50 minutos! 💪🔥`;
        }

        else if (
          action?.type ===
          "CANCEL_CLASS"
        ) {
          reply =
            `Pronto, ${userName}! ` +
            `Sua solicitação para cancelar ` +
            `${action.className} foi processada. ✨`;
        }

        else {
          reply =
            `Oi, ${userName}! ` +
            `Como posso te ajudar hoje? 💪`;
        }
      }

      return res.json({
        reply,
        action,
      });

    } catch (error: any) {
      console.error(
        "Erro na API da Vic:",
        error
      );

      const emergencyAction =
        parseBookingIntent(
          req.body?.message || ""
        );

      let fallbackReply =
        "Opa, tive uma pequena oscilação na conexão, mas estou aqui com você! 💪";

      if (
        emergencyAction?.type ===
        "BOOK_CLASS"
      ) {
        fallbackReply =
          `Entendi! Você quer agendar ` +
          `${emergencyAction.className} ` +
          `às ${emergencyAction.time}. ` +
          `Vou precisar confirmar o agendamento pelo sistema. 🔥`;
      }

      return res.json({
        reply: fallbackReply,
        action: emergencyAction,
      });
    }
  }
);

// ============================================================
// VITE
// ============================================================

async function startServer() {
  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    const vite =
      await createViteServer({
        server: {
          middlewareMode: true,
        },

        appType: "spa",
      });

    app.use(vite.middlewares);
  }

  else {
    const distPath =
      path.join(
        process.cwd(),
        "dist"
      );

    app.use(
      express.static(distPath)
    );

    app.get(
      "*",
      (_req: Request, res: Response) => {
        res.sendFile(
          path.join(
            distPath,
            "index.html"
          )
        );
      }
    );
  }

  app.listen(
    PORT,
    "0.0.0.0",
    () => {
      console.log(
        `MoveFIT server running on http://0.0.0.0:${PORT}`
      );
    }
  );
}

startServer();
