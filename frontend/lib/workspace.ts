"use client";
import { createContext, useContext } from "react";
import type { UsuarioAutenticado } from "./auth";
import type { ConfiguracaoSaas } from "./saas";
import type { Assinatura } from "./assinatura";

export type Workspace = {
  usuario: UsuarioAutenticado | null;
  config: ConfiguracaoSaas | null;
  assinatura: Assinatura | null;
  erro: string;
  atualizar: () => Promise<void>;
};
export const Contexto = createContext<Workspace>({
  usuario: null,
  config: null,
  assinatura: null,
  erro: "",
  atualizar: async () => {},
});
export const useWorkspace = () => useContext(Contexto);
export function avisarWorkspace() {
  window.dispatchEvent(new Event("nexo:workspace"));
}
