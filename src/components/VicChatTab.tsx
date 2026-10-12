import React, { useState, useRef, useEffect } from "react";
import {
  User,
  BookedClass,
  ChatMessage,
  GymClass,
  ChatAction,
  SavedRecommendation,
  RecommendationCategory,
} from "../types";

import {
  Sparkles,
  Send,
  User as UserIcon,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRight,
  Check,
  CalendarCheck2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Loader2,
  Settings2,
  Bookmark,
  BookmarkCheck,
  Plus,
  MessageSquare,
  History,
  Dumbbell,
} from "lucide-react";

interface VicChatTabProps {
  user: User;
  bookedClasses: BookedClass[];
  classes: GymClass[];
  onBookClass: (
    classId: string,
    time: string
  ) => {
    success: boolean;
    message: string;
  };
  onCancelBooking: (bookingId: string) => void;
  onNavigateToClasses?: () => void;
  savedRecommendations?: SavedRecommendation[];
  onSaveRecommendation?: (rec: Omit<SavedRecommendation, "id" | "savedAt" | "userId">) => void;
  onRemoveRecommendation?: (recId: string) => void;
  onNavigateToProfile?: () => void;
}

// ============================================================
// COMPONENTE DE CARD DEMONSTRATIVO DE EXERCÍCIO (YOUTUBE GUIADO)
// ============================================================
// Dicionário de tradução para garantir que qualquer termo em inglês vire Português
const EXERCISE_TRANSLATIONS: Record<string, string> = {
  "jumping_jacks": "Polichinelo",
  "jumping jacks": "Polichinelo",
  "bodyweight_squat": "Agachamento Livre",
  "bodyweight squat": "Agachamento Livre",
  "squat": "Agachamento",
  "push_up": "Flexão de Braço",
  "push up": "Flexão de Braço",
  "wall_push_up": "Flexão na Parede",
  "wall push up": "Flexão na Parede",
  "plank": "Prancha Abdominal",
  "walking_in_place": "Caminhada no Lugar",
  "stretching": "Alongamento",
  "side_plank": "Prancha Lateral",
  "dumbbell_shoulder_raise": "Elevação Lateral com Halteres",
  "lunges": "Afundo",
  "walking_lunge": "Passada / Lunge",
};

