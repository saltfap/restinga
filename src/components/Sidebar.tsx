import React from "react";
import { UserProfile } from "../types";
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  MapPin, 
  BookMarked, 
  LogOut, 
  BookOpen 
} from "lucide-react";
import { motion } from "motion/react";

interface SidebarProps {
  user: UserProfile;
  activeSection: string;
  onNavigate: (section: string) => void;
  onLogout: () => void;
  allowedSections: string[];
}

export default function Sidebar({ 
  user, 
  activeSection, 
  onNavigate, 
  onLogout, 
  allowedSections 
}: SidebarProps) {

  // Translate role with beautiful Portuguese labels
  function formatRole(role: string = ""): string {
    switch (role) {
      case "admin":
        return "Pastor / Administrador";
      case "distrital":
        return "Líder Distrital";
      case "local":
        return "Líder Local";
      case "membro":
        return "Membro Ativo";
      default:
        return "Sem perfil";
    }
  }

  // Get initials for profile badge
  function getInitials(name: string = ""): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "EV";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  const menuItems = [
    { id: "dashboardSection", label: "Dashboard", icon: LayoutDashboard },
    { id: "interessadosSection", label: "Interessados", icon: Users },
    { id: "instrutoresSection", label: "Instrutores", icon: BookOpen },
    { id: "usuariosSection", label: "Usuários", icon: Settings },
    { id: "locaisSection", label: "Igrejas & Grupos", icon: MapPin },
    { id: "catalogoSection", label: "Catálogo de Estudos", icon: BookMarked },
  ];

  const visibleMenuItems = menuItems.filter(item => allowedSections.includes(item.id));

  return (
    <aside className="w-full lg:w-72 bg-gradient-to-b from-emerald-900 via-emerald-800 to-teal-900 text-white p-5 lg:h-screen lg:fixed lg:left-0 lg:top-0 lg:z-10 flex flex-col justify-between shadow-xl">
      
      {/* Upper part */}
      <div className="flex flex-col gap-6">
        
        {/* District Title */}
        <div className="flex items-center gap-3 pb-4 border-b border-white/10">
          <div className="w-10 h-10 bg-white/12 rounded-xl flex items-center justify-center border border-white/15 shadow-md overflow-hidden p-1 shrink-0">
            <img 
              src="./logo.png" 
              className="w-full h-full object-contain" 
              alt="Logo" 
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-[10px] tracking-wider font-extrabold uppercase text-emerald-300/80 block">Estudos Bíblicos</span>
            <h2 className="font-display font-bold text-base text-white tracking-tight -mt-0.5">Distrito da Restinga</h2>
          </div>
        </div>

        {/* User Card Profile details */}
        <div className="flex items-center gap-3.5 p-3.5 bg-white/5 border border-white/10 rounded-2xl">
          <div className="w-11 h-11 rounded-xl bg-white font-black text-emerald-800 text-sm flex items-center justify-center shadow-lg uppercase select-none">
            {getInitials(user.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold truncate title text-white">{user.nome}</h4>
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300/90 block mt-0.5">
              {formatRole(user.perfil)}
            </span>
          </div>
        </div>

        {/* Dynamic Navigation */}
        <nav className="flex flex-col gap-1.5 mt-2">
          {visibleMenuItems.map((item) => {
            const isActive = activeSection === item.id;
            const IconComponent = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium text-sm text-left transition-smooth relative select-none ${
                  isActive 
                    ? "bg-white text-emerald-900 font-bold shadow-md" 
                    : "text-emerald-100/90 hover:bg-white/5 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute inset-0 bg-white rounded-xl -z-10 shadow-md"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <IconComponent className={`w-4.5 h-4.5 ${isActive ? "text-emerald-700" : "text-emerald-300"}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Logout button bottom */}
      <div className="pt-4 border-t border-white/10 mt-6 lg:mt-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 bg-red-950/20 hover:bg-red-900/30 border border-red-500/10 hover:border-red-500/20 rounded-xl text-red-200 hover:text-red-100 font-bold text-sm transition-smooth select-none"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Sair da Conta</span>
        </button>
      </div>

    </aside>
  );
}
