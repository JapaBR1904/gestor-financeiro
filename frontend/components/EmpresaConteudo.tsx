"use client";
import Link from "next/link";
import { Icone } from "./Icone";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";
import { WorkspaceShell } from "./WorkspaceShell";
import { useWorkspace } from "../lib/workspace";
import {
  criarEspacoPessoal,
  minhasOrganizacoes,
  nomePapel,
  Organizacao,
  renomearOrganizacao,
  selecionarOrganizacao,
} from "../lib/equipe";
import {
  datasDoMes,
  ResumoFinanceiro,
  resumoFinanceiro,
} from "../lib/financeiro";
import { formatarMoeda } from "../lib/produtos";

export function EmpresaConteudo() {
  const { usuario, assinatura, config, atualizar } = useWorkspace();
  const router = useRouter();
  const podeLer =
    usuario?.papel === "proprietario" || config?.plano === "business";
  const gestao =
    usuario?.papel === "proprietario" ||
    (usuario?.papel === "administrador" && config?.plano === "business");
  const [nome, setNome] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [revisao, setRevisao] = useState(0);
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [dados, setDados] = useState<ResumoFinanceiro | null>(null);
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  useEffect(() => {
    let ativo = true;
    const periodo = datasDoMes();
    Promise.all([
      minhasOrganizacoes(),
      podeLer
        ? resumoFinanceiro(periodo.inicio, periodo.fim)
        : Promise.resolve(null),
    ])
      .then(([lista, resumo]) => {
        if (ativo) {
          setOrganizacoes(lista);
          setDados(resumo);
        }
      })
      .catch((e) => {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível carregar a organização.",
          );
      });
    return () => {
      ativo = false;
    };
  }, [usuario?.organizacaoId, revisao, podeLer]);
  async function criarPessoal() {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      const pessoal = await criarEspacoPessoal();
      await selecionarOrganizacao(pessoal.id);
      await atualizar();
      router.replace("/onboarding");
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível criar seu espaço.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  async function escolher(id: number) {
    if (trava.current || id === usuario?.organizacaoId) return;
    trava.current = true;
    setOcupado(true);
    try {
      await selecionarOrganizacao(id);
      await atualizar();
      router.replace("/");
    } catch (e) {
      setErro(
        e instanceof Error
          ? e.message
          : "Não foi possível trocar de organização.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  async function renomear(e: FormEvent) {
    e.preventDefault();
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      await renomearOrganizacao(nome);
      await atualizar();
      setNome("");
      setRevisao((r) => r + 1);
      setSucesso("Nome do espaço atualizado.");
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível salvar o nome.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  return (
    <WorkspaceShell
      titulo="Organização"
      descricao="Conheça o resultado do espaço atual e mantenha seus outros espaços separados."
    >
      {sucesso ? (
        <p className="form-success" role="status">
          {sucesso}
        </p>
      ) : null}
      {erro ? (
        <p className="form-error-banner" role="alert">
          {erro}
        </p>
      ) : null}
      {!podeLer ? (
        <p className="permission-note">
          O acesso compartilhado precisa do Business. Seus espaços pessoais
          continuam disponíveis abaixo, e os dados da empresa foram preservados.
        </p>
      ) : null}
      <section className="finance-summary">
        <article className="summary-card balance-card">
          <span>Resultado deste mês</span>
          <strong>{dados ? formatarMoeda(dados.saldo) : "—"}</strong>
          <small>Entradas menos saídas</small>
        </article>
        <article className="summary-card">
          <span>Entradas do mês</span>
          <strong>{dados ? formatarMoeda(dados.receitas) : "—"}</strong>
          <small>Dados do espaço atual</small>
        </article>
        <article className="summary-card">
          <span>Usuários ativos</span>
          <strong>{assinatura?.usuariosAtivos ?? "—"}</strong>
          <small>
            Limite do plano: {assinatura?.plano.limiteUsuarios ?? "—"}
          </small>
        </article>
      </section>
      {gestao ? (
        <section className="product-form-panel">
          <h2>Nome do espaço</h2>
          <form className="period-toolbar" onSubmit={renomear}>
            <label className="field">
              <span>Novo nome</span>
              <input
                aria-label="Novo nome"
                required
                maxLength={160}
                value={nome}
                placeholder={usuario.organizacaoNome}
                onChange={(e) => setNome(e.target.value)}
              />
            </label>
            <button className="primary-button" disabled={ocupado}>
              {ocupado ? "Salvando…" : "Salvar nome"}
            </button>
          </form>
        </section>
      ) : null}
      <div className="product-two-columns">
        <section className="panel">
          <div className="panel-header">
            <h2>Seus espaços</h2>
          </div>
          <p className="subtitle">
            Cada espaço tem dados e assinatura próprios. Mudar de espaço não
            move seus registros.
          </p>
          {organizacoes.length > 0 &&
          !organizacoes.some((org) => org.papel === "proprietario") ? (
            <div className="permission-note">
              <p>
                Sua conta antiga está vinculada à empresa. Crie um espaço
                pessoal gratuito para usar suas próprias finanças, mantendo o
                acesso da empresa separado.
              </p>
              <button
                className="secondary-button"
                disabled={ocupado}
                onClick={() => void criarPessoal()}
              >
                Criar meu espaço pessoal
              </button>
            </div>
          ) : null}
          <div className="organization-switcher">
            {organizacoes.map((org) => (
              <button
                className={org.id === usuario?.organizacaoId ? "active" : ""}
                key={org.id}
                disabled={ocupado || org.id === usuario?.organizacaoId}
                onClick={() => void escolher(org.id)}
              >
                <strong>{org.nome}</strong>
                <small style={{ display: "block", marginTop: 6 }}>
                  {nomePapel(org.papel)}
                  {org.id === usuario?.organizacaoId
                    ? " · Espaço atual"
                    : " · Abrir espaço →"}
                </small>
              </button>
            ))}
          </div>
        </section>
        <section className="panel">
          <div className="panel-header">
            <h2>Gestão do espaço</h2>
          </div>
          <div className="quick-actions organization-actions">
            <Link className="quick-action" href="/equipe">
              <Icone nome="equipe" />
              <strong>Equipe e permissões</strong>
              <span>
                {config?.plano === "business"
                  ? "Convide e gerencie quem trabalha com você."
                  : "Conheça a colaboração disponível no Business."}
              </span>
            </Link>
            <Link className="quick-action" href="/documentos">
              <Icone nome="documento" />
              <strong>Documentos</strong>
              <span>Arquivos da empresa, disponíveis para a equipe.</span>
            </Link>
            <Link className="quick-action" href="/conta/assinatura">
              <Icone nome="conta" />
              <strong>Assinatura</strong>
              <span>Plano, histórico e ações permitidas.</span>
            </Link>
          </div>
        </section>
      </div>
    </WorkspaceShell>
  );
}
