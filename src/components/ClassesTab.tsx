import React, { useState, useEffect } from "react";
import { GymClass, BookedClass } from "../types";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Sparkles,
  ChevronRight,
  Activity,
  Bike,
  Music,
  Dumbbell,
  Trash2,
  CalendarCheck2,
} from "lucide-react";

interface ClassesTabProps {
  classesList?: GymClass[];
  bookedClasses?: BookedClass[];
  onBookClass: (classId: string, time: string, className: string) => Promise<{ success: boolean; message: string }>;
  onCancelBooking: (bookingId: string) => void;
  onNavigateToVic: () => void;
  userMatricula: string;
}

// Modalidades padrão de segurança caso a API ainda não tenha retornado os dados
const DEFAULT_CLASSES: GymClass[] = [
  {
    id: "pilates",
    name: "Pilates",
    category: "Flexibilidade & Core",
    days: "Seg / Qua / Sex",
    description: "Fortalecimento do core, postura e flexibilidade.",
    iconName: "Activity",
    slots: [
      { time: "07:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "10:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "18:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
    ],
  },
  {
    id: "spinning",
    name: "Spinning",
    category: "Cardio Alta Intensidade",
    days: "Ter / Qui",
    description: "Treino aeróbico dinâmico sobre bicicleta ergométrica.",
    iconName: "Bike",
    slots: [
      { time: "06:30", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "12:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "19:30", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
    ],
  },
  {
    id: "fitdance",
    name: "FitDance",
    category: "Ritmo & Queima",
    days: "Seg / Qua",
    description: "Aulas de dança dinâmicas com coreografias atuais.",
    iconName: "Music",
    slots: [
      { time: "11:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "19:00", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
    ],
  },
  {
    id: "funcional",
    name: "Treino Funcional",
    category: "Condicionamento Total",
    days: "Ter / Qui",
    description: "Exercícios dinâmicos para agilidade, força e resistência.",
    iconName: "Dumbbell",
    slots: [
      { time: "07:30", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "17:30", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
      { time: "18:30", totalSpots: 30, bookedSpots: 0, availableSpots: 30 },
    ],
  },
];

export const ClassesTab: React.FC<ClassesTabProps> = ({
  classesList = [],
  bookedClasses = [],
  onBookClass,
  onCancelBooking,
  onNavigateToVic,
  userMatricula,
}) => {
  // Se classesList vier vazio do backend, assume a lista padrão automaticamente
  const safeClassesList = Array.isArray(classesList) && classesList.length > 0 ? classesList : DEFAULT_CLASSES;
  const safeBookedClasses = Array.isArray(bookedClasses) ? bookedClasses : [];

  const [selectedClassId, setSelectedClassId] = useState<string>("pilates");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingMessage, setBookingMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const currentClass = safeClassesList.find((c) => c.id === selectedClassId) || safeClassesList[0];

  useEffect(() => {
    if (safeClassesList.length > 0 && !safeClassesList.some((c) => c.id === selectedClassId)) {
      setSelectedClassId(safeClassesList[0].id);
    }
  }, [safeClassesList, selectedClassId]);

  const handleClassChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedClassId(e.target.value);
    setSelectedTime("");
    setBookingMessage(null);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentClass) return;

    if (!selectedTime) {
      setBookingMessage({ type: "error", text: "Por favor, selecione um horário disponível." });
      return;
    }

    setIsSubmitting(true);
    setBookingMessage(null);

    try {
      const res = await onBookClass(currentClass.id, selectedTime, currentClass.name);
      if (res.success) {
        setBookingMessage({ type: "success", text: res.message });
        setSelectedTime("");
      } else {
        setBookingMessage({ type: "error", text: res.message });
      }
    } catch (err: any) {
      setBookingMessage({ type: "error", text: "Erro ao realizar agendamento." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case "Bike":
        return <Bike className="w-5 h-5 text-[#00C0A3]" />;
      case "Music":
        return <Music className="w-5 h-5 text-[#845EC2]" />;
      case "Dumbbell":
        return <Dumbbell className="w-5 h-5 text-amber-400" />;
      case "Activity":
      default:
        return <Activity className="w-5 h-5 text-[#00C0A3]" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* BALÃO INFORMATIVO COM REGRA OFICIAL + ENDEREÇO E TELEFONE DA MOVEFIT */}
      <div className="bg-[#292433] border border-[#00C0A3]/30 rounded-2xl p-4 sm:p-5 shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-[#00C0A3]/15 border border-[#00C0A3]/30 flex items-center justify-center shrink-0 mt-0.5">
            <Clock className="w-5 h-5 text-[#00C0A3]" />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-extrabold tracking-wider uppercase px-2 py-0.5 rounded bg-[#00C0A3]/20 text-[#00C0A3] border border-[#00C0A3]/40">
                Regra Oficial MoveFIT
              </span>
              <span className="text-xs text-[#B0A8B9] font-medium">Instruções do Treino da IA</span>
            </div>

            <p className="text-xs sm:text-sm text-zinc-200 leading-relaxed">
              Todas as aulas coletivas duram rigorosamente <strong>50 minutos</strong>.
              <span className="block text-xs text-[#B0A8B9] mt-0.5">
                Grade oficial: <strong>Pilates</strong> (Seg/Qua/Sex), <strong>Spinning</strong> (Ter/Qui), <strong>FitDance</strong> (Seg/Qua) e <strong>Treino Funcional</strong> (Ter/Qui).
              </span>
            </p>

            {/* ENDEREÇO E TELEFONE DENTRO DO BALÃO */}
            <div className="pt-2 border-t border-[#3E374C]/60 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-[#B0A8B9]">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00C0A3] shrink-0" />
                <span>Rua Frederico Grotte, 322 - Jardim São Luís, São Paulo - SP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#00C0A3] shrink-0" />
                <span>(11) 4002-8922</span>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={onNavigateToVic}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#1E1B24] hover:bg-[#342f40] text-[#00C0A3] hover:text-white border border-[#00C0A3]/40 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-md"
        >
          <span className="w-6 h-6 rounded-full overflow-hidden border border-[#00C0A3] inline-block shrink-0">
            <img src="/assets/foto_vicIA.png" alt="Vic" className="w-full h-full object-cover object-[center_20%]" />
          </span>
          Agendar com a Vic (IA)
        </button>
      </div>

      {/* INSCRIÇÃO RÁPIDA EM AULAS COLETIVAS */}
      <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#3E374C] pb-3 flex-wrap gap-2">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00C0A3] inline-block"></span>
              Inscrição Rápida em Aulas Coletivas
            </h3>
            <p className="text-xs text-[#B0A8B9] mt-0.5">
              Selecione a modalidade e o horário oficial (todas as aulas duram estritamente 50 minutos).
            </p>
          </div>

          <span className="inline-flex items-center gap-1.5 text-xs text-[#00C0A3] bg-[#00C0A3]/10 px-3 py-1 rounded-full border border-[#00C0A3]/30">
            <Clock className="w-3.5 h-3.5" /> Duração padrão: 50 min
          </span>
        </div>

        {bookingMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs sm:text-sm flex items-center gap-2.5 ${
              bookingMessage.type === "success"
                ? "bg-[#00C0A3]/15 text-[#00C0A3] border border-[#00C0A3]/40"
                : "bg-red-500/15 text-red-300 border border-red-500/40"
            }`}
          >
            {bookingMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-[#00C0A3] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{bookingMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleBookingSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              1. Selecionar Modalidade Oficial
            </label>
            <select
              value={selectedClassId}
              onChange={handleClassChange}
              className="w-full h-11 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-xl text-white text-sm focus:outline-none focus:border-[#00C0A3] cursor-pointer"
            >
              {safeClassesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.days}) • 50 min
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-zinc-300 mb-1.5 uppercase tracking-wider">
              2. Horário Disponível (Início e Término)
            </label>
            <select
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              className="w-full h-11 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-xl text-white text-sm focus:outline-none focus:border-[#00C0A3] cursor-pointer"
            >
              <option value="">Selecione um horário...</option>
              {currentClass?.slots?.map((slot) => (
                <option key={slot.time} value={slot.time} disabled={slot.availableSpots <= 0}>
                  {slot.time} ({slot.availableSpots} vagas disponíveis)
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isSubmitting || !selectedTime || !currentClass}
              className="w-full h-11 bg-[#845EC2] hover:bg-[#734db1] disabled:bg-zinc-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <CalendarCheck2 className="w-4 h-4" />
              {isSubmitting ? "Reservando..." : "+ Confirmar Reserva"}
            </button>
          </div>
        </form>

        {currentClass && (
          <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-xs text-zinc-300 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white flex items-center gap-1.5">
                {getIcon(currentClass.iconName)}
                {currentClass.name}
              </span>
              <span className="text-[#B0A8B9]">• {currentClass.category}</span>
              <span className="text-[#00C0A3] font-medium">• {currentClass.days}</span>
            </div>
            <span className="text-zinc-400 text-[11px]">
              Duração garantida de 50 minutos por aula
            </span>
          </div>
        )}
      </div>

      {/* SUAS AULAS COLETIVAS AGENDADAS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white">Suas Aulas Coletivas Agendadas</h3>
          <span className="text-xs text-[#00C0A3] font-semibold bg-[#00C0A3]/10 px-2.5 py-0.5 rounded-full border border-[#00C0A3]/30">
            {safeBookedClasses.length} reserva(s) ativa(s)
          </span>
        </div>

        {safeBookedClasses.length === 0 ? (
          <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-6 text-center text-xs text-[#B0A8B9]">
            Você ainda não possui vagas reservadas em nenhuma aula. Selecione uma modalidade acima!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {safeBookedClasses.map((booking: any) => {
              const bId = booking.id || booking.bookingId;
              const bName = booking.className || "Aula Coletiva";

              return (
                <div
                  key={bId}
                  className="bg-[#292433] border border-[#3E374C] rounded-2xl p-4 shadow-md flex items-center justify-between gap-3 relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#00C0A3]"></div>

                  <div>
                    <h4 className="font-bold text-white text-sm">{bName}</h4>
                    <div className="flex items-center gap-2 text-xs text-[#B0A8B9] mt-1">
                      <Clock className="w-3.5 h-3.5 text-[#00C0A3]" />
                      <span className="text-white font-mono font-semibold">{booking.time}</span>
                      <span>(50 min)</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`Cancelar agendamento de ${bName} às ${booking.time}?`)) {
                        onCancelBooking(bId);
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};