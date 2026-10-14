"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { carregarUsuarioAtual } from "../../lib/auth";
import {
  aceitarConvite,
  consultarConvite,
  InformacaoConvite,
  nomePapel,
  selecionarOrganizacao,
} from "../../lib/equipe";
import AuthCard from "../../components/AuthCard";

export default function ConvitePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [dados, setDados] = useState<InformacaoConvite | null>(null);
  const [erro, setErro] = useState("");
  const [precisaEntrar, setPrecisaEntrar] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const trava = useRef(false);
  useEffect(() => {
    let ativo = true;
    const convite = window.location.hash.slice(1);
    async function carregar() {
      if (!/^[A-Za-z0-9_-]{43}$/.test(convite)) {
        if (ativo) setErro("Este link de convite não é válido.");
        return;
      }
      if (ativo) setToken(convite);
      try {
        await carregarUsuarioAtual();
      } catch {
        if (ativo) setPrecisaEntrar(true);
        return;
      }
      try {
        const info = await consultarConvite(convite);
        if (ativo) setDados(info);
      } catch (e) {
        if (ativo)
          setErro(
            e instanceof Error
              ? e.message
              : "Não foi possível consultar o convite.",
          );
      }
    }
    void carregar();
    return () => {
      ativo = false;
    };
  }, []);
  async function aceitar() {
    if (trava.current) return;
    trava.current = true;
    setOcupado(true);
    setErro("");
    try {
      const info = await aceitarConvite(token);
      await selecionarOrganizacao(info.organizacaoId);
      router.replace("/empresa");
      router.refresh();
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível aceitar o convite.",
      );
    } finally {
      trava.current = false;
      setOcupado(false);
    }
  }
  const fragmento = token ? `#convite=${token}` : "";
  return (
    <AuthCard
      titulo="Um convite para trabalhar junto"
      descricao="Entre com o e-mail convidado. Sua conta pessoal e seus outros espaços serão preservados."
    >
      {erro ? (
        <p className="form-error-banner" role="alert">
          {erro}
        </p>
      ) : precisaEntrar ? (
        <div className="auth-form">
          <p>
            Para consultar e aceitar, entre com o mesmo e-mail usado no convite.
          </p>
          <Link className="primary-button" href={`/login${fragmento}`}>
            Entrar para aceitar
          </Link>
          <Link className="secondary-button" href={`/cadastro${fragmento}`}>
            Criar conta com este e-mail
          </Link>
        </div>
      ) : dados ? (
        <div className="auth-form">
          <h2>{dados.organizacaoNome}</h2>
          <p>
            Seu papel será <strong>{nomePapel(dados.papel)}</strong>.
          </p>
          <p>
            Convite válido até{" "}
            {new Date(dados.expiraEm).toLocaleString("pt-BR")}.
          </p>
          <button
            className="primary-button"
            disabled={ocupado}
            onClick={aceitar}
          >
            {ocupado ? "Aceitando…" : "Aceitar convite"}
          </button>
          <Link className="secondary-button" href="/dashboard">
            Continuar no meu espaço
          </Link>
        </div>
      ) : (
        <p role="status">Consultando convite…</p>
      )}
    </AuthCard>
  );
}
