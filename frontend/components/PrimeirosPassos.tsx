"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useWorkspace } from "../lib/workspace";
import { planoPermite } from "../lib/planos";

export function PrimeirosPassos({ temMovimentos }: { temMovimentos: boolean }) {
  const { usuario, config } = useWorkspace();
  const [dispensado, setDispensado] = useState(true);
  const chave = usuario ? `nexo:guia:${usuario.id}:${usuario.organizacaoId}` : null;
  useEffect(() => {
    if (!chave) return;
    let ativo = true;
    Promise.resolve().then(() => { if (ativo) { try { setDispensado(localStorage.getItem(chave) === "dispensado"); } catch { setDispensado(false); } } });
    return () => { ativo = false; };
  }, [chave]);
  if (!usuario || !config || dispensado) return null;
  const pro = planoPermite(config.plano, "pro");
  const objetivo = config.objetivos.find(o => ["Controlar gastos", "Controlar custos", "Acompanhar saldo", "Criar metas", "Organizar clientes", "Acompanhar lucro", "Acompanhar indicadores", "Gerenciar equipe", "Padronizar a operação"].includes(o));
  const gestao = usuario.papel === "proprietario" || usuario.papel === "administrador";
  const destino = objetivo === "Criar metas" && pro ? "/metas" : objetivo === "Organizar clientes" && gestao ? "/clientes" : objetivo === "Gerenciar equipe" && config.plano === "business" && gestao ? "/equipe" : ["Acompanhar lucro", "Acompanhar indicadores"].includes(objetivo ?? "") && config.perfilUso !== "pessoal" ? "/relatorios" : objetivo === "Padronizar a operação" && gestao ? "/produtos" : pro && !["Controlar gastos", "Controlar custos"].includes(objetivo ?? "") ? "/fluxo-caixa" : "/pessoal";
  return <details className="panel first-steps"><summary>Primeiros passos — guia opcional</summary>
    <ul><li>{config.onboardingConcluido ? "✓ Preferências salvas" : "Escolha como usar o Nexo"}</li><li>{temMovimentos ? "✓ Movimentações registradas neste período" : gestao ? "Registre uma entrada ou saída, sem exemplos fictícios" : "Seu papel permite acompanhar os registros da equipe"}</li><li><Link className="text-button" href={temMovimentos ? destino : "/pessoal"}>{temMovimentos ? `Revisar seu foco: ${objetivo ?? "acompanhar o período"}` : gestao ? "Abrir lançamentos" : "Consultar lançamentos"}</Link></li></ul>
    <button className="text-button" onClick={() => { if (chave) { try { localStorage.setItem(chave,"dispensado"); } catch { /* A preferência continua válida nesta visita. */ } } setDispensado(true); }}>Dispensar guia</button>
  </details>;
}
