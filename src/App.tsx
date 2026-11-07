import React, { useState, useEffect, useCallback } from "react";
import { User, GymClass, BookedClass, SavedRecommendation } from "./types";
import { INITIAL_CLASSES } from "./data/initialClasses";
import { AuthView } from "./components/AuthView";
import { UserHeader } from "./components/UserHeader";
import { ClassesTab } from "./components/ClassesTab";
import { VicChatTab } from "./components/VicChatTab";
import { ProfileTab } from "./components/ProfileTab";

const DEFAULT_DEMO_USER: User = {
  id: "user-demo-1",
  fullName: "Maria Luiza Queiroz",
  email: "maria@movefit.com",
  username: "marialuiza.fit",
  password: "Movefit@2026",
  trainingLevel: "Iniciante",
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

  const activeUserId = currentUser?.id || (currentUser as any)?._id || "";

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("movefit_active_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("movefit_active_user");
    }
  }, [currentUser]);

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
      // Fallback local
    }
  }, []);

  const fetchBookedClassesFromBackend = useCallback(async () => {
    if (!activeUserId) {
      setBookedClasses([]);
      return;
    }

    try {
      const res = await fetch(`/api/users/${activeUserId}/bookings`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const formattedBookings: BookedClass[] = data.map((b: any) => ({
            bookingId: b.id || b.bookingId || `book-${Date.now()}`,
            classId: b.classId,
            className: b.className || b.classId,
            time: b.time,
            schedule: b.schedule || `${b.time}`,
            duration: "50 minutos",
            bookedAt: b.bookedAt || new Date().toISOString(),
          }));
          setBookedClasses(formattedBookings);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar agendamentos:", err);
    }
  }, [activeUserId]);

  const fetchRecommendationsFromBackend = useCallback(async () => {
    if (!activeUserId) {
      setSavedRecommendations([]);
      return;
    }

    try {
      const res = await fetch(`/api/recommendations/${activeUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setSavedRecommendations(data);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar recomendações:", err);
    }
  }, [activeUserId]);

  useEffect(() => {
    fetchClassesFromBackend();
    fetchBookedClassesFromBackend();
    fetchRecommendationsFromBackend();

    const interval = setInterval(() => {
      fetchClassesFromBackend();
      fetchBookedClassesFromBackend();
      fetchRecommendationsFromBackend();
    }, 4000);

    return () => clearInterval(interval);
  }, [fetchClassesFromBackend, fetchBookedClassesFromBackend, fetchRecommendationsFromBackend]);

  useEffect(() => {
    fetch("/api/users")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setRegisteredUsers(data);
        }
      })
      .catch((err) => console.error("Erro ao carregar usuários:", err));
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("movefit_active_user", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("movefit_active_user");
    setActiveTab("classes");
  };

  const handleRegisterUser = async (newUser: User) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        setRegisteredUsers((prev) => [...prev, data]);
        setCurrentUser(data);
        localStorage.setItem("movefit_active_user", JSON.stringify(data));
      } else {
        alert(data.error || "Erro ao realizar cadastro.");
      }
    } catch (error) {
      alert("Não foi possível conectar ao servidor.");
    }
  };

  const handleBookClass = (classId: string, time: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: "É necessário estar autenticado." };

    const targetClass = gymClasses.find(
      (c) =>
        c.id === classId ||
        (classId === "funcional" && c.id === "treino-funcional") ||
        (classId === "treino-funcional" && c.id === "funcional")
    );

    const className = targetClass ? targetClass.name : classId;

    fetch("/api/classes/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: activeUserId,
        classId,
        className,
        time,
      }),
    })
      .then(() => {
        fetchClassesFromBackend();
        fetchBookedClassesFromBackend();
      })
      .catch((err) => console.error("Erro ao agendar no servidor:", err));

    return {
      success: true,
      message: `Vaga confirmada para ${className} (${time})! Duração: 50 minutos.`,
    };
  };

  const handleCancelBooking = (bookingId: string) => {
    const booking = bookedClasses.find((b) => b.bookingId === bookingId);
    if (!booking || !activeUserId) return;

    fetch("/api/classes/cancel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: activeUserId,
        classId: booking.classId,
      }),
    })
      .then(() => {
        fetchClassesFromBackend();
        fetchBookedClassesFromBackend();
      })
      .catch((err) => console.error("Erro ao cancelar agendamento:", err));
  };

  const handleSaveRecommendation = (recData: Omit<SavedRecommendation, "id" | "savedAt" | "userId">) => {
    if (!activeUserId) return;

    fetch("/api/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: activeUserId,
        title: recData.title,
        category: recData.category,
        content: recData.content,
        sourceMessageId: recData.sourceMessageId,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((newRec) => {
        if (newRec) {
          setSavedRecommendations((prev) => [newRec, ...prev]);
        }
      })
      .catch((err) => console.error("Erro ao salvar recomendação:", err));
  };

  const handleRemoveRecommendation = (recId: string) => {
    if (!activeUserId) return;

    fetch(`/api/recommendations/${recId}`, {
      method: "DELETE",
    })
      .then(() => {
        setSavedRecommendations((prev) => prev.filter((r) => r.id !== recId && (r as any)._id !== recId));
      })
      .catch((err) => console.error("Erro ao remover recomendação:", err));
  };

  const handleUpdateUser = (updatedData: Partial<User>): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: "Nenhum usuário logado." };
    const updatedUser: User = { ...currentUser, ...updatedData };
    setCurrentUser(updatedUser);
    localStorage.setItem("movefit_active_user", JSON.stringify(updatedUser));
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
        savedCount={savedRecommendations.length}
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
            savedRecommendations={savedRecommendations}
            onSaveRecommendation={handleSaveRecommendation}
            onRemoveRecommendation={handleRemoveRecommendation}
            onNavigateToProfile={() => setActiveTab("profile")}
          />
        ) : (
          <ProfileTab
            user={currentUser}
            bookedClasses={bookedClasses}
            savedRecommendations={savedRecommendations}
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