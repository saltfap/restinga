import React, { useState, useEffect } from "react";
import { 
  signInWithEmailAndPassword, 
  setPersistence, 
  browserLocalPersistence 
} from "firebase/auth";
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  limit, 
  doc, 
  getDoc 
} from "firebase/firestore";
import { auth, db } from "../firebase";
import { Church, UserRole, UserProfile } from "../types";
import { BookOpen, User, Lock, Mail, ChevronRight } from "lucide-react";

interface AuthScreenProps {
  onLoginSuccess: (user: UserProfile) => void;
}

export default function AuthScreen({ onLoginSuccess }: AuthScreenProps) {
  const [accessType, setAccessType] = useState<UserRole>("admin");
  const [locais, setLocais] = useState<Church[]>([]);
  const [selectedChurch, setSelectedChurch] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load locations on mount
  useEffect(() => {
    async function fetchLocais() {
      try {
        const snap = await getDocs(collection(db, "locais"));
        const list = snap.docs
          .map((item) => ({ id: item.id, ...item.data() } as Church))
          .filter((item) => item.ativo !== false)
          .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR"));
        setLocais(list);
      } catch (err) {
        console.error("Erro ao carregar locais:", err);
      }
    }
    fetchLocais();
  }, []);

  const isGlobal = accessType === "admin" || accessType === "distrital";

  // Error mappings
  function mapFirebaseAuthError(code: string): string {
    switch (code) {
      case "auth/invalid-email":
        return "E-mail inválido.";
      case "auth/missing-password":
        return "Digite sua senha.";
      case "auth/invalid-credential":
        return "Credenciais inválidas ou incorretas.";
      case "auth/user-disabled":
        return "Este usuário foi desativado.";
      case "auth/too-many-requests":
        return "Muitas tentativas. Tente novamente mais tarde.";
      case "auth/network-request-failed":
        return "Falha de conexão. Verifique sua internet.";
      default:
        return "Não foi possível entrar. Verifique suas credenciais.";
    }
  }

  async function fetchUserProfile(uid: string): Promise<UserProfile> {
    const ref = doc(db, "usuarios", uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      throw new Error("Perfil do usuário não encontrado no banco de dados.");
    }

    const data = snap.data();
    if (!data.ativo) {
      throw new Error("Seu acesso está inativo. Fale com o pastor ou administrador.");
    }

    return {
      id: snap.id,
      uid: snap.id,
      ...data
    } as unknown as UserProfile;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setIsLoading(true);

    try {
      await setPersistence(auth, browserLocalPersistence);

      if (isGlobal) {
        if (!email || !password) {
          throw new Error("Por favor, preencha o e-mail e a senha.");
        }
        const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const profile = await fetchUserProfile(credential.user.uid);

        if (profile.perfil !== accessType) {
          await auth.signOut();
          throw new Error("Esse acesso não corresponde ao perfil selecionado.");
        }

        onLoginSuccess(profile);
      } else {
        // Local leader / member flow
        if (!selectedChurch) {
          throw new Error("Por favor, selecione a sua igreja.");
        }
        if (!username) {
          throw new Error("Por favor, digite seu nome de usuário.");
        }
        if (!password) {
          throw new Error("Por favor, insira a senha.");
        }

        const normalizedUsername = username.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // Query the login_index collection
        const q = query(
          collection(db, "login_index"),
          where("perfil", "==", accessType),
          where("username", "==", normalizedUsername),
          where("igrejaId", "==", selectedChurch),
          where("ativo", "==", true),
          limit(1)
        );

        const snap = await getDocs(q);

        if (snap.empty) {
          throw new Error("Usuário não cadastrado para essa igreja específica.");
        }

        const docSnap = snap.docs[0];
        const data = docSnap.data();

        if (!data.emailAuth) {
          throw new Error("Esse cadastro não possui credenciais válidas configuradas.");
        }

        const credential = await signInWithEmailAndPassword(auth, data.emailAuth, password);
        const profile = await fetchUserProfile(credential.user.uid);

        if (profile.perfil !== accessType) {
          await auth.signOut();
          throw new Error("Esse login não corresponde ao perfil selecionado.");
        }

        if (profile.igrejaId !== selectedChurch) {
          await auth.signOut();
          throw new Error("Esse usuário não pertence à igreja selecionada.");
        }

        onLoginSuccess(profile);
      }
    } catch (err: any) {
      console.error("Login failure:", err);
      const code = err?.code || "";
      const msg = code ? mapFirebaseAuthError(code) : (err?.message || "Ocorreu um erro ao entrar.");
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-8 select-none">
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-md border border-emerald-100 rounded-3xl shadow-2xl overflow-hidden grid md:grid-cols-[1.1fr_0.9fr]">
        
        {/* Left Panel: Information & Branding */}
        <div className="bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorations */}
          <div className="absolute -right-16 -bottom-16 w-64 h-64 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-12 -top-12 w-48 h-48 bg-teal-600/10 rounded-full blur-2xl pointer-events-none" />

          {/* Top Info */}
          <div>
            <div className="flex items-center gap-3.5 mb-8">
              <div className="w-12 h-12 bg-white/12 rounded-xl border border-white/20 flex items-center justify-center shadow-lg overflow-hidden p-1.5 shrink-0">
                <img 
                  src="/logo.png" 
                  className="w-full h-full object-contain" 
                  alt="Logo" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-300">Distrito da Restinga</span>
                <h3 className="font-display font-semibold text-white -mt-1 text-sm">Gestão de Estudos</h3>
              </div>
            </div>

            <h1 className="font-display font-extrabold text-3xl md:text-4xl lg:text-5xl tracking-tight leading-none mb-4">
              Estudos Bíblicos
            </h1>
            <p className="text-emerald-100/90 text-sm md:text-base leading-relaxed max-w-sm mb-10">
              Painel para acompanhar interessados, progresso nos estudos e decisões espirituais significativas.
            </p>
          </div>

          {/* Feature List */}
          <div className="space-y-4">
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h4 className="text-sm font-bold text-emerald-200">Hierarquia de perfis</h4>
              <p className="text-xs text-emerald-100/80 mt-1">Pastor, líder distrital, líder local e membradores com acessos específicos.</p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h4 className="text-sm font-bold text-emerald-200">Segmentação inteligente</h4>
              <p className="text-xs text-emerald-100/80 mt-1">Líder local vê apenas a sua igreja. Membro acessa apenas os seus interessados.</p>
            </div>

            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm">
              <h4 className="text-sm font-bold text-emerald-200">Análise de risco</h4>
              <p className="text-xs text-emerald-100/80 mt-1">Monitore quem está sem contato recente ou quem está pronto para decisões espirituais.</p>
            </div>
          </div>
        </div>

        {/* Right Panel: Portal Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h2 className="font-display font-bold text-2xl text-slate-800">Entrar no painel</h2>
            <p className="text-slate-500 text-xs mt-1">Escolha o nível de acesso e informe as suas credenciais.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Access Type Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Tipo de acesso</label>
              <div className="relative">
                <select
                  value={accessType}
                  onChange={(e) => {
                    setAccessType(e.target.value as UserRole);
                    setErrorMsg("");
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-smooth focus:border-emerald-500 focus:bg-white select-none appearance-none"
                >
                  <option value="admin">Pastor / Administrador</option>
                  <option value="distrital">Líder Distrital</option>
                  <option value="local">Líder Local</option>
                  <option value="membro">Membro</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                  <ChevronRight className="w-4 h-4 transform rotate-90" />
                </div>
              </div>
            </div>

            {/* Local / Membro specific select church */}
            {!isGlobal && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Selecione sua igreja</label>
                <div className="relative">
                  <select
                    value={selectedChurch}
                    onChange={(e) => setSelectedChurch(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-800 transition-smooth focus:border-emerald-500 focus:bg-white select-none appearance-none"
                  >
                    <option value="">Escolher igreja / grupo</option>
                    {locais.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome} {c.tipo ? `(${c.tipo})` : ""}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500">
                    <ChevronRight className="w-4 h-4 transform rotate-90" />
                  </div>
                </div>
              </div>
            )}

            {/* Local / Membro username input */}
            {!isGlobal ? (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Usuário</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    placeholder="Ex: joao.silva"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            ) : (
              /* Global admin / district leader email input */
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">E-mail</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                    <Mail className="w-4 h-4" />
                  </span>
                  <input
                    type="email"
                    placeholder="exemplo@igreja.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">Senha de acesso</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium text-slate-800 transition-smooth placeholder:text-slate-400 focus:border-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 font-medium text-xs leading-relaxed animate-pulse">
                {errorMsg}
              </div>
            )}

            {/* Access CTA Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl py-3 font-semibold text-sm transition-smooth shadow-md hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none mt-2 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando credenciais...</span>
                </>
              ) : (
                <span>Entrar no sistema</span>
              )}
            </button>
          </form>

          <div className="mt-8 pt-5 border-t border-slate-100 text-[11px] text-slate-400 text-center leading-relaxed">
            Painel exclusivo para oficiais do Distrito da Restinga. As igrejas listadas são previamente cadastradas pela administração pastoral.
          </div>
        </div>

      </div>
    </div>
  );
}
