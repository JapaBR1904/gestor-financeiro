import { apiFetch } from "./api";

export type Cliente = {
  id: number;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  observacao?: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
};

export function formatarTelefone(valor: string | null | undefined) {
  const numeros = (valor ?? "").replace(/\D/g, "").slice(0, 11);
  if (!numeros) return "";
  if (numeros.length <= 2) return `(${numeros}`;
  const ddd = numeros.slice(0, 2);
  const restante = numeros.slice(2);
  if (restante.length <= 4) return `(${ddd}) ${restante}`;
  if (restante.length <= 8) return `(${ddd}) ${restante.slice(0, 4)}-${restante.slice(4)}`;
  return `(${ddd}) ${restante.slice(0, 5)}-${restante.slice(5)}`;
}

export async function carregarClientes(): Promise<Cliente[]> {
  return apiFetch<Cliente[]>("/api/clientes");
}

export async function carregarCliente(clienteId: string | number): Promise<Cliente> {
  return apiFetch<Cliente>(`/api/clientes/${clienteId}`);
}

export async function salvarCliente(dados: { nome: string; telefone?: string; email?: string; observacao?: string }): Promise<Cliente> {
  return apiFetch<Cliente>("/api/clientes", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export async function atualizarCliente(clienteId: string | number, dados: { nome: string; telefone?: string; email?: string; observacao?: string }): Promise<Cliente> {
  return apiFetch<Cliente>(`/api/clientes/${clienteId}`, {
    method: "PUT",
    body: JSON.stringify(dados),
  });
}

export async function alterarStatusCliente(clienteId: string | number, ativo: boolean): Promise<Cliente> {
  return apiFetch<Cliente>(`/api/clientes/${clienteId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ ativo }),
  });
}
