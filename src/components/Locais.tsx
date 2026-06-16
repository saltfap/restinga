import React, { useState } from "react";
import { Church } from "../types";
import { collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { Landmark, MapPin, Edit, Trash, Plus } from "lucide-react";

interface LocaisProps {
  locais: Church[];
  onRefresh: () => Promise<void>;
  onShowMessage: (text: string, type: "success" | "error" | "info") => void;
  onShowLoading: (show: boolean) => void;
  isAdmin: boolean;
}

export default function Locais({
  locais,
  onRefresh,
  onShowMessage,
  onShowLoading,
  isAdmin
}: LocaisProps) {
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<"igreja" | "grupo">("igreja");
  const [editingId, setEditingId] = useState<string | null>(null);

  const DISTRITO_FIXO = "Restinga";

  // Trigger inline edits
  function handleEditClick(item: Church) {
    if (!isAdmin) {
      onShowMessage("Apenas administradores podem gerenciar locais.", "error");
      return;
    }
    const novoNome = window.prompt("Editar nome da igreja / grupo:", item.nome);
    if (novoNome === null) return;

    const nomeFinal = novoNome.trim();
    if (!nomeFinal) {
      onShowMessage("O nome do local não pode ficar em branco.", "error");
      return;
    }

    const novoTipoStr = window.prompt("Editar tipo (igreja / grupo):", item.tipo || "igreja");
    if (novoTipoStr === null) return;
    const tipoFinal = novoTipoStr.toLowerCase().trim() === "grupo" ? "grupo" : "igreja";

    handleUpdate(item.id, nomeFinal, tipoFinal);
  }

  async function handleUpdate(id: string, nameValue: string, typeValue: "igreja" | "grupo") {
    // Check key duplicate conflicts
    const duplicate = locais.find(
      (item) => item.id !== id && item.nome.trim().toLowerCase() === nameValue.toLowerCase()
    );
    if (duplicate) {
      onShowMessage("Atenção: Já existe outro local cadastrado com este nome.", "error");
      return;
    }

    onShowLoading(true);
    try {
      await updateDoc(doc(db, "locais", id), {
        nome: nameValue,
        tipo: typeValue,
        atualizadoEm: new Date().toISOString()
      });
      onShowMessage("Local atualizado com sucesso!", "success");
      await onRefresh();
    } catch (e) {
      console.error("Error updating location:", e);
      onShowMessage("Falha ao salvar as alterações do local.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Handle deletions
  async function handleDeleteClick(item: Church) {
    if (!isAdmin) {
      onShowMessage("Apenas administradores podem gerenciar locais.", "error");
      return;
    }
    const confirmed = window.confirm(`Tem certeza que deseja excluir o local "${item.nome}" permanentemente?`);
    if (!confirmed) return;

    onShowLoading(true);
    try {
      await deleteDoc(doc(db, "locais", item.id));
      onShowMessage(`Local "${item.nome}" excluído com sucesso.`, "success");
      await onRefresh();
    } catch (e: any) {
      console.error("Error deleting location:", e);
      onShowMessage("Não foi possível excluir o local.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Submission handler
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      onShowMessage("Informe o nome do local.", "error");
      return;
    }

    // Check duplicate
    const duplicate = locais.find(
      (item) => item.nome.trim().toLowerCase() === nome.trim().toLowerCase()
    );
    if (duplicate) {
      onShowMessage("Já existe um local cadastrado com esse nome.", "error");
      return;
    }

    onShowLoading(true);
    try {
      await addDoc(collection(db, "locais"), {
        nome: nome.trim(),
        tipo,
        distrito: DISTRITO_FIXO,
        ativo: true,
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      onShowMessage("Nova igreja / grupo adicionado com sucesso!", "success");
      setNome("");
      setTipo("igreja");
      await onRefresh();
    } catch (err) {
      console.error("Error creating location:", err);
      onShowMessage("Ocorreu uma falha ao cadastrar o novo local.", "error");
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
            <Landmark className="w-5 h-5 text-emerald-600 font-bold" />
            <span>Locais Ativos</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Igrejas e grupos do distrito de Restinga disponíveis para associação.
          </p>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {locais.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
              Nenhuma igreja cadastrada no distrito ainda.
            </div>
          ) : (
            locais.map((item) => (
              <div key={item.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 rounded-2xl transition-smooth flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-800 border border-emerald-250 rounded-xl flex items-center justify-center font-bold">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-850">{item.nome}</h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mt-0.5">
                      Tipo: <span className="text-emerald-800 font-extrabold">{item.tipo || "igreja"}</span> • Distrito: {DISTRITO_FIXO}
                    </span>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex items-center gap-1.5 shrink-0 select-none">
                    <button
                      onClick={() => handleEditClick(item)}
                      title="Editar local"
                      className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-250 rounded-xl transition-smooth"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(item)}
                      title="Excluir local"
                      className="p-2 text-red-650 bg-white hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-xl transition-smooth"
                    >
                      <Trash className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Adding form element */}
      <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600 font-bold" />
              <span>Adicionar Igreja ou Grupo</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              Cadastre e disponibilize novas igrejas para a criação automática de usuários locais.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location Nome */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nome do local</label>
              <input
                type="text"
                placeholder="Exemplo: Restinga Central / Capela Leste"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                disabled={!isAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:opacity-50"
              />
            </div>

            {/* Type picker option */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tipo de Congregação</label>
              <select
                value={tipo}
                onChange={(e) => setTipo(e.target.value as "igreja" | "grupo")}
                disabled={!isAdmin}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-750 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-50"
              >
                <option value="igreja">Igreja Estabelecida</option>
                <option value="grupo">Grupo Missionário</option>
              </select>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={!isAdmin}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl py-2.5 mt-2 text-xs transition-smooth shadow-sm hover:shadow-md"
            >
              Adicionar Local
            </button>
          </form>
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed select-none">
          Igrejas e grupos cadastrados ficam imediatamente ativos e disponíveis para seleção na página de login de líderes locais e membros.
        </div>
      </div>

    </div>
  );
}
