import React, { useState } from "react";
import { UserProfile, InterestedPerson, Church } from "../types";
import { 
  Search, 
  MapPin, 
  BookOpen, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  Phone, 
  Calendar, 
  Clock,
  Sparkles,
  CheckCircle,
  HelpCircle
} from "lucide-react";

interface InstrutoresProps {
  currentUser: UserProfile;
  usuarios: UserProfile[];
  interessados: InterestedPerson[];
  locais: Church[];
}

export default function Instrutores({
  currentUser,
  usuarios,
  interessados,
  locais
}: InstrutoresProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedChurchId, setSelectedChurchId] = useState("Todas");
  const [expandedInstructorId, setExpandedInstructorId] = useState<string | null>(null);

  // Translate roles
  function formatRole(role: string = ""): string {
    switch (role) {
      case "admin": return "Pastor / Administrador";
      case "distrital": return "Líder Distrital";
      case "local": return "Líder Local";
      case "membro": return "Membro / Instrutor";
      default: return role;
    }
  }

  // Get status badge styles
  const getStatusPillClass = (statusStr: string): string => {
    switch (statusStr) {
      case "Ativo": return "bg-green-50 text-green-700 border-green-100";
      case "Pausado": return "bg-amber-50 text-amber-700 border-amber-100";
      case "Desinteressado": return "bg-rose-50 text-rose-700 border-rose-100";
      case "Concluído": return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "Pronto para apelo": return "bg-cyan-50 text-cyan-700 border-cyan-100";
      case "Pronto para batismo": return "bg-blue-50 text-blue-700 border-blue-100";
      case "Batismo Realizado": return "bg-purple-50 text-purple-700 border-purple-100";
      default: return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  // 1. FILTER INSTRUCTORS BASED ON CHARGED ACCESS LEVEL HIERARCHY
  const getVisibleInstructors = (): UserProfile[] => {
    // Pastor/Administrador & Distrital sees all active users
    if (currentUser.perfil === "admin" || currentUser.perfil === "distrital") {
      return usuarios.filter(u => u.ativo !== false);
    }
    // Líder local sees only users from their own church
    if (currentUser.perfil === "local") {
      return usuarios.filter(u => u.ativo !== false && u.igrejaId === currentUser.igrejaId);
    }
    // Membro sees only themselves
    if (currentUser.perfil === "membro") {
      return usuarios.filter(u => u.id === currentUser.id);
    }
    return [];
  };

  const visibleInstructors = getVisibleInstructors();

  // Helper matching individual candidates to instructors
  const getCandidatesForInstructor = (instructorId: string): InterestedPerson[] => {
    return interessados.filter((item) => {
      // Matches the instructor ID in the Candidate's assigned list
      const isAssigned = item.instrutorIds && item.instrutorIds.includes(instructorId);
      // Fallback: If no assigned IDs are written, but name matches and member is the creator, or matches criadoPorId
      const isCreator = item.criadoPorId === instructorId;
      return isAssigned || (isCreator && (!item.instrutorIds || item.instrutorIds.length === 0));
    });
  };

  // Perform filtering based on search-term and selected church
  const filteredInstructorsList = visibleInstructors.filter((instructor) => {
    // 1. Filter by church
    if (selectedChurchId !== "Todas" && instructor.igrejaId !== selectedChurchId) {
      return false;
    }

    // 2. Filter by search-term
    const normalizedSearch = searchTerm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    if (normalizedSearch) {
      const nameMatch = instructor.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedSearch);
      const emailMatch = (instructor.email || "").toLowerCase().includes(normalizedSearch);
      const usernameMatch = (instructor.username || "").toLowerCase().includes(normalizedSearch);
      const churchMatch = (instructor.igrejaNome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().includes(normalizedSearch);
      return nameMatch || emailMatch || usernameMatch || churchMatch;
    }

    return true;
  });

  // Calculate comprehensive metrics for dashboard summary cards
  const totalInstructorsCount = filteredInstructorsList.length;
  
  const instructorsWithCandidates = filteredInstructorsList.map(inst => ({
    instructor: inst,
    candidates: getCandidatesForInstructor(inst.id)
  }));

  const totalActiveStudiesCount = instructorsWithCandidates.reduce(
    (acc, curr) => acc + curr.candidates.filter(c => c.status === "Ativo").length, 
    0
  );

  const totalStudiesCount = instructorsWithCandidates.reduce(
    (acc, curr) => acc + curr.candidates.length, 
    0
  );

  const activeInstructorsCount = instructorsWithCandidates.filter(
    item => item.candidates.length > 0
  ).length;

  const averageStudiesPerInstructor = totalInstructorsCount > 0 
    ? (totalStudiesCount / totalInstructorsCount).toFixed(1) 
    : "0";

  const toggleExpand = (id: string) => {
    setExpandedInstructorId(prev => prev === id ? null : id);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. METRICS OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Instructors */}
        <div id="stat-total-instructors" className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shrink-0">
            <Users className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Instrutores</span>
            <h3 className="font-sans font-extrabold text-2xl text-slate-800 -mt-0.5 leading-none">
              {totalInstructorsCount}
            </h3>
            <span className="text-[10px] text-slate-400 truncate block mt-1">
              {activeInstructorsCount} ativos com alunos
            </span>
          </div>
        </div>

        {/* Total Studies */}
        <div id="stat-total-studies" className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center border border-teal-100 shrink-0">
            <BookOpen className="w-6 h-6 text-teal-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Estudos Ativos</span>
            <h3 className="font-sans font-extrabold text-2xl text-teal-750 -mt-0.5 leading-none">
              {totalActiveStudiesCount}
            </h3>
            <span className="text-[10px] text-slate-400 truncate block mt-1">
              De {totalStudiesCount} estudos cadastrados
            </span>
          </div>
        </div>

        {/* Average Studies */}
        <div id="stat-average-studies" className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100 shrink-0">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Média de Estudos</span>
            <h3 className="font-sans font-extrabold text-2xl text-indigo-805 -mt-0.5 leading-none">
              {averageStudiesPerInstructor}
            </h3>
            <span className="text-[10px] text-slate-400 truncate block mt-1">
              Estudos por instrutor cadastrado
            </span>
          </div>
        </div>

        {/* Support Ratio */}
        <div id="stat-support-ratio" className="bg-white p-5 border border-slate-100 rounded-2xl shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100 shrink-0">
            <CheckCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Capacidade</span>
            <h3 className="font-sans font-extrabold text-2xl text-amber-750 -mt-0.5 leading-none">
              {totalInstructorsCount > 0 ? Math.round((activeInstructorsCount / totalInstructorsCount) * 100) : 0}%
            </h3>
            <span className="text-[10px] text-slate-400 truncate block mt-1">
              De engajamento de obreiros
            </span>
          </div>
        </div>

      </div>

      {/* 2. SEARCH & FILTER CONTROLS */}
      <div className="bg-white p-5 border border-slate-100 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Buscar instrutor por nome, nome da igreja ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 hover:bg-slate-100/50 rounded-2xl pl-10 pr-4 py-3 text-sm font-medium transition-smooth placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 outline-none text-slate-700"
            />
          </div>

          {/* Show Church Filter if Admin or District leader */}
          {(currentUser.perfil === "admin" || currentUser.perfil === "distrital") && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Igreja:</span>
              <select
                value={selectedChurchId}
                onChange={(e) => setSelectedChurchId(e.target.value)}
                className="bg-slate-50 border border-slate-150 hover:bg-slate-100/50 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 transition-smooth focus:bg-white focus:border-emerald-500 outline-none"
              >
                <option value="Todas">Todas as Igrejas</option>
                {locais.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          )}

        </div>
      </div>

      {/* 3. LIST OF INSTRUCTORS VIEW */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-display font-black text-slate-800 text-[18px]">Relação de Instrutores Autorizados</h3>
          <p className="text-slate-400 text-xs mt-1">
            Lista organizada por hierarquia e filiação. Clique nos cartões dos instrutores para visualizar a lista detalhada de seus respectivos alunos.
          </p>
        </div>

        {filteredInstructorsList.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-700 text-sm">Nenhum instrutor encontrado</h4>
            <p className="text-slate-400 text-xs max-w-sm leading-relaxed">
              Não localizamos registros com os critérios inseridos ou para o seu escopo de autorização distrital.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredInstructorsList.map((inst) => {
              const students = getCandidatesForInstructor(inst.id);
              const activeStudents = students.filter(s => s.status === "Ativo");
              const isExpanded = expandedInstructorId === inst.id;

              return (
                <div key={inst.id} className="transition-all duration-150 hover:bg-slate-50/40">
                  
                  {/* Instructor main expandable row clicker */}
                  <div 
                    onClick={() => toggleExpand(inst.id)}
                    className="p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    
                    {/* Left: Avatar & Profile and credentials */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-100 to-emerald-50 text-emerald-800 font-extrabold text-[15px] flex items-center justify-center shadow-inner uppercase shrink-0 border border-emerald-200/40">
                        {inst.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-slate-800 text-base leading-tight truncate">
                            {inst.nome}
                          </h4>
                          {inst.id === currentUser.id && (
                            <span className="bg-emerald-55 text-emerald-700 px-2 py-0.5 rounded-lg text-[9px] font-black tracking-widest uppercase border border-emerald-100 shadow-sm select-none">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3.5 text-xs text-slate-400 mt-1 flex-wrap font-medium">
                          <span className="font-bold text-emerald-600 uppercase tracking-wide text-[10px] bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
                            {formatRole(inst.perfil)}
                          </span>
                          {inst.igrejaNome && (
                            <span className="flex items-center gap-1 shrink-0">
                              <MapPin className="w-3.5 h-3.5 text-slate-300" />
                              {inst.igrejaNome}
                            </span>
                          )}
                          {inst.username && (
                            <span className="text-[11px] font-mono select-all bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
                              @{inst.username}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Summary values and toggles */}
                    <div className="flex items-center justify-between md:justify-end gap-6 shrink-0 border-t border-dashed border-slate-100 pt-3 md:pt-0 md:border-0">
                      
                      {/* Metric capsules */}
                      <div className="flex items-center gap-4">
                        
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">Total Alunos</span>
                          <span className="text-sm font-extrabold text-slate-700 block mt-0.5">
                            {students.length} {students.length === 1 ? "interessado" : "interessados"}
                          </span>
                        </div>

                        <div className="text-right border-l border-slate-100 pl-4">
                          <span className="text-[10px] text-emerald-600 uppercase font-black tracking-wider block">Estudos Ativos</span>
                          <span className="text-sm font-extrabold text-emerald-800 block mt-0.5">
                            {activeStudents.length} em andamento
                          </span>
                        </div>

                      </div>

                      {/* Expand / Collapse Indicator */}
                      <div className="w-8 h-8 rounded-full hover:bg-slate-150 flex items-center justify-center text-slate-400 transition-smooth shrink-0 border border-slate-200/50 bg-white shadow-sm">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-600" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-600" />
                        )}
                      </div>

                    </div>

                  </div>

                  {/* Instructor nested students list block */}
                  {isExpanded && (
                    <div className="bg-slate-50/50 border-t border-b border-dashed border-slate-100 p-5 md:p-6 space-y-4 animate-in fade-in-50 duration-200">
                      
                      <div className="flex items-center gap-2 select-none">
                        <BookOpen className="w-4 h-4 text-slate-400" />
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-500">
                          Estudos Bíblicos Sob Custódia de {inst.nome.split(" ")[0]}
                        </h5>
                      </div>

                      {students.length === 0 ? (
                        <div className="p-6 text-center bg-white border border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-1">
                          <p className="text-xs font-bold text-slate-500">Nenhum aluno vinculado a este instrutor</p>
                          <p className="text-[10px] text-slate-400 max-w-xs">
                            Associe participantes a este instrutor na tela de Gestão de Interessados para iniciar o acompanhamento.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {students.map((stud) => {
                            return (
                              <div 
                                key={stud.id} 
                                className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between gap-3 relative hover:shadow-md transition-smooth"
                              >
                                
                                {/* Base details inside capsule */}
                                <div className="space-y-2">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <h6 className="font-bold text-sm text-slate-800">
                                        {stud.nome}
                                      </h6>
                                      <span className="text-[10px] text-slate-400 block mt-0.5">
                                        Igreja: {stud.igrejaNome}
                                      </span>
                                    </div>
                                    
                                    {/* Status Badge */}
                                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shadow-sm select-none tracking-wider ${getStatusPillClass(stud.status)}`}>
                                      {stud.status}
                                    </span>
                                  </div>

                                  {/* Course series & progress bar */}
                                  <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                                      <span className="truncate max-w-[190px]">{stud.serieNome || "Sem série"}</span>
                                      <span className="font-mono text-xs">{stud.porcentagem || 0}%</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 -mt-0.5">
                                      <span>Lição {stud.estudoAtual} de {stud.totalEstudos}</span>
                                      {stud.faltantes > 0 ? (
                                        <span>Restam {stud.faltantes} lições</span>
                                      ) : (
                                        <span className="text-emerald-600 font-bold">Linguagens concluídas!</span>
                                      )}
                                    </div>

                                    {/* Visual Proportional Progress Bar */}
                                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2 border border-slate-100/50">
                                      <div 
                                        className="bg-emerald-600 h-full rounded-full transition-all duration-300" 
                                        style={{ width: `${stud.porcentagem || 0}%` }}
                                      />
                                    </div>
                                  </div>
                                </div>

                                {/* Bottom extra details info metadata */}
                                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex-wrap gap-2 font-medium">
                                  
                                  {stud.telefone && (
                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 text-slate-500 font-mono">
                                      <Phone className="w-3 h-3 text-slate-400" />
                                      {stud.telefone}
                                    </span>
                                  )}

                                  <div className="flex items-center gap-3">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-3.5 h-3.5 text-slate-300" />
                                      Último contato: {stud.ultimoContato ? stud.ultimoContato.split("-").reverse().join("/") : "Sem registro"}
                                    </span>
                                  </div>

                                </div>

                              </div>
                            );
                          })}
                        </div>
                      )}

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

    </div>
  );
}
