import React from "react";
import { Plus, BookOpen } from "lucide-react";

interface HeaderProps {
  title: string;
  description: string;
  onOpenNewInteressadoModal: () => void;
}

export default function Header({ title, description, onOpenNewInteressadoModal }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white p-6 shadow-sm border border-slate-100 rounded-2xl">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 block md:hidden overflow-hidden shrink-0">
            <img 
              src="./logo.png" 
              className="w-full h-full object-contain filter invert opacity-80" 
              alt="Logo" 
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-600 block">Painel estratégico</span>
        </div>
        <h1 className="font-display font-black text-2xl md:text-3xl lg:text-4xl text-slate-800 tracking-tight leading-none">
          {title}
        </h1>
        <p className="text-slate-500 text-xs md:text-sm leading-relaxed max-w-2xl">
          {description}
        </p>
      </div>

      <div className="flex shrink-0">
        <button
          onClick={onOpenNewInteressadoModal}
          className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-5 py-3 text-xs font-bold transition-smooth shadow-sm hover:shadow-md flex items-center justify-center gap-2 select-none"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>Novo interessado</span>
        </button>
      </div>
    </header>
  );
}
