import React, { useState } from "react";
import { StudySeries } from "../types";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { BookOpen, Library, Edit, Trash, Plus } from "lucide-react";

interface CatalogoProps {
  series: StudySeries[];
  onRefresh: () => Promise<void>;
  onShowMessage: (text: string, type: "success" | "error" | "info") => void;
  onShowLoading: (show: boolean) => void;
  isAdmin: boolean;
  interessadosCountBySerieId: Record<string, number>;
}

export default function Catalogo({
  series,
  onRefresh,
  onShowMessage,
  onShowLoading,
  isAdmin,
  interessadosCountBySerieId
}: CatalogoProps) {
  const [nome, setNome] = useState("");
  const [totalEstudos, setTotalEstudos] = useState("");

  // Edit inline dialog trigger
  function handleEditClick(item: StudySeries) {
    if (!isAdmin) {
      onShowMessage("Permissão negada: Apenas administradores podem gerenciar séries.", "error");
      return;
    }
    const novoNome = window.prompt("Editar nome da série de estudos:", item.nome);
    if (novoNome === null) return;

    const nomeFinal = novoNome.trim();
    if (!nomeFinal) {
      onShowMessage("O nome da série de estudos não pode ficar em branco.", "error");
      return;
    }

    const novoTotalStr = window.prompt("Editar total de estudos (número inteiro maior que 0):", String(item.totalEstudos));
    if (novoTotalStr === null) return;

    const totalFinal = parseInt(novoTotalStr, 10);
    if (isNaN(totalFinal) || totalFinal < 1) {
      onShowMessage("O total de estudos precisa ser um número inteiro válido.", "error");
      return;
    }

    handleUpdate(item.id, nomeFinal, totalFinal);
  }

  async function handleUpdate(id: string, nameValue: string, totalValue: number) {
    // Conflict check
    const duplicate = series.find(
      (item) => item.id !== id && item.nome.trim().toLowerCase() === nameValue.toLowerCase()
    );
    if (duplicate) {
      onShowMessage("Já existe outra série cadastrada com este nome.", "error");
      return;
    }

    onShowLoading(true);
    try {
      await updateDoc(doc(db, "series", id), {
        nome: nameValue,
        totalEstudos: totalValue,
        atualizadoEm: new Date().toISOString()
      });
      onShowMessage("Série de estudos atualizada com sucesso!", "success");
      await onRefresh();
    } catch (e) {
      console.error("Error updating series:", e);
      onShowMessage("Falha ao salvar as modificações na série.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Deletions with usage lock trigger checks
  async function handleDeleteClick(item: StudySeries) {
    if (!isAdmin) {
      onShowMessage("Operação negada: Apenas administradores podem gerenciar séries.", "error");
      return;
    }

    const inUseCount = interessadosCountBySerieId[item.id] || 0;
    if (inUseCount > 0) {
      onShowMessage(
        `Essa série de estudos está atrelada a ${inUseCount} participante(s) ativo(s) e não pode ser removida agora.`,
        "error"
      );
      return;
    }

    const confirmed = window.confirm(`Deseja excluir a série de estudos "${item.nome}" permanentemente do catálogo?`);
    if (!confirmed) return;

    onShowLoading(true);
    try {
      await deleteDoc(doc(db, "series", item.id));
      onShowMessage(`Série "${item.nome}" apagada com sucesso.`, "success");
      await onRefresh();
    } catch (e: any) {
      console.error("Error deleting series:", e);
      onShowMessage("Não foi possível excluir a série.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Submit trigger
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nomeFinal = nome.trim();
    const totalFinal = parseInt(totalEstudos, 10);

    if (!nomeFinal) {
      onShowMessage("Informe o nome da série.", "error");
      return;
    }

    if (isNaN(totalFinal) || totalFinal < 1) {
      onShowMessage("O total de estudos precisa ser um número inteiro válido.", "error");
      return;
    }

    // Duplicate check
    const duplicate = series.find(
      (item) => item.nome.trim().toLowerCase() === nomeFinal.toLowerCase()
    );
    if (duplicate) {
      onShowMessage("Já existe uma série com esse mesmo nome no catálogo.", "error");
      return;
    }

    onShowLoading(true);
    try {
      await addDoc(collection(db, "series"), {
        nome: nomeFinal,
        totalEstudos: totalFinal,
        ativo: true,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onShowMessage("Série de estudos adicionada com sucesso!", "success");
      setNome("");
      setTotalEstudos("");
      await onRefresh();
    } catch (err) {
      console.error("Error creating series:", err);
      onShowMessage("Ocorreu um erro ao adicionar a série de estudos.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      
      {/* List element */}
      <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
            <Library className="w-5 h-5 text-emerald-600 font-bold" />
            <span>Séries Cadastradas</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Catálogo híbrido de estudos e lições bíblicas atualmente ativo no distrito.
          </p>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {series.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
              Nenhuma série de lições bíblicas registrada no catálogo ainda.
            </div>
          ) : (
            series.map((item) => {
              const inUseCount = interessadosCountBySerieId[item.id] || 0;
              return (
                <div key={item.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 rounded-2xl transition-smooth flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-xl flex items-center justify-center font-bold">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-850">{item.nome}</h4>
                      <span className="text-[10px] font-extrabold text-slate-400 block mt-0.5">
                        Lições: <span className="text-slate-700 font-extrabold">{item.totalEstudos}</span> • Ativos: <span className="text-emerald-800 font-extrabold">{inUseCount}</span> candidato(s)
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0 select-none">
                      <button
                        onClick={() => handleEditClick(item)}
                        title="Modificar série"
                        className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-smooth"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteClick(item)}
                        title="Remover série"
                        className="p-2 text-red-600 bg-white hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-xl transition-smooth"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Adding card form */}
      <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600 font-bold" />
              <span>Cadastrar Nova Série</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Adicione novos cursos ou lições (ex: Apocalipse / O Grande Conflito) ao catálogo estratégico.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nome do Curso / Série</label>
              <input
                type="text"
                placeholder="Exemplo: Ouvindo a Voz de Deus"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={!isAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:opacity-50"
              />
            </div>

            {/* Total count of study papers */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Total de Lições (estudos)</label>
              <input
                type="number"
                min="1"
                placeholder="Exemplo: 24"
                value={totalEstudos}
                onChange={(e) => setTotalEstudos(e.target.value)}
                required
                disabled={!isAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:opacity-50"
              />
            </div>

            {/* CTA action button */}
            <button
              type="submit"
              disabled={!isAdmin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 mt-2 text-xs transition-smooth shadow-sm hover:shadow-md"
            >
              Adicionar Curso ao Catálogo
            </button>
          </form>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed select-none">
          Cursos e séries adicionadas ficam disponíveis para edição em cada candidato na mesma hora. Participantes existentes mantêm o progresso sincronizado em cascata se o limite de capítulos for estendido.
        </div>
      </div>

    </div>
  );
}
