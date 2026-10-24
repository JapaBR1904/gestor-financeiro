"use client";

import { useState } from "react";
import { datasDoMes } from "../lib/financeiro";

type Periodo = { inicio: string; fim: string };

export function PeriodosRapidos({ atual, desabilitado, selecionar }: {
  atual: Periodo | null;
  desabilitado: boolean;
  selecionar: (periodo: Periodo) => void;
}) {
  const [preferido, setPreferido] = useState("Este mês");
  // Usa o mesmo dia de São Paulo já adotado pelas consultas financeiras.
  const mes = datasDoMes();
  const [ano, numeroMes] = mes.fim.split("-").map(Number);
  const fimAnterior = new Date(Date.UTC(ano, numeroMes - 1, 0)).toISOString().slice(0, 10);
  const opcoes = [
    { nome: "Hoje", inicio: mes.fim, fim: mes.fim },
    { nome: "Este mês", ...mes },
    { nome: "Mês anterior", inicio: `${fimAnterior.slice(0, 7)}-01`, fim: fimAnterior },
  ];
  const correspondentes = opcoes.filter(opcao => atual?.inicio === opcao.inicio && atual?.fim === opcao.fim);
  const ativo = correspondentes.find(opcao => opcao.nome === preferido)?.nome ?? correspondentes[0]?.nome;
  return <div className="period-shortcuts" role="group" aria-label="Atalhos de período">
    {opcoes.map(({ nome, inicio, fim }) => <button
      key={nome} type="button" disabled={desabilitado}
      aria-pressed={ativo === nome}
      onClick={() => { setPreferido(nome); selecionar({ inicio, fim }); }}
    >{nome}</button>)}
  </div>;
}
