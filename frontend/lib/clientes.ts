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

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function lerResposta(response: Response) {
  if (response.ok) return response.json();
  let mensagem = `Erro ${response.status} ao acessar o backend.`;
  try {
    const corpo = await response.json();
    mensagem = corpo.message ?? corpo.mensagem ?? corpo.detail ?? mensagem;
  } catch {}
  throw new Error(mensagem);
}

async function obterOrganizacaoId(): Promise<number> {
  const response = await fetch(`${API_URL}/api/organizacoes`, { cache: "no-store" });
  const organizacoes = (await lerResposta(response)) as Array<{ id: number }>;
  if (organizacoes.length > 0) return organizacoes[0].id;
  const criacao = await fetch(`${API_URL}/api/organizacoes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome: "Minha empresa" }),
  });
  const organizacao = (await lerResposta(criacao)) as { id: number };
  return organizacao.id;
}

export async function carregarClientes(): Promise<Cliente[]> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/clientes?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Cliente[];
}

export async function carregarCliente(clienteId: string | number): Promise<Cliente> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/clientes/${clienteId}?organizacaoId=${organizacaoId}`, { cache: "no-store" }))) as Cliente;
}

export async function salvarCliente(dados: { nome: string; telefone?: string; email?: string; observacao?: string }): Promise<Cliente> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/clientes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizacaoId, ...dados }),
  }))) as Cliente;
}

export async function atualizarCliente(clienteId: string | number, dados: { nome: string; telefone?: string; email?: string; observacao?: string }): Promise<Cliente> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/clientes/${clienteId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizacaoId, ...dados }),
  }))) as Cliente;
}

export async function alterarStatusCliente(clienteId: string | number, ativo: boolean): Promise<Cliente> {
  const organizacaoId = await obterOrganizacaoId();
  return (await lerResposta(await fetch(`${API_URL}/api/clientes/${clienteId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ organizacaoId, ativo }),
  }))) as Cliente;
}
