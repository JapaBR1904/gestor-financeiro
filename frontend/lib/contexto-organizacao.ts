import { ApiError } from "./api-error";

export const CABECALHO_ORGANIZACAO = "X-Nexo-Organizacao";
const CHAVE = "nexo:organizacao-alterada";
let organizacao: number | null = null;
let geracao = 0;
const pendentes = new Set<AbortController>();

export function suspenderContexto() {
  organizacao = null;
  geracao++;
  for (const controle of pendentes) controle.abort();
  pendentes.clear();
}
export function definirContexto(id: number) {
  if (organizacao === id) return;
  suspenderContexto();
  organizacao = id;
}
export const organizacaoAtual = () => organizacao;
export function erroContexto() {
  return new ApiError("O espaço mudou. Revise os dados antes de tentar novamente.", 409);
}
export function contextoDaRequisicao() {
  if (organizacao === null) throw erroContexto();
  const versao = geracao;
  const id = organizacao;
  const controle = new AbortController();
  pendentes.add(controle);
  return {
    id, signal: controle.signal,
    validar: () => { if (versao !== geracao || id !== organizacao) throw erroContexto(); },
    encerrar: () => pendentes.delete(controle),
  };
}
export function requerContexto(caminho: string) {
  const rota = caminho.split("?")[0];
  return !["/api/organizacoes/minhas", "/api/organizacoes/selecionar", "/api/organizacoes/pessoal", "/api/equipe/convites/consulta", "/api/equipe/convites/aceitar"].includes(rota);
}
export function contextoMudou() {
  suspenderContexto();
  window.dispatchEvent(new Event("nexo:organizacao-alterada"));
}
export function publicarTrocaOrganizacao() {
  // Só um sinal de invalidação. Nenhuma conta, organização, sessão ou credencial é compartilhada.
  const sinal = crypto.randomUUID();
  try { localStorage.setItem(CHAVE, sinal); } catch { /* BroadcastChannel/foco continuam disponíveis. */ }
  if (typeof BroadcastChannel !== "undefined") {
    const canal = new BroadcastChannel(CHAVE);
    canal.postMessage(sinal);
    canal.close();
  }
  contextoMudou();
}
export function observarTrocaOrganizacao(receber: () => void) {
  let ultimo = "";
  const avisar = (sinal: unknown) => {
    if (typeof sinal !== "string" || sinal === ultimo) return;
    ultimo = sinal;
    receber();
  };
  const armazenado = (e: StorageEvent) => { if (e.key === CHAVE) avisar(e.newValue); };
  window.addEventListener("storage", armazenado);
  const canal = typeof BroadcastChannel === "undefined" ? null : new BroadcastChannel(CHAVE);
  if (canal) canal.onmessage = e => avisar(e.data);
  return () => { window.removeEventListener("storage", armazenado); canal?.close(); };
}
