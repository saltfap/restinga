import React, { useState } from "react";
import { UserProfile, Church, UserRole } from "../types";
import { collection, doc, updateDoc, deleteDoc, setDoc, serverTimestamp, getDocs, query, where, limit } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { initializeApp, deleteApp } from "firebase/app";
import { db, app } from "../firebase";
import { Users, UserPlus, Trash, Edit, Mail, ShieldAlert } from "lucide-react";

interface UsuariosProps {
  currentUser: UserProfile;
  usuarios: UserProfile[];
  locais: Church[];
  onRefresh: () => Promise<void>;
  onShowMessage: (text: string, type: "success" | "error" | "info") => void;
  onShowLoading: (show: boolean) => void;
}

export default function Usuarios({
  currentUser,
  usuarios,
  locais,
  onRefresh,
  onShowMessage,
  onShowLoading
}: UsuariosProps) {
  // Form fields
  const [nome, setNome] = useState("");
  const [perfil, setPerfil] = useState<UserRole>("membro");
  const [selectedChurch, setSelectedChurch] = useState("");
  const [username, setUsername] = useState("");
  const [passwordLocal, setPasswordLocal] = useState("");
  const [email, setEmail] = useState("");
  const [passwordGlobal, setPasswordGlobal] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  const DISTRITO_FIXO = "Restinga";

  // Translate roles
  function formatRole(role: string = ""): string {
    switch (role) {
      case "admin": return "Pastor / Administrador";
      case "distrital": return "Líder Distrital";
      case "local": return "Líder Local";
      case "membro": return "Membro";
      default: return role;
    }
  }

  // Get profiles the current user is allowed to create
  function getAllowedProfilesToCreate(): UserRole[] {
    if (currentUser.perfil === "admin") return ["admin", "distrital", "local", "membro"];
    if (currentUser.perfil === "distrital") return ["local", "membro"];
    if (currentUser.perfil === "local") return ["membro"];
    return [];
  }

  const allowedProfiles = getAllowedProfilesToCreate();

  // Profile-based view helpers
  const isGlobalProfile = perfil === "admin" || perfil === "distrital";

  // Authorization checks for editing & deleting
  const canEditUser = (target: UserProfile): boolean => {
    if (currentUser.perfil === "admin") return true;
    if (currentUser.perfil === "distrital") return ["local", "membro"].includes(target.perfil);
    if (currentUser.perfil === "local") return target.perfil === "membro";
    return false;
  };

  const canDeleteUser = (target: UserProfile): boolean => {
    if (target.id === currentUser.id) return false; // cannot delete oneself
    if (currentUser.perfil === "admin") return true;
    if (currentUser.perfil === "distrital") return ["local", "membro"].includes(target.perfil);
    if (currentUser.perfil === "local") return target.perfil === "membro";
    return false;
  };

  // Helper: Generates local authentication email using custom schema
  function buildEmailAuth(user: string, churchId: string): string {
    const safeUser = user.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "");
    const safeChurch = String(churchId || "").replace(/[^a-zA-Z0-9]/g, "");
    return `${safeUser}__${safeChurch}@app.estudosbiblicosrestinga.local`;
  }

  // Trigger edit setup
  function handleEditClick(target: UserProfile) {
    if (!canEditUser(target)) {
      onShowMessage("Você não tem permissão para editar este usuário.", "error");
      return;
    }
    setNome(target.nome || "");
    setPerfil(target.perfil || "membro");
    setSelectedChurch(target.igrejaId || "");
    setUsername(target.username || "");
    setEmail(target.email || "");
    // Password fields are left blank on edit
    setEditingUserId(target.id);
    onShowMessage(`Editando perfil de: ${target.nome}`, "info");
  }

  // Handle delete action
  async function handleDeleteClick(target: UserProfile) {
    if (!canDeleteUser(target)) {
      onShowMessage("Você não tem permissão para remover este usuário.", "error");
      return;
    }
    const confirmed = window.confirm(`Tem certeza que deseja desativar o cadastro de "${target.nome}"?`);
    if (!confirmed) return;

    onShowLoading(true);
    try {
      // Soft-delete: update status to inactive
      await updateDoc(doc(db, "usuarios", target.id), {
        ativo: false,
        atualizadoEm: new Date().toISOString()
      });

      // Also updates the login_index entry if local
      if (["local", "membro"].includes(target.perfil)) {
        await updateDoc(doc(db, "login_index", target.id), {
          ativo: false,
          atualizadoEm: new Date().toISOString()
        }).catch(() => {});
      }

      onShowMessage(`Usuário "${target.nome}" removido com sucesso.`, "success");
      await onRefresh();
      
      // Clean editing states if deleted current edited target
      if (editingUserId === target.id) {
        handleReset();
      }
    } catch (e: any) {
      console.error("Error deleting user:", e);
      onShowMessage("Não foi possível excluir o usuário.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Reset form helper
  function handleReset() {
    setNome("");
    setPerfil("membro");
    setSelectedChurch("");
    setUsername("");
    setPasswordLocal("");
    setEmail("");
    setPasswordGlobal("");
    setEditingUserId(null);
  }

  // Submit flow
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      onShowMessage("Atenção: Por favor, preencha o nome do usuário.", "error");
      return;
    }

    onShowLoading(true);

    try {
      // EDIT CURRENT PROFILE FLOW
      if (editingUserId) {
        const target = usuarios.find(u => u.id === editingUserId);
        if (!target) throw new Error("Usuário não encontrado.");
        if (!canEditUser(target)) throw new Error("Sem permissão para editar.");

        const updatePayload: Record<string, any> = {
          nome: nome.trim(),
          atualizadoEm: new Date().toISOString()
        };

        if (currentUser.perfil === "admin") {
          updatePayload.perfil = perfil;
        }

        if (["local", "membro"].includes(updatePayload.perfil || target.perfil)) {
          if (!selectedChurch) throw new Error("Selecione a igreja associada.");
          const churchObj = locais.find(l => l.id === selectedChurch);
          if (!churchObj) throw new Error("Igreja inválida.");

          updatePayload.igrejaId = churchObj.id;
          updatePayload.igrejaNome = churchObj.nome;
        }

        await updateDoc(doc(db, "usuarios", editingUserId), updatePayload);

        // Update login_index database records if changed
        if (["local", "membro"].includes(target.perfil)) {
          await updateDoc(doc(db, "login_index", editingUserId), {
            igrejaId: updatePayload.igrejaId || target.igrejaId,
            igrejaNome: updatePayload.igrejaNome || target.igrejaNome,
            perfil: updatePayload.perfil || target.perfil,
            atualizadoEm: new Date().toISOString()
          }).catch(() => {});
        }

        onShowMessage("Cadastro de usuário atualizado com sucesso!", "success");
        handleReset();
        await onRefresh();
        return;
      }

      // CREATE BRAND NEW USER FLOW (SANDBOX SECONDARY AUTH APP INSTANTIATION!)
      if (!isGlobalProfile) {
        // Local leader / member creation
        if (!selectedChurch) throw new Error("Por favor, selecione a igreja.");
        if (!username.trim()) throw new Error("Informe o nome de usuário local.");
        if (!passwordLocal || passwordLocal.length < 6) throw new Error("A senha precisa conter no mínimo 6 caracteres.");

        const churchObj = locais.find(l => l.id === selectedChurch);
        if (!churchObj) throw new Error("Igreja selecionada inválida.");

        const normalizedUsername = username.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]/g, "");

        // Real-time unique login index verification
        const qUnique = query(
          collection(db, "login_index"),
          where("username", "==", normalizedUsername),
          where("igrejaId", "==", selectedChurch),
          where("ativo", "==", true),
          limit(1)
        );
        const checkSnap = await getDocs(qUnique);
        if (!checkSnap.empty) {
          throw new Error("Conflito: Este nome de usuário já está em uso para esta igreja.");
        }

        const emailAuth = buildEmailAuth(normalizedUsername, selectedChurch);

        // Instantiate isolated auth to preserve active session!
        const secondaryAppInstanceName = `isolated-auth-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const secondaryApp = initializeApp(app.options, secondaryAppInstanceName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, emailAuth, passwordLocal);
          const uid = credential.user.uid;

          // Write public profile document
          await setDoc(doc(db, "usuarios", uid), {
            nome: nome.trim(),
            email: "",
            emailAuth,
            perfil,
            username: normalizedUsername,
            senhaLocal: "", // Empty for safety
            igrejaId: selectedChurch,
            igrejaNome: churchObj.nome,
            distrito: DISTRITO_FIXO,
            ativo: true,
            criadoPor: currentUser.id,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          // Write internal login verification index
          await setDoc(doc(db, "login_index", uid), {
            username: normalizedUsername,
            igrejaId: selectedChurch,
            igrejaNome: churchObj.nome,
            perfil,
            emailAuth,
            ativo: true,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);

          onShowMessage("Novo usuário local registrado com sucesso!", "success");
          handleReset();
          await onRefresh();
        } catch (authErr: any) {
          await deleteApp(secondaryApp).catch(() => {});
          const code = authErr?.code || "";
          if (code === "auth/email-already-in-use") {
            throw new Error("Erro de inscrição: Esse e-mail virtual configurado já está em uso.");
          }
          throw authErr;
        }

      } else {
        // Global admin / district leader creation
        if (!email.trim()) throw new Error("Preencha o e-mail de acesso.");
        if (!passwordGlobal || passwordGlobal.length < 6) throw new Error("Forneça uma senha global de no mínimo 6 caracteres.");

        // Instantiate isolated auth to preserve active session!
        const secondaryAppInstanceName = `isolated-auth-app-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const secondaryApp = initializeApp(app.options, secondaryAppInstanceName);
        const secondaryAuth = getAuth(secondaryApp);

        try {
          const credential = await createUserWithEmailAndPassword(secondaryAuth, email.trim(), passwordGlobal);
          const uid = credential.user.uid;

          // Write global profile document
          await setDoc(doc(db, "usuarios", uid), {
            nome: nome.trim(),
            email: email.trim(),
            emailAuth: email.trim(),
            perfil,
            username: "",
            senhaLocal: "",
            igrejaId: "",
            igrejaNome: "",
            distrito: DISTRITO_FIXO,
            ativo: true,
            criadoPor: currentUser.id,
            criadoEm: new Date().toISOString(),
            atualizadoEm: new Date().toISOString(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });

          await signOut(secondaryAuth);
          await deleteApp(secondaryApp);

          onShowMessage("Novo usuário administrador/distrital registrado com sucesso!", "success");
          handleReset();
          await onRefresh();
        } catch (authErr: any) {
          await deleteApp(secondaryApp).catch(() => {});
          const code = authErr?.code || "";
          if (code === "auth/email-already-in-use") {
            throw new Error("Erro de inscrição: Este endereço de e-mail já está em uso.");
          }
          throw authErr;
        }
      }

    } catch (err: any) {
      console.error("User registration error:", err);
      onShowMessage(err.message || "Ocorreu uma falha ao persistir dados do usuário.", "error");
    } finally {
      onShowLoading(false);
    }
  }

  // Get users allowed to display under this view
  const visibleUsers = usuarios.filter(u => {
    if (currentUser.perfil === "admin" || currentUser.perfil === "distrital") return true;
    if (currentUser.perfil === "local") return u.igrejaId === currentUser.igrejaId;
    return u.id === currentUser.id;
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
      
      {/* 1. Left hand: Users visual list */}
      <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm space-y-4">
        <div>
          <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600 font-bold" />
            <span>Integrantes Cadastrados</span>
          </h3>
          <p className="text-slate-500 text-xs mt-1">
            Veja quem possui direitos de acesso e registros no Distrito da Restinga.
          </p>
        </div>

        <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
          {visibleUsers.length === 0 ? (
            <div className="p-8 border border-dashed border-slate-200 bg-slate-50 rounded-2xl text-center text-slate-400 text-xs">
              Nenhum integrante cadastrado sob este contexto.
            </div>
          ) : (
            visibleUsers.map((u) => {
              const shownLogin = ["admin", "distrital"].includes(u.perfil) 
                ? (u.email || u.emailAuth || "-") 
                : (u.username || "-");

              const canEdit = canEditUser(u);
              const canDel = canDeleteUser(u);

              return (
                <div key={u.id} className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-200/70 rounded-2xl transition-smooth flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <strong className="text-sm text-slate-800 font-extrabold">{u.nome}</strong>
                      <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full select-none">
                        {formatRole(u.perfil)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed font-semibold">
                      Login: <span className="text-slate-800 font-extrabold">{shownLogin}</span> 
                      {u.igrejaNome && (
                        <> • Igreja: <span className="text-emerald-800 font-extrabold">{u.igrejaNome}</span></>
                      )}
                    </p>

                    <div className="mt-2.5 flex items-center gap-1">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.ativo ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {u.ativo ? "Conta Ativa" : "Inativa"}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  {(canEdit || canDel) && (
                    <div className="flex items-center gap-1 shrink-0 select-none">
                      {canEdit && (
                        <button
                          onClick={() => handleEditClick(u)}
                          title="Editar permissões"
                          className="p-2 text-slate-600 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-smooth"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      {canDel && (
                        <button
                          onClick={() => handleDeleteClick(u)}
                          title="Desativar usuário"
                          className="p-2 text-red-650 bg-white hover:bg-red-50 border border-red-100 hover:border-red-200 rounded-xl transition-smooth"
                        >
                          <Trash className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}

                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Right hand: Creation / Edit form */}
      <div className="bg-white p-6 border border-slate-100 rounded-3xl shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-black text-slate-800 text-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600 font-bold" />
              <span>{editingUserId ? "Editar Usuário" : "Novo Cadastro"}</span>
            </h3>
            <p className="text-slate-500 text-xs mt-1">
              {editingUserId 
                ? "Dica: Você só pode editar o nome e a igreja para líderes locais e membros."
                : "Defina os acessos permitidos no distrito e crie a credencial segura."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nome Completo</label>
              <input
                type="text"
                placeholder="Exemplo: João da Silva Reis"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
              />
            </div>

            {/* Profile Role Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Perfil no Sistema</label>
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value as UserRole)}
                disabled={!!editingUserId && currentUser.perfil !== "admin"} // Only admin can switch roles of existing users
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white disabled:opacity-75"
              >
                {allowedProfiles.map(p => (
                  <option key={p} value={p}>
                    {formatRole(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Local Profile church selection */}
            {!isGlobalProfile && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Igreja Associada</label>
                <select
                  value={selectedChurch}
                  onChange={(e) => setSelectedChurch(e.target.value)}
                  disabled={currentUser.perfil === "local"} // local leaders cannot register users for other congregations
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-700 transition-smooth focus:border-emerald-500 focus:bg-white select-none disabled:opacity-75"
                >
                  <option value="">Escolher igreja / grupo</option>
                  {currentUser.perfil === "local" 
                    ? locais.filter(l => l.id === currentUser.igrejaId).map(c => (
                        <option key={c.id} value={c.id}>{c.nome}</option>
                      ))
                    : locais.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome} {c.tipo ? `(${c.tipo})` : ""}
                        </option>
                      ))
                  }
                </select>
              </div>
            )}

            {/* Local profile unique login inputs */}
            {!isGlobalProfile ? (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Nome de usuário (sem espaços)</label>
                  <input
                    type="text"
                    placeholder="Ex: joao.silva"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    disabled={!!editingUserId} // cannot change username after creation
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:opacity-75"
                  />
                </div>

                {!editingUserId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider font-display">Senha (mínimo 6 dígitos)</label>
                    <input
                      type="password"
                      placeholder="Defina a senha"
                      value={passwordLocal}
                      onChange={(e) => setPasswordLocal(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                )}
              </>
            ) : (
              /* Global profiles coordinates fields */
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Endereço de E-mail</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      placeholder="exemplo@restinga.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!!editingUserId} // email auth is immutable
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white disabled:opacity-75"
                    />
                  </div>
                </div>

                {!editingUserId && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Senha Provisória</label>
                    <input
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={passwordGlobal}
                      onChange={(e) => setPasswordGlobal(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                    />
                  </div>
                )}
              </>
            )}

            {/* Actions CTA buttons */}
            <div className="flex gap-2 pt-4 select-none">
              {editingUserId && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl py-2.5 text-xs transition-smooth"
                >
                  Cancelar Edição
                </button>
              )}
              <button
                type="submit"
                className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl py-2.5 text-xs transition-smooth shadow-sm"
              >
                {editingUserId ? "Salvar Alterações" : "Criar Novo Cadastro"}
              </button>
            </div>

          </form>
        </div>

        {/* Small security warning footer info */}
        <div className="p-3 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-2.5 mt-6 select-none leading-relaxed">
          <ShieldAlert className="w-4.5 h-4.5 text-red-650 shrink-0 mt-0.5" />
          <p className="text-[10px] text-red-700 font-semibold">
            <strong>Proteção de Sessão:</strong> Este painel implementa isolamento de registro. Ao preencher, o sistema gera o indexador e preserva o login do pastor ativo no navegador.
          </p>
        </div>
      </div>

    </div>
  );
}
