import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { 
  collection, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  query, 
  where 
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { 
  InterestedPerson, 
  UserProfile, 
  Church, 
  StudySeries 
} from "./types";

// UI Components
import AuthScreen from "./components/AuthScreen";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import Interessados from "./components/Interessados";
import Usuarios from "./components/Usuarios";
import Locais from "./components/Locais";
import Catalogo from "./components/Catalogo";
import Instrutores from "./components/Instrutores";
import InteressadosModal from "./components/InteressadosModal";

import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Ban } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isGlobalLoading, setIsGlobalLoading] = useState<boolean>(false);

  // Core Data models
  const [interessados, setInteressados] = useState<InterestedPerson[]>([]);
  const [locais, setLocais] = useState<Church[]>([]);
  const [series, setSeries] = useState<StudySeries[]>([]);
  const [usuarios, setUsuarios] = useState<UserProfile[]>([]);

  // Active workspace section
  const [activeSection, setActiveSection] = useState<string>("dashboardSection");

  // Filter Presets (from Dashboard selections)
  const [statusPreset, setStatusPreset] = useState<string | undefined>(undefined);
  const [seriesPreset, setSeriesPreset] = useState<string | undefined>(undefined);
  const [interestPreset, setInterestPreset] = useState<string | undefined>(undefined);
  const [churchPreset, setChurchPreset] = useState<string | undefined>(undefined);

  // Modal active states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeInteressado, setActiveInteressado] = useState<InterestedPerson | null>(null);

  // Custom UI notification alerts
  const [notification, setNotification] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);

  const DISTRITO_FIXO = "Restinga";

  // Display user notification
  function handleShowNotification(text: string, type: "success" | "error" | "info") {
    setNotification({ text, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  }

  // Load profile of logged on user
  async function fetchUserProfile(uid: string): Promise<UserProfile | null> {
    try {
      const ref = doc(db, "usuarios", uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        if (data.ativo === false) return null;
        return { id: snap.id, ...data } as UserProfile;
      }
    } catch (e) {
      console.error("Error loading user profile:", e);
    }
    return null;
  }

  // Initialize Auth Listening
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setIsAuthLoading(true);
      if (firebaseUser) {
        const profile = await fetchUserProfile(firebaseUser.uid);
        if (profile) {
          const allowedRoles = ["admin", "distrital", "local", "membro"];
          if (allowedRoles.includes(profile.perfil)) {
            setCurrentUser(profile);
          } else {
            handleShowNotification("Erro: Seu perfil não possui permissão de leitura neste painel.", "error");
            await signOut(auth);
            setCurrentUser(null);
          }
        } else {
          // Profile doc might not exist or be disabled
          await signOut(auth);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch all databases once authenticated or on requested syncs
  async function refreshData() {
    if (!currentUser) return;
    setIsGlobalLoading(true);

    try {
      // 1. Fetch places
      const locaisSnap = await getDocs(collection(db, "locais"));
      const listLocais = locaisSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as Church))
        .filter(d => d.ativo !== false);
      setLocais(listLocais);

      // 2. Fetch series
      const seriesSnap = await getDocs(collection(db, "series"));
      const listSeries = seriesSnap.docs
        .map(d => ({ id: d.id, ...d.data() } as StudySeries));
      setSeries(listSeries);

      // 3. Fetch system authors/users based on permissions
      let listUsers: UserProfile[] = [];
      if (currentUser.perfil === "admin" || currentUser.perfil === "distrital") {
        const usersSnap = await getDocs(collection(db, "usuarios"));
        listUsers = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as UserProfile))
          .filter(d => d.ativo !== false);
      } else if (currentUser.perfil === "local") {
        // Only load members in same local congregation
        const qUsers = query(collection(db, "usuarios"), where("igrejaId", "==", currentUser.igrejaId));
        const usersSnap = await getDocs(qUsers);
        listUsers = usersSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as UserProfile))
          .filter(d => d.ativo !== false);
      } else {
        listUsers = [currentUser];
      }
      setUsuarios(listUsers);

      // 4. Fetch candidates list based on role level security rules
      let listCandidates: InterestedPerson[] = [];
      if (currentUser.perfil === "admin") {
        const snap = await getDocs(collection(db, "interessados"));
        listCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() } as InterestedPerson));
      } else if (currentUser.perfil === "distrital") {
        const qRef = query(collection(db, "interessados"), where("distrito", "==", DISTRITO_FIXO));
        const snap = await getDocs(qRef);
        listCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() } as InterestedPerson));
      } else if (currentUser.perfil === "local") {
        const qRef = query(collection(db, "interessados"), where("igrejaId", "==", currentUser.igrejaId));
        const snap = await getDocs(qRef);
        listCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() } as InterestedPerson));
      } else {
        // Members only see candidates where they created or are marked as assigned instructor
        const qRef = query(collection(db, "interessados"), where("criadoPorId", "==", currentUser.id));
        const snap = await getDocs(qRef);
        listCandidates = snap.docs.map(d => ({ id: d.id, ...d.data() } as InterestedPerson));
      }
      setInteressados(listCandidates);

    } catch (err) {
      console.error("Error refreshing database:", err);
      handleShowNotification("Erro de rede ao carregar os dados. Verifique sua conexão.", "error");
    } finally {
      setIsGlobalLoading(false);
    }
  }

  // Reload lists if active identity changes
  useEffect(() => {
    if (currentUser) {
      refreshData();
      setActiveSection("dashboardSection");
      // clear presets
      handleClearPresets();
    }
  }, [currentUser]);

  // Clean filters
  function handleClearPresets() {
    setStatusPreset(undefined);
    setSeriesPreset(undefined);
    setInterestPreset(undefined);
    setChurchPreset(undefined);
  }

  // Dashboard selections triggers section navigation and applies preset filter state
  function handleSelectMetric(filterType: string, filterValue: string) {
    handleClearPresets();

    if (filterType === "status") {
      setStatusPreset(filterValue);
    } else if (filterType === "risco") {
      setStatusPreset("Ativo"); // candidates must be active to trigger contact warnings
    } else if (filterType === "decisao") {
      setStatusPreset("Pronto para apelo"); // or will match either apelo or batismo in row filter
    } else if (filterType === "church") {
      setChurchPreset(filterValue);
    }

    setActiveSection("interessadosSection");
  }

  // Logout handler
  async function handleLogout() {
    setIsGlobalLoading(true);
    try {
      await signOut(auth);
      setCurrentUser(null);
      handleShowNotification("Sessão encerrada com sucesso.", "success");
    } catch (e) {
      console.error("Logout failed:", e);
    } finally {
      setIsGlobalLoading(false);
    }
  }

  // Instant direct study increments
  async function handleAddStudySingle(id: string) {
    try {
      const match = interessados.find(i => i.id === id);
      if (!match) return;

      const nextVal = Math.min((match.estudoAtual || 0) + 1, match.totalEstudos || 0);
      const total = match.totalEstudos || 1;
      const pct = Math.round((nextVal / total) * 100);
      const remains = Math.max(0, total - nextVal);

      await updateDoc(doc(db, "interessados", id), {
        estudoAtual: nextVal,
        porcentagem: pct,
        faltantes: remains,
        atualizadoEm: new Date().toISOString()
      });

      handleShowNotification(`Estudo para "${match.nome}" avançado para a lição ${nextVal}!`, "success");
      await refreshData();
    } catch (err) {
      console.error("Error advancing study:", err);
      handleShowNotification("Não foi possível avançar a lição.", "error");
    }
  }

  // Dialog triggers
  function handleOpenCreate() {
    setActiveInteressado(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(item: InterestedPerson) {
    setActiveInteressado(item);
    setIsModalOpen(true);
  }

  const handleDeleteInteressado = async (id: string) => {
    const item = interessados.find(i => i.id === id);
    if (!item) return;

    const confirmed = window.confirm(`Tem certeza que deseja excluir o cadastro de "${item.nome}" permanentemente?`);
    if (!confirmed) return;

    setIsGlobalLoading(true);
    try {
      const { deleteDoc } = await import("firebase/firestore");
      await deleteDoc(doc(db, "interessados", id));
      handleShowNotification("Registro excluído com sucesso.", "success");
      await refreshData();
    } catch (err) {
      console.error("Error deleting candidate:", err);
      handleShowNotification("Erro ao excluir registro.", "error");
    } finally {
      setIsGlobalLoading(false);
    }
  };

  // Profile-based allowed screens list
  function getAllowedSections(): string[] {
    if (!currentUser) return [];
    const base = ["dashboardSection", "interessadosSection", "instrutoresSection"];
    if (["admin", "distrital", "local"].includes(currentUser.perfil)) {
      base.push("usuariosSection");
    }
    if (currentUser.perfil === "admin") {
      base.push("locaisSection");
      base.push("catalogoSection");
    }
    return base;
  }

  const allowedSections = getAllowedSections();

  // Page titles helper
  function getSectionTitle(): { title: string; desc: string } {
    switch (activeSection) {
      case "dashboardSection":
        return { 
          title: "Painel Principal", 
          desc: "Panorama estratégico de estudos bíblicos, metas concluídas e índices de prontidão espiritual." 
        };
      case "interessadosSection":
        return { 
          title: "Acompanhamento de Interessados", 
          desc: "Procure participantes por igreja, acompanhe lições ensinadas e atualize status rapidamente." 
        };
      case "instrutoresSection":
        return { 
          title: "Quadro de Instrutores e Classes", 
          desc: "Visualize os instrutores autorizados, carga horária de estudos bíblicos e alunos correspondentes por nível de liderança." 
        };
      case "usuariosSection":
        return { 
          title: "Usuários & Instrutores", 
          desc: "Gerencie permissões de acesso e contas locais para os instrutores autorizados do distrito." 
        };
      case "locaisSection":
        return { 
          title: "Igrejas & Grupos do Distrito", 
          desc: "Cadastre novas capelas e grupos missionários para a rede de estudos bíblicos." 
        };
      case "catalogoSection":
        return { 
          title: "Catálogo de Estudos", 
          desc: "Crie novas séries personalizadas de lições bíblicas sem limitações de grade de estudos." 
        };
      default:
        return { title: "Painel de Estudos Bíblicos", desc: "Acompanhamento estratégico para pastores e instrutores." };
    }
  }

  // Pre-calculations for locked study catalog relations
  const getInteressadosCountBySerieId = (): Record<string, number> => {
    const counts: Record<string, number> = {};
    interessados.forEach((item) => {
      if (item.serieId) {
        counts[item.serieId] = (counts[item.serieId] || 0) + 1;
      }
    });
    return counts;
  };

  // Center screen authenticating skeleton
  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 select-none bg-slate-50">
        <div className="bg-white border border-slate-100 rounded-3xl p-8 py-10 shadow-xl flex flex-col items-center gap-4 text-center max-w-sm animate-pulse">
          <div className="w-11 h-11 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin" />
          <h3 className="font-display font-black text-slate-800 text-lg tracking-tight">Verificando sessão</h3>
          <p className="text-slate-400 text-xs">Conectando aos servidores seguros do Distrito da Restinga. Por favor, aguarde...</p>
        </div>
      </div>
    );
  }

  // Force login portal if unauthenticated
  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(profile) => setCurrentUser(profile)} />;
  }

  const headerMeta = getSectionTitle();
  const isAdmin = currentUser.perfil === "admin";

  return (
    <div className="min-h-screen app-layout bg-[#f8faf9]">
      
      {/* 1. Sidebar Container (Left column) */}
      <Sidebar 
        user={currentUser}
        activeSection={activeSection}
        onNavigate={(sect) => {
          handleClearPresets();
          setActiveSection(sect);
        }}
        onLogout={handleLogout}
        allowedSections={allowedSections}
      />

      {/* 2. Main content viewport wrapper (Right column) */}
      <main className="main-content flex-1 p-4 lg:p-8 lg:pl-80 overflow-y-auto min-h-screen">
        
        {/* Centralised interactive Header */}
        <Header 
          title={headerMeta.title}
          description={headerMeta.desc}
          onOpenNewInteressadoModal={handleOpenCreate}
        />

        {/* Global actions overlay loader spinner */}
        {isGlobalLoading && (
          <div className="fixed right-6 top-6 bg-white border border-emerald-50 px-4 py-2.5 rounded-2xl shadow-md z-30 flex items-center gap-2.5 select-none transition-smooth">
            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <span className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">Sincronizando banco...</span>
          </div>
        )}

        {/* Real-time floating Notification Card */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 rounded-2xl border shadow-lg flex items-center gap-3 max-w-md ${
                notification.type === "success" 
                  ? "bg-emerald-50 border-emerald-100 text-emerald-800" 
                  : notification.type === "error" 
                    ? "bg-red-50 border-red-100 text-red-800" 
                    : "bg-sky-50 border-sky-100 text-sky-800"
              }`}
            >
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold leading-relaxed">{notification.text}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Transition page container grids */}
        <section className="mt-2">
          {activeSection === "dashboardSection" && allowedSections.includes("dashboardSection") && (
            <Dashboard 
              interessados={interessados}
              locais={locais}
              isAdminOrDistrital={["admin", "distrital"].includes(currentUser.perfil)}
              currentUserIgrejaId={currentUser.igrejaId || ""}
              currentUserIgrejaNome={currentUser.igrejaNome || ""}
              onSelectMetric={handleSelectMetric}
              onNavigate={(sect) => {
                handleClearPresets();
                setActiveSection(sect);
              }}
            />
          )}

          {activeSection === "interessadosSection" && allowedSections.includes("interessadosSection") && (
            <Interessados 
              interessados={interessados}
              series={series}
              onOpenNewInteressadoModal={handleOpenCreate}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteInteressado}
              onAddStudy={handleAddStudySingle}
              statusPreset={statusPreset}
              seriesPreset={seriesPreset}
              interestPreset={interestPreset}
              churchPreset={churchPreset}
              onClearPresets={handleClearPresets}
            />
          )}

          {activeSection === "instrutoresSection" && allowedSections.includes("instrutoresSection") && (
            <Instrutores 
              currentUser={currentUser}
              usuarios={usuarios}
              interessados={interessados}
              locais={locais}
            />
          )}

          {activeSection === "usuariosSection" && allowedSections.includes("usuariosSection") && (
            <Usuarios 
              currentUser={currentUser}
              usuarios={usuarios}
              locais={locais}
              onRefresh={refreshData}
              onShowMessage={handleShowNotification}
              onShowLoading={setIsGlobalLoading}
            />
          )}

          {activeSection === "locaisSection" && allowedSections.includes("locaisSection") && (
            <Locais 
              locais={locais}
              onRefresh={refreshData}
              onShowMessage={handleShowNotification}
              onShowLoading={setIsGlobalLoading}
              isAdmin={isAdmin}
            />
          )}

          {activeSection === "catalogoSection" && allowedSections.includes("catalogoSection") && (
            <Catalogo 
              series={series}
              onRefresh={refreshData}
              onShowMessage={handleShowNotification}
              onShowLoading={setIsGlobalLoading}
              isAdmin={isAdmin}
              interessadosCountBySerieId={getInteressadosCountBySerieId()}
            />
          )}
        </section>

      </main>

      {/* 3. Global Full form candidate Modal overlay */}
      <InteressadosModal 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveInteressado(null);
        }}
        activeItem={activeInteressado}
        currentUser={currentUser}
        series={series}
        locais={locais}
        usuarios={usuarios}
        onRefresh={refreshData}
        onShowMessage={handleShowNotification}
        onShowLoading={setIsGlobalLoading}
      />

    </div>
  );
}
