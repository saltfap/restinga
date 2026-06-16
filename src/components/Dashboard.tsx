import React from "react";
import { InterestedPerson, Church } from "../types";
import { AlertCircle, CheckCircle, TrendingUp, Sparkles, Users, Award, Landmark, ChevronRight } from "lucide-react";

interface DashboardProps {
  interessados: InterestedPerson[];
  locais: Church[];
  isAdminOrDistrital: boolean;
  currentUserIgrejaId: string;
  currentUserIgrejaNome: string;
  onSelectMetric: (filterType: string, filterValue: string) => void;
  onNavigate: (section: string) => void;
}

export default function Dashboard({
  interessados,
  locais,
  isAdminOrDistrital,
  currentUserIgrejaId,
  currentUserIgrejaNome,
  onSelectMetric,
  onNavigate
}: DashboardProps) {

  // Days since calculation helper
  function daysSince(dateStr: string): number {
    if (!dateStr) return 999;
    const today = new Date();
    // Parse to ensure YYYY-MM-DD parsing respects zone
    const date = new Date(`${dateStr}T00:00:00`);
    const diff = today.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  const isAtRisk = (item: InterestedPerson) => {
    const activeStatuses = ["Ativo", "Pronto para apelo", "Pronto para batismo"];
    return activeStatuses.includes(item.status) && daysSince(item.ultimoContato) > 14;
  };

  const isDecision = (item: InterestedPerson) => {
    return item.status === "Pronto para apelo" || item.status === "Pronto para batismo";
  };

  // 1. Metrics calculations
  const totalInteressados = interessados.length;
  const ativos = interessados.filter((item) => item.status === "Ativo").length;
  const emRisco = interessados.filter(isAtRisk).length;
  const concluidos = interessados.filter((item) => item.status === "Concluído").length;
  const emDecisao = interessados.filter(isDecision).length;
  const batizados = interessados.filter((item) => item.status === "Batismo Realizado").length;

  // 2. Average progress calculation
  const avgProgress = totalInteressados > 0 
    ? Math.round(interessados.reduce((acc, curr) => acc + (curr.porcentagem || 0), 0) / totalInteressados) 
    : 0;

  // 3. Spiritual Readiness average calculation (0 to 100 based on their map weights)
  const getReadinessScore = (statusStr: string): number => {
    switch (statusStr) {
      case "Desinteressado": return 10;
      case "Pausado": return 30;
      case "Ativo": return 55;
      case "Concluído": return 75;
      case "Pronto para apelo": return 90;
      case "Pronto para batismo": return 100;
      case "Batismo Realizado": return 100;
      default: return 0;
    }
  };

  const avgReadiness = totalInteressados > 0
    ? Math.round(interessados.reduce((acc, curr) => acc + getReadinessScore(curr.status), 0) / totalInteressados)
    : 0;

  // Insight labels
  const getProgressInsight = (avg: number) => {
    if (avg >= 85) return "Grupo muito avançado nos estudos bíblicos.";
    if (avg >= 65) return "Bom avanço geral no distrito.";
    if (avg >= 45) return "Avanço moderado dos candidatos.";
    if (avg >= 25) return "Geral em fases iniciais de estudos.";
    return "Estudos iniciados recentemente.";
  };

  const getReadinessInsight = (avg: number) => {
    if (avg >= 85) return "Prontidão espiritual excelente.";
    if (avg >= 65) return "Nível de envolvimento consistente.";
    if (avg >= 45) return "Decisões e interesses em amadurecimento.";
    if (avg >= 25) return "Necessidade de apelos mais próximos.";
    return "Acompanhamento inicial recomendado.";
  };

  // 4. Progress Buckets
  const getProgressBuckets = () => {
    const buckets = {
      "0–25%": 0,
      "26–50%": 0,
      "51–75%": 0,
      "76–99%": 0,
      "100%": 0
    };

    interessados.forEach((item) => {
      const pct = item.porcentagem || 0;
      if (pct <= 25) buckets["0–25%"]++;
      else if (pct <= 50) buckets["26–50%"]++;
      else if (pct <= 75) buckets["51–75%"]++;
      else if (pct < 100) buckets["76–99%"]++;
      else buckets["100%"]++;
    });

    return buckets;
  };

  const buckets = getProgressBuckets();
  const maxBucketValue = Math.max(...Object.values(buckets), 1);

  // 5. Group by Church for Admin / Distrital panorama cards
  const getChurchPanorama = () => {
    const churchMap: Record<string, { id: string; nome: string; items: InterestedPerson[] }> = {};
    
    interessados.forEach((item) => {
      const cId = item.igrejaId || "sem-igreja";
      if (!churchMap[cId]) {
        churchMap[cId] = {
          id: cId,
          nome: item.igrejaNome || "Sem Igreja cadastrada",
          items: []
        };
      }
      churchMap[cId].items.push(item);
    });

    return Object.values(churchMap).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  };

  const churchPanorama = getChurchPanorama();

  // Status percents utility builder
  const getStatusShares = (items: InterestedPerson[]) => {
    const total = items.length || 1;
    const counts = {
      ativos: items.filter(u => u.status === "Ativo").length,
      apelo: items.filter(u => u.status === "Pronto para apelo").length,
      batismo: items.filter(u => u.status === "Pronto para batismo").length,
      concluidos: items.filter(u => u.status === "Concluído").length,
      batismoRealizado: items.filter(u => u.status === "Batismo Realizado").length
    };

    return {
      total: items.length,
      ativosPct: Math.round((counts.ativos / total) * 100),
      apeloPct: Math.round((counts.apelo / total) * 100),
      batismoPct: Math.round((counts.batismo / total) * 100),
      concluidosPct: Math.round((counts.concluidos / total) * 100),
      batismoRealizadoPct: Math.round((counts.batismoRealizado / total) * 100)
    };
  };

  // Lists sidebar
  const recentInteressados = [...interessados]
    .sort((a, b) => {
      const aTime = new Date(a.atualizadoEm || 0).getTime();
      const bTime = new Date(b.atualizadoEm || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  const attentionList = interessados
    .filter((item) => isAtRisk(item) || isDecision(item))
    .slice(0, 5);

  // Status bar rendering component helper to reuse
  const renderStatusBars = (shares: ReturnType<typeof getStatusShares>) => {
    const barConfigs = [
      { label: "Estudos Ativos", percent: shares.ativosPct, colorClass: "bg-emerald-500" },
      { label: "Pronto p/ Apelo", percent: shares.apeloPct, colorClass: "bg-teal-500" },
      { label: "Pronto p/ Batismo", percent: shares.batismoPct, colorClass: "bg-blue-500" },
      { label: "Estudo Concluído", percent: shares.concluidosPct, colorClass: "bg-indigo-500" },
      { label: "Batismo Realizado", percent: shares.batismoRealizadoPct, colorClass: "bg-green-600" },
    ];

    return (
      <div className="space-y-3 mt-3">
        {barConfigs.map((config, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-semibold">{config.label}</span>
              <span className="font-extrabold text-slate-800">{config.percent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden select-none">
              <div 
                className={`${config.colorClass} h-full rounded-full transition-all duration-500`} 
                style={{ width: `${config.percent}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      
      {/* 1. Primary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: "Interessados Cadastrados", value: totalInteressados, metric: "todos", val: "Todos", color: "from-slate-50 to-emerald-50/50 border-slate-200 text-slate-800", icon: Users },
          { label: "Estudos Ativos", value: ativos, metric: "status", val: "Ativo", color: "from-emerald-50/30 to-emerald-100/30 border-emerald-150 text-emerald-800", icon: TrendingUp },
          { label: "Em Risco de Desistência", value: emRisco, metric: "risco", val: "true", color: "from-amber-50/30 to-amber-100/30 border-amber-150 text-amber-800", icon: AlertCircle },
          { label: "Estudos Concluídos", value: concluidos, metric: "status", val: "Concluído", color: "from-emerald-50/40 to-teal-50/30 border-teal-150 text-teal-800", icon: CheckCircle },
          { label: "Decisão Espiritual", value: emDecisao, metric: "decisao", val: "true", color: "from-sky-50/30 to-blue-100/30 border-blue-150 text-blue-800", icon: Sparkles },
          { label: "Batismos Confirmados", value: batizados, metric: "status", val: "Batismo Realizado", color: "from-purple-50/20 to-indigo-50/30 border-indigo-150 text-indigo-800", icon: Award }
        ].map((met, idx) => {
          const Icon = met.icon;
          return (
            <div
              key={idx}
              onClick={() => onSelectMetric(met.metric, met.val)}
              className={`bg-gradient-to-b ${met.color} border p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-smooth group active:scale-[0.98] relative overflow-hidden`}
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-extrabold uppercase tracking-wide opacity-80 block select-none max-w-[80%] leading-snug">
                  {met.label}
                </span>
                <Icon className="w-4 h-4 opacity-40 group-hover:scale-110 transition-smooth" />
              </div>
              <strong className="text-3xl font-black block mt-2.5 tracking-tight font-display">
                {met.value}
              </strong>
            </div>
          );
        })}
      </div>

      {/* 2. Custom Charts and Distribution Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">

        {/* Dynamic Progress Overview (Left 7-columns) */}
        <div className="xl:col-span-7 bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-6">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg">Distribuição do progresso nos estudos</h3>
            <p className="text-slate-500 text-xs mt-1">Status atual baseado nas faixas de percentual concluído de cada interessado.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Progresso Médio Geral</span>
              <strong className="text-2xl font-black text-emerald-800 block mt-1 tracking-tight">{avgProgress}%</strong>
              <p className="text-slate-600 text-xs mt-1 font-semibold">{getProgressInsight(avgProgress)}</p>
            </div>

            <div className="p-4 bg-teal-50/30 border border-teal-100 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">Prontidão Espiritual</span>
              <strong className="text-2xl font-black text-teal-800 block mt-1 tracking-tight">{avgReadiness}%</strong>
              <p className="text-slate-600 text-xs mt-1 font-semibold">{getReadinessInsight(avgReadiness)}</p>
            </div>
          </div>

          {/* Pure HTML Bar Chart representing progress buckets */}
          {totalInteressados === 0 ? (
            <div className="h-44 border border-dashed border-slate-200 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 font-medium text-xs select-none">
              Nenhum estudo bíblico registrado para exibir análise gráfica.
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-end gap-6 pt-6">
              
              {/* Y Axis indications */}
              <div className="hidden md:flex flex-col justify-between h-44 text-[10px] font-bold text-slate-400 select-none text-right pr-2">
                <span>{maxBucketValue}</span>
                <span>{Math.round(maxBucketValue * 0.75)}</span>
                <span>{Math.round(maxBucketValue * 0.50)}</span>
                <span>{Math.round(maxBucketValue * 0.25)}</span>
                <span>0</span>
              </div>

              {/* Chart columns */}
              <div className="flex-1 grid grid-cols-5 gap-3 h-48 items-end relative border-b border-slate-200 pb-2">
                
                {Object.entries(buckets).map(([kKey, valCount], uIdx) => {
                  const percentOfMax = (valCount / maxBucketValue) * 100;
                  // Color configuration depending on key
                  let barBg = "bg-gradient-to-t from-emerald-600 to-emerald-400";
                  if (uIdx === 0) barBg = "bg-gradient-to-t from-rose-500 to-rose-400";
                  if (uIdx === 1) barBg = "bg-gradient-to-t from-amber-500 to-amber-400";
                  if (uIdx === 3) barBg = "bg-gradient-to-t from-teal-500 to-teal-400";
                  if (uIdx === 4) barBg = "bg-gradient-to-t from-indigo-600 to-indigo-400";

                  return (
                    <div key={kKey} className="flex flex-col items-center group">
                      <span className="text-xs font-black text-slate-800 mb-1 opacity-0 group-hover:opacity-100 transition-smooth block">
                        {valCount}
                      </span>
                      <div className="w-full bg-slate-50 h-32 flex items-end rounded-lg overflow-hidden select-none">
                        <div 
                          className={`${barBg} w-full rounded-t-md transition-all duration-500 shadow-sm`}
                          style={{ height: `${percentOfMax || 8}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-extrabold text-slate-500 mt-2 block whitespace-nowrap leading-none select-none">
                        {kKey}
                      </span>
                    </div>
                  );
                })}

              </div>
            </div>
          )}
        </div>

        {/* 3. Church-by-Church or Group panoramas (Right 5-columns) */}
        <div className="xl:col-span-5 bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-6 flex flex-col justify-between">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg">
              {isAdminOrDistrital ? "Panorama do Distrito por Igreja" : "Panorama da Igreja Local"}
            </h3>
            <p className="text-slate-500 text-xs mt-1">Percentual atual dos principais níveis e tomadas de decisão.</p>
          </div>

          <div className="space-y-4 max-h-[340px] overflow-y-auto pr-1">
            {isAdminOrDistrital ? (
              churchPanorama.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-200 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 font-medium text-xs text-center leading-relaxed">
                  Sem dados para agrupar por igreja no momento.
                </div>
              ) : (
                churchPanorama.map((cp) => {
                  const shares = getStatusShares(cp.items);
                  return (
                    <div 
                      key={cp.id}
                      onClick={() => onSelectMetric("church", cp.id)}
                      className="p-4 bg-slate-50 hover:bg-emerald-50/10 border border-slate-200 hover:border-emerald-200 rounded-2xl transition-smooth cursor-pointer group"
                    >
                      <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 mb-2">
                        <h4 className="text-sm font-black text-slate-800 group-hover:text-emerald-700 transition-smooth flex items-center gap-1">
                          <Landmark className="w-3.5 h-3.5" />
                          <span>{cp.nome}</span>
                        </h4>
                        <span className="text-[10px] font-extrabold bg-slate-200/70 group-hover:bg-emerald-100 text-slate-600 group-hover:text-emerald-800 px-2 py-0.5 rounded-full transition-smooth">
                          {shares.total} estudos
                        </span>
                      </div>
                      {renderStatusBars(shares)}
                    </div>
                  );
                })
              )
            ) : (
              /* Local player view */
              <div className="p-4 bg-emerald-50/10 border border-emerald-100 rounded-2xl">
                <div className="flex justify-between items-center pb-2 border-b border-emerald-100/60 mb-2">
                  <h4 className="text-sm font-black text-emerald-900 flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{currentUserIgrejaNome || "Igreja Local"}</span>
                  </h4>
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                    {totalInteressados} estudos ativos
                  </span>
                </div>
                {renderStatusBars(getStatusShares(interessados))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate("interessadosSection")}
            className="w-full text-center text-xs text-emerald-700 hover:text-emerald-800 font-bold transition-smooth flex items-center justify-center gap-1 pt-3 border-t border-slate-100 select-none mt-2"
          >
            <span>Ver todos os registros detalhados</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>

      {/* 4. Side-by-side lists of Recent and Attention points */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Recent block */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-base">Últimos atualizados</h3>
            <p className="text-slate-500 text-xs mt-1">Acompanhe quem teve evolução registrada recentemente.</p>
          </div>

          <div className="space-y-3">
            {recentInteressados.length === 0 ? (
              <div className="p-8 border border-dashed border-slate-100 bg-slate-50/50 rounded-2xl flex items-center justify-center text-slate-400 text-xs select-none">
                Nenhum interessado atualizado recentemente.
              </div>
            ) : (
              recentInteressados.map((item) => (
                <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 leading-snug">{item.nome}</h4>
                      <p className="text-[10px] text-slate-500 font-medium mt-1">
                        Série: <span className="font-bold text-slate-700">{item.serieNome}</span> • Igreja: <span className="font-bold text-slate-700">{item.igrejaNome}</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-wider block shrink-0 select-none">
                      Cap: {item.estudoAtual} / {item.totalEstudos}
                    </span>
                  </div>
                  {/* Miniature progress bar */}
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-3">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${item.porcentagem}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Attention point list */}
        <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-base">Precisam de atenção</h3>
            <p className="text-slate-500 text-xs mt-1">Casos críticos sem contatos nos últimos 14 dias ou prontos para apelo/batismo.</p>
          </div>

          <div className="space-y-3">
            {attentionList.length === 0 ? (
              <div className="p-10 border border-dashed border-slate-100 bg-emerald-50/10 rounded-2xl flex items-center justify-center text-emerald-700 text-xs text-center leading-relaxed">
                Nenhum caso crítico identificado. Continue o bom trabalho de contatos constantes!
              </div>
            ) : (
              attentionList.map((item) => {
                const atRisk = isAtRisk(item);
                const lastContactDays = daysSince(item.ultimoContato);
                const note = atRisk 
                  ? `Alerta: Último contato há ${lastContactDays} dias. Risco de desistência!` 
                  : `Pronto para apelo espiritual ou batismo imediato!`;

                return (
                  <div key={item.id} className="p-4 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-sm font-bold text-slate-800 leading-snug">{item.nome}</h4>
                        <div className="flex gap-1.5 self-start shrink-0 select-none">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            atRisk ? "bg-amber-100 text-amber-800 font-extrabold" : "bg-sky-100 text-sky-800 font-extrabold"
                          }`}>
                            {atRisk ? "Sem contato" : "Decisão"}
                          </span>
                        </div>
                      </div>
                      <p className={`text-xs mt-1.5 font-semibold ${atRisk ? "text-amber-700" : "text-sky-700"}`}>
                        {note}
                      </p>
                    </div>

                    <div className="flex gap-2 mt-3 text-[10px] text-slate-500 border-t border-slate-150 pt-2 font-medium">
                      <span>Igreja: <span className="font-bold text-slate-700">{item.igrejaNome}</span></span>
                      <span>•</span>
                      <span>Contato: <span className="font-semibold text-slate-700">{item.ultimoContato ? new Date(item.ultimoContato + "T12:00:00").toLocaleDateString("pt-BR") : "-"}</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
