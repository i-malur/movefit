import React, { useState, useRef } from "react";
import {
  Dumbbell,
  LogIn,
  UserPlus,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Eye,
  EyeOff,
  CalendarCheck,
  Check,
  Building2,
  Info,
  ArrowRight,
  Scale,
  Ruler,
} from "lucide-react";
import { User, TrainingLevel } from "../types";

interface AuthViewProps {
  onLogin: (user: User) => void;
  registeredUsers?: User[];
  onRegisterUser?: (user: User) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  onLogin,
  registeredUsers = [],
  onRegisterUser,
}) => {
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const loginUsernameRef = useRef<HTMLInputElement>(null);

  // Register form state
  const [regFullName, setRegFullName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regLevel, setRegLevel] = useState<TrainingLevel>("Iniciante");
  const [regWeight, setRegWeight] = useState("");
  const [regHeight, setRegHeight] = useState("");
  const [regMedicalNotes, setRegMedicalNotes] = useState("Nenhuma");
  const [regMatricula, setRegMatricula] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regErrors, setRegErrors] = useState<string[]>([]);

  // Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdUserModalData, setCreatedUserModalData] = useState<any | null>(null);

  // Real-time password requirement flags
  const passLength = regPassword.length >= 8;
  const passUpper = /[A-Z]/.test(regPassword);
  const passLower = /[a-z]/.test(regPassword);
  const passNumber = /[0-9]/.test(regPassword);
  const passSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(regPassword);
  const isPasswordValid = passLength && passUpper && passLower && passNumber && passSpecial;

  // Limpa todos os campos do cadastro
  const resetRegisterForm = () => {
    setRegFullName("");
    setRegEmail("");
    setRegUsername("");
    setRegPassword("");
    setRegLevel("Iniciante");
    setRegWeight("");
    setRegHeight("");
    setRegMedicalNotes("Nenhuma");
    setRegMatricula("");
    setRegErrors([]);
  };

  // Formatador do username corporativo
  const generateFitUsername = (fullName: string): string => {
    const cleanName = fullName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

    return cleanName ? `${cleanName}.fit` : "";
  };

  const handleFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRegFullName(val);
    setRegUsername(generateFitUsername(val));
  };

  const handleFillDemo = () => {
    setLoginUsername("marialuiza.fit");
    setLoginPassword("Movefit@2026");
    setLoginError(null);
  };

  // Handler de Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    const trimmedUser = loginUsername.trim();
    const trimmedPass = loginPassword;

    if (!trimmedUser || !trimmedPass) {
      setLoginError("Usuário/Matrícula e Senha são campos obrigatórios.");
      setLoginUsername("");
      setLoginPassword("");
      loginUsernameRef.current?.focus();
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: trimmedUser, password: trimmedPass }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        onLogin(data.user);
      } else {
        const foundUser = registeredUsers.find(
          (u) =>
            (u.username?.toLowerCase() === trimmedUser.toLowerCase() ||
              u.matricula?.toLowerCase() === trimmedUser.toLowerCase()) &&
            u.password === trimmedPass
        );

        if (foundUser) {
          onLogin(foundUser);
        } else {
          setLoginError(data.error || "Credenciais inválidas. Usuário/matrícula ou senha incorretos.");
          setLoginUsername("");
          setLoginPassword("");
          loginUsernameRef.current?.focus();
        }
      }
    } catch (err) {
      const foundUser = registeredUsers.find(
        (u) =>
          (u.username?.toLowerCase() === trimmedUser.toLowerCase() ||
            u.matricula?.toLowerCase() === trimmedUser.toLowerCase()) &&
          u.password === trimmedPass
      );

      if (foundUser) {
        onLogin(foundUser);
      } else {
        setLoginError("Credenciais inválidas. Usuário/matrícula ou senha incorretos.");
        setLoginUsername("");
        setLoginPassword("");
        loginUsernameRef.current?.focus();
      }
    }
  };

  // Handler de Cadastro
 const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegErrors([]);

    const errors: string[] = [];

    // 1. Validação do Nome Completo
    const trimmedFullName = regFullName.trim();
    const words = trimmedFullName.split(/\s+/).filter(Boolean);
    if (trimmedFullName.length < 5 || words.length < 2) {
      errors.push("Nome Completo: informe ao menos dois nomes (nome e sobrenome, mín. 5 caracteres).");
    }

    // 2. Validação do E-mail (Normalizado e sem maiúsculas/espaços ocultos)
    const trimmedEmail = regEmail.trim().toLowerCase();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      errors.push("E-mail: formato inválido (exemplo: usuario@email.com).");
    }

    // 3. Validação da Senha
    if (!isPasswordValid) {
      errors.push("Senha: deve atender a todos os 5 requisitos de segurança.");
    }

    // 4. Validação da Matrícula (Remove hífen ou espaços acidentais para comparar limpo)
    const rawMatricula = regMatricula.trim().toUpperCase().replace(/\s+/g, "");
    const matriculaRegex = /^MF-202[0-9]-[0-9]{3}$/i;

    if (!rawMatricula) {
      errors.push("Número de Matrícula: campo obrigatório.");
    } else if (!matriculaRegex.test(rawMatricula)) {
      errors.push("Número de Matrícula: formato inválido (ex: MF-2026-001).");
    }

    if (errors.length > 0) {
      setRegErrors(errors);
      return;
    }

    // Payload pronto para o backend SQLite
    const newUserPayload = {
      fullName: trimmedFullName,
      email: trimmedEmail,
      password: regPassword,
      trainingLevel: regLevel,
      weight: regWeight ? parseFloat(regWeight.replace(',', '.')) : null,
      height: regHeight ? parseFloat(regHeight.replace(',', '.')) : null,
      medicalNotes: regMedicalNotes.trim() || "Nenhuma",
      matricula: rawMatricula,
    };

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUserPayload),
      });

      const data = await res.json();

      if (res.ok) {
        setCreatedUserModalData(data);
        setShowSuccessModal(true);
        resetRegisterForm();
      } else {
        setRegErrors([data.error || "Erro ao realizar o cadastro no servidor."]);
      }
    } catch (err) {
      setRegErrors(["Não foi possível conectar ao servidor para salvar o cadastro."]);
    }
  };
  
  const handleCloseModalAndGoToLogin = () => {
    setShowSuccessModal(false);
    if (createdUserModalData?.username) {
      setLoginUsername(createdUserModalData.username);
    }
    setCreatedUserModalData(null);
    setActiveTab("login");
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-[#1E1B24] relative">
      {/* ================= POP-UP MODAL DE SUCESSO ================= */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-[#292433] border border-[#00C0A3]/40 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 bg-[#00C0A3]/20 border border-[#00C0A3]/40 text-[#00C0A3] rounded-2xl flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-2xl font-bold text-white">Cadastro Realizado!</h3>
              <p className="text-zinc-300 text-xs sm:text-sm mt-1">
                Sua conta foi criada com sucesso na base de dados do MoveFIT.
              </p>
            </div>

            {createdUserModalData && (
              <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-4 text-left space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center border-b border-[#3E374C] pb-2">
                  <span className="text-[#B0A8B9]">Nome:</span>
                  <span className="text-white font-medium">{createdUserModalData.fullName}</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#3E374C] pb-2">
                  <span className="text-[#B0A8B9]">Usuário Corporativo:</span>
                  <span className="text-[#00C0A3] font-mono font-bold">{createdUserModalData.username}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[#B0A8B9]">Matrícula:</span>
                  <span className="text-white font-medium">{createdUserModalData.matricula}</span>
                </div>
              </div>
            )}

            <button
              onClick={handleCloseModalAndGoToLogin}
              className="w-full h-11 bg-[#00C0A3] hover:bg-[#00a88f] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-lg"
            >
              Ir para o Login <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Brand Header */}
      <div className="text-center mb-6 max-w-lg">
        <div className="inline-flex items-center justify-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#845EC2] to-[#00C0A3] p-[2px] shadow-lg">
            <div className="w-full h-full bg-[#1E1B24] rounded-[10px] flex items-center justify-center">
              <Dumbbell className="w-6 h-6 text-[#00C0A3]" />
            </div>
          </div>
          <div className="text-left">
            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white block">
              Move<span className="text-[#00C0A3]">FIT</span>
            </span>
            <span className="text-[11px] font-semibold text-[#B0A8B9] tracking-wider uppercase block">
              Academia & Treinos
            </span>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div
        className={`w-full transition-all duration-200 ${
          activeTab === "register" ? "max-w-2xl" : "max-w-md"
        }`}
      >
        <div className="bg-[#292433] border border-[#3E374C] rounded-2xl p-6 sm:p-8 shadow-xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#845EC2] via-[#00C0A3] to-[#845EC2] rounded-t-2xl"></div>

          {/* Clean Tab Switcher */}
          <div className="grid grid-cols-2 bg-[#1E1B24] p-1 rounded-xl border border-[#3E374C] mb-6">
            <button
              id="tab-login"
              type="button"
              onClick={() => {
                setActiveTab("login");
                setLoginError(null);
              }}
              className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "login"
                  ? "bg-[#845EC2] text-white shadow"
                  : "text-[#B0A8B9] hover:text-white"
              }`}
            >
              <LogIn className="w-4 h-4" />
              Entrar
            </button>
            <button
              id="tab-register"
              type="button"
              onClick={() => {
                setActiveTab("register");
                setRegErrors([]);
              }}
              className={`py-2.5 px-4 rounded-lg font-semibold text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === "register"
                  ? "bg-[#00C0A3] text-white shadow"
                  : "text-[#B0A8B9] hover:text-white"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Cadastrar
            </button>
          </div>

          {/* ==================== LOGIN FORM ==================== */}
          {activeTab === "login" && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {loginError && (
                <div
                  id="login-error-alert"
                  className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 text-xs sm:text-sm text-red-200 flex items-start gap-2.5"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-amber-300">Erro de login</p>
                    <p className="text-red-200 mt-0.5">{loginError}</p>
                  </div>
                </div>
              )}

              <div className="bg-[#1E1B24] border border-[#3E374C] rounded-xl p-3 text-xs text-zinc-300 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[#00C0A3] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong className="text-white">Ainda não é aluno MoveFIT?</strong> É necessário comparecer <strong>presencialmente à academia</strong> para realizar sua matrícula oficial e obter seu número de acesso.
                </p>
              </div>

              <div>
                <label htmlFor="login-username" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Usuário ou Matrícula <span className="text-red-400">*</span>
                </label>
                <input
                  id="login-username"
                  ref={loginUsernameRef}
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="Seu usuário ou matrícula (ex: MF-2026-001)"
                  className="w-full h-11 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                />
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Senha <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showLoginPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-11 px-3.5 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    aria-label="Mostrar ou ocultar senha"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                className="w-full h-11 bg-[#845EC2] hover:bg-[#734db1] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer mt-2"
              >
                <LogIn className="w-4 h-4" />
                Entrar
              </button>

              <div className="pt-3 border-t border-[#3E374C] flex items-center justify-between text-xs text-[#B0A8B9]">
                <span>Conta de teste:</span>
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="text-[#00C0A3] hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Preencher Demo
                </button>
              </div>
            </form>
          )}

          {/* ==================== REGISTRATION FORM ==================== */}
          {activeTab === "register" && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div
                id="aviso-matricula-presencial"
                className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-amber-200/95 flex items-start gap-3 shadow-inner"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Building2 className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-300">Aviso: Matrícula Obrigatória</span>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/25 border border-amber-500/40 text-amber-300">
                      Estrutura MF-202X-00X
                    </span>
                  </div>
                  <p className="text-zinc-200 leading-relaxed text-xs">
                    O <strong>número de matrícula é obrigatório</strong> e deve seguir exclusivamente a estrutura <strong>MF-202X-00X</strong>. Se você ainda não possui matrícula ativa, <strong>procure a MoveFIT presencialmente na academia</strong> para se matricular na recepção física.
                  </p>
                </div>
              </div>

              {regErrors.length > 0 && (
                <div
                  id="registration-errors-banner"
                  className="bg-red-500/10 border border-red-500/40 rounded-xl p-3.5 text-xs text-red-200"
                >
                  <div className="flex items-center gap-2 text-amber-300 font-semibold mb-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Corrija os seguintes campos:</span>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-zinc-300">
                    {regErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Nome Completo */}
                <div>
                  <label htmlFor="reg-fullname" className="block text-xs font-medium text-zinc-300 mb-1">
                    Nome Completo <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="reg-fullname"
                    type="text"
                    value={regFullName}
                    onChange={handleFullNameChange}
                    placeholder="Seu nome e sobrenome"
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                  />
                </div>

                {/* 2. E-mail */}
                <div>
                  <label htmlFor="reg-email" className="block text-xs font-medium text-zinc-300 mb-1">
                    E-mail <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="seuemail@exemplo.com"
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                  />
                </div>

                {/* 3. Usuário Corporativo (.fit) - Gerado Automaticamente */}
                <div>
                  <label htmlFor="reg-username" className="block text-xs font-medium text-zinc-300 mb-1">
                    Usuário Movefit <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    readOnly
                    value={regUsername}
                    placeholder="Gerado automaticamente (.fit)"
                    className="w-full h-10 px-3 bg-[#17141D] border border-[#3E374C] rounded-lg text-[#00C0A3] font-mono font-semibold placeholder-zinc-600 focus:outline-none cursor-not-allowed text-sm"
                  />
                </div>

                {/* 4. Nível do Usuário */}
                <div>
                  <label htmlFor="reg-level" className="block text-xs font-medium text-zinc-300 mb-1">
                    Nível do Usuário <span className="text-red-400">*</span>
                  </label>
                  <select
                    id="reg-level"
                    value={regLevel}
                    onChange={(e) => setRegLevel(e.target.value as TrainingLevel)}
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm cursor-pointer"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>

                {/* 5. Peso (kg) e Altura (cm) */}
                <div>
                  <label htmlFor="reg-weight" className="block text-xs font-medium text-zinc-300 mb-1">
                    Peso (kg)
                  </label>
                  <input
                    id="reg-weight"
                    type="number"
                    step="0.1"
                    value={regWeight}
                    onChange={(e) => setRegWeight(e.target.value)}
                    placeholder="Ex: 65.5"
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="reg-height" className="block text-xs font-medium text-zinc-300 mb-1">
                    Altura (cm)
                  </label>
                  <input
                    id="reg-height"
                    type="number"
                    value={regHeight}
                    onChange={(e) => setRegHeight(e.target.value)}
                    placeholder="Ex: 170"
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                  />
                </div>

                {/* 6. Senha */}
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-password" className="block text-xs font-medium text-zinc-300">
                      Senha <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[11px]">
                      {isPasswordValid ? (
                        <span className="text-[#00C0A3] font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Requisitos atendidos
                        </span>
                      ) : (
                        <span className="text-[#B0A8B9]">Atenda aos parâmetros abaixo:</span>
                      )}
                    </span>
                  </div>

                  <div className="relative">
                    <input
                      id="reg-password"
                      type={showRegPassword ? "text" : "password"}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Crie sua senha"
                      className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                      aria-label="Mostrar ou ocultar senha"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        passLength
                          ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] font-medium"
                          : "bg-[#1E1B24] border-[#3E374C] text-zinc-400"
                      }`}
                    >
                      <Check className={`w-3 h-3 ${passLength ? "text-[#00C0A3]" : "text-zinc-600"}`} />
                      8+ caracteres
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        passUpper
                          ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] font-medium"
                          : "bg-[#1E1B24] border-[#3E374C] text-zinc-400"
                      }`}
                    >
                      <Check className={`w-3 h-3 ${passUpper ? "text-[#00C0A3]" : "text-zinc-600"}`} />
                      1 maiúscula (A-Z)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        passLower
                          ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] font-medium"
                          : "bg-[#1E1B24] border-[#3E374C] text-zinc-400"
                      }`}
                    >
                      <Check className={`w-3 h-3 ${passLower ? "text-[#00C0A3]" : "text-zinc-600"}`} />
                      1 minúscula (a-z)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        passNumber
                          ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] font-medium"
                          : "bg-[#1E1B24] border-[#3E374C] text-zinc-400"
                      }`}
                    >
                      <Check className={`w-3 h-3 ${passNumber ? "text-[#00C0A3]" : "text-zinc-600"}`} />
                      1 número (0-9)
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border transition-colors ${
                        passSpecial
                          ? "bg-[#00C0A3]/10 border-[#00C0A3]/40 text-[#00C0A3] font-medium"
                          : "bg-[#1E1B24] border-[#3E374C] text-zinc-400"
                      }`}
                    >
                      <Check className={`w-3 h-3 ${passSpecial ? "text-[#00C0A3]" : "text-zinc-600"}`} />
                      1 caractere especial (!@#\$...)
                    </span>
                  </div>
                </div>

                {/* 7. Matrícula */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="reg-matricula" className="block text-xs font-semibold text-zinc-300">
                      Número de Matrícula <span className="text-red-400">*</span>
                    </label>
                    <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 font-mono">
                      <Building2 className="w-3 h-3 text-amber-400" />
                      MF-202X-00X
                    </span>
                  </div>
                  <input
                    id="reg-matricula"
                    type="text"
                    required
                    value={regMatricula}
                    onChange={(e) => setRegMatricula(e.target.value.toUpperCase())}
                    placeholder="MF-2026-001"
                    maxLength={11}
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white font-mono placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm uppercase tracking-wider"
                  />
                  <p className="text-[11px] text-amber-300/90 mt-1 flex items-start gap-1">
                    <Info className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      Estrutura: <strong>MF-202X-00X</strong>. Se não possuir, procure a MoveFIT presencialmente.
                    </span>
                  </p>
                </div>

                {/* 8. Restrição / Observação Médica */}
                <div>
                  <label htmlFor="reg-medical" className="block text-xs font-medium text-zinc-300 mb-1">
                    Restrição Médica <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="reg-medical"
                    type="text"
                    value={regMedicalNotes}
                    onChange={(e) => setRegMedicalNotes(e.target.value)}
                    placeholder="Nenhuma ou detalhe restrições"
                    className="w-full h-10 px-3 bg-[#1E1B24] border border-[#3E374C] rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-[#00C0A3] focus:ring-1 focus:ring-[#00C0A3] text-sm"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                id="btn-submit-register"
                type="submit"
                className="w-full h-11 bg-[#00C0A3] hover:bg-[#00a88f] text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer mt-3"
              >
                <UserPlus className="w-4 h-4" />
                Finalizar Cadastro
              </button>

              <div className="pt-2 text-center text-xs text-[#B0A8B9]">
                Já tem conta?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("login");
                    setLoginError(null);
                  }}
                  className="text-[#00C0A3] hover:underline font-semibold cursor-pointer"
                >
                  Entrar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-6 flex items-center gap-4 text-xs text-[#B0A8B9]">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#00C0A3]" /> Ambiente Seguro
        </span>
        <span>•</span>
        <span className="flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-[#845EC2]" /> Aulas de 50 min
        </span>
      </div>
    </div>
  );
};