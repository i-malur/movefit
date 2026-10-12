const ExerciseCard: React.FC<{ exerciseName: string }> = ({ exerciseName }) => {
  // Formata o nome do exercício (ex: "wall_push_up" -> "Wall Push Up")
  const cleanName = exerciseName.replace(/_/g, " ").trim();
  const formattedTitle = cleanName
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  // Busca interativa no YouTube para a execução correta
  const youtubeQuery = encodeURIComponent(`como fazer exercicio ${cleanName} tecnica correta`);
  const youtubeUrl = `https://www.youtube.com/results?search_query=${youtubeQuery}`;

  return (
    <div className="bg-[#1E1B24] border border-[#00C0A3]/30 hover:border-[#00C0A3]/60 rounded-xl p-3.5 shadow-md space-y-3 transition-all">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00C0A3]/10 border border-[#00C0A3]/30 flex items-center justify-center text-[#00C0A3]">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">{formattedTitle}</h4>
            <p className="text-[10px] text-[#B0A8B9]">Movimento Demonstrativo</p>
          </div>
        </div>
      </div>

      {/* Card Visual Interativo */}
      <div className="w-full h-24 bg-[#292433] rounded-lg border border-[#3E374C] p-3 flex flex-col items-center justify-center text-center gap-1.5 relative overflow-hidden group">
        <Dumbbell className="w-7 h-7 text-[#845EC2] group-hover:scale-110 transition-transform" />
        <span className="text-[11px] font-medium text-zinc-300">
          Guia de Postura e Execução
        </span>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-[#3E374C]/60">
        <span className="text-[10px] text-zinc-400">Técnica Recomendada</span>
        <a
          href={youtubeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] font-bold text-[#00C0A3] hover:text-[#00a88f] flex items-center gap-1 transition-colors"
        >
          Ver Demonstração <ArrowRight className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
};