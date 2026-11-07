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
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Check,
  CalendarCheck2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Loader2,
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
  onBookClass: (classId: string, time: string) => { success: boolean; message: string };
  onCancelBooking: (bookingId: string) => void;
  onNavigateToClasses?: () => void;
  savedRecommendations?: SavedRecommendation[];
  onSaveRecommendation?: (rec: Omit<SavedRecommendation, "id" | "savedAt" | "userId">) => void;
  onRemoveRecommendation?: (recId: string) => void;
  onNavigateToProfile?: () => void;
}

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
  
  const portugueseName =
    EXERCISE_TRANSLATIONS[cleanKey] ||
    EXERCISE_TRANSLATIONS[exerciseName.toLowerCase()] ||
    cleanKey
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

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
  const currentUserId = user?.id || (user as any)?._id || "";

  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Array<{ id: string; title: string; createdAt: string }>>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [showHistorySidebar, setShowHistorySidebar] = useState(false);

  const parseVicMessageContent = (content: string) => {
    const match = content.match(/\[EXERCISES:\s*(.*?)\]/i);
    if (!match) return { textContent: content, exercisesList: [] };

    const textContent = content.replace(/\[EXERCISES:\s*.*?\]/gi, "").trim();
    const exercisesList = match[1].split(",").map((e) => e.trim()).filter(Boolean);
    return { textContent, exercisesList };
  };

  const detectRecommendationCategory = (text: string): RecommendationCategory => {
    const lower = text.toLowerCase();
    if (lower.includes("aqueciment") || lower.includes("esteira") || lower.includes("mobilidade")) return "aquecimento";
    if (lower.includes("treino") || lower.includes("série") || lower.includes("agachamento")) return "treino";
    if (lower.includes("execu") || lower.includes("exercício") || lower.includes("postura")) return "exercicio";
    return "geral";
  };

  const extractRecommendationTitle = (text: string, category: RecommendationCategory): string => {
    const firstLine = text.trim().split("\n")[0].replace(/[#*•-]/g, "").trim();
    if (firstLine.length > 5 && firstLine.length <= 50) return firstLine;
    return category === "aquecimento" ? "Aquecimento MoveFIT" : category === "treino" ? `Treino (${user.trainingLevel})` : "Recomendação da Vic";
  };

  const isMessageSaved = (msg: ChatMessage) => {
    if (!savedRecommendations) return false;
    return savedRecommendations.some((r) => r.sourceMessageId === msg.id || (r.content && r.content.trim() === msg.content.trim()));
  };

  const handleToggleSaveRecommendation = (msg: ChatMessage) => {
    const existing = savedRecommendations?.find((r) => r.sourceMessageId === msg.id || (r.content && r.content.trim() === msg.content.trim()));

    if (existing && onRemoveRecommendation) {
      onRemoveRecommendation(existing.id);
      setToastNotification("Recomendação removida dos salvos.");
      setTimeout(() => setToastNotification(null), 3000);
      return;
    }

    if (onSaveRecommendation) {
      const category = detectRecommendationCategory(msg.content);
      const title = extractRecommendationTitle(msg.content, category);
      onSaveRecommendation({ title, category, content: msg.content, sourceMessageId: msg.id });
      setToastNotification("Recomendação salva no seu Perfil! ✨");
      setTimeout(() => setToastNotification(null), 4000);
    }
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const bookedText = bookedClasses.length > 0 ? `Você tem **${bookedClasses.length} aula(s)** agendada(s)!` : "Nenhuma aula agendada no momento.";
    const userWeight = user.weight ? `${user.weight} kg` : "não informado";
    const userHeight = user.height ? `${user.height} cm` : "não informada";

    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Oi, ${user.fullName.split(" ")[0]}! Sou a Vic, sua personal trainer na MoveFIT! 💪✨\n\nPerfil carregado: nível **${user.trainingLevel}**, peso **${userWeight}**, altura **${userHeight}**, obs médica: "${user.medicalNotes}" e ${bookedText}\n\nComo posso ajudar você hoje?`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedVoiceKey] = useState<string>(() => localStorage.getItem("vicVoiceKey") || "bella");
  const [autoSpeak] = useState<boolean>(() => localStorage.getItem("vicAutoSpeak") !== "false");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioLoadingMessageId, setAudioLoadingMessageId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUserId) {
      fetch(`/api/vic/sessions/${currentUserId}`)
        .then((res) => (res.ok ? res.json() : []))
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
  }, [currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleCreateNewChat = async () => {
    if (!currentUserId) return;
    try {
      const res = await fetch("/api/vic/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUserId, title: "Nova conversa com a Vic" }),
      });
      const newSession = await res.json();
      if (newSession?.id) {
        setSessions((prev) => [newSession, ...prev]);
        setCurrentSessionId(newSession.id);
        setMessages([
          {
            id: "msg-welcome-" + Date.now(),
            role: "assistant",
            content: `Nova conversa iniciada, ${user.fullName.split(" ")[0]}! 🌟\n\nO que vamos treinar hoje?`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (e) {
      console.error("Erro ao criar nova sessão:", e);
    }
  };

  const handleSelectSession = async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    stopSpeaking();
    try {
      const res = await fetch(`/api/vic/messages/${sessionId}`);
      if (!res.ok) return;
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
      console.error("Erro ao carregar mensagens:", e);
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

  const speakText = async (text: string, messageId: string) => {
    stopSpeaking();
    setIsAudioLoading(true);
    setAudioLoadingMessageId(messageId);

    try {
      const response = await fetch("/api/vic/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoiceKey }),
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
        if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        setIsAudioLoading(false);
        setAudioLoadingMessageId(null);
      };

      await audio.play();
    } catch (err) {
      setIsAudioLoading(false);
      setAudioLoadingMessageId(null);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
    }
  };

  const toggleMicrophone = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

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
        setInputPrompt(event.results[0][0].transcript);
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
          userId: currentUserId,
          sessionId: currentSessionId,
        }),
      });

      if (!response.ok) throw new Error("Erro no servidor.");

      const data = await response.json();
      let executedAction: ChatAction | undefined = undefined;

      if (data.action?.type === "BOOK_CLASS" && data.action?.status === "success") {
        onBookClass(data.action.classId, data.action.time);
        executedAction = data.action;
      } else if (data.action?.type === "CANCEL_CLASS") {
        const found = bookedClasses.find((b) => b.classId === data.action.classId);
        if (found) {
          onCancelBooking(found.bookingId || (found as any).id);
          executedAction = { ...data.action, status: "success", statusMessage: "Inscrição cancelada com sucesso." };
        }
      }

      const replyText = data.response || "Com certeza! Vamos focar nos seus resultados! 💪";

      const vicReply: ChatMessage = {
        id: "msg-" + Date.now(),
        role: "assistant",
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        action: executedAction,
      };

      setMessages((prev) => [...prev, vicReply]);

      if (autoSpeak) {
        setTimeout(() => speakText(vicReply.content, vicReply.id), 100);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: "msg-" + Date.now(),
          role: "assistant",
          content: "Tive uma oscilação na conexão. Tente de novo em instantes!",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  return (
    <div className="space-y-5 pb-12 max-w-5xl mx-auto">
      {/* HEADER DA VIC */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden border-2 border-[#00C0A3] shadow-lg bg-[#1E1B24]">
              <img src="/assets/foto_vicIA.png" alt="Vic IA" className="w-full h-full object-cover object-[center_20%]" />
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
              onClick={handleCreateNewChat}
              className="px-3 py-1.5 rounded-xl bg-[#1E1B24] hover:bg-[#3E374C] text-[#B0A8B9] hover:text-white border border-[#3E374C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Chat
            </button>
          </div>
        </div>
      </div>

      {/* AULAS RÁPIDAS */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
            <CalendarCheck2 className="w-4 h-4 text-[#00C0A3]" /> Agende direto em 1 clique com a Vic:
          </span>
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

      {/* CHAT CONTAINER */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {showHistorySidebar && (
          <div className="md:col-span-1 bg-[#292433] border border-[#3E374C] rounded-2xl p-4 shadow-xl flex flex-col h-[520px] overflow-hidden">
            <div className="flex items-center justify-between mb-3 border-b border-[#3E374C] pb-2">
              <span className="text-xs font-bold text-white flex items-center gap-1.5 uppercase tracking-wider">
                <History className="w-3.5 h-3.5 text-[#00C0A3]" /> Histórico
              </span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSelectSession(s.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all truncate block cursor-pointer border ${
                    currentSessionId === s.id ? "bg-[#845EC2]/20 border-[#845EC2] text-white font-semibold" : "bg-[#1E1B24] border-[#3E374C] text-zinc-300"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-3.5 h-3.5 text-[#00C0A3] shrink-0" />
                    <span className="truncate flex-1">{s.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={`bg-[#292433] border border-[#3E374C] rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden ${showHistorySidebar ? "md:col-span-3" : "md:col-span-4"}`}>
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((msg) => {
              const isVic = msg.role === "assistant";
              return (
                <div key={msg.id} className={`flex items-start gap-3 ${isVic ? "justify-start" : "justify-end"}`}>
                  {isVic && (
                    <div className="w-10 h-10 rounded-full border border-[#00C0A3]/50 shrink-0 mt-0.5 overflow-hidden bg-[#1E1B24]">
                      <img src="/assets/foto_vicIA.png" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
                    </div>
                  )}

                  <div className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${isVic ? "bg-[#1E1B24] border border-[#3E374C] text-zinc-100 shadow-md" : "bg-gradient-to-r from-[#845EC2] to-[#734db1] text-white shadow-md"}`}>
                    <div className="flex items-center justify-between gap-4 mb-1">
                      <span className="text-[11px] font-bold tracking-wide opacity-80">{isVic ? "Vic (MoveFIT)" : "Você"}</span>
                      <span className="text-[10px] opacity-60">{msg.timestamp}</span>
                    </div>

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
                            <CheckCircle2 className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold">✓ Aula Salva com Sucesso no Seu Cronograma!</p>
                              <p className="text-[11px] mt-0.5 text-zinc-200">{msg.action.statusMessage || `${msg.action.className} às ${msg.action.time}`}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-start gap-3 justify-start animate-fadeIn">
                <div className="w-10 h-10 rounded-full border border-[#00C0A3]/50 shrink-0 overflow-hidden bg-[#1E1B24]">
                  <img src="/assets/foto_vicIA.png" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
                </div>
                <div className="bg-[#1E1B24] border border-[#3E374C] rounded-2xl px-4 py-3 text-xs text-[#B0A8B9] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00C0A3]" />
                  <span>Vic está pensando...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-[#1E1B24] border-t border-[#3E374C]">
            <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMicrophone}
                className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                  isListening ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse" : "bg-[#292433] border-[#3E374C] text-[#B0A8B9] hover:text-white"
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>

              <input
                ref={inputRef}
                type="text"
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder="Fale ou digite para a Vic..."
                disabled={isLoading}
                className="flex-1 px-4 py-3 bg-[#292433] border border-[#3E374C] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] text-sm"
              />
              <button
                type="submit"
                disabled={!inputPrompt.trim() || isLoading}
                className="px-5 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-[#845EC2] to-[#00C0A3] text-white shadow-lg cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#292433] border border-[#00C0A3]/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-[#00C0A3] shrink-0" />
          <span className="text-xs font-semibold">{toastNotification}</span>
        </div>
      )}
    </div>
  );
};