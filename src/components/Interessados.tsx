import React, { useState, useTransition } from "react";
import { InterestedPerson, StudySeries } from "../types";
import { Search, Plus, Trash2, Edit, ChevronUp, AlertCircle } from "lucide-react";

interface InteressadosProps {
  interessados: InterestedPerson[];
  series: StudySeries[];
  onOpenNewInteressadoModal: () => void;
  onEdit: (item: InterestedPerson) => void;
  onDelete: (id: string) => void;
  onAddStudy: (id: string) => Promise<void>;
  statusPreset?: string;
  seriesPreset?: string;
  interestPreset?: string;
  churchPreset?: string;
  onClearPresets?: () => void;
}

export default function Interessados({
  interessados,
  series,
  onOpenNewInteressadoModal,
  onEdit,
  onDelete,
  onAddStudy,
  statusPreset,
  seriesPreset,
  interestPreset,
  churchPreset,
  onClearPresets
}: InteressadosProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>(statusPreset || "Todos");
  const [selectedInterest, setSelectedInterest] = useState<string>(interestPreset || "Todos");
  const [selectedSerie, setSelectedSerie] = useState<string>(seriesPreset || "Todas");
  const [incrementingId, setIncrementingId] = useState<string | null>(null);

  const statusOptions = [
    "Todos",
    "Ativo",
    "Pausado",
    "Desinteressado",
    "Concluído",
    "Pronto para apelo",
    "Pronto para batismo",
    "Batismo Realizado"
  ];

  const interestOptions = ["Todos", "Alto", "Médio", "Baixo"];

  function normalizeText(text: string = ""): string {
    return String(text)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  // Handle direct study increment
  async function handleIncrement(item: InterestedPerson) {
    if (Number(item.estudoAtual || 0) >= Number(item.totalEstudos || 0)) return;
    setIncrementingId(item.id);
    try {
      await onAddStudy(item.id);
    } finally {
      setIncrementingId(null);
    }
  }

  // Filter candidates
  const filteredList = interessados.filter((item) => {
    // Search query match
    const search = normalizeText(searchTerm);
    const instructorsText = item.instrutorNomes?.join(", ") || "";
    const matchesSearch = !search ||
      normalizeText(item.nome).includes(search) ||
      normalizeText(item.telefone).includes(search) ||
      normalizeText(item.igrejaNome || "").includes(search) ||
      normalizeText(instructorsText).includes(search) ||
      normalizeText(item.serieNome || "").includes(search);

    // Filter preset overrides if present
    const statFilter = statusPreset && selectedStatus === "Todos" ? statusPreset : selectedStatus;
    const matchesStatus = statFilter === "Todos" || item.status === statFilter;

    const intFilter = interestPreset && selectedInterest === "Todos" ? interestPreset : selectedInterest;
    const matchesInterest = intFilter === "Todos" || item.interesse === intFilter;

    const serFilter = seriesPreset && selectedSerie === "Todas" ? seriesPreset : selectedSerie;
    const matchesSerie = serFilter === "Todas" || item.serieId === serFilter;

    const matchesChurch = !churchPreset || item.igrejaId === churchPreset;

    return matchesSearch && matchesStatus && matchesInterest && matchesSerie && matchesChurch;
  });

  // Pill styling configurations
  const getStatusPillClass = (statusStr: string): string => {
    switch (statusStr) {
      case "Ativo": return "bg-green-100 text-green-800 border-green-200";
      case "Pausado": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Desinteressado": return "bg-rose-100 text-rose-800 border-rose-200";
      case "Concluído": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Pronto para apelo": return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "Pronto para batismo": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Batismo Realizado": return "bg-purple-100 text-purple-800 border-purple-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const getInterestPillClass = (level: string): string => {
    switch (level) {
      case "Alto": return "bg-green-100 text-green-800 border-green-200";
      case "Médio": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Baixo": return "bg-rose-100 text-rose-800 border-rose-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const hasActivePresetFilters = !!(statusPreset || seriesPreset || interestPreset || churchPreset);

  return (
    <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-6">
      
      {/* Table Title and Preset feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-display font-black text-slate-800 text-[19px]">Lista de Interessados</h3>
          <p className="text-slate-500 text-xs mt-1">Busque, filtre e acompanhe o andamento geral dos estudos bíblicos.</p>
        </div>

        {hasActivePresetFilters && (
          <div className="flex items-center gap-2 bg-emerald-50 px-3.5 py-2 rounded-xl border border-emerald-100 shrink-0">
            <span className="text-xs font-bold text-emerald-800 select-none">Filtro ativo aplicado!</span>
            <button
              onClick={onClearPresets}
              className="text-[10px] font-black uppercase text-emerald-900 bg-emerald-200/50 hover:bg-emerald-200 px-2 py-0.5 rounded transition-smooth ml-1"
            >
              Limpar Filtro
            </button>
          </div>
        )}
      </div>

      {/* Modern Filter toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9.5 pr-4 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusPreset || selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          disabled={!!statusPreset}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-70"
        >
          {statusOptions.map((opt) => (
            <option key={opt} value={opt}>
              Status: {opt}
            </option>
          ))}
        </select>

        {/* Interest Filter */}
        <select
          value={interestPreset || selectedInterest}
          onChange={(e) => setSelectedInterest(e.target.value)}
          disabled={!!interestPreset}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-70"
        >
          {interestOptions.map((opt) => (
            <option key={opt} value={opt}>
              Interesse: {opt}
            </option>
          ))}
        </select>

        {/* Study Series filter */}
        <select
          value={seriesPreset || selectedSerie}
          onChange={(e) => setSelectedSerie(e.target.value)}
          disabled={!!seriesPreset}
          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-70"
        >
          <option value="Todas">Todas as séries</option>
          {series.map((ser) => (
            <option key={ser.id} value={ser.id}>
              {ser.nome}
            </option>
          ))}
        </select>

      </div>

      {/* Data Table segment */}
      <div className="w-full overflow-hidden border border-slate-100 rounded-2xl bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-slate-500 min-w-[900px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 select-none">
                <th className="px-6 py-4">Nome & Contato</th>
                <th className="px-5 py-4">Instrutores</th>
                <th className="px-5 py-4">Estudo / Série</th>
                <th className="px-5 py-4">Progresso Geral</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-center">Interesse</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2 select-none text-slate-400">
                      <AlertCircle className="w-8 h-8 text-slate-300" />
                      <span className="font-semibold text-sm">Nenhum interessado corresponde ao filtro configurado.</span>
                      <span className="text-xs">Tente ajustar seus termos de busca ou filtros de coluna.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isFinished = Number(item.estudoAtual || 0) >= Number(item.totalEstudos || 0);
                  const isPendingStudy = incrementingId === item.id;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-smooth group font-medium text-xs text-slate-700">
                      
                      {/* Name & phone & church label */}
                      <td className="px-6 py-4">
                        <div className="font-extrabold text-slate-800 text-sm leading-snug">{item.nome}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1 tracking-wide">{item.telefone || "Sem telefone"}</div>
                        <div className="text-[10px] text-emerald-700 font-extrabold mt-0.5 tracking-wider uppercase">
                          {item.igrejaNome} • {item.distrito}
                        </div>
                      </td>

                      {/* Associated instructors */}
                      <td className="px-5 py-4 text-slate-650 max-w-[150px]">
                        <p className="line-clamp-2 leading-relaxed">
                          {item.instrutorNomes?.join(", ") || "Sem instrutor vinculado"}
                        </p>
                      </td>

                      {/* Studio series label */}
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        {item.serieNome || "Catálogo básico"}
                      </td>

                      {/* Progress visual and text */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1 select-none">
                          <span>{item.estudoAtual} de {item.totalEstudos}</span>
                          <span>{item.porcentagem || 0}%</span>
                        </div>
                        <div className="w-28 bg-slate-100 h-2 rounded-full overflow-hidden select-none">
                          <div 
                            className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
                            style={{ width: `${item.porcentagem || 0}%` }}
                          />
                        </div>
                      </td>

                      {/* Status indicator pill */}
                      <td className="px-5 py-4 text-center select-none">
                        <span className={`inline-block px-2.5 py-1 text-[9px] font-black border uppercase tracking-wider rounded-full ${getStatusPillClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>

                      {/* Interest level indicator pill */}
                      <td className="px-5 py-4 text-center select-none">
                        <span className={`inline-block px-2.5 py-1 text-[9px] font-black border uppercase tracking-wider rounded-full ${getInterestPillClass(item.interesse)}`}>
                          {item.interesse}
                        </span>
                      </td>

                      {/* CRUD Actions */}
                      <td className="px-6 py-4 select-none">
                        <div className="flex items-center justify-center gap-1.5 shrink-0">
                          
                          {/* Increment studies counter by +1 quickly */}
                          <button
                            onClick={() => handleIncrement(item)}
                            disabled={isFinished || isPendingStudy}
                            title={isFinished ? "Estudos concluídos" : "+1 Estudo finalizado"}
                            className="p-2 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 hover:border-emerald-350 disabled:opacity-40 disabled:pointer-events-none rounded-xl transition-smooth flex items-center gap-1.5"
                          >
                            {isPendingStudy ? (
                              <div className="w-3.5 h-3.5 border-2 border-emerald-700/30 border-t-emerald-700 rounded-full animate-spin" />
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                            <span className="text-[10px] font-black uppercase tracking-wider">+1 Cap</span>
                          </button>

                          {/* Trigger update modal */}
                          <button
                            onClick={() => onEdit(item)}
                            title="Editar cadastro"
                            className="p-2 text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-smooth"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Prompt deletion */}
                          <button
                            onClick={() => onDelete(item.id)}
                            title="Excluir cadastro"
                            className="p-2 text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 rounded-xl transition-smooth"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
