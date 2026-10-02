import React from "react";
import { User } from "../types";
import { LogOut, Dumbbell, ShieldCheck, HeartPulse, IdCard, User as UserIcon, Bookmark } from "lucide-react";

interface UserHeaderProps {
  user: User;
  onLogout: () => void;
  activeTab: "classes" | "vic" | "profile";
  setActiveTab: (tab: "classes" | "vic" | "profile") => void;
  bookedCount: number;
  savedCount?: number;
}

export const UserHeader: React.FC<UserHeaderProps> = ({
  user,
  onLogout,
  activeTab,
  setActiveTab,
  bookedCount,
  savedCount = 0,
}) => {
  // Extract initials (up to 2 letters)
  const initials = user.fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "Avançado":
        return "bg-rose-500/20 text-rose-300 border-rose-500/30";
      case "Intermediário":
        return "bg-[#845EC2]/20 text-[#c8b2ed] border-[#845EC2]/40";
      case "Iniciante":
      default:
        return "bg-[#00C0A3]/20 text-[#00C0A3] border-[#00C0A3]/40";
    }
  };

  return (
    <header className="w-full bg-[#1E1B24] border-b border-[#3E374C] sticky top-0 z-30 shadow-lg">
      {/* Top bar with Brand & Logout */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#845EC2] to-[#00C0A3] p-[1.5px] glow-purple-sm">
            <div className="w-full h-full bg-[#1E1B24] rounded-[9px] flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-[#00C0A3]" />
            </div>
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-white">
              Move<span className="text-[#00C0A3]">FIT</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-[#845EC2]/20 text-[#b59ee4] border border-[#845EC2]/30">
              Centro de Treinamento
            </span>
          </div>
        </div>

        {/* Action Logout */}
        <button
          id="btn-logout"
          onClick={onLogout}
          className="flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-[#292433] hover:bg-red-500/20 text-[#B0A8B9] hover:text-red-300 border border-[#3E374C] hover:border-red-500/30 transition-all cursor-pointer"
          title="Encerrar sessão"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden xs:inline">Sair</span>
        </button>
      </div>

      {/* User Welcome Card Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-4">
        <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-xl">
          {/* Subtle accent glow */}
          <div className="absolute -top-16 -right-16 w-36 h-36 bg-[#845EC2]/15 rounded-full blur-2xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div
              onClick={() => setActiveTab("profile")}
              className="flex items-center gap-4 cursor-pointer group"
              title="Clique para acessar seu perfil"
            >
              {/* Avatar circle */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#845EC2] to-[#00C0A3] flex items-center justify-center text-white font-extrabold text-xl sm:text-2xl shadow-lg shrink-0 group-hover:scale-105 transition-transform">
                {initials || "MF"}
              </div>

              {/* User details */}
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-[#00C0A3] transition-colors">
                    Olá, {user.fullName}!
                  </h1>
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${getLevelBadge(
                      user.trainingLevel
                    )} whitespace-nowrap`}
                  >
                    Nível: {user.trainingLevel}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1.5 flex-wrap text-xs text-[#B0A8B9]">
                  <span className="flex items-center gap-1 bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] font-mono text-zinc-300">
                    <IdCard className="w-3.5 h-3.5 text-[#00C0A3]" />
                    Matrícula: <strong className="text-white ml-0.5">{user.matricula}</strong>
                  </span>

                  {user.medicalNotes && user.medicalNotes !== "Nenhuma" && (
                    <span className="flex items-center gap-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-lg text-[11px]">
                      <HeartPulse className="w-3 h-3 text-amber-400" />
                      Obs: {user.medicalNotes}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick stats buttons */}
            <div className="flex items-center gap-2 self-start sm:self-center">
              <button
                onClick={() => setActiveTab("classes")}
                className="bg-[#1E1B24] hover:bg-[#201c29] border border-[#3E374C] px-3.5 py-2 rounded-xl text-center transition-colors cursor-pointer"
                title="Ver aulas agendadas"
              >
                <span className="block text-[11px] text-[#B0A8B9]">Aulas Agendadas</span>
                <span className="text-base font-bold text-[#00C0A3]">{bookedCount}</span>
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                className="bg-[#1E1B24] hover:bg-[#201c29] border border-[#3E374C] px-3.5 py-2 rounded-xl text-center transition-colors cursor-pointer"
                title="Ver recomendações salvas"
              >
                <span className="block text-[11px] text-[#B0A8B9]">Salvos</span>
                <span className="text-base font-bold text-[#845EC2]">{savedCount}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <button
            id="tab-minhas-aulas"
            onClick={() => setActiveTab("classes")}
            className={`flex-1 sm:flex-initial py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "classes"
                ? "bg-[#845EC2] text-white shadow-lg glow-purple-sm border border-[#9b72db]"
                : "bg-[#292433] text-[#B0A8B9] hover:text-white border border-[#3E374C]"
            }`}
          >
            <Dumbbell className="w-4 h-4 text-[#00C0A3]" />
            Aulas Coletivas
            {bookedCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#00C0A3] text-black text-[10px] font-extrabold rounded-full">
                {bookedCount}
              </span>
            )}
          </button>

          <button
            id="tab-conversar-vic"
            onClick={() => setActiveTab("vic")}
            className={`flex-1 sm:flex-initial py-2 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer ${
              activeTab === "vic"
                ? "bg-gradient-to-r from-[#845EC2] to-[#00C0A3] text-white shadow-lg glow-turquoise border border-[#00C0A3]"
                : "bg-[#292433] text-[#B0A8B9] hover:text-white border border-[#3E374C]"
            }`}
          >
            <div className="relative w-6 h-6 rounded-full overflow-hidden border border-[#00C0A3]/60 shrink-0">
              <img
                src="/foto_vic.jpeg"
                alt="Vic"
                className="w-full h-full object-cover object-[center_20%]"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-0 right-0 w-1.5 h-1.5 bg-emerald-400 rounded-full"></span>
            </div>
            Conversar com a Vic (IA)
          </button>

          <button
            id="tab-meu-perfil"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 sm:flex-initial py-2.5 px-5 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#00C0A3] text-white shadow-lg glow-turquoise border border-[#00C0A3]"
                : "bg-[#292433] text-[#B0A8B9] hover:text-white border border-[#3E374C]"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            Meu Perfil
            {(savedCount > 0 || bookedCount > 0) && (
              <span className="ml-1 px-1.5 py-0.2 bg-[#845EC2] text-white text-[10px] font-extrabold rounded-full">
                {savedCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

