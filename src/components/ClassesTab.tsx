import React, { useState } from "react";
import { GymClass, BookedClass } from "../types";
import {
  Activity,
  Bike,
  Music,
  Dumbbell,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  Sparkles,
  Info,
  CalendarDays,
  LayoutGrid
} from "lucide-react";

interface ClassesTabProps {
  classes: GymClass[];
  bookedClasses: BookedClass[];
  onBookClass: (classId: string, time: string) => { success: boolean; message: string };
  onCancelBooking: (bookingId: string) => void;
  onNavigateToVic: () => void;
}

// Calculate slot end time (+50 min)
export const getSlotEndTime = (startTime: string): string => {
  const [h, m] = startTime.split(":").map(Number);
  const totalMin = h * 60 + m + 50;
  const endH = Math.floor(totalMin / 60);
  const endM = totalMin % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
};

interface ScheduleItem {
  classId: string;
  className: string;
  category: string;
  room: string;
  startTime: string;
  endTime: string;
  iconName: "Activity" | "Bike" | "Music" | "Dumbbell";
}

const WEEKDAYS_SCHEDULE: { dayKey: "Seg" | "Ter" | "Qua" | "Qui" | "Sex"; dayName: string; daySubtitle: string; items: ScheduleItem[] }[] = [
  {
    dayKey: "Seg",
    dayName: "Segunda-feira",
    daySubtitle: "Pilates & FitDance",
    items: [
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "07:00", endTime: "07:50", iconName: "Activity" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "10:00", endTime: "10:50", iconName: "Activity" },
      { classId: "fitdance", className: "FitDance", category: "Ritmo & Queima", room: "Studio Dança", startTime: "11:00", endTime: "11:50", iconName: "Music" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "18:00", endTime: "18:50", iconName: "Activity" },
      { classId: "fitdance", className: "FitDance", category: "Ritmo & Queima", room: "Studio Dança", startTime: "19:00", endTime: "19:50", iconName: "Music" },
    ],
  },
  {
    dayKey: "Ter",
    dayName: "Terça-feira",
    daySubtitle: "Spinning & Treino Funcional",
    items: [
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "06:30", endTime: "07:20", iconName: "Bike" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "07:30", endTime: "08:20", iconName: "Dumbbell" },
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "12:00", endTime: "12:50", iconName: "Bike" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "17:30", endTime: "18:20", iconName: "Dumbbell" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "18:30", endTime: "19:20", iconName: "Dumbbell" },
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "19:30", endTime: "20:20", iconName: "Bike" },
    ],
  },
  {
    dayKey: "Qua",
    dayName: "Quarta-feira",
    daySubtitle: "Pilates & FitDance",
    items: [
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "07:00", endTime: "07:50", iconName: "Activity" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "10:00", endTime: "10:50", iconName: "Activity" },
      { classId: "fitdance", className: "FitDance", category: "Ritmo & Queima", room: "Studio Dança", startTime: "11:00", endTime: "11:50", iconName: "Music" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "18:00", endTime: "18:50", iconName: "Activity" },
      { classId: "fitdance", className: "FitDance", category: "Ritmo & Queima", room: "Studio Dança", startTime: "19:00", endTime: "19:50", iconName: "Music" },
    ],
  },
  {
    dayKey: "Qui",
    dayName: "Quinta-feira",
    daySubtitle: "Spinning & Treino Funcional",
    items: [
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "06:30", endTime: "07:20", iconName: "Bike" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "07:30", endTime: "08:20", iconName: "Dumbbell" },
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "12:00", endTime: "12:50", iconName: "Bike" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "17:30", endTime: "18:20", iconName: "Dumbbell" },
      { classId: "funcional", className: "Treino Funcional", category: "Condicionamento Total", room: "Arena Funcional", startTime: "18:30", endTime: "19:20", iconName: "Dumbbell" },
      { classId: "spinning", className: "Spinning", category: "Cardio Alta Intensidade", room: "Bike Studio", startTime: "19:30", endTime: "20:20", iconName: "Bike" },
    ],
  },
  {
    dayKey: "Sex",
    dayName: "Sexta-feira",
    daySubtitle: "Pilates Especial",
    items: [
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "07:00", endTime: "07:50", iconName: "Activity" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "10:00", endTime: "10:50", iconName: "Activity" },
      { classId: "pilates", className: "Pilates", category: "Flexibilidade & Core", room: "Sala Zen 01", startTime: "18:00", endTime: "18:50", iconName: "Activity" },
    ],
  },
];

