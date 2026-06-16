import React, { useState, useEffect } from "react";
import { InterestedPerson, StudySeries, Church, UserProfile, InstructorRef } from "../types";
import { collection, addDoc, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { X, Plus, Trash2, Calendar, BookOpen, AlertCircle } from "lucide-react";

interface InteressadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem: InterestedPerson | null;
  currentUser: UserProfile;
  series: StudySeries[];
  locais: Church[];
  usuarios: UserProfile[];
  onRefresh: () => Promise<void>;
  onShowMessage: (text: string, type: "success" | "error" | "info") => void;
  onShowLoading: (show: boolean) => void;
}

export default function InteressadosModal({
  isOpen,
  onClose,
  activeItem,
  currentUser,
  series,
  locais,
  usuarios,
  onRefresh,
  onShowMessage,
  onShowLoading
}: InteressadosModalProps) {
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [endereco, setEndereco] = useState("");
  const [igrejaId, setIgrejaId] = useState("");
  const [serieId, setSerieId] = useState("");
  const [estudoAtual, setEstudoAtual] = useState<number>(0);
  const [status, setStatus] = useState("Ativo");
  const [interesse, setInteresse] = useState<"Alto" | "Médio" | "Baixo">("Médio");
  const [ultimoContato, setUltimoContato] = useState("");
  const [observacoes, setObservacoes] = useState("");
  
  // Custom multi-instructor list
  const [instrutorIds, setInstrutorIds] = useState<string[]>([""]);

  const DISTRITO_FIXO = "Restinga";

  const statusOptions = [
    "Ativo",
    "Pausado",
    "Desinteressado",
    "Concluído",
    "Pronto para apelo",
    "Pronto para batismo",
    "Batismo Realizado"
  ];

  const quickMarkers = [
    { label: "Analfabeto", value: "Analfabeto." },
    { label: "Dificuldade de locomoção", value: "Dificuldade de locomoção." },
    { label: "Acompanhamento próximo", value: "Precisa de acompanhamento mais próximo." },
    { label: "Resistência familiar", value: "Resistência familiar." },
    { label: "Prefere estudo em áudio", value: "Prefere estudo em áudio." }
  ];

  // Fill up fields when editing, or set defaults when creating
  useEffect(() => {
    if (isOpen) {
      if (activeItem) {
        setNome(activeItem.nome || "");
        setTelefone(activeItem.telefone || "");
        setEndereco(activeItem.endereco || "");
        setIgrejaId(activeItem.igrejaId || "");
        setSerieId(activeItem.serieId || "");
        setEstudoAtual(activeItem.estudoAtual || 0);
        setStatus(activeItem.status || "Ativo");
        setInteresse(activeItem.interesse || "Médio");
        setUltimoContato(activeItem.ultimoContato || "");
        setObservacoes(activeItem.observacoes || "");
        
        // Multi-instructor mapping
        if (activeItem.instrutorIds && activeItem.instrutorIds.length > 0) {
          setInstrutorIds(activeItem.instrutorIds);
        } else {
          setInstrutorIds([""]);
        }
      } else {
        // Defaults on create
        setNome("");
        setTelefone("");
        setEndereco("");
        
        // Auto-lock for local leaders or members
        if (["local", "membro"].includes(currentUser.perfil)) {
          setIgrejaId(currentUser.igrejaId || "");
        } else {
          setIgrejaId("");
        }

        setSerieId("");
        setEstudoAtual(0);
        setStatus("Ativo");
        setInteresse("Médio");
        setUltimoContato(new Date().toISOString().slice(0, 10)); // default today
        setObservacoes("");

        // For member login, default first instructor slot as active user
        if (currentUser.perfil === "membro") {
          setInstrutorIds([currentUser.id]);
        } else {
          setInstrutorIds([""]);
        }
      }
    }
  }, [isOpen, activeItem, currentUser]);

  if (!isOpen) return null;

  // Active study parameters helper
  const selectedSerieObj = series.find(s => s.id === serieId);
  const totalStudies = selectedSerieObj ? selectedSerieObj.totalEstudos : 0;

  // Interactive metrics indicators
  const cappedEstudos = Math.min(Math.max(0, estudoAtual), totalStudies);
  const calculatedPercentage = totalStudies > 0 ? Math.round((cappedEstudos / totalStudies) * 100) : 0;
  const remainingStudies = Math.max(0, totalStudies - cappedEstudos);

  // Instructors list segmentable by profile role level
  const getInstructorsChoices = () => {
    if (currentUser.perfil === "admin" || currentUser.perfil === "distrital") {
      return usuarios.filter(u => u.ativo !== false);
    }
    if (currentUser.perfil === "local") {
      return usuarios.filter(u => u.ativo !== false && u.igrejaId === currentUser.igrejaId);
    }
    // Member only registers themselves, but can list other active congregation users
    return usuarios.filter(u => u.ativo !== false && u.igrejaId === currentUser.igrejaId);
  };

  const choiceInstructors = getInstructorsChoices();

  // Multi-instructor triggers
  function handleAddInstructor() {
    setInstrutorIds([...instrutorIds, ""]);
  }

  function handleRemoveInstructor(idx: number) {
    if (instrutorIds.length === 1) return;
    const next = [...instrutorIds];
    next.splice(idx, 1);
    setInstrutorIds(next);
  }

  function handleChangeInstructor(idx: number, val: string) {
    const next = [...instrutorIds];
    next[idx] = val;
    setInstrutorIds(next);
  }

  // Obs quick add dropdown selection
  function handleQuickMarkerSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) return;
    setObservacoes(prev => prev.trim() ? `${prev.trim()} ${val}` : val);
    e.target.value = ""; // reset dropdown
  }

  // Main Submit handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      onShowMessage("O nome do candidato é obrigatório.", "error");
      return;
    }
    if (!igrejaId) {
      onShowMessage("Por favor, selecione uma igreja local.", "error");
      return;
    }
    if (!serieId) {
      onShowMessage("Por favor, selecione uma série de lições.", "error");
      return;
    }

    // Process unique, valid non-empty instructors
    const uniqueInstructorIds = [...new Set(instrutorIds.filter(Boolean))];
    if (uniqueInstructorIds.length === 0) {
      onShowMessage("Por favor, selecione ao menos um instrutor para este candidato.", "error");
      return;
    }

    if (currentUser.perfil === "membro" && !uniqueInstructorIds.includes(currentUser.id)) {
      onShowMessage("Atenção: Você deve estar incluído entre os instrutores autorizados.", "error");
      return;
    }

    // Resolve details object
    const selectedChurchObj = locais.find(l => l.id === igrejaId);
    if (!selectedChurchObj) {
      onShowMessage("Associação inválida: Igreja não encontrada.", "error");
      return;
    }

    const resolvedInstructors: InstructorRef[] = uniqueInstructorIds
      .map((id) => {
        const match = usuarios.find(u => u.id === id);
        return match ? { id: match.id, nome: match.nome, perfil: match.perfil } : null;
      })
      .filter(Boolean) as InstructorRef[];

    const instructorNames = resolvedInstructors.map(i => i.nome);

    const payload = {
      nome: nome.trim(),
      telefone: telefone.trim(),
      endereco: endereco.trim(),
      igrejaId: selectedChurchObj.id,
      igrejaNome: selectedChurchObj.nome,
      igrejaTipo: selectedChurchObj.tipo || "igreja",
      distrito: DISTRITO_FIXO,

      instrutorIds: uniqueInstructorIds,
      instrutorNomes: instructorNames,
      instrutores: resolvedInstructors,

      serieId,
      serieNome: selectedSerieObj?.nome || "Série personalizada",
      estudoAtual: cappedEstudos,
      totalEstudos: totalStudies,
      porcentagem: calculatedPercentage,
      faltantes: remainingStudies,
      status,
      interesse,
      observacoes: observacoes.trim(),
      ultimoContato: ultimoContato || new Date().toISOString().slice(0, 10),
      atualizadoEm: new Date().toISOString(),
    };

    onShowLoading(true);

    try {
      if (activeItem) {
        // EDIT MODE
        await updateDoc(doc(db, "interessados", activeItem.id), payload);
        onShowMessage("Estudo bíblico atualizado com sucesso!", "success");
      } else {
        // CREATE MODE
        const createPayload = {
          ...payload,
          criadoPorId: currentUser.id,
          criadoPorNome: currentUser.nome,
          criadoPorPerfil: currentUser.perfil,
          criadoEm: new Date().toISOString()
        };
        await addDoc(collection(db, "interessados"), createPayload);
        onShowMessage("Estudo bíblico registrado com sucesso!", "success");
      }

      await onRefresh();
      onClose();
    } catch (err: any) {
      console.error("Error saving interesado:", err);
      onShowMessage("Ocorreu um erro ao salvar os dados na nuvem.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  const isMembroUser = currentUser.perfil === "membro";
  const isLocalUser = currentUser.perfil === "local";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
        
        {/* Header element */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between select-none bg-slate-50/50">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg md:text-xl">
              {activeItem ? "Editar Interessado" : "Cadastrar Novo Interessado"}
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Associe ao curso de lições, defina o andamento e acompanhe seu progresso de perto.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-slate-105 hover:bg-slate-205 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body Form scroll wrapper */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          <form id="modalInteressadoForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
            
            {/* Candidate Nome */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Nome do Participante</label>
              <input
                type="text"
                placeholder="Exemplo: Maria Souza de Oliveira"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Candidate Telefone */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Contato / Telefone</label>
              <input
                type="text"
                placeholder="Exemplo: (51) 98888-7777"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Candidate Endereço */}
            <div className="md:col-span-2 space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Endereço Completo</label>
              <input
                type="text"
                placeholder="Exemplo: Rua das Flores, 123, Restinga"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Congregation Igreja Id */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Igreja do Distrito</label>
              <select
                value={igrejaId}
                onChange={(e) => setIgrejaId(e.target.value)}
                disabled={isMembroUser || isLocalUser} // Locked based on credentials
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-75"
              >
                <option value="">Selecione a igreja</option>
                {locais.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} {c.tipo ? `(${c.tipo})` : ""}</option>
                ))}
              </select>
            </div>

            {/* District name */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Distrito Pastoral</label>
              <input
                type="text"
                value={DISTRITO_FIXO}
                readOnly
                className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-500 cursor-not-allowed uppercase"
              />
            </div>

            {/* Multiple instructors configuration section */}
            <div className="md:col-span-2 border border-slate-150 p-4 rounded-2xl bg-slate-50/50 space-y-3">
              <div className="flex justify-between items-center select-none">
                <span className="font-bold text-slate-700 uppercase tracking-wider block">Instrutores autorizados</span>
                
                {/* Prevent addition if blocked */}
                {!isMembroUser && (
                  <button
                    type="button"
                    onClick={handleAddInstructor}
                    className="text-[10px] font-extrabold uppercase text-emerald-800 hover:text-emerald-900 bg-white hover:bg-emerald-50 border border-emerald-150 px-2.5 py-1 rounded-lg transition-smooth flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Adicionar</span>
                  </button>
                )}
              </div>

              <div className="space-y-3.5">
                {instrutorIds.map((instId, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={instId}
                      onChange={(e) => handleChangeInstructor(index, e.target.value)}
                      disabled={isMembroUser && index === 0} // Lock first slot for members
                      required
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-750 transition-smooth focus:border-emerald-500 disabled:opacity-70 select-none"
                    >
                      <option value="">Escolher instrutor responsável</option>
                      {/* Active profile listings */}
                      {choiceInstructors.map(u => (
                        <option key={u.id} value={u.id}>{u.nome}</option>
                      ))}
                    </select>

                    {/* Enable deletion only if multiple and not member user locked */}
                    {instrutorIds.length > 1 && (!isMembroUser || index > 0) && (
                      <button
                        type="button"
                        onClick={() => handleRemoveInstructor(index)}
                        className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-smooth border border-slate-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Biblical Course selection */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Foco / Série de Estudos</label>
              <select
                value={serieId}
                onChange={(e) => {
                  setSerieId(e.target.value);
                  setEstudoAtual(0); // Reset progress value if series shifts
                }}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none"
              >
                <option value="">Selecione o curso</option>
                {series.map(s => (
                  <option key={s.id} value={s.id}>{s.nome} ({s.totalEstudos} lições)</option>
                ))}
              </select>
            </div>

            {/* Current study chapter counter */}
            <div className="space-y-1">
              <div className="flex justify-between items-center select-none">
                <label className="block font-bold text-slate-700 uppercase tracking-wider">Estudo atual</label>
                {serieId && (
                  <span className="text-[10px] font-black text-emerald-850">Lógica: {calculatedPercentage}% concluído</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  max={totalStudies}
                  value={estudoAtual}
                  onChange={(e) => setEstudoAtual(parseInt(e.target.value, 10) || 0)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 transition-smooth"
                />
              </div>

              {/* Progress dynamic preview text helper */}
              {serieId && (
                <div className="p-2.5 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center gap-2 text-[10px] font-bold text-emerald-800">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  <span>Resultado: {cappedEstudos} de {totalStudies} lições • Faltam: {remainingStudies}</span>
                </div>
              )}
            </div>

            {/* Status level */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Status Geral</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none"
              >
                {statusOptions.map(o => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Candidate interest level */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Grau de Interesse</label>
              <select
                value={interesse}
                onChange={(e) => setInteresse(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none"
              >
                <option value="Alto">Alto</option>
                <option value="Médio">Médio</option>
                <option value="Baixo">Baixo</option>
              </select>
            </div>

            {/* Last contact YYYY-MM-DD date input */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Data do Último Contato</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 pb-0.5">
                  <Calendar className="w-4 h-4" />
                </span>
                <input
                  type="date"
                  value={ultimoContato}
                  onChange={(e) => setUltimoContato(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 font-semibold text-slate-800 transition-smooth focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Quick Observations Dropdown template */}
            <div className="space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Marcadores de Observação Rápidos</label>
              <select
                onChange={handleQuickMarkerSelect}
                defaultValue=""
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none"
              >
                <option value="" disabled>Selecione um marcador para anexar...</option>
                {quickMarkers.map(m => (
                  <option key={m.label} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Free textarea detailed Observations */}
            <div className="md:col-span-2 space-y-1">
              <label className="block font-bold text-slate-700 uppercase tracking-wider">Histórico & Observações Decisivas</label>
              <textarea
                rows={5}
                placeholder="Insira detalhes chaves: melhor horário para visitas, dificuldades com a família, restrições físicas, etc."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 font-semibold text-slate-850 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white resize-y min-h-[90px]"
              />
            </div>

          </form>
        </div>

        {/* Footer controls */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 select-none bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 sm:flex-none border border-slate-200 text-slate-700 rounded-xl px-5 py-3 text-xs font-bold transition-smooth bg-white hover:bg-slate-50 shadow-xs"
          >
            Voltar
          </button>
          
          <button
            type="submit"
            form="modalInteressadoForm"
            className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-xs font-bold transition-smooth shadow-sm hover:shadow-md"
          >
            Salvar Registro
          </button>
        </div>

      </div>
    </div>
  );
}
