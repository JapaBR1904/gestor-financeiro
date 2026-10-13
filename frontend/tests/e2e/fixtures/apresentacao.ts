import type { Page } from "@playwright/test";
// Dados sintéticos de apresentação. Não substituem testes de autorização/persistência.
const planos=['free','pro','business'].map((id,i)=>({id,nome:['Free','Pro','Business'][i],valorMensal:[0,39,99][i],moeda:'BRL',periodicidade:'mensal',descricao:['O essencial para começar.','Planejamento e análise individual.','Colaboração para sua organização.'][i],beneficios:['Dashboard financeiro','Lançamentos e relatórios',...(i?['Metas e fluxo de caixa','Exportação CSV','Assistente IA']:[]),...(i===2?['Equipe e documentos']:[])],limiteUsuarios:i===2?10:1,recursos:[]}));
const hoje=new Date().toISOString().slice(0,10),inicio=hoje.slice(0,7)+'-01';
const movimentos=[{id:1,origem:'manual',tipo:'receita',descricao:'Pagamento de serviços de consultoria',valor:4800,data:hoje,categoria:'Serviços',conta:'Principal'},{id:2,origem:'manual',tipo:'despesa',descricao:'Materiais para o projeto',valor:350,data:hoje,categoria:'Materiais',conta:'Principal'},{id:3,origem:'venda',tipo:'receita',descricao:'Venda comercial registrada',valor:1200,data:hoje,categoria:'Vendas',conta:'Principal'},{id:4,origem:'manual',tipo:'despesa',descricao:'Transporte',valor:80,data:hoje,categoria:'Transporte',conta:'Principal'},{id:5,origem:'manual',tipo:'despesa',descricao:'Aluguel do espaço',valor:800,data:hoje,categoria:'Moradia',conta:'Principal'}];
const resumo={inicio,fim:hoje,receitas:6000,despesas:1230,saldo:4770,movimentacoes:movimentos};
export const fixtures: Record<string, unknown>={'/api/auth/me':{id:900001,nome:'Pessoa de demonstração',email:'apresentacao@example.com',organizacaoId:900001,organizacaoNome:'Espaço de apresentação',papel:'proprietario'},'/api/saas':{perfilUso:'negocio',objetivos:['Controlar custos'],onboardingConcluido:true,plano:'business',statusAssinatura:'ativa'},'/api/assinatura':{plano:planos[2],status:'ativa',ultimaAlteracao:null,usuariosAtivos:1,podeGerenciar:true,simulacaoHabilitada:true,ambienteDesenvolvimento:true,historico:[]},'/api/assinatura/planos':planos,'/api/financeiro/resumo':resumo,'/api/ia/status':{configurada:true},'/api/organizacoes/minhas':[{id:900001,nome:'Espaço de apresentação',papel:'proprietario'}]};

export async function apresentar(page: Page) {
  await page.route("**/api/**", async route => {
    const caminho = new URL(route.request().url()).pathname;
    if (route.request().method() === "GET" && caminho in fixtures) await route.fulfill({ status: 200, json: fixtures[caminho] });
    else await route.abort(); // Nunca encaminhar um GET desconhecido ao banco.
  });
}
