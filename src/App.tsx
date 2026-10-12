import React, { useState, useEffect, useCallback } from "react";
import { User, GymClass, BookedClass, SavedRecommendation } from "./types";
import { INITIAL_CLASSES } from "./data/initialClasses";
import { AuthView } from "./components/AuthView";
import { UserHeader } from "./components/UserHeader";
import { ClassesTab } from "./components/ClassesTab";
import { VicChatTab } from "./components/VicChatTab";
import { ProfileTab } from "./components/ProfileTab";

const DEFAULT_DEMO_USER: User = {
  id: "user-demo-01",
  fullName: "Maria Luiza Fernandes",
  email: "marialuizafernandes384@gmail.com",
  username: "marialuiza.fit",
  password: "Movefit@2026",
  trainingLevel: "Intermediário",
  medicalNotes: "Nenhuma",
  matricula: "MF-2026-001",
  createdAt: "2026-01-10T10:00:00Z",
};

export default function App() {
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem("movefit_users");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return [DEFAULT_DEMO_USER];
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("movefit_active_user");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  const [savedRecommendations, setSavedRecommendations] = useState<SavedRecommendation[]>([]);
  const [gymClasses, setGymClasses] = useState<GymClass[]>(INITIAL_CLASSES);
  const [bookedClasses, setBookedClasses] = useState<BookedClass[]>([]);
  const [activeTab, setActiveTab] = useState<"classes" | "vic" | "profile">("classes");

  // Fetch das aulas sincronizadas com o backend SQLite
  const fetchClassesFromBackend = useCallback(async () => {
    try {
      const res = await fetch("/api/classes");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setGymClasses(data);
        }
      }
    } catch (error) {
      // Caso a API não responda, mantém o estado das aulas sem quebrar o App
    }
  }, []);

  // 1. Polling contínuo das aulas para manter as vagas em tempo real
  useEffect(() => {
    fetchClassesFromBackend();
    const interval = setInterval(() => {
      fetchClassesFromBackend();
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchClassesFromBackend]);

  // 2. Buscar usuários cadastrados no banco SQLite ao iniciar a aplicação
  useEffect(() => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setRegisteredUsers(data);
        }
      })
      .catch((err) => console.error("Erro ao carregar usuários do SQLite:", err));
  }, []);

  // 3. Carregar os agendamentos do usuário ativo diretamente do SQLite
  useEffect(() => {
    if (currentUser) {
      fetch(`/api/classes/user/${currentUser.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setBookedClasses(data);
          }
        })
        .catch((err) => console.error("Erro ao carregar agendamentos do SQLite:", err));
    } else {
      setBookedClasses([]);
    }
  }, [currentUser]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("classes");
  };

  const handleRegisterUser = async (newUser: User) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: newUser.fullName,
          email: newUser.email,
          password: newUser.password,
          matricula: newUser.matricula,
          trainingLevel: newUser.trainingLevel,
          medicalNotes: newUser.medicalNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Adiciona o novo usuário retornado pelo SQLite (com id e username .fit criados)
        setRegisteredUsers((prev) => [...prev, data]);
        // Seta o usuário recém-criado como usuário ativo para já entrar logado
        setCurrentUser(data);
      } else {
        alert(data.error || "Erro ao realizar cadastro no servidor.");
      }
    } catch (error) {
      console.error("Erro ao enviar cadastro para o SQLite:", error);
      alert("Não foi possível conectar ao servidor para salvar o cadastro.");
    }
  };

  // Agendamento sincronizado com backend SQLite + estado local
  const handleBookClass = (classId: string, time: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: "É necessário estar autenticado." };

    const targetClass = gymClasses.find(
      (c) =>
        c.id === classId ||
        (classId === "funcional" && c.id === "treino-funcional") ||
        (classId === "treino-funcional" && c.id === "funcional")
    );

    if (!targetClass) return { success: false, message: "Aula não encontrada." };

    const alreadyBooked = bookedClasses.some(
      (b) =>
        (b.classId === targetClass.id ||
          (targetClass.id === "funcional" && b.classId === "treino-funcional") ||
          (targetClass.id === "treino-funcional" && b.classId === "funcional")) &&
        b.time === time
    );

    if (alreadyBooked) {
      return {
        success: false,
        message: `Você já está inscrito(a) na aula de ${targetClass.name} neste horário!`,
      };
    }

    // Regista no servidor SQLite
    fetch("/api/classes/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        classId: targetClass.id,
        time,
      }),
    })
      .then(() => fetchClassesFromBackend())
      .catch((err) => console.error("Erro ao sincronizar com backend:", err));

    const newBooking: BookedClass = {
      bookingId: `book-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      classId: targetClass.id,
      className: targetClass.name,
      days: targetClass.days,
      time,
      schedule: `${targetClass.days} • ${time}`,
      duration: "50 minutos",
      iconName: targetClass.iconName,
      bookedAt: new Date().toISOString(),
    };

    setBookedClasses((prev) => [...prev, newBooking]);

    return {
      success: true,
      message: `Vaga confirmada para ${targetClass.name} (${time})! Duração: 50 minutos.`,
    };
  };

  // Cancelamento sincronizado com backend SQLite + estado local
  const handleCancelBooking = (bookingId: string) => {
    const booking = bookedClasses.find((b) => b.bookingId === bookingId);
    if (!booking || !currentUser) return;

    fetch("/api/classes/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        classId: booking.classId,
        time: booking.time,
      }),
    })
      .then(() => fetchClassesFromBackend())
      .catch((err) => console.error("Erro ao cancelar no backend:", err));

    setBookedClasses((prev) => prev.filter((b) => b.bookingId !== bookingId));
  };

  const userSavedRecommendations = savedRecommendations.filter((r) => r.userId === currentUser?.id);

  const handleSaveRecommendation = (recData: Omit<SavedRecommendation, "id" | "savedAt" | "userId">) => {
    if (!currentUser) return;
    const newRec: SavedRecommendation = {
      ...recData,
      id: `rec-${Date.now()}`,
      userId: currentUser.id,
      savedAt: new Date().toLocaleString("pt-BR"),
    };
    setSavedRecommendations((prev) => [newRec, ...prev]);
  };

  const handleRemoveRecommendation = (recId: string) => {
    setSavedRecommendations((prev) => prev.filter((r) => r.id !== recId));
  };

  const handleUpdateUser = (updatedData: Partial<User>): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: "Nenhum usuário logado." };
    const updatedUser: User = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    setRegisteredUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
    return { success: true, message: "Perfil atualizado com sucesso!" };
  };

  if (!currentUser) {
    return (
      <AuthView
        onLogin={handleLogin}
        registeredUsers={registeredUsers}
        onRegisterUser={handleRegisterUser}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#1E1B24] text-white flex flex-col font-sans">
      <UserHeader
        user={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        bookedCount={bookedClasses.length}
        savedCount={userSavedRecommendations.length}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "classes" ? (
          <ClassesTab
            classes={gymClasses}
            bookedClasses={bookedClasses}
            onBookClass={handleBookClass}
            onCancelBooking={handleCancelBooking}
            onNavigateToVic={() => setActiveTab("vic")}
            onRefreshClasses={fetchClassesFromBackend}
          />
        ) : activeTab === "vic" ? (
          <VicChatTab
            user={currentUser}
            bookedClasses={bookedClasses}
            classes={gymClasses}
            onBookClass={handleBookClass}
            onCancelBooking={handleCancelBooking}
            onNavigateToClasses={() => setActiveTab("classes")}
            savedRecommendations={userSavedRecommendations}
            onSaveRecommendation={handleSaveRecommendation}
            onRemoveRecommendation={handleRemoveRecommendation}
            onNavigateToProfile={() => setActiveTab("profile")}
          />
        ) : (
          <ProfileTab
            user={currentUser}
            bookedClasses={bookedClasses}
            savedRecommendations={userSavedRecommendations}
            onUpdateUser={handleUpdateUser}
            onCancelBooking={handleCancelBooking}
            onRemoveRecommendation={handleRemoveRecommendation}
            onNavigateToClasses={() => setActiveTab("classes")}
            onNavigateToVic={() => setActiveTab("vic")}
          />
        )}
      </main>

      <footer className="border-t border-[#3E374C] py-6 text-center text-xs text-[#B0A8B9] bg-[#1E1B24]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MoveFIT. Todos os direitos reservados.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Aulas coletivas: 50 min</span>
            <span>•</span>
            <span>Atendimento IA Vic 24h</span>
          </div>
        </div>
      </footer>
    </div>
  );
}