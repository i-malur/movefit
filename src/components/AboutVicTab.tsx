import React from "react";
import {
    ShieldCheck,
    Volume2,
    CalendarCheck,
    Activity,
    Brain,
    MessageSquare,
    ArrowRight,
    HeartPulse,
    Image as ImageIcon,
} from "lucide-react";

interface AboutVicTabProps {
    onStartChat?: () => void;
}

export const AboutVicTab: React.FC<AboutVicTabProps> = ({ onStartChat }) => {
    const pillars = [
        {
            icon: <ShieldCheck className="w-6 h-6 text-[#00C0A3]" />,
            title: "Protocolo de Segurança Biomecânica",
            description:
                "Antes de sugerir qualquer série, a Vic cruza suas observações médicas cadastradas com dores relatadas no chat, bloqueando exercícios de risco articular ou cardiovascular.",
        },
        {
            icon: <Brain className="w-6 h-6 text-[#8B5CF6]" />,
            title: "Personalização Biométrica",
            description:
                "Adapta automaticamente volume, repetições e cadência considerando sua idade, peso, altura e nível de condicionamento físico atual.",
        },
        {
            icon: <Volume2 className="w-6 h-6 text-[#00C0A3]" />,
            title: "Interação por Voz e Demonstração",
            description:
                "Possui síntese de voz natural para acompanhar você durante o treino e exibe vídeos demonstrativos da postura correta de cada movimento.",
        },
        {
            icon: <CalendarCheck className="w-6 h-6 text-[#8B5CF6]" />,
            title: "Agendamento Inteligente",
            description:
                "Reserva ou cancela suas vagas diretamente na grade oficial de aulas coletivas da MoveFIT apenas conversando pelo chat.",
        },
    ];

    const steps = [
        {
            number: "01",
            title: "Leitura do Perfil",
            detail: "Analisa seu nível de treino, dados corporais e restrições médicas.",
        },
        {
            number: "02",
            title: "Triagem em Tempo Real",
            detail: "Identifica sintomas ou dores informadas na conversa do dia.",
        },
        {
            number: "03",
            title: "Prescrição Segura",
            detail: "Monta a rotina ideal, libera os vídeos e permite salvar no perfil.",
        },
    ];

    return (
        <div className="space-y-8 animate-fadeIn pb-10">
            {/* HERO COM VÍDEO ANIMADO SEM SOM */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E1B24] via-[#191620] to-[#131118] border border-[#2E2938] p-6 md:p-8">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#00C0A3]/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#8B5CF6]/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-8">
                    {/* Vídeo em loop, mudo e sem controles */}
                    <div className="relative shrink-0">
                        <div className="w-40 h-48 md:w-44 md:h-52 rounded-2xl bg-gradient-to-tr from-[#00C0A3] to-[#8B5CF6] p-[2px] shadow-xl shadow-[#8B5CF6]/20">
                            <div className="w-full h-full rounded-2xl overflow-hidden bg-white">
                                <video
                                    src="/assets/animacao.mp4"
                                    autoPlay
                                    loop
                                    muted
                                    playsInline
                                    poster="/assets/foto_vicIA.png"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-0.5 rounded-full text-[11px] font-semibold bg-[#00C0A3] text-[#110F15] shadow">
                            Personal IA 3D • Online
                        </span>
                    </div>

                    {/* Texto de Apresentação */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#25212E] border border-[#383146] text-xs text-[#00C0A3] font-medium">
                            <HeartPulse className="w-3.5 h-3.5" />
                            Assistente Virtual Oficial MoveFIT
                        </div>

                        <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                            Conheça a <span className="text-[#00C0A3]">Vic</span>, sua Personal Trainer Inteligente
                        </h2>

                        <p className="text-gray-300 text-sm md:text-base leading-relaxed max-w-2xl">
                            Desenvolvida para unir tecnologia, acolhimento e segurança física, a Vic acompanha sua jornada na MoveFIT criando treinos adaptados ao seu corpo, respeitando limites articulares e facilitando sua rotina na academia.
                        </p>

                        {onStartChat && (
                            <div className="pt-2">
                                <button
                                    onClick={onStartChat}
                                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00C0A3] hover:bg-[#00a88f] text-[#110F15] font-semibold text-sm transition-all cursor-pointer shadow-md shadow-[#00C0A3]/20"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Conversar com a Vic agora
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* INFOGRÁFICO DE EXERCÍCIOS E IDENTIDADE DA VIC */}
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-[#8B5CF6]" />
                    Guia Visual e Demonstrações da Vic
                </h3>

                {/* Banner Infográfico Principal */}
                <div className="rounded-2xl overflow-hidden border border-[#2E2938] bg-[#1A1721] shadow-lg">
                    <img
                        src="/assets/vic_exercicios.png"
                        alt="Vic - Sua Assistente Virtual e Personal Trainer"
                        className="w-full h-auto object-contain"
                    />
                </div>

                {/* Cards com as outras duas imagens da personagem */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-[#1A1721] border border-[#2C2736] p-4 flex flex-col sm:flex-row items-center gap-4">
                        <img
                            src="/assets/vic_persona.png"
                            alt="Vic com uniforme oficial MoveFit"
                            className="w-32 h-32 rounded-xl object-cover shrink-0 border border-[#383146]"
                        />
                        <div className="text-center sm:text-left space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#8B5CF6]">
                                Identidade Oficial
                            </span>
                            <h4 className="text-base font-semibold text-white">
                                Uniforme & Presença MoveFIT
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Criada para representar a energia da academia MoveFIT, unindo proximidade humana, estilo moderno e motivação constante em cada treino.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-2xl bg-[#1A1721] border border-[#2C2736] p-4 flex flex-col sm:flex-row items-center gap-4">
                        <img
                            src="/assets/foto_vicIA.png"
                            alt="Retrato da Vic IA"
                            className="w-32 h-32 rounded-xl object-cover object-[50%_35%] shrink-0 border border-[#383146] bg-white"
                        />
                        <div className="text-center sm:text-left space-y-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#00C0A3]">
                                Comunicação Natural
                            </span>
                            <h4 className="text-base font-semibold text-white">
                                Empatia e Acolhimento
                            </h4>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                Treinada para ouvir suas dificuldades, adaptar rotinas em caso de desconforto físico e orientar cada exercício de forma clara e acessível.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* PILARES DE INTELIGÊNCIA */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-[#00C0A3]" />
                    O que a Vic faz por você
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pillars.map((item, idx) => (
                        <div
                            key={idx}
                            className="p-5 rounded-2xl bg-[#1A1721] border border-[#2C2736] hover:border-[#3E374C] transition-all space-y-2.5"
                        >
                            <div className="w-11 h-11 rounded-xl bg-[#24202D] flex items-center justify-center">
                                {item.icon}
                            </div>
                            <h4 className="text-base font-semibold text-white">{item.title}</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* COMO FUNCIONA NA PRÁTICA */}
            <div className="rounded-2xl bg-[#1A1721] border border-[#2C2736] p-6">
                <h3 className="text-lg font-semibold text-white mb-4">
                    Como funciona o raciocínio de treino seguro
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {steps.map((step) => (
                        <div
                            key={step.number}
                            className="p-4 rounded-xl bg-[#14111A] border border-[#262230] flex flex-col gap-1.5"
                        >
                            <span className="text-xs font-bold text-[#00C0A3] tracking-widest">
                                ETAPA {step.number}
                            </span>
                            <h4 className="text-sm font-semibold text-white">{step.title}</h4>
                            <p className="text-xs text-gray-400 leading-relaxed">{step.detail}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-5 p-3.5 rounded-xl bg-[#00C0A3]/10 border border-[#00C0A3]/25 text-xs text-gray-300 leading-relaxed">
                    <strong className="text-[#00C0A3]">Aviso de Saúde:</strong> A Vic atua como suporte inteligente de orientação física e bem-estar, mas não substitui avaliação médica ou acompanhamento presencial de profissionais de Educação Física e Fisioterapia.
                </div>
            </div>
        </div>
    );
};