const ExerciseCard: React.FC<{ exerciseName: string }> = ({ exerciseName }) => {
  const cleanKey = exerciseName.toLowerCase().replace(/_/g, " ").trim();
  
  // Tenta traduzir ou formata o texto caso já esteja em português
  const portugueseName =
    EXERCISE_TRANSLATIONS[cleanKey] ||
    EXERCISE_TRANSLATIONS[exerciseName.toLowerCase()] ||
    cleanKey
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

  // Busca no YouTube com a query em português
  const youtubeQuery = encodeURIComponent(`como fazer exercicio ${portugueseName} tecnica correta`);
  const youtubeUrl = `https://www.youtube.com/results?search_query=${youtubeQuery}`;

  return (
    <div className="bg-[#1E1B24] border border-[#00C0A3]/30 hover:border-[#00C0A3]/60 rounded-xl p-3.5 shadow-md space-y-3 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00C0A3]/10 border border-[#00C0A3]/30 flex items-center justify-center text-[#00C0A3]">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">{portugueseName}</h4>
            <p className="text-[10px] text-[#B0A8B9]">Movimento Demonstrativo</p>
          </div>
        </div>
      </div>

      {/* Card Visual Interativo */}
      <div className="w-full h-24 bg-[#292433] rounded-lg border border-[#3E374C] p-3 flex flex-col items-center justify-center text-center gap-1.5 relative overflow-hidden group">
        <Dumbbell className="w-7 h-7 text-[#845EC2] group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-medium text-zinc-300">
          Guia de Postura e Execução
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#3E374C]/60">
        <span className="text-[10px] text-zinc-400">Técnica Recomendada</span>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#00C0A3] hover:text-[#00a88f] flex items-center gap-1 transition-colors"
        >
          Ver Demonstração <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};

const VIC_VOICES = [
  {
    id: "bella",
    name: "Bella",
    label: "Vic Energética (Bella)",
    description: "Jovem, articulada e dinâmica",
    emoji: "🩷",
    accent: "en-US / pt-BR",
  },
  {
    id: "rachel",
    name: "Rachel",
    label: "Vic Natural (Rachel)",
    description: "Calma, fluida e amigável",
    emoji: "✨",
    accent: "en-US / pt-BR",
  },
  {
    id: "domi",
    name: "Domi",
    label: "Vic Forte (Domi)",
    description: "Enérgica, firme e motivadora",
    emoji: "🔥",
    accent: "en-US / pt-BR",
  },
  {
    id: "elli",
    name: "Elli",
    label: "Vic Suave (Elli)",
    description: "Jovem, leve e espontânea",
    emoji: "🌸",
    accent: "en-US / pt-BR",
  },
];

export const VicChatTab: React.FC<VicChatTabProps> = ({
  user,
  bookedClasses,
  onBookClass,
  onCancelBooking,
  onNavigateToClasses,
  savedRecommendations = [],
  onSaveRecommendation,
  onRemoveRecommendation,
  onNavigateToProfile,
}) => {
  const [toastNotification, setToastNotification] = useState<string | null>(null);

  // Estados de Gerenciamento do Histórico de Sessões
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  // Função auxiliar para processar e separar a tag [EXERCISES: ...] da mensagem da Vic
  const parseVicMessageContent = (content: string) => {
    const match = content.match(/\[EXERCISES:\s*(.*?)\]/i);
    if (!match) {
      return { textContent: content, exercisesList: [] };
    }

    const textContent = content.replace(/\[EXERCISES:\s*.*?\]/gi, "").trim();
    const exercisesList = match[1]
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    return { textContent, exercisesList };
  };

  const detectRecommendationCategory = (text: string): RecommendationCategory => {
    const lower = text.toLowerCase();
    if (
      lower.includes("aqueciment") ||
      lower.includes("esteira") ||
      lower.includes("mobilidade") ||
      lower.includes("elíptico") ||
      lower.includes("remo seco") ||
      lower.includes("corda")
    ) {
      return "aquecimento";
    }
    if (
      lower.includes("treino principal") ||
      lower.includes("treino secundário") ||
      lower.includes("treino a") ||
      lower.includes("treino b") ||
      lower.includes("série") ||
      lower.includes("repetições") ||
      lower.includes("supino") ||
      lower.includes("leg press") ||
      lower.includes("agachamento") ||
      lower.includes("drop-set") ||
      lower.includes("remada") ||
      lower.includes("puxada")
    ) {
      return "treino";
    }
    if (
      lower.includes("execu") ||
      lower.includes("exercício") ||
      lower.includes("postura") ||
      lower.includes("movimento") ||
      lower.includes("biomecânica")
    ) {
      return "exercicio";
    }
    return "geral";
  };

  const extractRecommendationTitle = (text: string, category: RecommendationCategory): string => {
    const firstLine = text.trim().split("\n")[0].replace(/[#*•-]/g, "").trim();
    if (firstLine.length > 5 && firstLine.length <= 50) {
      return firstLine;
    }
    switch (category) {
      case "aquecimento":
        return "Aquecimento Oficial MoveFIT";
      case "treino":
        return `Série de Treino (${user.trainingLevel})`;
      case "exercicio":
        return "Orientação de Exercício da Vic";
      default:
        return "Recomendação Personalizada da Vic";
    }
  };

  const isMessageSaved = (msg: ChatMessage) => {
    if (!savedRecommendations) return false;
    return savedRecommendations.some(
      (r) => r.sourceMessageId === msg.id || (r.content && r.content.trim() === msg.content.trim())
    );
  };

  const handleToggleSaveRecommendation = (msg: ChatMessage) => {
    const existing = savedRecommendations?.find(
      (r) => r.sourceMessageId === msg.id || (r.content && r.content.trim() === msg.content.trim())
    );

    if (existing && onRemoveRecommendation) {
      onRemoveRecommendation(existing.id);
      setToastNotification("Recomendação removida dos seus salvos.");
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    if (onSaveRecommendation) {
      const category = detectRecommendationCategory(msg.content);
      const title = extractRecommendationTitle(msg.content, category);
      onSaveRecommendation({
        title,
        category,
        content: msg.content,
        sourceMessageId: msg.id,
      });
      setToastNotification("Recomendação salva no seu Perfil! ✨");
      setTimeout(() => setToastNotification(null), 4000);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const bookedText =
      bookedClasses.length > 0
        ? `Você tem **${bookedClasses.length} aula(s)** agendada(s) para esta semana!`
        : "Ainda não vi nenhuma aula agendada no seu cronograma.";

    const userWeight = user.weight ? `${user.weight} kg` : "não informado";
    const userHeight = user.height ? `${user.height} cm` : "não informada";

    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Oi, ${user.fullName.split(" ")[0]}! Sou a Vic, sua personal trainer na MoveFIT! 💪✨

Já carreguei seu perfil por aqui: nível **${user.trainingLevel}**, peso **${userWeight}**, altura **${userHeight}**, restrição médica "${user.medicalNotes}" e ${bookedText}

Como posso te ajudar com seus treinos hoje? Se quiser, posso agendar suas aulas coletivas de 50 minutos ou montar uma rotina personalizada!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [selectedVoiceKey, setSelectedVoiceKey] = useState<string>(() => {
    return localStorage.getItem("vicVoiceKey") || "bella";
  });

  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem("vicAutoSpeak") !== "false";
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar histórico de sessões do usuário e selecionar/criar sessão ativa
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/vic/sessions/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setSessions(data);
            if (data.length > 0 && !currentSessionId) {
              handleSelectSession(data[0].id);
            } else if (data.length === 0 && !currentSessionId) {
              handleCreateNewChat();
            }
          }
        })
        .catch((err) => console.error("Erro ao carregar sessões de chat:", err));
    }
  }, [user?.id]);

  useEffect(() => {
    localStorage.setItem("vicVoiceKey", selectedVoiceKey);
  }, [selectedVoiceKey]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Função para criar uma nova sessão de conversa no SQLite
  const handleCreateNewChat = async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/vic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, title: "Nova conversa com a Vic" }),
      });
      const newSession = await res.json();
      if (newSession?.id) {
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);

        const bookedText =
          bookedClasses.length > 0
            ? `Você tem **${bookedClasses.length} aula(s)** no seu cronograma.`
            : "Nenhuma aula agendada por enquanto.";

        const userWeight = user.weight ? `${user.weight} kg` : "não informado";
        const userHeight = user.height ? `${user.height} cm` : "não informada";

        setMessages([
          {
            id: "msg-welcome-" + Date.now(),
            role: "assistant",
            content: `Nova conversa iniciada, ${user.fullName.split(" ")[0]}! 🌟

Seu perfil está atualizado: nível **${user.trainingLevel}**, peso **${userWeight}**, altura **${userHeight}**, restrição médica "${user.medicalNotes}" e ${bookedText}

O que vamos focar no treino de hoje?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (e) {
      console.error("Erro ao criar nova sessão:", e);
    }
  };

  // Função para selecionar um chat antigo do histórico
  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    stopSpeaking();
    try {
      const res = await fetch(`/api/vic/messages/${sessionId}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMessages(
          data.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            action: m.action,
          }))
        );
      }
    } catch (e) {
      console.error("Erro ao carregar mensagens da sessão:", e);
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setIsAudioLoading(false);
    setAudioLoadingMessageId(null);
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  const speakText = async (text: string, messageId: string, voiceKeyToUse?: string) => {
    stopSpeaking();
    setIsAudioLoading(true);
    setAudioLoadingMessageId(messageId);

    const voiceKey = voiceKeyToUse || selectedVoiceKey;

    try {
      const response = await fetch("/api/vic/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: voiceKey,
        }),
      });

      if (!response.ok) throw new Error("Erro na API de voz");

      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error("Áudio vazio");

      const audioUrl = URL.createObjectURL(audioBlob);
      audioUrlRef.current = audioUrl;

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onplay = () => {
        setIsAudioLoading(false);
        setAudioLoadingMessageId(null);
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);
      };

      audio.onended = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        setIsAudioLoading(false);
        setAudioLoadingMessageId(null);
      };

      await audio.play();
    } catch (err) {
      console.warn("⚠ Falha ao carregar áudio:", err);
      setIsAudioLoading(false);
      setAudioLoadingMessageId(null);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const handleSelectVoice = async (voiceId: string, voiceName: string) => {
    setSelectedVoiceKey(voiceId);
    stopSpeaking();

    const testMessageId = "voice-preview-" + Date.now();
    const testPhrase = `Oi! Eu sou a Vic na versão ${voiceName}. Vamos treinar juntos hoje?`;

    await speakText(testPhrase, testMessageId, voiceId);
  };

  const toggleMicrophone = async () => {
    setMicPermissionError(null);
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setMicPermissionError("Seu navegador não oferece suporte ao reconhecimento de voz.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "pt-BR";
      recognition.continuous = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputPrompt(transcript);
      };

      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const quickClasses = [
    { classId: "pilates", name: "Pilates", time: "10:00", days: "Seg/Qua/Sex" },
    { classId: "spinning", name: "Spinning", time: "12:00", days: "Ter/Qui" },
    { classId: "fitdance", name: "FitDance", time: "19:00", days: "Seg/Qua" },
    { classId: "funcional", name: "Funcional", time: "18:30", days: "Ter/Qui" },
  ];

  const quickPrompts = [
    "Vic, agenda Pilates às 10:00 para mim",
    "Vic, agenda Spinning às 12:00",
    "Vic, marca FitDance às 19:00",
    "Vic, agenda Treino Funcional às 18:30",
    "Quanto tempo dura cada aula coletiva?",
    `Dicas de treino para nível ${user.trainingLevel}`,
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || inputPrompt).trim();
    if (!messageContent || isLoading) return;

    const userMessage: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputPrompt("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/vic/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
          user,
          bookedClasses,
          sessionId: currentSessionId, // Passa o sessionId para persistir no SQLite
        }),
      });

      const data = await response.json();
      let executedAction: ChatAction | undefined = undefined;

      if (data.action?.type === "BOOK_CLASS") {
        const res = onBookClass(data.action.classId, data.action.time);
        executedAction = { ...data.action, status: res.success ? "success" : "error", statusMessage: res.message };
      } else if (data.action?.type === "CANCEL_CLASS") {
        const found = bookedClasses.find((b) => b.classId === data.action.classId);
        if (found) {
          onCancelBooking(found.bookingId);
          executedAction = { ...data.action, status: "success", statusMessage: "Inscrição cancelada com sucesso." };
        }
      }

      const vicReply: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: data.reply || "Bora focar nos treinos! 💪",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: executedAction,
      };

      setMessages((prev) => [...prev, vicReply]);

      // Atualizar lista de sessões no estado local
      if (currentSessionId) {
        setSessions((prev) =>
          prev.map((s) =>
            s.id === currentSessionId && s.title === "Nova conversa com a Vic"
              ? { ...s, title: messageContent.substring(0, 25) + "..." }
              : s
          )
        );
      }

      if (autoSpeak) {
        setTimeout(() => speakText(vicReply.content, vicReply.id, selectedVoiceKey), 100);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg-" + Date.now(),
          role: "assistant",
          content: "Tive uma oscilação de rede, mas estou aqui com você! Como posso ajudar?",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleClearHistory = () => {
    stopSpeaking();
    handleCreateNewChat();
  };

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">
      {/* HEADER DA VIC */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00C0A3]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#00C0A3] shadow-lg shadow-[#00C0A3]/20 bg-[#1E1B24]">
                <img src="/foto_vicIA.png" alt="Vic IA" className="w-full h-full object-cover object-[center_20%]" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white tracking-tight">Vic • Assistente MoveFIT</h3>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00C0A3]/15 text-[#00C0A3] border border-[#00C0A3]/30">
                  {isListening ? "🎤 Ouvindo..." : isSpeaking ? "🔊 Falando..." : "Voz/Texto Ativo"}
                </span>
              </div>
              <p className="text-xs text-[#B0A8B9] mt-0.5">Sua personal trainer digital</p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
            <button
              onClick={() => setShowHistorySidebar((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-[#845EC2]/20 hover:bg-[#845EC2]/30 text-[#d6c7f7] border border-[#845EC2]/40 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <History className="w-3.5 h-3.5" /> Conversas Antigas
            </button>

            <button
              onClick={() => {
                setAutoSpeak((prev) => {
                  const next = !prev;
                  localStorage.setItem("vicAutoSpeak", String(next));
                  if (!next) stopSpeaking();
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                autoSpeak ? "bg-[#00C0A3]/15 border-[#00C0A3]/40 text-[#00C0A3]" : "bg-[#1E1B24] border-[#3E374C] text-[#B0A8B9]"
              }`}
            >
              {autoSpeak ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{autoSpeak ? "Voz Ativa" : "Voz Muta"}</span>
            </button>

            <button
              onClick={() => setShowVoiceSettings((prev) => !prev)}
              className="px-3 py-1.5 rounded-xl bg-[#1E1B24] border border-[#3E374C] text-[#B0A8B9] hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5" /> Vozes
            </button>

            <button
              onClick={handleClearHistory}
              className="px-3 py-1.5 rounded-xl bg-[#1E1B24] hover:bg-[#3E374C] text-[#B0A8B9] hover:text-white border border-[#3E374C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Chat
            </button>
          </div>
        </div>

        {/* PAINEL DE VOZES ELEVENLABS */}
        {showVoiceSettings && (
          <div className="mt-4 pt-4 border-t border-[#3E374C] space-y-3 animate-fadeIn">
            <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-[#00C0A3]" /> Vozes Disponíveis (ElevenLabs HD)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              {VIC_VOICES.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => handleSelectVoice(voice.id, voice.name)}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    selectedVoiceKey === voice.id ? "bg-[#00C0A3]/10 border-[#00C0A3]" : "bg-[#1E1B24] border-[#3E374C] hover:border-[#845EC2]/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{voice.emoji}</span>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">{voice.label}</p>
                      <p className="text-[10px] text-[#B0A8B9]">{voice.description}</p>
                    </div>
                    {selectedVoiceKey === voice.id && <Check className="w-4 h-4 text-[#00C0A3]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-[#3E374C] flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-[#B0A8B9] uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#00C0A3]" /> Contexto Ativo:
          </span>
          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">
            Nível: <strong className="text-white">{user.trainingLevel}</strong>
          </span>
          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">
            Aulas salvas: <strong className="text-[#00C0A3]">{bookedClasses.length} agendada(s)</strong>
          </span>
          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">
            Duração oficial: <strong className="text-white">50 minutos</strong>
          </span>
        </div>
      </div>

      {/* AULAS RÁPIDAS */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <CalendarCheck2 className="w-4 h-4 text-[#00C0A3]" /> Agende direto em 1 clique com a Vic:
          </span>
          <span className="text-[11px] text-[#B0A8B9]">Duração: 50 min cada</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {quickClasses.map((qc) => {
            const isAlreadyBooked = bookedClasses.some((b) => b.classId === qc.classId);
            return (
              <button
                key={qc.classId}
                onClick={() => handleSendMessage(`Vic, por favor agenda a aula de ${qc.name} às ${qc.time} para mim.`)}
                disabled={isLoading || isAlreadyBooked}
                className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all flex flex-col justify-between ${
                  isAlreadyBooked ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] cursor-default" : "bg-[#1E1B24] hover:bg-[#845EC2]/20 border-[#3E374C] text-zinc-200 cursor-pointer"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-bold">{qc.name}</span>
                  {isAlreadyBooked ? <Check className="w-3.5 h-3.5 text-[#00C0A3]" /> : <span className="text-[10px] text-[#00C0A3]">{qc.time}</span>}
                </div>
                <span className="text-[10px] text-zinc-400 mt-1">{isAlreadyBooked ? "Já agendada" : `${qc.days} • 50 min`}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CONTAINER PRINCIPAL DO CHAT + BARRA LATERAL DE HISTÓRICO */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* BARRA LATERAL DE HISTÓRICO (EXIBIDA/OCULTA VIA BOTÃO) */}
        {showHistorySidebar && (
          <div className="md:col-span-1 bg-[#292433] border border-[#3E374C] rounded-2xl p-4 shadow-xl flex flex-col h-[520px] overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-[#3E374C] pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-[#00C0A3]" /> Histórico
              </span>
              <button
                onClick={handleCreateNewChat}
                className="p-1 rounded-lg bg-[#00C0A3]/20 hover:bg-[#00C0A3]/30 text-[#00C0A3] text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Novo
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {sessions.length === 0 ? (
                <p className="text-[11px] text-zinc-500 text-center py-4">Nenhuma conversa anterior salva.</p>
              ) : (
                sessions.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSelectSession(s.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all truncate block cursor-pointer border ${
                      currentSessionId === s.id
                        ? "bg-[#845EC2]/20 border-[#845EC2] text-white font-semibold"
                        : "bg-[#1E1B24] border-[#3E374C] text-zinc-300 hover:bg-[#292433]"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5 text-[#00C0A3] shrink-0" />
                      <span className="truncate flex-1">{s.title}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* CHAT PRINCIPAL */}
        <div className={`bg-[#292433] border border-[#3E374C] rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden ${showHistorySidebar ? "md:col-span-3" : "md:col-span-4"}`}>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isVic = msg.role === "assistant";
              return (
                <div key={msg.id} className={`flex items-start gap-3 ${isVic ? "justify-start" : "justify-end"}`}>
                  {isVic && (
                    <div className="w-10 h-10 rounded-full border border-[#00C0A3]/50 shrink-0 mt-0.5 overflow-hidden bg-[#1E1B24]">
                      <img src="/foto_vicIA.png" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isVic ? "bg-[#1E1B24] border border-[#3E374C] text-zinc-100 shadow-md" : "bg-gradient-to-r from-[#845EC2] to-[#734db1] text-white shadow-md"}`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-[11px] font-bold tracking-wide opacity-80">{isVic ? "Vic (MoveFIT)" : "Você"}</span>
                      <span className="text-[10px] opacity-60">{msg.timestamp}</span>
                    </div>

                    {/* RENDERIZAÇÃO DA MENSAGEM DA VIC COM RENDERIZADOR INTERATIVO */}
                    {isVic ? (
                      (() => {
                        const { textContent, exercisesList } = parseVicMessageContent(msg.content);

                        return (
                          <div className="space-y-3">
                            <div className="whitespace-pre-wrap text-[13.5px]">{textContent}</div>

                            {exercisesList.length > 0 && (
                              <div className="mt-3 pt-3 border-t border-[#3E374C]">
                                <p className="text-[11px] font-bold text-[#00C0A3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5" /> Demonstrativos dos Movimentos:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  {exercisesList.map((exName, idx) => (
                                    <ExerciseCard key={idx} exerciseName={exName} />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="whitespace-pre-wrap text-[13.5px]">{msg.content}</div>
                    )}

                    {isVic && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">
                        {isAudioLoading && audioLoadingMessageId === msg.id ? (
                          <button disabled className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#845EC2]/20 text-[#cdb9ee] border border-[#845EC2]/30 text-[10px] font-semibold cursor-wait">
                            <Loader2 className="w-3 h-3 animate-spin text-[#cdb9ee]" /> Carregando áudio...
                          </button>
                        ) : speakingMessageId === msg.id ? (
                          <button onClick={stopSpeaking} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold cursor-pointer">
                            <Square className="w-3 h-3 fill-current" /> Parar
                          </button>
                        ) : (
                          <button onClick={() => speakText(msg.content, msg.id)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00C0A3]/10 hover:bg-[#00C0A3]/20 text-[#00C0A3] border border-[#00C0A3]/30 text-[10px] font-semibold cursor-pointer">
                            <Volume2 className="w-3 h-3" /> Ouvir
                          </button>
                        )}

                        {onSaveRecommendation && msg.id !== "msg-welcome" && (
                          <button
                            type="button"
                            onClick={() => handleToggleSaveRecommendation(msg)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                              isMessageSaved(msg) ? "bg-[#845EC2]/30 text-[#d6c7f7] border border-[#845EC2]/60" : "bg-[#292433] hover:bg-[#342f40] text-zinc-300 border border-[#3E374C]"
                            }`}
                          >
                            {isMessageSaved(msg) ? (
                              <>
                                <BookmarkCheck className="w-3 h-3 text-[#00C0A3]" />
                                <span>Salva no Perfil</span>
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3 h-3 text-zinc-400" />
                                <span>Salvar Recomendação</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {msg.action && (
                      <div className={`mt-3 p-3 rounded-xl border text-xs transition-all ${msg.action.status === "success" ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3]" : "bg-amber-500/10 border-amber-500/40 text-amber-300"}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-2.5">
                            {msg.action.status === "success" ? <CheckCircle2 className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" /> : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                            <div>
                              <p className="font-bold">{msg.action.status === "success" ? "✓ Aula Salva com Sucesso no Seu Cronograma!" : "Aviso sobre o Agendamento"}</p>
                              <p className="text-[11px] mt-0.5 text-zinc-200">{msg.action.statusMessage || `${msg.action.className} às ${msg.action.time}`}</p>
                              {msg.action.status === "success" && msg.action.type === "BOOK_CLASS" && (
                                <p className="text-[10px] text-[#00C0A3] font-medium mt-1">Duração oficial da aula: 50 minutos</p>
                              )}
                            </div>
                          </div>

                          {onNavigateToClasses && msg.action.status === "success" && (
                            <button onClick={onNavigateToClasses} className="shrink-0 px-2.5 py-1 rounded-lg bg-[#00C0A3] hover:bg-[#00a88f] text-black font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer">
                              Ver Grade <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {!isVic && (
                    <div className="w-8 h-8 rounded-xl bg-[#845EC2]/20 border border-[#845EC2]/40 flex items-center justify-center text-[#c8b2ed] shrink-0 mt-0.5">
                      <UserIcon className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-fadeIn">
                <div className="w-10 h-10 rounded-full border border-[#00C0A3]/50 shrink-0 overflow-hidden bg-[#1E1B24]">
                  <img src="/foto_vicIA.png" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
                </div>
                <div className="bg-[#1E1B24] border border-[#3E374C] rounded-2xl px-4 py-3 text-xs text-[#B0A8B9] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00C0A3]" />
                  <span>Vic está pensando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* SUGESTÕES */}
          <div className="p-3 bg-[#1E1B24]/70 border-t border-[#3E374C] overflow-x-auto no-scrollbar flex items-center gap-2">
            <span className="text-[10px] font-semibold text-[#B0A8B9] uppercase tracking-wider shrink-0 mr-1">Sugestões:</span>
            {quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                className="text-xs bg-[#292433] hover:bg-[#845EC2]/20 text-[#B0A8B9] hover:text-white border border-[#3E374C] px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* INPUT */}
          <div className="p-4 bg-[#1E1B24] border-t border-[#3E374C]">
            {micPermissionError && (
              <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-300">Permissão do Microfone</p>
                    <p className="text-[11px] text-zinc-300 mt-0.5">{micPermissionError}</p>
                  </div>
                </div>
                <button type="button" onClick={() => setMicPermissionError(null)} className="px-2.5 py-1 rounded-lg bg-[#292433] text-[#B0A8B9] text-[10px]">Fechar</button>
              </div>
            )}

            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMicrophone}
                disabled={isLoading}
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                  isListening ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" : "bg-[#292433] border-[#3E374C] text-[#B0A8B9] hover:text-white hover:border-[#00C0A3]/50 hover:bg-[#00C0A3]/10"
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                ref={inputRef}
                id="vic-chat-input"
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={isListening ? "Estou ouvindo..." : "Fale ou digite para a Vic..."}
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-[#292433] border border-[#3E374C] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm transition-all"
              />

              <button
                id="btn-send-vic-chat"
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                  inputPrompt.trim() && !isLoading ? "bg-gradient-to-r from-[#845EC2] to-[#00C0A3] text-white shadow-lg glow-turquoise hover:opacity-95" : "bg-[#292433] text-[#B0A8B9] border border-[#3E374C] opacity-50 cursor-not-allowed"
                }`}
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Enviar</span>
              </button>
            </form>

            <div className="mt-2 flex items-center justify-center gap-2">
              {isListening ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[10px] text-red-400">Vic está ouvindo você...</span>
                </>
              ) : isSpeaking ? (
                <>
                  <Volume2 className="w-3 h-3 text-[#845EC2]" />
                  <span className="text-[10px] text-[#B0A8B9]">Vic está falando...</span>
                  <button type="button" onClick={stopSpeaking} className="text-[10px] text-[#00C0A3] hover:underline">Parar</button>
                </>
              ) : (
                <>
                  <Mic className="w-3 h-3 text-[#B0A8B9]" />
                  <span className="text-[10px] text-[#B0A8B9]">Clique no microfone para falar com a Vic</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#292433] border border-[#00C0A3]/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-[#00C0A3] shrink-0" />
          <span className="text-xs font-semibold">{toastNotification}</span>
          {onNavigateToProfile && (
            <button onClick={onNavigateToProfile} className="ml-2 px-2.5 py-1 rounded-lg bg-[#00C0A3]/15 hover:bg-[#00C0A3]/25 text-[#00C0A3] text-xs font-bold transition-colors cursor-pointer">
              Ver Perfil →
            </button>
          )}
        </div>
      )}
    </div>
  );
};