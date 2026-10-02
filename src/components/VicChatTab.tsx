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
  Zap,
  Bookmark,
  BookmarkCheck,
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

/* ============================================================
   TIPOS DA WEB SPEECH API
============================================================ */

interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult:
    | ((event: SpeechRecognitionEventLike) => void)
    | null;
  onerror:
    | ((event: SpeechRecognitionErrorEventLike) => void)
    | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

/* ============================================================
   VOZES
============================================================ */

const VIC_VOICES = [
  {
    id: "jovem",
    name: "Kore",
    label: "Vic Energética",
    description: "Jovem, acolhedora e animada",
    emoji: "🩷",
  },
  {
    id: "amigavel",
    name: "Zephyr",
    label: "Vic Natural",
    description: "Espontânea, clara e amigável",
    emoji: "✨",
  },
  {
    id: "calorosa",
    name: "Charon",
    label: "Vic Tranquila",
    description: "Calma, atenciosa e equilibrada",
    emoji: "🌸",
  },
  {
    id: "animada",
    name: "Puck",
    label: "Vic Motivadora",
    description: "Dinâmica e alto astral",
    emoji: "🔥",
  },
];

/* ============================================================
   COMPONENTE
============================================================ */

export const VicChatTab: React.FC<VicChatTabProps> = ({
  user,
  bookedClasses,
  classes,
  onBookClass,
  onCancelBooking,
  onNavigateToClasses,
  savedRecommendations = [],
  onSaveRecommendation,
  onRemoveRecommendation,
  onNavigateToProfile,
}) => {
  /* ==========================================================
     RECOMENDAÇÕES SALVAS & TOAST NOTIFICATION
  ========================================================== */

  const [toastNotification, setToastNotification] = useState<string | null>(null);

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

  /* ==========================================================
     MENSAGENS
  ========================================================== */

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const bookedText =
      bookedClasses.length > 0
        ? `Vi que você já tem **${bookedClasses.length} aula(s)** salvas no seu cronograma!`
        : "Vi que você ainda não agendou aulas para esta semana.";

    return [
      {
        id: "msg-welcome",
        role: "assistant",
        content: `Oie, ${user.fullName.split(" ")[0]}! Sou a Vic, sua assistente virtual e treinadora da MoveFIT! 💪✨

Estou a par de tudo: seu nível é **${user.trainingLevel}**, sua observação médica é "${user.medicalNotes}" e ${bookedText}

⚡ **Você pode agendar aulas diretamente comigo aqui no chat!** Basta me dizer algo como: *"Vic, agenda spinning às 12:00 para mim"* ou usar os botões rápidos de agendamento abaixo. Todas as nossas aulas coletivas duram rigorosamente **50 minutos**! O que vamos agendar hoje?`,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* ==========================================================
     VOZ
  ========================================================== */

  const [selectedVoice, setSelectedVoice] = useState(() => {
    return localStorage.getItem("vicVoice") || "jovem";
  });

  const [voiceEngine, setVoiceEngine] = useState<"instant" | "gemini">(() => {
    return (localStorage.getItem("vicVoiceEngine") as any) || "instant";
  });

  const [autoSpeak, setAutoSpeak] = useState<boolean>(() => {
    return localStorage.getItem("vicAutoSpeak") !== "false";
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] =
    useState<string | null>(null);

  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioLoadingMessageId, setAudioLoadingMessageId] =
    useState<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [micPermissionError, setMicPermissionError] =
    useState<string | null>(null);

  const [showVoiceSettings, setShowVoiceSettings] =
    useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  /* ==========================================================
     PRE-CARREGAMENTO DE VOZES E DESBLOQUEIO DE ÁUDIO
  ========================================================== */

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const preload = () => {
        window.speechSynthesis.getVoices();
      };
      preload();
      window.speechSynthesis.onvoiceschanged = preload;
    }
  }, []);

  const primeAudioContext = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.resume();
      } catch {}
    }
  };

  /* ==========================================================
     REFS
  ========================================================== */

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const inputRef =
    useRef<HTMLInputElement>(null);

  /* ==========================================================
     VERIFICAR MICROFONE
  ========================================================== */

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    const recognition =
      new SpeechRecognition() as SpeechRecognitionLike;

    recognition.lang = "pt-BR";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      setMicPermissionError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      setIsListening(false);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        console.warn(
          "Acesso ao microfone não concedido pelo navegador:",
          event.error
        );

        setMicPermissionError(
          "O navegador não concedeu acesso ao microfone. Conceda a permissão nas configurações do site (ícone de cadeado na barra de endereços) ou abra o app em uma nova aba para falar com a Vic."
        );
      } else if (event.error === "no-speech") {
        // Silêncio temporário, comportamento normal
      } else if (event.error === "aborted") {
        // Cancelamento normal
      } else {
        console.warn(
          "Aviso no reconhecimento de voz:",
          event.error
        );
      }
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0].transcript;
      }

      setInputPrompt(transcript.trim());
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignora se já estiver parado
      }
    };
  }, []);

  /* ==========================================================
     AUTO SCROLL
  ========================================================== */

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  /* ==========================================================
     SALVAR VOZ
  ========================================================== */

  useEffect(() => {
    localStorage.setItem(
      "vicVoice",
      selectedVoice
    );
  }, [selectedVoice]);

  /* ==========================================================
     PARAR ÁUDIO
  ========================================================== */

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignora se não estiver sintetizando
      }
    }

    utteranceRef.current = null;
    setIsAudioLoading(false);
    setAudioLoadingMessageId(null);
    setIsSpeaking(false);
    setSpeakingMessageId(null);
  };

  /* ==========================================================
     LIMPEZA DE TEXTO PARA FALA
  ========================================================== */

  const cleanTextForSpeech = (rawText: string): string => {
    return rawText
      .replace(/https?:\/\/\S+/g, "")
      .replace(
        /[\u{1F600}-\u{1F64F}|\u{1F300}-\u{1F5FF}|\u{1F680}-\u{1F6FF}|\u{2600}-\u{26FF}|\u{2700}-\u{27BF}]/gu,
        ""
      )
      .replace(/[*_~`#>-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  /* ==========================================================
     SÍNTESE NATIVA DO NAVEGADOR (INSTANTÂNEA / 0s DELAY)
  ========================================================== */

  const playBrowserSpeech = (text: string, messageId: string): boolean => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return false;
    }

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const cleaned = cleanTextForSpeech(text);
      if (!cleaned) return false;

      // Mantém fala ágil e conversacional
      const spokenPart =
        cleaned.length > 350 ? cleaned.slice(0, 347) + "..." : cleaned;

      const utterance = new SpeechSynthesisUtterance(spokenPart);
      utterance.lang = "pt-BR";
      utterance.rate = 1.06;
      utterance.pitch = 1.04;

      const voices = window.speechSynthesis.getVoices();
      const brVoice =
        voices.find((v) => v.lang === "pt-BR" || v.lang === "pt_BR") ||
        voices.find(
          (v) =>
            v.name.toLowerCase().includes("brazil") ||
            v.name.toLowerCase().includes("brasil")
        ) ||
        voices.find((v) => v.lang.startsWith("pt")) ||
        voices[0];

      if (brVoice) {
        utterance.voice = brVoice;
      }

      utterance.onstart = () => {
        setIsAudioLoading(false);
        setAudioLoadingMessageId(null);
        setIsSpeaking(true);
        setSpeakingMessageId(messageId);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        utteranceRef.current = null;
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        setSpeakingMessageId(null);
        utteranceRef.current = null;
      };

      utteranceRef.current = utterance;
      setIsAudioLoading(false);
      setAudioLoadingMessageId(null);
      setIsSpeaking(true);
      setSpeakingMessageId(messageId);

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn("Erro ao sintetizar voz nativa:", err);
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      return false;
    }
  };

  /* ==========================================================
     FALAR COM A VIC (INSTANTÂNEO OU GEMINI HD COM TIMEOUT)
  ========================================================== */

  const speakText = async (
    text: string,
    messageId: string,
    forceEngine?: "instant" | "gemini"
  ) => {
    stopSpeaking();
    primeAudioContext();

    const engineToUse = forceEngine || voiceEngine;

    // Se o modo for Instantâneo (padrão): fala imediatamente com 0s de espera
    if (engineToUse === "instant") {
      playBrowserSpeech(text, messageId);
      return;
    }

    // Modo Estúdio IA (Gemini HD):
    setIsAudioLoading(true);
    setAudioLoadingMessageId(messageId);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 3200);

    try {
      const response = await fetch("/api/vic/speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          voice: selectedVoice,
          accent: "pt-BR-natural",
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Status ${response.status}`);
      }

      const audioBlob = await response.blob();

      if (!audioBlob.size) {
        throw new Error("O áudio retornado está vazio.");
      }

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
        console.warn(
          "Aviso ao reproduzir áudio Gemini TTS, usando voz nativa do navegador..."
        );
        setIsAudioLoading(false);
        setAudioLoadingMessageId(null);
        playBrowserSpeech(text, messageId);
      };

      await audio.play();
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn(
        "Gemini TTS demorou ou falhou, ativando voz instantânea do navegador:",
        error
      );
      setIsAudioLoading(false);
      setAudioLoadingMessageId(null);
      playBrowserSpeech(text, messageId);
    }
  };

  /* ==========================================================
     MICROFONE
  ========================================================== */

  const toggleMicrophone = async () => {
    setMicPermissionError(null);

    if (!speechSupported) {
      setMicPermissionError(
        "Seu navegador não oferece suporte ao reconhecimento de voz. Você pode digitar normalmente ou usar Google Chrome / Microsoft Edge."
      );
      return;
    }

    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignora se já estiver parado
      }

      setIsListening(false);
      return;
    }

    // Tenta solicitar permissão limpa via getUserMedia para acionar o prompt nativo do navegador
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        // Libera a trilha imediatamente para a Web Speech API assumir
        stream.getTracks().forEach((track) => track.stop());
      } catch (err: any) {
        if (
          err?.name === "NotAllowedError" ||
          err?.name === "PermissionDeniedError"
        ) {
          console.warn("Acesso ao microfone negado:", err);
          setMicPermissionError(
            "Permissão do microfone negada. Clique no ícone de cadeado na barra de endereços do navegador para permitir o microfone, ou abra o app em uma nova aba para falar com a Vic."
          );
          setIsListening(false);
          return;
        }
      }
    }

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      console.warn(
        "Aviso ao inicializar o microfone:",
        error?.message || error
      );
    }
  };

  /* ==========================================================
     SUGESTÕES
  ========================================================== */

  const quickPrompts = [
    "Vic, agenda Pilates às 10:00 para mim",
    "Vic, agenda Spinning às 12:00",
    "Vic, marca FitDance às 19:00",
    "Vic, agenda Treino Funcional às 18:30",
    "Quanto tempo dura cada aula coletiva?",
    `Dicas de treino para nível ${user.trainingLevel}`,
  ];

  /* ==========================================================
     AULAS RÁPIDAS
  ========================================================== */

  const quickClasses = [
    {
      classId: "pilates",
      name: "Pilates",
      time: "10:00",
      days: "Seg/Qua/Sex",
    },
    {
      classId: "spinning",
      name: "Spinning",
      time: "12:00",
      days: "Ter/Qui",
    },
    {
      classId: "fitdance",
      name: "FitDance",
      time: "19:00",
      days: "Seg/Qua",
    },
    {
      classId: "funcional",
      name: "Funcional",
      time: "18:30",
      days: "Ter/Qui",
    },
  ];

  /* ==========================================================
     FALLBACK DE AGENDAMENTO
  ========================================================== */

  const detectClientBooking = (
    text: string
  ) => {
    const lower =
      text.toLowerCase();

    const isBooking =
      lower.includes("agenda") ||
      lower.includes("marca") ||
      lower.includes("reserva") ||
      lower.includes("quero fazer") ||
      lower.includes("inscrever");

    if (!isBooking) return null;

    if (lower.includes("pilates")) {
      const time =
        lower.includes("07")
          ? "07:00"
          : lower.includes("18")
          ? "18:00"
          : "10:00";

      return {
        classId: "pilates",
        time,
        className: "Pilates",
      };
    }

    if (
      lower.includes("spinning") ||
      lower.includes("bike")
    ) {
      const time =
        lower.includes("06") ||
        lower.includes("6:30")
          ? "06:30"
          : lower.includes("19")
          ? "19:30"
          : "12:00";

      return {
        classId: "spinning",
        time,
        className: "Spinning",
      };
    }

    if (
      lower.includes("fitdance") ||
      lower.includes("dança") ||
      lower.includes("danca")
    ) {
      const time =
        lower.includes("11")
          ? "11:00"
          : "19:00";

      return {
        classId: "fitdance",
        time,
        className: "FitDance",
      };
    }

    if (
      lower.includes("funcional")
    ) {
      const time =
        lower.includes("07")
          ? "07:30"
          : lower.includes("17")
          ? "17:30"
          : "18:30";

      return {
        classId: "funcional",
        time,
        className:
          "Treino Funcional",
      };
    }

    return null;
  };

  /* ==========================================================
     ENVIAR MENSAGEM
  ========================================================== */

  const handleSendMessage = async (
    textToSend?: string
  ) => {
    primeAudioContext();

    const messageContent =
      (
        textToSend ||
        inputPrompt
      ).trim();

    if (
      !messageContent ||
      isLoading
    ) {
      return;
    }

    const userMessage: ChatMessage = {
      id:
        "msg-" +
        Date.now(),

      role: "user",

      content:
        messageContent,

      timestamp:
        new Date().toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setInputPrompt("");
    setIsLoading(true);

    try {
      const response =
        await fetch(
          "/api/vic/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              message:
                messageContent,

              history:
                messages.map(
                  (m) => ({
                    role:
                      m.role,
                    content:
                      m.content,
                  })
                ),

              user: {
                fullName:
                  user.fullName,

                trainingLevel:
                  user.trainingLevel,

                medicalNotes:
                  user.medicalNotes,

                bookedClasses:
                  bookedClasses.map(
                    (b) => ({
                      className:
                        b.className,

                      schedule:
                        `${b.days} às ${b.time}`,
                    })
                  ),
              },
            }),
          }
        );

      let data: any = null;

      if (response.ok) {
        data =
          await response.json();
      } else {
        console.error(
          "Erro HTTP no chat:",
          response.status
        );
      }

      /* ======================================================
         ACTION
      ====================================================== */

      let actionToExecute =
        data?.action;

      if (!actionToExecute) {
        const clientDetected =
          detectClientBooking(
            messageContent
          );

        if (clientDetected) {
          actionToExecute = {
            type: "BOOK_CLASS",
            classId:
              clientDetected.classId,
            time:
              clientDetected.time,
            className:
              clientDetected.className,
          };
        }
      }

      let executedAction:
        | ChatAction
        | undefined =
        undefined;

      /* ======================================================
         EXECUTAR AGENDAMENTO
      ====================================================== */

      if (actionToExecute) {
        if (
          actionToExecute.type ===
            "BOOK_CLASS" &&
          actionToExecute.classId &&
          actionToExecute.time
        ) {
          const bookingResult =
            onBookClass(
              actionToExecute.classId,
              actionToExecute.time
            );

          executedAction = {
            type: "BOOK_CLASS",
            classId:
              actionToExecute.classId,
            className:
              actionToExecute.className,
            time:
              actionToExecute.time,
            status:
              bookingResult.success
                ? "success"
                : "error",
            statusMessage:
              bookingResult.message,
          };
        }

        else if (
          actionToExecute.type ===
            "CANCEL_CLASS" &&
          actionToExecute.classId
        ) {
          const foundBooking =
            bookedClasses.find(
              (b) =>
                b.classId ===
                actionToExecute.classId
            );

          if (foundBooking) {
            onCancelBooking(
              foundBooking.bookingId
            );

            executedAction = {
              type:
                "CANCEL_CLASS",

              classId:
                actionToExecute.classId,

              className:
                actionToExecute.className,

              status:
                "success",

              statusMessage:
                `Inscrição em ${
                  actionToExecute.className ||
                  "aula"
                } cancelada com sucesso.`,
            };
          } else {
            executedAction = {
              type:
                "CANCEL_CLASS",

              classId:
                actionToExecute.classId,

              className:
                actionToExecute.className,

              status:
                "error",

              statusMessage:
                `Você não está inscrito(a) na aula de ${
                  actionToExecute.className ||
                  "esta aula"
                }.`,
            };
          }
        }
      }

      /* ======================================================
         RESPOSTA DA VIC
      ====================================================== */

      const vicContent =
        data?.reply ||
        (
          executedAction?.status ===
          "success"
            ? `Prontinho, ${
                user.fullName.split(
                  " "
                )[0]
              }! Agendei sua vaga em ${
                executedAction.className
              } às ${
                executedAction.time
              }. Duração oficial de 50 minutos. Te vejo lá! 💪✨`

            : `Oi ${
                user.fullName.split(
                  " "
                )[0]
              }! Bora com foco total! Lembre-se que todas as aulas coletivas duram exatamente 50 minutos!`
        );

      const vicReply:
        ChatMessage = {
        id:
          "msg-" +
          Date.now(),

        role: "assistant",

        content:
          vicContent,

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),

        action:
          executedAction,
      };

      setMessages((prev) => [
        ...prev,
        vicReply,
      ]);

      /* ======================================================
         FAZER A VIC FALAR AUTOMATICAMENTE (SE HABILITADO)
      ====================================================== */

      if (autoSpeak) {
        setTimeout(() => {
          speakText(
            vicContent,
            vicReply.id
          );
        }, 60);
      }

    } catch (err: any) {
      console.error(
        "Erro na comunicação com a Vic:",
        err
      );

      /* ======================================================
         FALLBACK OFFLINE
      ====================================================== */

      const clientDetected =
        detectClientBooking(
          messageContent
        );

      let executedAction:
        | ChatAction
        | undefined =
        undefined;

      if (clientDetected) {
        const result =
          onBookClass(
            clientDetected.classId,
            clientDetected.time
          );

        executedAction = {
          type:
            "BOOK_CLASS",

          classId:
            clientDetected.classId,

          className:
            clientDetected.className,

          time:
            clientDetected.time,

          status:
            result.success
              ? "success"
              : "error",

          statusMessage:
            result.message,
        };
      }

      const fallbackReply:
        ChatMessage = {
        id:
          "msg-" +
          Date.now(),

        role:
          "assistant",

        content:
          executedAction
            ? `Agendamento processado! Sua vaga em ${executedAction.className} às ${executedAction.time} foi registrada. Lembre-se: todas as aulas coletivas duram rigorosamente 50 minutos! 💪🔥`

            : `Oi ${
                user.fullName.split(
                  " "
                )[0]
              }! Tive uma oscilação de rede, mas estou aqui! Todas as nossas aulas coletivas duram 50 minutos. Bora treinar! 🔥`,

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),

        action:
          executedAction,
      };

      setMessages((prev) => [
        ...prev,
        fallbackReply,
      ]);

      if (autoSpeak) {
        setTimeout(() => {
          speakText(
            fallbackReply.content,
            fallbackReply.id
          );
        }, 60);
      }

    } finally {
      setIsLoading(false);

      setTimeout(
        () =>
          inputRef.current?.focus(),
        100
      );
    }
  };

  /* ==========================================================
     AGENDAMENTO RÁPIDO
  ========================================================== */

  const handleQuickBook = (
    classId: string,
    time: string,
    className: string
  ) => {
    handleSendMessage(
      `Vic, por favor agenda a aula de ${className} às ${time} para mim.`
    );
  };

  /* ==========================================================
     LIMPAR HISTÓRICO
  ========================================================== */

  const handleClearHistory = () => {
    stopSpeaking();

    setMessages([
      {
        id:
          "msg-welcome-reset",

        role:
          "assistant",

        content:
          `Conversa reiniciada, ${
            user.fullName.split(
              " "
            )[0]
          }! 🌟 Pronta para agendar suas aulas de 50 minutos e tirar dúvidas sobre treinos. O que deseja agendar?`,

        timestamp:
          new Date().toLocaleTimeString(
            [],
            {
              hour: "2-digit",
              minute: "2-digit",
            }
          ),
      },
    ]);
  };

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <div className="space-y-5 pb-12 max-w-4xl mx-auto">

      {/* ======================================================
          HEADER DA VIC
      ====================================================== */}

      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 shadow-xl relative overflow-hidden">

        <div className="absolute top-0 right-0 w-48 h-48 bg-[#00C0A3]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

          <div className="flex items-center gap-3.5">

            <div className="relative shrink-0">

              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#00C0A3] shadow-lg shadow-[#00C0A3]/20 bg-[#1E1B24]">

                <img
                  src="/foto_vic.jpeg"
                  alt="Vic IA - Assistente MoveFIT"
                  className="w-full h-full object-cover object-[center_20%]"
                  referrerPolicy="no-referrer"
                />

              </div>

              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-[#292433] rounded-full shadow ${
                  isListening
                    ? "bg-red-500 animate-pulse"
                    : isSpeaking
                    ? "bg-[#845EC2] animate-pulse"
                    : "bg-emerald-500"
                }`}
                title={
                  isListening
                    ? "Vic está ouvindo"
                    : isSpeaking
                    ? "Vic está falando"
                    : "Vic Online"
                }
              />

            </div>

            <div>

              <div className="flex items-center gap-2 flex-wrap">

                <h3 className="text-lg font-bold text-white tracking-tight">
                  Vic • Assistente & Agendamento MoveFIT
                </h3>

                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#00C0A3]/15 text-[#00C0A3] border border-[#00C0A3]/30">

                  {isListening
                    ? "🎤 Ouvindo..."
                    : isSpeaking
                    ? "🔊 Falando..."
                    : "Voz/Texto Ativo"}

                </span>

              </div>

              <p className="text-xs text-[#B0A8B9] mt-0.5">
                Fale com a Vic pelo microfone ou digite sua mensagem.
              </p>

            </div>

          </div>

          <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">

            {/* TOGGLE FALA AUTOMÁTICA */}
            <button
              onClick={() => {
                primeAudioContext();
                setAutoSpeak((prev) => {
                  const next = !prev;
                  localStorage.setItem("vicAutoSpeak", String(next));
                  if (!next) stopSpeaking();
                  return next;
                });
              }}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                autoSpeak
                  ? "bg-[#00C0A3]/15 border-[#00C0A3]/40 text-[#00C0A3] hover:bg-[#00C0A3]/25"
                  : "bg-[#1E1B24] border-[#3E374C] text-[#B0A8B9] hover:text-white"
              }`}
              title={
                autoSpeak
                  ? "Voz automática ativada (clique para silenciar)"
                  : "Voz silenciada (clique para falar automaticamente)"
              }
            >
              {autoSpeak ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-[#00C0A3]" />
                  <span className="hidden xs:inline">Voz Ativa</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden xs:inline">Voz Muta</span>
                </>
              )}
            </button>

            {/* CONFIGURAÇÃO DA VOZ */}

            <button
              onClick={() =>
                setShowVoiceSettings(
                  (prev) => !prev
                )
              }
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showVoiceSettings
                  ? "bg-[#845EC2]/20 border-[#845EC2]/50 text-white"
                  : "bg-[#1E1B24] border-[#3E374C] text-[#B0A8B9] hover:text-white"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Configurar Voz
            </button>

            {onNavigateToClasses && (
              <button
                onClick={
                  onNavigateToClasses
                }
                className="px-3 py-1.5 rounded-xl bg-[#00C0A3]/10 hover:bg-[#00C0A3]/20 text-[#00C0A3] border border-[#00C0A3]/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                Ver Minha Grade
              </button>
            )}

            <button
              onClick={
                handleClearHistory
              }
              className="px-3 py-1.5 rounded-xl bg-[#1E1B24] hover:bg-[#3E374C] text-[#B0A8B9] hover:text-white border border-[#3E374C] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Limpar conversa"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Limpar
            </button>

          </div>
        </div>

        {/* ==================================================
            PAINEL DE CONFIGURAÇÃO DE VOZ E LATÊNCIA
        ================================================== */}

        {showVoiceSettings && (
          <div className="mt-4 pt-4 border-t border-[#3E374C] space-y-4 animate-fadeIn">

            {/* SELEÇÃO DO MOTOR DE ÁUDIO (LATÊNCIA) */}
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Modo de Reprodução de Áudio
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    primeAudioContext();
                    setVoiceEngine("instant");
                    localStorage.setItem("vicVoiceEngine", "instant");
                  }}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    voiceEngine === "instant"
                      ? "bg-[#00C0A3]/15 border-[#00C0A3] text-white"
                      : "bg-[#1E1B24] border-[#3E374C] text-[#B0A8B9] hover:border-[#845EC2]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">⚡</span>
                        <p className="text-xs font-bold text-white">
                          Instantâneo (0s de delay)
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        Fala imediata em Português do Brasil. Sem esperar download nem travamentos.
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] font-bold text-[#00C0A3] bg-[#00C0A3]/10 px-2 py-0.5 rounded">
                        Recomendado
                      </span>
                    </div>
                    {voiceEngine === "instant" && (
                      <Check className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopSpeaking();
                    primeAudioContext();
                    setVoiceEngine("gemini");
                    localStorage.setItem("vicVoiceEngine", "gemini");
                  }}
                  className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                    voiceEngine === "gemini"
                      ? "bg-[#845EC2]/20 border-[#845EC2] text-white"
                      : "bg-[#1E1B24] border-[#3E374C] text-[#B0A8B9] hover:border-[#845EC2]/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎙️</span>
                        <p className="text-xs font-bold text-white">
                          Estúdio IA (Gemini HD)
                        </p>
                      </div>
                      <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                        Síntese neural Gemini de estúdio. Se demorar mais de 3s, ativa o modo rápido automaticamente.
                      </p>
                      <span className="inline-block mt-1.5 text-[9px] font-bold text-[#845EC2] bg-[#845EC2]/10 px-2 py-0.5 rounded">
                        Alta Definição
                      </span>
                    </div>
                    {voiceEngine === "gemini" && (
                      <Check className="w-4 h-4 text-[#845EC2] shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              </div>
            </div>

            {/* TIMBRE / PERSONALIDADE */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Volume2 className="w-3.5 h-3.5 text-[#00C0A3]" />
                  Timbre e Personalidade da Vic
                </p>

                <button
                  type="button"
                  onClick={() => {
                    primeAudioContext();
                    speakText(
                      "Oi! Eu sou a Vic, sua treinadora virtual da MoveFIT! Bora treinar hoje?",
                      "test-audio-sample"
                    );
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#00C0A3]/15 hover:bg-[#00C0A3]/25 text-[#00C0A3] text-[10px] font-bold border border-[#00C0A3]/30 transition-all cursor-pointer"
                >
                  Testar Voz Agora
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VIC_VOICES.map((voice) => (
                  <button
                    key={voice.id}
                    onClick={() => {
                      stopSpeaking();
                      setSelectedVoice(voice.id);
                    }}
                    className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedVoice === voice.id
                        ? "bg-[#00C0A3]/10 border-[#00C0A3]/50"
                        : "bg-[#1E1B24] border-[#3E374C] hover:border-[#845EC2]/50"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{voice.emoji}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white">
                          {voice.label}
                        </p>
                        <p className="text-[10px] text-[#B0A8B9]">
                          {voice.description}
                        </p>
                      </div>
                      {selectedVoice === voice.id && (
                        <Check className="w-4 h-4 text-[#00C0A3]" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ==================================================
            CONTEXTO
        ================================================== */}

        <div className="mt-4 pt-3 border-t border-[#3E374C] flex flex-wrap items-center gap-2 text-xs">

          <span className="text-[11px] font-semibold text-[#B0A8B9] uppercase tracking-wider flex items-center gap-1">

            <Sparkles className="w-3 h-3 text-[#00C0A3]" />

            Contexto Ativo:

          </span>

          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">

            Nível:
            {" "}
            <strong className="text-white">
              {user.trainingLevel}
            </strong>

          </span>

          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">

            Aulas salvas:
            {" "}
            <strong className="text-[#00C0A3]">
              {bookedClasses.length} agendada(s)
            </strong>

          </span>

          <span className="bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] text-zinc-300">

            Duração oficial:
            {" "}
            <strong className="text-white">
              50 minutos
            </strong>

          </span>

        </div>

      </div>

      {/* ======================================================
          AULAS RÁPIDAS
      ====================================================== */}

      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-3.5 shadow-md">

        <div className="flex items-center justify-between mb-2">

          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">

            <CalendarCheck2 className="w-4 h-4 text-[#00C0A3]" />

            Agende direto em 1 clique com a Vic:

          </span>

          <span className="text-[11px] text-[#B0A8B9]">
            Duração: 50 min cada
          </span>

        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

          {quickClasses.map(
            (qc) => {

              const isAlreadyBooked =
                bookedClasses.some(
                  (b) =>
                    b.classId ===
                    qc.classId
                );

              return (
                <button
                  key={qc.classId}
                  onClick={() =>
                    handleQuickBook(
                      qc.classId,
                      qc.time,
                      qc.name
                    )
                  }
                  disabled={
                    isLoading ||
                    isAlreadyBooked
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-left border transition-all flex flex-col justify-between ${
                    isAlreadyBooked
                      ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] opacity-80 cursor-default"
                      : "bg-[#1E1B24] hover:bg-[#845EC2]/20 border-[#3E374C] hover:border-[#845EC2]/50 text-zinc-200 hover:text-white cursor-pointer"
                  }`}
                >

                  <div className="flex items-center justify-between w-full">

                    <span className="font-bold">
                      {qc.name}
                    </span>

                    {isAlreadyBooked ? (
                      <Check className="w-3.5 h-3.5 text-[#00C0A3]" />
                    ) : (
                      <span className="text-[10px] text-[#00C0A3]">
                        {qc.time}
                      </span>
                    )}

                  </div>

                  <span className="text-[10px] text-zinc-400 mt-1">
                    {isAlreadyBooked
                      ? "Já agendada"
                      : `${qc.days} • 50 min`}
                  </span>

                </button>
              );
            }
          )}

        </div>

      </div>

      {/* ======================================================
          CHAT
      ====================================================== */}

      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl shadow-xl flex flex-col h-[520px] overflow-hidden">

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">

          {messages.map(
            (msg) => {

              const isVic =
                msg.role ===
                "assistant";

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isVic
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >

                  {isVic && (
                    <div className="w-8 h-8 rounded-full border border-[#00C0A3]/50 shrink-0 mt-0.5 overflow-hidden bg-[#1E1B24]">

                      <img
                        src="/foto_vic.jpeg"
                        alt="Vic"
                        className="w-full h-full object-cover object-[center_20%]"
                        referrerPolicy="no-referrer"
                      />

                    </div>
                  )}

                  <div
                    className={`max-w-[88%] sm:max-w-[78%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      isVic
                        ? "bg-[#1E1B24] border border-[#3E374C] text-zinc-100 shadow-md"
                        : "bg-gradient-to-r from-[#845EC2] to-[#734db1] text-white shadow-md glow-purple-sm"
                    }`}
                  >

                    <div className="flex items-center justify-between gap-4 mb-1">

                      <span className="text-[11px] font-bold tracking-wide opacity-80">
                        {isVic
                          ? "Vic (MoveFIT)"
                          : "Você"}
                      </span>

                      <span className="text-[10px] opacity-60">
                        {msg.timestamp}
                      </span>

                    </div>

                    <div className="whitespace-pre-wrap text-[13.5px]">
                      {msg.content}
                    </div>

                    {/* ==================================================
                        CONTROLES DE ÁUDIO & SALVAR RECOMENDAÇÃO
                    ================================================== */}

                    {isVic && (
                      <div className="mt-2.5 flex items-center gap-2 flex-wrap">

                        {isAudioLoading && audioLoadingMessageId === msg.id ? (
                          <button
                            disabled
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#845EC2]/20 text-[#cdb9ee] border border-[#845EC2]/30 text-[10px] font-semibold transition-all cursor-wait"
                          >
                            <Loader2 className="w-3 h-3 animate-spin text-[#cdb9ee]" />
                            Carregando áudio...
                          </button>
                        ) : speakingMessageId === msg.id ? (
                          <button
                            onClick={stopSpeaking}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            <Square className="w-3 h-3 fill-current" />
                            Parar
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              primeAudioContext();
                              speakText(msg.content, msg.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00C0A3]/10 hover:bg-[#00C0A3]/20 text-[#00C0A3] border border-[#00C0A3]/30 text-[10px] font-semibold transition-all cursor-pointer"
                          >
                            <Volume2 className="w-3 h-3" />
                            Ouvir
                          </button>
                        )}

                        {/* Botão de Salvar Recomendação */}
                        {onSaveRecommendation && msg.id !== "msg-welcome" && (
                          <button
                            type="button"
                            onClick={() => handleToggleSaveRecommendation(msg)}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all cursor-pointer ${
                              isMessageSaved(msg)
                                ? "bg-[#845EC2]/30 text-[#d6c7f7] border border-[#845EC2]/60 hover:bg-[#845EC2]/40"
                                : "bg-[#292433] hover:bg-[#342f40] text-zinc-300 hover:text-white border border-[#3E374C]"
                            }`}
                            title={isMessageSaved(msg) ? "Recomendação salva no seu perfil (clique para remover)" : "Salvar esta recomendação no seu perfil"}
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

                    {/* ==================================================
                        ACTION STATUS
                    ================================================== */}

                    {msg.action && (
                      <div
                        className={`mt-3 p-3 rounded-xl border text-xs transition-all ${
                          msg.action.status ===
                          "success"
                            ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3]"
                            : "bg-amber-500/10 border-amber-500/40 text-amber-300"
                        }`}
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div className="flex items-start gap-2.5">

                            {msg.action.status ===
                            "success" ? (
                              <CheckCircle2 className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            )}

                            <div>

                              <p className="font-bold">

                                {msg.action.status ===
                                "success"
                                  ? msg.action.type ===
                                    "BOOK_CLASS"
                                    ? "✓ Aula Salva com Sucesso no Seu Cronograma!"
                                    : "✓ Inscrição Cancelada"
                                  : "Aviso sobre o Agendamento"}

                              </p>

                              <p className="text-[11px] mt-0.5 text-zinc-200">

                                {msg.action.statusMessage ||
                                  `${msg.action.className} às ${msg.action.time}`}

                              </p>

                              {msg.action.status ===
                                "success" &&
                                msg.action.type ===
                                  "BOOK_CLASS" && (
                                  <p className="text-[10px] text-[#00C0A3] font-medium mt-1">
                                    Duração oficial da aula: 50 minutos
                                  </p>
                                )}

                            </div>

                          </div>

                          {onNavigateToClasses &&
                            msg.action.status ===
                              "success" && (
                              <button
                                onClick={
                                  onNavigateToClasses
                                }
                                className="shrink-0 px-2.5 py-1 rounded-lg bg-[#00C0A3] hover:bg-[#00a88f] text-black font-semibold text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                Ver Grade
                                <ArrowRight className="w-3 h-3" />
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
            }
          )}

          {/* ====================================================
              LOADING
          ==================================================== */}

          {isLoading && (
            <div className="flex items-start gap-3 justify-start animate-fadeIn">

              <div className="w-8 h-8 rounded-full border border-[#00C0A3]/50 shrink-0 overflow-hidden bg-[#1E1B24]">

                <img
                  src="/foto_vic.jpeg"
                  alt="Vic"
                  className="w-full h-full object-cover object-[center_20%]"
                  referrerPolicy="no-referrer"
                />

              </div>

              <div className="bg-[#1E1B24] border border-[#3E374C] rounded-2xl px-4 py-3 text-xs text-[#B0A8B9] flex items-center gap-2">

                <Loader2 className="w-4 h-4 animate-spin text-[#00C0A3]" />

                <span>
                  Vic está pensando...
                </span>

              </div>

            </div>
          )}

          <div ref={messagesEndRef} />

        </div>

        {/* ======================================================
            SUGESTÕES
        ====================================================== */}

        <div className="p-3 bg-[#1E1B24]/70 border-t border-[#3E374C] overflow-x-auto no-scrollbar flex items-center gap-2">

          <span className="text-[10px] font-semibold text-[#B0A8B9] uppercase tracking-wider shrink-0 mr-1">
            Sugestões:
          </span>

          {quickPrompts.map(
            (prompt, idx) => (
              <button
                key={idx}
                onClick={() => {
                  primeAudioContext();
                  handleSendMessage(
                    prompt
                  );
                }}
                disabled={isLoading}
                className="text-xs bg-[#292433] hover:bg-[#845EC2]/20 text-[#B0A8B9] hover:text-white border border-[#3E374C] hover:border-[#845EC2]/50 px-3 py-1.5 rounded-xl whitespace-nowrap transition-all cursor-pointer shrink-0 disabled:opacity-50"
              >
                {prompt}
              </button>
            )
          )}

        </div>

        {/* ======================================================
            INPUT
        ====================================================== */}

        <div className="p-4 bg-[#1E1B24] border-t border-[#3E374C]">

          {/* ====================================================
              AVISO DE PERMISSÃO DO MICROFONE
          ==================================================== */}
          {micPermissionError && (
            <div className="mb-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-start justify-between gap-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Permissão do Microfone</p>
                  <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
                    {micPermissionError}
                  </p>
                  <p className="text-[10px] text-[#00C0A3] mt-1 font-medium">
                    💡 Você também pode digitar sua mensagem no campo abaixo a qualquer momento!
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {typeof window !== "undefined" && window.self !== window.top && (
                  <button
                    type="button"
                    onClick={() => window.open(window.location.href, "_blank")}
                    className="px-2.5 py-1 rounded-lg bg-[#845EC2]/20 hover:bg-[#845EC2]/30 text-[#cdb9ee] text-[10px] font-semibold transition-colors cursor-pointer"
                    title="Abrir em nova aba"
                  >
                    Nova Aba
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMicPermissionError(null)}
                  className="px-2.5 py-1 rounded-lg bg-[#292433] hover:bg-[#3E374C] text-[#B0A8B9] hover:text-white text-[10px] transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();

              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >

            {/* ==================================================
                MICROFONE
            ================================================== */}

            <button
              type="button"
              onClick={
                toggleMicrophone
              }
              disabled={isLoading}
              title={
                isListening
                  ? "Parar de ouvir"
                  : "Falar com a Vic"
              }
              className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center border transition-all cursor-pointer ${
                isListening
                  ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                  : "bg-[#292433] border-[#3E374C] text-[#B0A8B9] hover:text-white hover:border-[#00C0A3]/50 hover:bg-[#00C0A3]/10"
              }`}
            >

              {isListening ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}

            </button>

            {/* ==================================================
                INPUT
            ================================================== */}

            <input
              ref={inputRef}
              id="vic-chat-input"
              type="text"
              value={inputPrompt}
              onChange={(e) =>
                setInputPrompt(
                  e.target.value
                )
              }
              placeholder={
                isListening
                  ? "Estou ouvindo..."
                  : "Fale ou digite para a Vic..."
              }
              disabled={isLoading}
              className="flex-1 px-4 py-3 bg-[#292433] border border-[#3E374C] rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm transition-all"
            />

            {/* ==================================================
                ENVIAR
            ================================================== */}

            <button
              id="btn-send-vic-chat"
              type="submit"
              disabled={
                !inputPrompt.trim() ||
                isLoading
              }
              className={`px-5 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 transition-all cursor-pointer ${
                inputPrompt.trim() &&
                !isLoading
                  ? "bg-gradient-to-r from-[#845EC2] to-[#00C0A3] text-white shadow-lg glow-turquoise hover:opacity-95"
                  : "bg-[#292433] text-[#B0A8B9] border border-[#3E374C] opacity-50 cursor-not-allowed"
              }`}
            >

              <Send className="w-4 h-4" />

              <span className="hidden sm:inline">
                Enviar
              </span>

            </button>

          </form>

          {/* ====================================================
              STATUS DO MICROFONE
          ==================================================== */}

          <div className="mt-2 flex items-center justify-center gap-2">

            {isListening ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />

                <span className="text-[10px] text-red-400">
                  Vic está ouvindo você...
                </span>
              </>
            ) : isSpeaking ? (
              <>
                <Volume2 className="w-3 h-3 text-[#845EC2]" />

                <span className="text-[10px] text-[#B0A8B9]">
                  Vic está falando...
                </span>

                <button
                  type="button"
                  onClick={
                    stopSpeaking
                  }
                  className="text-[10px] text-[#00C0A3] hover:underline"
                >
                  Parar
                </button>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 text-[#B0A8B9]" />

                <span className="text-[10px] text-[#B0A8B9]">
                  Clique no microfone para falar com a Vic
                </span>
              </>
            )}

          </div>

        </div>

      </div>

      {/* ========================================================
          TOAST NOTIFICATION DE RECOMENDAÇÃO SALVA
      ======================================================== */}
      {toastNotification && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#292433] border border-[#00C0A3]/50 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-5 h-5 text-[#00C0A3] shrink-0" />
          <span className="text-xs font-semibold">{toastNotification}</span>
          {onNavigateToProfile && (
            <button
              onClick={onNavigateToProfile}
              className="ml-2 px-2.5 py-1 rounded-lg bg-[#00C0A3]/15 hover:bg-[#00C0A3]/25 text-[#00C0A3] text-xs font-bold transition-colors cursor-pointer"
            >
              Ver Perfil →
            </button>
          )}
        </div>
      )}
    </div>
  );
};