export const ClassesTab: React.FC<ClassesTabProps> = ({
  classes,
  bookedClasses,
  onBookClass,
  onCancelBooking,
  onNavigateToVic,
}) => {
  // Dropdown selector state
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || "");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // View state: "schedule" (Grade Semanal por dia) vs "modalities" (Por modalidade)
  const [viewMode, setViewMode] = useState<"schedule" | "modalities">("schedule");
  const [selectedDayFilter, setSelectedDayFilter] = useState<"ALL" | "Seg" | "Ter" | "Qua" | "Qui" | "Sex">("ALL");

  const selectedClass = classes.find((c) => c.id === selectedClassId) || classes[0];

  // Helper for rendering icons
  const renderClassIcon = (iconName: string, className = "w-5 h-5") => {
    switch (iconName) {
      case "Activity":
        return <Activity className={className} />;
      case "Bike":
        return <Bike className={className} />;
      case "Music":
        return <Music className={className} />;
      case "Dumbbell":
      default:
        return <Dumbbell className={className} />;
    }
  };

  const handleBookingSubmit = (classId: string, time: string) => {
    setFeedback(null);
    if (!time) {
      setFeedback({ type: "error", message: "Selecione um horário disponível para agendar." });
      return;
    }
    const result = onBookClass(classId, time);
    if (result.success) {
      setFeedback({ type: "success", message: result.message });
      setSelectedTime("");
    } else {
      setFeedback({ type: "error", message: result.message });
    }
  };

  // Helper to find slot status from live classes state
  const getSlotAvailability = (classId: string, time: string) => {
    const gymClass = classes.find(
      (c) => c.id === classId || (classId === "funcional" && c.id === "treino-funcional")
    );
    if (!gymClass) return { remaining: 0, total: 15, isFull: false, isBooked: false };

    const slot = gymClass.slots.find((s) => s.time === time);
    const total = slot ? slot.totalSpots : 15;
    const booked = slot ? slot.bookedSpots : 0;
    const remaining = Math.max(0, total - booked);
    const isFull = remaining <= 0;
    const isBooked = bookedClasses.some(
      (b) =>
        (b.classId === classId || (classId === "funcional" && b.classId === "treino-funcional")) &&
        b.time === time
    );

    return { remaining, total, isFull, isBooked };
  };

  const filteredDays =
    selectedDayFilter === "ALL"
      ? WEEKDAYS_SCHEDULE
      : WEEKDAYS_SCHEDULE.filter((d) => d.dayKey === selectedDayFilter);

  return (
    <div className="space-y-8 pb-12">
      {/* Toast Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-fadeIn ${
            feedback.type === "success"
              ? "bg-[#00C0A3]/10 border-[#00C0A3]/50 text-[#00C0A3]"
              : "bg-amber-500/10 border-amber-500/50 text-amber-300"
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-[#00C0A3]" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
            )}
            <span className="font-medium">{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs px-2 py-1 rounded bg-black/20 hover:bg-black/40 text-white cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Script Official Rules Banner */}
      <div className="bg-gradient-to-r from-[#845EC2]/15 via-[#1E1B24] to-[#00C0A3]/15 border border-[#845EC2]/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#845EC2]/20 border border-[#845EC2]/40 flex items-center justify-center shrink-0 text-[#00C0A3]">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-[#00C0A3] bg-[#00C0A3]/10 px-2 py-0.5 rounded border border-[#00C0A3]/30">
                Regra Oficial MoveFIT
              </span>
              <span className="text-xs text-zinc-400">Instruções do Treino da IA</span>
            </div>
            <p className="text-sm font-semibold text-white mt-1">
              Todas as aulas coletivas duram rigorosamente <span className="text-[#00C0A3]">50 minutos</span>.
            </p>
            <p className="text-xs text-[#B0A8B9] mt-0.5">
              Grade oficial: <strong>Pilates</strong> (Seg/Qua/Sex), <strong>Spinning</strong> (Ter/Qui), <strong>FitDance</strong> (Seg/Qua) e <strong>Treino Funcional</strong> (Ter/Qui).
            </p>
          </div>
        </div>

        <button
          onClick={onNavigateToVic}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E1B24] hover:bg-[#845EC2]/20 border border-[#00C0A3]/40 text-[#00C0A3] rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 shadow"
        >
          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-[#00C0A3]/60">
            <img
              src="/foto_vic.jpeg"
              alt="Vic"
              className="w-full h-full object-cover object-[center_20%]"
              referrerPolicy="no-referrer"
            />
          </div>
          <span>Agendar com a Vic (IA)</span>
        </button>
      </div>

      {/* SECTION 1: Interactive Class Booking (Dropdown & Form) */}
      <section className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#3E374C]">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C0A3] animate-pulse"></span>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Inscrição Rápida em Aulas Coletivas
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#B0A8B9] mt-0.5">
              Selecione a modalidade e o horário oficial (todas as aulas duram estritamente 50 minutos).
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[#00C0A3] bg-[#00C0A3]/10 border border-[#00C0A3]/20 px-3 py-1.5 rounded-lg w-fit">
            <Clock className="w-3.5 h-3.5" />
            <span>Duração padrão: 50 min</span>
          </div>
        </div>

        {/* Dropdown Selection Form */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          {/* Select Modalidade */}
          <div className="md:col-span-5">
            <label htmlFor="select-class" className="block text-xs font-semibold text-[#B0A8B9] uppercase tracking-wider mb-2">
              1. Selecionar Modalidade Oficial
            </label>
            <div className="relative">
              <select
                id="select-class"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedTime("");
                }}
                className="w-full px-4 py-3 bg-[#1E1B24] border border-[#3E374C] rounded-xl text-white text-sm focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] transition-all cursor-pointer font-medium"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id} className="bg-[#1E1B24] text-white">
                    {cls.name} ({cls.days}) • 50 min
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Select Horário */}
          <div className="md:col-span-4">
            <label htmlFor="select-time-slot" className="block text-xs font-semibold text-[#B0A8B9] uppercase tracking-wider mb-2">
              2. Horário Disponível (Início e Término)
            </label>
            <select
              id="select-time-slot"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full px-4 py-3 bg-[#1E1B24] border border-[#3E374C] rounded-xl text-white text-sm focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] transition-all cursor-pointer font-medium"
            >
              <option value="">Selecione um horário...</option>
              {selectedClass?.slots.map((slot) => {
                const remaining = slot.totalSpots - slot.bookedSpots;
                const isFull = remaining <= 0;
                const isAlreadyBooked = bookedClasses.some(
                  (b) =>
                    (b.classId === selectedClass.id ||
                      (selectedClass.id === "funcional" && b.classId === "treino-funcional")) &&
                    b.time === slot.time
                );
                const endTime = getSlotEndTime(slot.time);

                return (
                  <option
                    key={slot.time}
                    value={slot.time}
                    disabled={isFull || isAlreadyBooked}
                    className="bg-[#1E1B24] text-white"
                  >
                    {slot.time} às {endTime} (50 min) • {isAlreadyBooked ? "Já Inscrito" : isFull ? "Esgotado (0 vagas)" : `${remaining} vagas`}
                  </option>
                );
              })}
            </select>
          </div>

          {/* Submit Button */}
          <div className="md:col-span-3">
            <button
              id="btn-confirm-booking"
              type="button"
              disabled={!selectedTime}
              onClick={() => handleBookingSubmit(selectedClass.id, selectedTime)}
              className={`w-full py-3 px-4 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                selectedTime
                  ? "bg-gradient-to-r from-[#845EC2] to-[#00C0A3] text-white shadow-lg glow-purple hover:opacity-95"
                  : "bg-[#1E1B24] text-[#B0A8B9] border border-[#3E374C] opacity-60 cursor-not-allowed"
              }`}
            >
              <Plus className="w-4 h-4" />
              Confirmar Reserva
            </button>
          </div>
        </div>

        {/* Selected class info summary bar */}
        {selectedClass && (
          <div className="mt-4 p-3.5 bg-[#1E1B24] rounded-xl border border-[#3E374C] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[#00C0A3] font-semibold flex items-center gap-1.5">
                {renderClassIcon(selectedClass.iconName, "w-4 h-4")}
                {selectedClass.name}
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-[#B0A8B9]">{selectedClass.category}</span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-300 font-medium">{selectedClass.days}</span>
            </div>
            <div className="flex items-center gap-2 text-zinc-400">
              <Info className="w-3.5 h-3.5 text-[#845EC2]" />
              <span>Duração garantida de 50 minutos por aula</span>
            </div>
          </div>
        )}
      </section>

      {/* SECTION 2: Active User's Booked Classes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              Suas Aulas Coletivas Agendadas
            </h3>
            <p className="text-xs text-[#B0A8B9]">
              Gerencie suas reservas semanais. Você pode cancelar sua vaga a qualquer momento.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#845EC2]/20 text-[#00C0A3] border border-[#845EC2]/40">
            {bookedClasses.length} {bookedClasses.length === 1 ? "reserva ativa" : "reservas ativas"}
          </span>
        </div>

        {bookedClasses.length === 0 ? (
          <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#1E1B24] border border-[#3E374C] flex items-center justify-center mx-auto mb-3 text-[#B0A8B9]">
              <Calendar className="w-6 h-6 text-[#845EC2]" />
            </div>
            <h4 className="text-sm font-bold text-white">Nenhuma aula agendada ainda</h4>
            <p className="text-xs text-[#B0A8B9] max-w-md mx-auto mt-1 mb-4">
              Você ainda não reservou vagas para as turmas da semana. Escolha uma das turmas na grade abaixo ou solicite à Vic para agendar direto no chat!
            </p>
            <button
              onClick={onNavigateToVic}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#845EC2]/20 hover:bg-[#845EC2]/30 text-[#00C0A3] border border-[#845EC2]/40 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-[#00C0A3]/50">
                <img
                  src="/foto_vic.jpeg"
                  alt="Vic"
                  className="w-full h-full object-cover object-[center_20%]"
                  referrerPolicy="no-referrer"
                />
              </div>
              Pedir recomendação para a Vic
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bookedClasses.map((item) => {
              const endTime = getSlotEndTime(item.time);
              return (
                <div
                  key={item.bookingId}
                  id={`booked-class-${item.bookingId}`}
                  className="bg-[#292433] border border-[#3E374C] hover:border-[#845EC2]/60 rounded-2xl p-5 shadow-lg relative group transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      {/* Sport Icon Card */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#845EC2] to-[#00C0A3] p-[1.5px] shrink-0">
                        <div className="w-full h-full bg-[#1E1B24] rounded-[10px] flex items-center justify-center text-[#00C0A3]">
                          {renderClassIcon(item.iconName, "w-6 h-6 text-[#00C0A3]")}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {item.className}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[#B0A8B9]">
                          <Calendar className="w-3.5 h-3.5 text-[#00C0A3]" />
                          <span>{item.days} • <strong>{item.time} às {endTime}</strong></span>
                        </div>

                        {/* Required "50 minutos" duration tag */}
                        <div className="flex items-center gap-2 mt-2.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#00C0A3]/15 text-[#00C0A3] border border-[#00C0A3]/30">
                            <Clock className="w-3 h-3" />
                            50 minutos
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] text-[#B0A8B9]">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            Vaga Confirmada
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Cancel / Remove slot mechanism */}
                    <button
                      id={`btn-cancel-booking-${item.bookingId}`}
                      onClick={() => onCancelBooking(item.bookingId)}
                      title="Cancelar agendamento e liberar vaga"
                      className="p-2 rounded-xl bg-[#1E1B24] hover:bg-red-500/20 text-[#B0A8B9] hover:text-red-400 border border-[#3E374C] hover:border-red-500/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 3: Grade Oficial de Horários (Weekly Schedule Timetable & Cards) */}
      <section className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#3E374C]/60">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-[#00C0A3]" />
              <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Grade Oficial de Horários MoveFIT
              </h3>
            </div>
            <p className="text-xs text-[#B0A8B9]">
              Conforme as diretrizes oficiais do script de treino da academia. Duração estrita de 50 minutos por aula.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#1E1B24] p-1 rounded-xl border border-[#3E374C] self-start sm:self-auto">
            <button
              onClick={() => setViewMode("schedule")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "schedule"
                  ? "bg-[#845EC2] text-white shadow"
                  : "text-[#B0A8B9] hover:text-white"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Grade Semanal (Por Dia)
            </button>
            <button
              onClick={() => setViewMode("modalities")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === "modalities"
                  ? "bg-[#845EC2] text-white shadow"
                  : "text-[#B0A8B9] hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Por Modalidades
            </button>
          </div>
        </div>

        {/* VIEW 1: Grade Semanal por Dia (Segunda a Sexta) */}
        {viewMode === "schedule" && (
          <div className="space-y-5">
            {/* Day Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                onClick={() => setSelectedDayFilter("ALL")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  selectedDayFilter === "ALL"
                    ? "bg-[#00C0A3] text-black font-bold border-[#00C0A3] shadow-md shadow-[#00C0A3]/20"
                    : "bg-[#292433] text-[#B0A8B9] border-[#3E374C] hover:text-white"
                }`}
              >
                Todos os Dias (Seg - Sex)
              </button>
              {WEEKDAYS_SCHEDULE.map((day) => (
                <button
                  key={day.dayKey}
                  onClick={() => setSelectedDayFilter(day.dayKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    selectedDayFilter === day.dayKey
                      ? "bg-[#00C0A3] text-black font-bold border-[#00C0A3] shadow-md shadow-[#00C0A3]/20"
                      : "bg-[#292433] text-[#B0A8B9] border-[#3E374C] hover:text-white"
                  }`}
                >
                  {day.dayName}
                </button>
              ))}
            </div>

            {/* Days Grid / List */}
            <div className="space-y-6">
              {filteredDays.map((day) => (
                <div
                  key={day.dayKey}
                  className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 shadow-lg relative overflow-hidden"
                >
                  {/* Day Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#3E374C]/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#00C0A3]/15 border border-[#00C0A3]/30 flex items-center justify-center font-bold text-xs text-[#00C0A3]">
                        {day.dayKey}
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-white tracking-tight">
                          {day.dayName}
                        </h4>
                        <p className="text-xs text-[#B0A8B9]">{day.daySubtitle}</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-semibold text-[#B0A8B9] bg-[#1E1B24] px-2.5 py-1 rounded-lg border border-[#3E374C] w-fit">
                      {day.items.length} horários no dia • Duração: 50 min
                    </span>
                  </div>

                  {/* Timetable Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {day.items.map((item, idx) => {
                      const avail = getSlotAvailability(item.classId, item.startTime);
                      const isFitDance = item.classId === "fitdance";
                      const isSpinning = item.classId === "spinning";
                      const isPilates = item.classId === "pilates";
                      const isFuncional = item.classId === "funcional";

                      const borderAccent = isFitDance
                        ? "hover:border-pink-500/40"
                        : isSpinning
                        ? "hover:border-amber-500/40"
                        : isPilates
                        ? "hover:border-[#00C0A3]/50"
                        : "hover:border-[#845EC2]/50";

                      return (
                        <div
                          key={`${day.dayKey}-${item.classId}-${item.startTime}-${idx}`}
                          className={`bg-[#1E1B24] border border-[#3E374C] ${borderAccent} rounded-xl p-3.5 flex flex-col justify-between transition-all duration-200 group`}
                        >
                          <div>
                            {/* Time & Badge */}
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                                <Clock className="w-3.5 h-3.5 text-[#00C0A3]" />
                                <span>{item.startTime}</span>
                                <span className="text-zinc-500">→</span>
                                <span className="text-[#00C0A3]">{item.endTime}</span>
                              </div>

                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#845EC2]/20 text-[#c8b2ed] border border-[#845EC2]/30">
                                50 min
                              </span>
                            </div>

                            {/* Class Name & Room */}
                            <div className="flex items-start gap-2.5 mt-2">
                              <div className="w-8 h-8 rounded-lg bg-[#292433] border border-[#3E374C] flex items-center justify-center text-[#00C0A3] shrink-0">
                                {renderClassIcon(item.iconName, "w-4 h-4")}
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-white group-hover:text-[#00C0A3] transition-colors">
                                  {item.className}
                                </h5>
                                <p className="text-[11px] text-[#B0A8B9]">{item.category}</p>
                                <span className="text-[10px] text-zinc-400 block mt-0.5">
                                  {item.room}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Footer: Availability & Booking Button */}
                          <div className="mt-3.5 pt-2.5 border-t border-[#3E374C]/60 flex items-center justify-between gap-2">
                            <div className="text-[11px]">
                              <span className="text-[#B0A8B9]">Vagas: </span>
                              <strong className={avail.isFull ? "text-red-400" : "text-white"}>
                                {avail.remaining}/{avail.total}
                              </strong>
                            </div>

                            {avail.isBooked ? (
                              <span className="text-[11px] font-bold text-[#00C0A3] bg-[#00C0A3]/10 px-2.5 py-1 rounded-lg border border-[#00C0A3]/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                Inscrito
                              </span>
                            ) : avail.isFull ? (
                              <span className="text-[11px] font-bold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-lg border border-red-500/20">
                                Lotada
                              </span>
                            ) : (
                              <button
                                onClick={() => handleBookingSubmit(item.classId, item.startTime)}
                                className="text-[11px] font-semibold text-white bg-gradient-to-r from-[#845EC2] to-[#00C0A3] hover:opacity-90 px-3 py-1 rounded-lg transition-all cursor-pointer shadow"
                              >
                                Reservar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 2: Visão por Modalidades (Cards) */}
        {viewMode === "modalities" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {classes.map((gymClass) => (
              <div
                key={gymClass.id}
                className="bg-[#292433] border border-[#3E374C] rounded-2xl p-4 flex flex-col justify-between shadow-lg hover:border-[#845EC2]/50 transition-all"
              >
                <div>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-[#1E1B24] border border-[#3E374C] flex items-center justify-center text-[#00C0A3]">
                      {renderClassIcon(gymClass.iconName, "w-5 h-5")}
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#845EC2]/20 text-[#c8b2ed] border border-[#845EC2]/30">
                      50 min
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-white">{gymClass.name}</h4>
                  <p className="text-xs text-[#00C0A3] font-medium mt-0.5">{gymClass.days}</p>
                  <p className="text-[11px] text-[#B0A8B9] mt-2 line-clamp-2">
                    {gymClass.description}
                  </p>

                  {/* Slots List */}
                  <div className="mt-4 space-y-2">
                    <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                      Horários (50 min) & Vagas:
                    </span>
                    {gymClass.slots.map((slot) => {
                      const remaining = slot.totalSpots - slot.bookedSpots;
                      const isFull = remaining <= 0;
                      const isBooked = bookedClasses.some(
                        (b) =>
                          (b.classId === gymClass.id ||
                            (gymClass.id === "funcional" && b.classId === "treino-funcional")) &&
                          b.time === slot.time
                      );
                      const endTime = getSlotEndTime(slot.time);

                      return (
                        <div
                          key={slot.time}
                          className="flex items-center justify-between bg-[#1E1B24] p-2 rounded-xl border border-[#3E374C] text-xs"
                        >
                          <div>
                            <span className="font-bold text-white">{slot.time}</span>
                            <span className="text-[10px] text-zinc-500 ml-1">às {endTime}</span>
                            <span className="text-[10px] text-[#B0A8B9] ml-1.5 block sm:inline">
                              ({remaining}/{slot.totalSpots} vagas)
                            </span>
                          </div>

                          {isBooked ? (
                            <span className="text-[10px] font-bold text-[#00C0A3] bg-[#00C0A3]/10 px-2 py-0.5 rounded-md border border-[#00C0A3]/30">
                              Inscrito
                            </span>
                          ) : isFull ? (
                            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                              Lotada
                            </span>
                          ) : (
                            <button
                              onClick={() => handleBookingSubmit(gymClass.id, slot.time)}
                              className="text-[10px] font-semibold text-white bg-[#845EC2] hover:bg-[#734db1] px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                            >
                              Reservar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#3E374C]/60 flex items-center justify-between text-[11px] text-[#B0A8B9]">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3 text-[#00C0A3]" />
                    Aulas Coletivas
                  </span>
                  <span>Sala Climatizada</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
