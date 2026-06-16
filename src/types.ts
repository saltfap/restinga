export type UserRole = "admin" | "distrital" | "local" | "membro";

export interface UserProfile {
  id: string; // matches uid
  nome: string;
  email: string; // empty for local/membro accounts
  emailAuth: string; // real login email in firebase
  perfil: UserRole;
  username: string; // empty for global accounts
  igrejaId: string; // empty for global accounts
  igrejaNome: string; // empty for global accounts
  distrito: string; // "Restinga"
  ativo: boolean;
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface Church {
  id: string;
  nome: string;
  tipo: "igreja" | "grupo";
  distrito: string; // "Restinga"
  ativo: boolean;
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface StudySeries {
  id: string;
  nome: string;
  totalEstudos: number;
  ativo: boolean;
  criadoPor?: string;
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface InstructorRef {
  id: string;
  nome: string;
  perfil: UserRole;
}

export interface InterestedPerson {
  id: string;
  nome: string;
  telefone: string;
  endereco: string;
  igrejaId: string;
  igrejaNome: string;
  igrejaTipo: string;
  distrito: string; // "Restinga"
  instrutorIds: string[];
  instrutorNomes: string[];
  instrutores: InstructorRef[];
  criadoPorId: string;
  criadoPorNome: string;
  criadoPorPerfil: UserRole;
  serieId: string;
  serieNome: string;
  estudoAtual: number;
  totalEstudos: number;
  porcentagem: number;
  faltantes: number;
  status: string; // "Ativo" | "Pausado" | "Desinteressado" | "Concluído" | "Pronto para apelo" | "Pronto para batismo" | "Batismo Realizado"
  interesse: "Alto" | "Médio" | "Baixo";
  observacoes: string;
  ultimoContato: string; // YYYY-MM-DD
  criadoEm?: string;
  atualizadoEm?: string;
}

export interface LoginIndex {
  id: string;
  username: string;
  igrejaId: string;
  igrejaNome: string;
  perfil: "local" | "membro";
  emailAuth: string;
  ativo: boolean;
  criadoEm?: string;
  atualizadoEm?: string;
}
