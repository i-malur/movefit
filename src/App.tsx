import React, { useState, useEffect } from "react";
import { User, GymClass, BookedClass } from "./types";
import { INITIAL_CLASSES } from "./data/initialClasses";
import { AuthView } from "./components/AuthView";
import { UserHeader } from "./components/UserHeader";
import { ClassesTab } from "./components/ClassesTab";
import { VicChatTab } from "./components/VicChatTab";

// Default demo user to enable immediate testing or login
const DEFAULT_DEMO_USER: User = {
  id: "user-demo-01",
  fullName: "Maria Luiza Fernandes",
  email: "marialuizafernandes384@gmail.com",
  username: "marialuiza.fit",
  password: "Movefit@2026",
  trainingLevel: "Intermediário",
  medicalNotes: "Nenhuma",
  matricula: "MF-2026-0101",
  createdAt: "2026-01-10T10:00:00Z",
};

export default function App() {
  // Users state
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

  // Active session
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem("movefit_active_user");
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  });

  // Gym classes state (spots available)
  const [gymClasses, setGymClasses] = useState<GymClass[]>(() => {
    try {
      const saved = localStorage.getItem("movefit_classes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize and merge with INITIAL_CLASSES according to official script
          return INITIAL_CLASSES.map((initCls) => {
            const match = parsed.find(
              (p: any) =>
                p.id === initCls.id ||
                (initCls.id === "funcional" && p.id === "treino-funcional")
            );
            if (!match) return initCls;
            return {
              ...initCls,
              slots: initCls.slots.map((initSlot) => {
                const savedSlot = match.slots?.find((s: any) => s.time === initSlot.time);
                return savedSlot ? { ...initSlot, bookedSpots: savedSlot.bookedSpots } : initSlot;
              }),
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_CLASSES;
  });

  // Booked classes for current user
  const [bookedClasses, setBookedClasses] = useState<BookedClass[]>([]);

  // Navigation tab
  const [activeTab, setActiveTab] = useState<"classes" | "vic">("classes");

  // Save registered users whenever changed
  useEffect(() => {
    localStorage.setItem("movefit_users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Save active user whenever changed
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("movefit_active_user", JSON.stringify(currentUser));
      // Load user's bookings
      try {
        const savedBookings = localStorage.getItem(`movefit_bookings_${currentUser.id}`);
        if (savedBookings) {
          setBookedClasses(JSON.parse(savedBookings));
        } else {
          // Pre-populate demo booking for Pilates if demo user
          if (currentUser.id === DEFAULT_DEMO_USER.id) {
            const initialDemoBooking: BookedClass = {
              bookingId: "book-demo-1",
              classId: "pilates",
              className: "Pilates",
              days: "Seg / Qua / Sex",
              time: "10:00",
              schedule: "Seg / Qua / Sex • 10:00",
              duration: "50 minutos",
              iconName: "Activity",
              bookedAt: new Date().toISOString(),
            };
            setBookedClasses([initialDemoBooking]);
          } else {
            setBookedClasses([]);
          }
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      localStorage.removeItem("movefit_active_user");
      setBookedClasses([]);
    }
  }, [currentUser]);

  // Save bookings whenever changed
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(`movefit_bookings_${currentUser.id}`, JSON.stringify(bookedClasses));
    }
  }, [bookedClasses, currentUser]);

  // Save gym classes whenever updated
  useEffect(() => {
    localStorage.setItem("movefit_classes", JSON.stringify(gymClasses));
  }, [gymClasses]);

  // Auth actions
  const handleLogin = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab("classes");
  };

  const handleRegisterUser = (newUser: User) => {
    setRegisteredUsers((prev) => [...prev, newUser]);
  };

  // Booking Logic: Users can book a class (spots decrease upon booking).
  // They cannot book the same class twice or book a full class.
  const handleBookClass = (classId: string, time: string): { success: boolean; message: string } => {
    if (!currentUser) return { success: false, message: "É necessário estar autenticado." };

    const targetClass = gymClasses.find(
      (c) =>
        c.id === classId ||
        (classId === "funcional" && c.id === "treino-funcional") ||
        (classId === "treino-funcional" && c.id === "funcional")
    );
    if (!targetClass) {
      return { success: false, message: "Aula não encontrada." };
    }

    const targetSlot = targetClass.slots.find((s) => s.time === time);
    if (!targetSlot) {
      return { success: false, message: "Horário não encontrado para esta aula." };
    }

    // 1. Check if user already booked this class
    const alreadyBooked = bookedClasses.some(
      (b) =>
        b.classId === targetClass.id ||
        (targetClass.id === "funcional" && b.classId === "treino-funcional") ||
        (targetClass.id === "treino-funcional" && b.classId === "funcional")
    );
    if (alreadyBooked) {
      return {
        success: false,
        message: `Você já está inscrito(a) em ${targetClass.name}. Cancele a vaga atual se quiser alterar o horário.`,
      };
    }

    // 2. Check if spots are full
    const availableSpots = targetSlot.totalSpots - targetSlot.bookedSpots;
    if (availableSpots <= 0) {
      return {
        success: false,
        message: `A turma de ${targetClass.name} das ${time} está com vagas esgotadas!`,
      };
    }

    // 3. Decrement available spots (increment bookedSpots)
    setGymClasses((prev) =>
      prev.map((cls) => {
        if (cls.id !== targetClass.id) return cls;
        return {
          ...cls,
          slots: cls.slots.map((slot) => {
            if (slot.time !== time) return slot;
            return {
              ...slot,
              bookedSpots: slot.bookedSpots + 1,
            };
          }),
        };
      })
    );

    // 4. Create new booking record
    const newBooking: BookedClass = {
      bookingId: `book-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      classId: targetClass.id,
      className: targetClass.name,
      days: targetClass.days,
      time: targetSlot.time,
      schedule: `${targetClass.days} • ${targetSlot.time}`,
      duration: "50 minutos",
      iconName: targetClass.iconName,
      bookedAt: new Date().toISOString(),
    };

    setBookedClasses((prev) => [...prev, newBooking]);

    return {
      success: true,
      message: `Vaga confirmada para ${targetClass.name} (${targetSlot.time})! Duração: 50 minutos.`,
    };
  };

  // Cancel / Remove booked slot mechanism
  const handleCancelBooking = (bookingId: string) => {
    const booking = bookedClasses.find((b) => b.bookingId === bookingId);
    if (!booking) return;

    // Restore spot in gymClasses
    setGymClasses((prev) =>
      prev.map((cls) => {
        if (
          cls.id !== booking.classId &&
          !(booking.classId === "funcional" && cls.id === "treino-funcional") &&
          !(booking.classId === "treino-funcional" && cls.id === "funcional")
        )
          return cls;
        return {
          ...cls,
          slots: cls.slots.map((slot) => {
            if (slot.time !== booking.time) return slot;
            return {
              ...slot,
              bookedSpots: Math.max(0, slot.bookedSpots - 1),
            };
          }),
        };
      })
    );

    // Remove from user's booked classes
    setBookedClasses((prev) => prev.filter((b) => b.bookingId !== bookingId));
  };

  // Render view
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
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 pt-6">
        {activeTab === "classes" ? (
          <ClassesTab
            classes={gymClasses}
            bookedClasses={bookedClasses}
            onBookClass={handleBookClass}
            onCancelBooking={handleCancelBooking}
            onNavigateToVic={() => setActiveTab("vic")}
          />
        ) : (
          <VicChatTab
            user={currentUser}
            bookedClasses={bookedClasses}
            classes={gymClasses}
            onBookClass={handleBookClass}
            onCancelBooking={handleCancelBooking}
            onNavigateToClasses={() => setActiveTab("classes")}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#3E374C] py-6 text-center text-xs text-[#B0A8B9] bg-[#1E1B24]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} MoveFIT. Todos os direitos reservados. Treinos que transformam.</p>
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
