"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { avisarWorkspace, useWorkspace } from "../lib/workspace";
import {
  OBJETIVOS_POR_PERFIL,
  type PerfilUso,
  salvarOnboardingNoBackend,
} from "../lib/saas";

const opcoes: Array<{
  id: PerfilUso;
  titulo: string;
  texto: string;
}> = [
  {
    id: "pessoal",
    titulo: "Pessoal",
    texto: "Entradas, gastos e metas do dia a dia.",
  },
  {
    id: "negocio",
    titulo: "Negócio",
    texto: "Vendas, despesas, produtos e clientes.",
  },
  {
    id: "empresa",
    titulo: "Empresa",
    texto: "Espaço compartilhado, equipe e gestão.",
  },
];

function destinoDoPerfil(perfil: PerfilUso) {
  if (perfil === "pessoal") return "/pessoal?novo=1";
  if (perfil === "empresa") return "/empresa";
  return "/produtos/novo?origem=onboarding";
}

export function PrimeiroAcesso() {
  const router = useRouter();
  const { usuario, config } = useWorkspace();
  const [dispensado, setDispensado] = useState(true);
  const [salvando, setSalvando] = useState<PerfilUso | null>(null);
  const [erro, setErro] = useState("");
  const chave = usuario ? `nexo:primeiro-acesso:${usuario.id}:${usuario.organizacaoId}` : null;

  useEffect(() => {
    if (!chave) return;
    let ativo = true;
    Promise.resolve().then(() => {
      if (!ativo) return;
      try {
        setDispensado(localStorage.getItem(chave) === "dispensado");
      } catch {
        setDispensado(false);
      }
    });
    return () => { ativo = false; };
  }, [chave]);

  if (!usuario || !config || config.onboardingConcluido || usuario.papel === "membro" || dispensado) return null;

  async function escolher(perfil: PerfilUso) {
    if (salvando) return;
    setSalvando(perfil);
    setErro("");
    try {
      const objetivosCompativeis = config.objetivos.filter((objetivo) =>
        OBJETIVOS_POR_PERFIL[perfil].includes(objetivo),
      );
      await salvarOnboardingNoBackend(perfil, objetivosCompativeis, true);
      try { if (chave) localStorage.removeItem(chave); } catch { /* O servidor continua sendo a fonte da preferência. */ }
      avisarWorkspace();
      router.push(destinoDoPerfil(perfil));
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar essa escolha.");
      setSalvando(null);
    }
  }

  function dispensar() {
    try { if (chave) localStorage.setItem(chave, "dispensado"); } catch { /* A escolha pode ser feita depois em Conta. */ }
    setDispensado(true);
  }

  return (
    <section className="panel first-use-choice" aria-labelledby="primeiro-acesso-titulo">
      <div className="first-use-copy">
        <p className="eyebrow">Primeiro passo</p>
        <h2 id="primeiro-acesso-titulo">Como você quer usar este espaço?</h2>
        <p>Escolha uma opção para o Nexo priorizar a linguagem e levar você à primeira ação útil. Dá para mudar depois em Conta.</p>
      </div>
      <div className="first-use-options">
        {opcoes.map((opcao) => (
          <button
            className="first-use-option"
            type="button"
            key={opcao.id}
            disabled={Boolean(salvando)}
            onClick={() => void escolher(opcao.id)}
          >
            <strong>{salvando === opcao.id ? "Salvando…" : opcao.titulo}</strong>
            <span>{opcao.texto}</span>
          </button>
        ))}
      </div>
      {erro ? <p className="form-error-banner" role="alert">{erro}</p> : null}
      <button className="text-button first-use-skip" type="button" onClick={dispensar} disabled={Boolean(salvando)}>
        Agora não
      </button>
    </section>
  );
}
