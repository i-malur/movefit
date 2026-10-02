import React, { useState } from "react";
import {
  User,
  BookedClass,
  SavedRecommendation,
  TrainingLevel,
  RecommendationCategory,
} from "../types";
import {
  User as UserIcon,
  Edit3,
  Calendar,
  Bookmark,
  CheckCircle2,
  AlertTriangle,
  HeartPulse,
  IdCard,
  Trash2,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Dumbbell,
  Flame,
  Activity,
  Sparkles,
  ArrowRight,
  Clock,
  CalendarCheck2,
  X,
  Save,
  ShieldCheck,
  Info,
} from "lucide-react";

interface ProfileTabProps {
  user: User;
  bookedClasses: BookedClass[];
  savedRecommendations: SavedRecommendation[];
  onUpdateUser: (updatedData: Partial<User>) => { success: boolean; message: string };
  onCancelBooking: (bookingId: string) => void;
  onRemoveRecommendation: (recId: string) => void;
  onNavigateToClasses: () => void;
  onNavigateToVic: () => void;
}

export const ProfileTab: React.FC<ProfileTabProps> = ({
  user,
  bookedClasses,
  savedRecommendations,
  onUpdateUser,
  onCancelBooking,
  onRemoveRecommendation,
  onNavigateToClasses,
  onNavigateToVic,
}) => {
  // Sub-tabs in Profile: "recommendations" | "classes"
  const [activeSection, setActiveSection] = useState<"recommendations" | "classes">("recommendations");

  // Recommendation category filter: "all" | "treino" | "aquecimento" | "exercicio"
  const [categoryFilter, setCategoryFilter] = useState<"all" | RecommendationCategory>("all");

  // Edit Profile Modal / Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFullName, setEditFullName] = useState(user.fullName);
  const [editEmail, setEditEmail] = useState(user.email);
  const [editLevel, setEditLevel] = useState<TrainingLevel>(user.trainingLevel);
  const [editMedicalNotes, setEditMedicalNotes] = useState(user.medicalNotes || "Nenhuma");
  const [editPassword, setEditPassword] = useState("");
  const [editErrors, setEditErrors] = useState<string[]>([]);
  const [editSuccessMessage, setEditSuccessMessage] = useState<string | null>(null);

  // Copy-to-clipboard state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Audio Speech state for saved recommendations
  const [speakingId, setSpeakingId] = useState<string | null>(null);

  // Initials
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  // Start editing with fresh values
  const handleOpenEdit = () => {
    setEditFullName(user.fullName);
    setEditEmail(user.email);
    setEditLevel(user.trainingLevel);
    setEditMedicalNotes(user.medicalNotes || "Nenhuma");
    setEditPassword("");
    setEditErrors([]);
    setEditSuccessMessage(null);
    setIsEditingProfile(true);
  };

  // Submit profile edits
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setEditErrors([]);
    setEditSuccessMessage(null);

    const errors: string[] = [];

    // 1. Nome Completo: min 5 chars, at least 2 words
    const trimmedName = editFullName.trim();
    const words = trimmedName.split(/\s+/).filter(Boolean);
    if (trimmedName.length < 5 || words.length < 2) {
      errors.push("Nome Completo: informe ao menos nome e sobrenome (mínimo 5 caracteres).");
    }

    // 2. Email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const trimmedEmail = editEmail.trim();
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.push("E-mail: informe um endereço de e-mail válido.");
    }

    // 3. Senha (se preenchida, deve ter ao menos 8 chars)
    if (editPassword.trim() && editPassword.trim().length < 8) {
      errors.push("Nova Senha: se desejar alterar, a senha deve ter pelo menos 8 caracteres.");
    }

    if (errors.length > 0) {
      setEditErrors(errors);
      return;
    }

    const payload: Partial<User> = {
      fullName: trimmedName,
      email: trimmedEmail,
      trainingLevel: editLevel,
      medicalNotes: editMedicalNotes.trim() || "Nenhuma",
    };

    if (editPassword.trim()) {
      payload.password = editPassword.trim();
    }

    const res = onUpdateUser(payload);
    if (res.success) {
      setEditSuccessMessage(res.message);
      setTimeout(() => {
        setIsEditingProfile(false);
        setEditSuccessMessage(null);
      }, 1400);
    } else {
      setEditErrors([res.message]);
    }
  };

  // Copy recommendation content
  const handleCopyContent = (rec: SavedRecommendation) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(`${rec.title}\n\n${rec.content}`);
      setCopiedId(rec.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Speak recommendation content using Web Speech API
  const handleSpeakContent = (rec: SavedRecommendation) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      alert("A síntese de voz não é suportada neste navegador.");
      return;
    }

    if (speakingId === rec.id) {
      window.speechSynthesis.cancel();
      setSpeakingId(null);
      return;
    }

    window.speechSynthesis.cancel();
    setSpeakingId(rec.id);

    const utterance = new SpeechSynthesisUtterance(rec.content);
    utterance.lang = "pt-BR";
    utterance.rate = 1.05;
    utterance.pitch = 1.08;

    utterance.onend = () => {
      setSpeakingId(null);
    };

    utterance.onerror = () => {
      setSpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Filter recommendations
  const filteredRecommendations = savedRecommendations.filter((rec) => {
    if (categoryFilter === "all") return true;
    return rec.category === categoryFilter;
  });

  const getCategoryBadge = (category: RecommendationCategory) => {
    switch (category) {
      case "treino":
        return {
          label: "Treino",
          className: "bg-[#845EC2]/20 text-[#d0bef5] border-[#845EC2]/40",
          icon: <Dumbbell className="w-3.5 h-3.5 text-[#845EC2]" />,
        };
      case "aquecimento":
        return {
          label: "Aquecimento",
          className: "bg-amber-500/20 text-amber-300 border-amber-500/30",
          icon: <Flame className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "exercicio":
        return {
          label: "Exercício",
          className: "bg-[#00C0A3]/20 text-[#00C0A3] border-[#00C0A3]/40",
          icon: <Activity className="w-3.5 h-3.5 text-[#00C0A3]" />,
        };
      case "geral":
      default:
        return {
          label: "Orientação",
          className: "bg-blue-500/20 text-blue-300 border-blue-500/30",
          icon: <Sparkles className="w-3.5 h-3.5 text-blue-400" />,
        };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ========================================================
          USER PROFILE HERO CARD
      ======================================================== */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-[#845EC2]/20 via-[#00C0A3]/10 to-transparent rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Left: Avatar + Details */}
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#845EC2] via-[#6d41b5] to-[#00C0A3] p-[2px] shadow-xl shrink-0">
              <div className="w-full h-full bg-[#1E1B24] rounded-[14px] flex items-center justify-center text-white font-extrabold text-2xl sm:text-3xl">
                {initials || "MF"}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {user.fullName}
                </h2>
                <span className="text-xs text-zinc-400 font-mono">@{user.username}</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#00C0A3]/15 text-[#00C0A3] border border-[#00C0A3]/30">
                  <ShieldCheck className="w-3 h-3 text-[#00C0A3]" /> Aluno(a) Oficial
                </span>
              </div>

              {/* Badges bar */}
              <div className="flex items-center gap-2.5 mt-2 flex-wrap text-xs">
                <span className="inline-flex items-center gap-1.5 bg-[#1E1B24] px-3 py-1 rounded-lg border border-[#3E374C] font-mono font-medium text-white shadow-sm">
                  <IdCard className="w-3.5 h-3.5 text-[#00C0A3]" />
                  Matrícula: <strong className="text-white ml-0.5">{user.matricula}</strong>
                </span>

                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#845EC2]/20 text-[#d0bef5] border border-[#845EC2]/35 font-medium">
                  <Dumbbell className="w-3.5 h-3.5 text-[#845EC2]" />
                  Nível: {user.trainingLevel}
                </span>

                {user.medicalNotes && user.medicalNotes !== "Nenhuma" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/25">
                    <HeartPulse className="w-3.5 h-3.5 text-amber-400" />
                    Obs: {user.medicalNotes}
                  </span>
                )}
              </div>

              <p className="text-[11px] text-[#B0A8B9] mt-2">
                E-mail de acesso: <span className="text-zinc-300 font-medium">{user.email}</span>
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 self-start lg:self-center">
            <button
              id="btn-edit-profile"
              onClick={handleOpenEdit}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#845EC2] hover:bg-[#734db1] text-white font-semibold text-xs sm:text-sm shadow-lg transition-all duration-200 cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              Editar Informações
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-[#3E374C]">
          <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-center">
            <span className="block text-[11px] text-[#B0A8B9]">Aulas Agendadas</span>
            <span className="text-lg font-black text-[#00C0A3]">{bookedClasses.length}</span>
          </div>

          <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-center">
            <span className="block text-[11px] text-[#B0A8B9]">Recomendações Salvas</span>
            <span className="text-lg font-black text-[#845EC2]">{savedRecommendations.length}</span>
          </div>

          <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-center">
            <span className="block text-[11px] text-[#B0A8B9]">Nível de Treino</span>
            <span className="text-sm font-bold text-zinc-200 truncate mt-0.5 block">
              {user.trainingLevel}
            </span>
          </div>

          <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-center">
            <span className="block text-[11px] text-[#B0A8B9]">Matrícula MoveFIT</span>
            <span className="text-xs font-mono font-bold text-[#00C0A3] truncate mt-1 block">
              {user.matricula}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================
          EDIT PROFILE MODAL / FORM
      ======================================================== */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#292433] border border-[#3E374C] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#3E374C]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#845EC2]/20 border border-[#845EC2]/30 flex items-center justify-center">
                  <Edit3 className="w-4 h-4 text-[#845EC2]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Editar Perfil</h3>
                  <p className="text-xs text-[#B0A8B9]">Atualize suas informações cadastrais da MoveFIT</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-[#1E1B24] transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error alerts */}
            {editErrors.length > 0 && (
              <div className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 mb-4 text-xs text-red-200">
                <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Atenção:</span>
                </div>
                <ul className="list-disc pl-4 space-y-0.5">
                  {editErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success alert */}
            {editSuccessMessage && (
              <div className="bg-[#00C0A3]/10 border border-[#00C0A3]/40 rounded-xl p-3.5 mb-4 text-xs text-[#00C0A3] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00C0A3] shrink-0" />
                <span>{editSuccessMessage}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nome Completo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Nome e Sobrenome"
                  className="w-full h-10 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                />
              </div>

              {/* E-mail */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  E-mail <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="seuemail@exemplo.com"
                  className="w-full h-10 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                />
              </div>

              {/* Nível de Treino */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nível de Treino <span className="text-red-400">*</span>
                </label>
                <select
                  value={editLevel}
                  onChange={(e) => setEditLevel(e.target.value as TrainingLevel)}
                  className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm cursor-pointer"
                >
                  <option value="Iniciante">Iniciante</option>
                  <option value="Intermediário">Intermediário</option>
                  <option value="Avançado">Avançado</option>
                </select>
                <p className="text-[11px] text-zinc-400 mt-1">
                  A Vic adapta os treinos e aquecimentos ao nível selecionado.
                </p>
              </div>

              {/* Observações Médicas */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Observações Médicas ou Restrições
                </label>
                <input
                  type="text"
                  value={editMedicalNotes}
                  onChange={(e) => setEditMedicalNotes(e.target.value)}
                  placeholder="Ex: Nenhuma, dor no joelho esquerdo, condromalácia..."
                  className="w-full h-10 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                />
              </div>

              {/* Nova Senha (Opcional) */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nova Senha <span className="text-zinc-500 font-normal">(Deixe em branco para manter a atual)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full h-10 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                />
              </div>

              {/* Matrícula (Fixa e protegida) */}
              <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 flex items-start gap-2.5">
                <IdCard className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-semibold text-zinc-300">
                    Matrícula Oficial MoveFIT: <strong className="text-white font-mono">{user.matricula}</strong>
                  </span>
                  <p className="text-zinc-400 text-[11px] mt-0.5">
                    O número de matrícula é oficial e intransferível. Para quaisquer alterações cadastrais de matrícula, consulte a recepção física.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3E374C]">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2 rounded-xl text-zinc-300 hover:text-white bg-[#1E1B24] hover:bg-[#201d27] border border-[#3E374C] text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#00C0A3] hover:bg-[#00a88f] text-white text-xs font-semibold transition-colors shadow-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-SECTION SWITCHER (Recomendações Salvas vs Aulas)
      ======================================================== */}
      <div className="flex items-center justify-between gap-3 border-b border-[#3E374C] pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            id="tab-profile-recommendations"
            onClick={() => setActiveSection("recommendations")}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeSection === "recommendations"
                ? "bg-[#845EC2] text-white shadow-lg glow-purple-sm border border-[#9b72db]"
                : "bg-[#292433] text-[#B0A8B9] hover:text-white border border-[#3E374C]"
            }`}
          >
            <div className="w-5 h-5 rounded-full overflow-hidden border border-[#00C0A3]/60 shrink-0">
              <img
                src="/foto_vic.jpeg"
                alt="Vic"
                className="w-full h-full object-cover object-[center_20%]"
                referrerPolicy="no-referrer"
              />
            </div>
            Recomendações Salvas da Vic
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#1E1B24] text-[#00C0A3] border border-[#3E374C]">
              {savedRecommendations.length}
            </span>
          </button>

          <button
            id="tab-profile-classes"
            onClick={() => setActiveSection("classes")}
            className={`py-2 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 flex items-center gap-2 cursor-pointer ${
              activeSection === "classes"
                ? "bg-[#00C0A3] text-white shadow-lg glow-turquoise border border-[#00C0A3]"
                : "bg-[#292433] text-[#B0A8B9] hover:text-white border border-[#3E374C]"
            }`}
          >
            <Calendar className="w-4 h-4" />
            Minhas Aulas Agendadas
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-[#1E1B24] text-white border border-[#3E374C]">
              {bookedClasses.length}
            </span>
          </button>
        </div>

        {/* Quick shortcut to chat with Vic */}
        <button
          onClick={onNavigateToVic}
          className="text-xs font-semibold text-[#00C0A3] hover:text-white hover:underline inline-flex items-center gap-1.5 cursor-pointer ml-auto"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#00C0A3]" />
          Pedir novas recomendações à Vic →
        </button>
      </div>

      {/* ========================================================
          SECTION 1: RECOMENDAÇÕES SALVAS DA VIC
      ======================================================== */}
      {activeSection === "recommendations" && (
        <div className="space-y-4">
          {/* Category Filter Pills */}
          {savedRecommendations.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-[#B0A8B9] font-medium mr-1">Filtrar por:</span>
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === "all"
                    ? "bg-[#845EC2] text-white"
                    : "bg-[#292433] text-zinc-400 hover:text-white border border-[#3E374C]"
                }`}
              >
                Todas ({savedRecommendations.length})
              </button>

              <button
                onClick={() => setCategoryFilter("treino")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === "treino"
                    ? "bg-[#845EC2] text-white"
                    : "bg-[#292433] text-zinc-400 hover:text-white border border-[#3E374C]"
                }`}
              >
                <Dumbbell className="w-3.5 h-3.5 text-[#845EC2]" />
                Treinos ({savedRecommendations.filter((r) => r.category === "treino").length})
              </button>

              <button
                onClick={() => setCategoryFilter("aquecimento")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === "aquecimento"
                    ? "bg-amber-500 text-white"
                    : "bg-[#292433] text-zinc-400 hover:text-white border border-[#3E374C]"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                Aquecimentos ({savedRecommendations.filter((r) => r.category === "aquecimento").length})
              </button>

              <button
                onClick={() => setCategoryFilter("exercicio")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  categoryFilter === "exercicio"
                    ? "bg-[#00C0A3] text-white"
                    : "bg-[#292433] text-zinc-400 hover:text-white border border-[#3E374C]"
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-[#00C0A3]" />
                Exercícios ({savedRecommendations.filter((r) => r.category === "exercicio").length})
              </button>
            </div>
          )}

          {/* Empty State */}
          {savedRecommendations.length === 0 ? (
            <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
              <div className="relative w-20 h-20 rounded-full border-2 border-[#00C0A3] shadow-lg shadow-[#00C0A3]/20 overflow-hidden mx-auto mb-4 bg-[#1E1B24]">
                <img
                  src="/foto_vic.jpeg"
                  alt="Vic - Personal MoveFIT"
                  className="w-full h-full object-cover object-[center_20%]"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-0 right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-[#292433]" title="Vic Online"></span>
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Nenhuma recomendação salva ainda
              </h3>
              <p className="text-xs sm:text-sm text-[#B0A8B9] leading-relaxed max-w-md mx-auto mb-6">
                Converse com a <strong>Vic</strong> para receber séries personalizadas de treino, aquecimentos obrigatórios e orientações de exercícios. Em cada resposta, basta clicar em <strong>"Salvar Recomendação"</strong> para guardar aqui!
              </p>
              <button
                onClick={onNavigateToVic}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-[#845EC2] to-[#00C0A3] hover:opacity-95 text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Pedir Treino à Vic no Chat
              </button>
            </div>
          ) : filteredRecommendations.length === 0 ? (
            <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-8 text-center">
              <p className="text-sm text-[#B0A8B9]">Nenhuma recomendação encontrada nesta categoria.</p>
              <button
                onClick={() => setCategoryFilter("all")}
                className="mt-3 text-xs text-[#00C0A3] hover:underline font-semibold cursor-pointer"
              >
                Ver todas as recomendações ({savedRecommendations.length})
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRecommendations.map((rec) => {
                const badge = getCategoryBadge(rec.category);
                const isSpeakingThis = speakingId === rec.id;

                return (
                  <div
                    key={rec.id}
                    className="bg-[#292433] border border-[#3E374C] hover:border-[#845EC2]/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all duration-200 relative group"
                  >
                    <div>
                      {/* Top Meta */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${badge.className}`}
                          >
                            {badge.icon}
                            {badge.label}
                          </span>
                          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[#00C0A3]">
                            <span className="w-3.5 h-3.5 rounded-full overflow-hidden border border-[#00C0A3]/60 inline-block align-middle">
                              <img src="/foto_vic.jpeg" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
                            </span>
                            Vic
                          </span>
                        </div>

                        <span className="text-[11px] text-[#B0A8B9] flex items-center gap-1">
                          <Clock className="w-3 h-3 text-zinc-500" />
                          {rec.savedAt}
                        </span>
                      </div>

                      {/* Title */}
                      <h4 className="text-base font-bold text-white mb-2">
                        {rec.title}
                      </h4>

                      {/* Content preview/body */}
                      <div className="bg-[#1E1B24] border border-[#3E374C]/80 rounded-xl p-3.5 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
                        {rec.content}
                      </div>
                    </div>

                    {/* Bottom Action buttons */}
                    <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-[#3E374C]">
                      <div className="flex items-center gap-2">
                        {/* Copy button */}
                        <button
                          type="button"
                          onClick={() => handleCopyContent(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1E1B24] hover:bg-[#342f40] text-zinc-300 hover:text-white border border-[#3E374C] text-[11px] font-semibold transition-colors cursor-pointer"
                          title="Copiar texto para área de transferência"
                        >
                          {copiedId === rec.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-[#00C0A3]" />
                              Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              Copiar
                            </>
                          )}
                        </button>

                        {/* Listen with TTS */}
                        <button
                          type="button"
                          onClick={() => handleSpeakContent(rec)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            isSpeakingThis
                              ? "bg-rose-500/20 text-rose-300 border-rose-500/30"
                              : "bg-[#00C0A3]/10 hover:bg-[#00C0A3]/20 text-[#00C0A3] border-[#00C0A3]/30"
                          }`}
                          title="Ouvir recomendação em áudio"
                        >
                          {isSpeakingThis ? (
                            <>
                              <VolumeX className="w-3.5 h-3.5" />
                              Parar Áudio
                            </>
                          ) : (
                            <>
                              <Volume2 className="w-3.5 h-3.5" />
                              Ouvir
                            </>
                          )}
                        </button>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Remover "${rec.title}" das recomendações salvas?`)) {
                            onRemoveRecommendation(rec.id);
                          }
                        }}
                        className="text-zinc-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Remover recomendação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          SECTION 2: MINHAS AULAS AGENDADAS
      ======================================================== */}
      {activeSection === "classes" && (
        <div className="space-y-4">
          {bookedClasses.length === 0 ? (
            <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-8 sm:p-12 text-center max-w-2xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-[#00C0A3]/10 border border-[#00C0A3]/30 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-[#00C0A3]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">
                Você não possui aulas agendadas no momento
              </h3>
              <p className="text-xs sm:text-sm text-[#B0A8B9] max-w-md mx-auto mb-6">
                Todas as aulas duram 50 minutos e contam com turmas de no máximo 15 alunos. Reserve sua vaga na grade oficial!
              </p>
              <button
                onClick={onNavigateToClasses}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00C0A3] hover:bg-[#00a88f] text-white font-bold text-sm shadow-lg transition-all cursor-pointer"
              >
                <CalendarCheck2 className="w-4 h-4" />
                Ver Grade de Aulas Coletivas
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#B0A8B9] px-1">
                <span>Total de reservas ativas: <strong className="text-white">{bookedClasses.length}</strong></span>
                <button
                  onClick={onNavigateToClasses}
                  className="text-[#00C0A3] hover:underline font-semibold cursor-pointer"
                >
                  + Agendar outra aula
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {bookedClasses.map((booking) => (
                  <div
                    key={booking.bookingId}
                    className="bg-[#292433] border border-[#3E374C] rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-lg relative overflow-hidden"
                  >
                    {/* Top Accent */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#845EC2] to-[#00C0A3]"></div>

                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#00C0A3] bg-[#00C0A3]/10 px-2 py-0.5 rounded border border-[#00C0A3]/30">
                            Vaga Confirmada
                          </span>
                          <h4 className="text-base sm:text-lg font-black text-white mt-1.5">
                            {booking.className}
                          </h4>
                        </div>

                        <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-[#1E1B24] text-white border border-[#3E374C]">
                          {booking.time}
                        </span>
                      </div>

                      <div className="space-y-1.5 mt-3 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#845EC2]" />
                          <span>Dias: <strong>{booking.days}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-[#00C0A3]" />
                          <span>Duração oficial: <strong>50 minutos</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 mt-4 border-t border-[#3E374C] flex items-center justify-between">
                      <span className="text-[10px] text-[#B0A8B9]">
                        Reservado para matrícula {user.matricula}
                      </span>
                      <button
                        onClick={() => {
                          if (confirm(`Deseja realmente cancelar sua reserva para ${booking.className} (${booking.time})?`)) {
                            onCancelBooking(booking.bookingId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-red-200 border border-red-500/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Cancelar Reserva
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
