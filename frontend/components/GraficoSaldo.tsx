"use client";
import { useId, useState } from "react";
import type { AnaliseFinanceira } from "../lib/financeiro";
import { useMoeda, usePreferencias } from "./PreferenciasProvider";

type Dia = AnaliseFinanceira["evolucao"][number];
const dataCurta = (data: string) =>
  new Date(`${data}T12:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
const valorEixo = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function GraficoSaldo({ dias }: { dias: Dia[] }) {
  const formatarMoeda = useMoeda();
  const { ocultarValores } = usePreferencias();
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const descricao = useId();
  const gradiente = useId();
  const minimo = Math.min(0, ...dias.map((d) => d.saldo));
  const maximo = Math.max(1, ...dias.map((d) => d.saldo));
  const amplitude = maximo - minimo;
  const x = (i: number) => 8 + (i / Math.max(1, dias.length - 1)) * 584;
  const y = (valor: number) => 204 - ((valor - minimo) / amplitude) * 188;
  const pontos = dias.map((d, i) => `${x(i)},${y(d.saldo)}`).join(" ");
  const indice = Math.min(selecionado ?? dias.length - 1, dias.length - 1);
  const dia = dias[indice];
  if (!dia) return null;
  return (
    <figure className="balance-chart">
      <figcaption className="chart-detail" aria-live="polite">
        <span>
          <i className="chart-legend-dot" />
          Saldo acumulado <small>{dataCurta(dia.data)}</small>
        </span>
        <strong className={dia.saldo < 0 ? "negative" : ""}>
          {formatarMoeda(dia.saldo)}
        </strong>
      </figcaption>
      <p className="sr-only" id={descricao}>
        Saldo acumulado a partir de zero no período. Use o controle de dia ou
        abra a tabela para consultar os valores.
      </p>
      <div className="chart-plot">
        <div className="chart-axis" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i}>
              {ocultarValores ? "•••" : valorEixo.format(maximo - (amplitude * i) / 4)}
            </span>
          ))}
        </div>
        <svg
          className="financial-chart"
          viewBox="0 0 600 220"
          preserveAspectRatio="none"
          role="img"
          aria-label="Evolução diária do saldo acumulado"
          aria-describedby={descricao}
          onPointerMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            const ponto = Math.round(
              Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) *
                (dias.length - 1),
            );
            if (ponto !== indice) setSelecionado(ponto);
          }}
        >
          <defs>
            <linearGradient id={gradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
              <stop
                offset="100%"
                stopColor="var(--accent)"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <line
              key={i}
              className="chart-grid"
              x1="8"
              x2="592"
              y1={16 + (188 * i) / 4}
              y2={16 + (188 * i) / 4}
            />
          ))}
          <polygon
            className="chart-area"
            style={{ fill: `url(#${gradiente})` }}
            points={`8,${y(0)} ${pontos} ${x(dias.length - 1)},${y(0)}`}
          />
          <line className="chart-zero" x1="8" x2="592" y1={y(0)} y2={y(0)} />
          <polyline
            className="chart-line"
            points={pontos}
            vectorEffect="non-scaling-stroke"
          />
          <line
            className="chart-cursor"
            x1={x(indice)}
            x2={x(indice)}
            y1="16"
            y2="204"
          />
          <circle
            className="chart-point"
            cx={x(indice)}
            cy={y(dia.saldo)}
            r="4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
      <div className="chart-caption">
        <span>{dataCurta(dias[0].data)}</span>
        <span>{dataCurta(dias[dias.length - 1].data)}</span>
      </div>
      <label className="chart-day-control">
        <span>
          Consultar dia <strong>{dataCurta(dia.data)}</strong>
        </span>
        <input
          aria-label="Dia no gráfico"
          type="range"
          min="0"
          max={Math.max(0, dias.length - 1)}
          value={indice}
          aria-valuetext={`${dataCurta(dia.data)}: ${formatarMoeda(dia.saldo)}`}
          onChange={(e) => setSelecionado(Number(e.target.value))}
        />
      </label>
      <details className="chart-data">
        <summary>Ver valores por dia</summary>
        <div className="finance-table-wrap">
          <table className="finance-table">
            <caption className="sr-only">Valores diários do período</caption>
            <thead>
              <tr>
                <th>Data</th>
                <th className="amount">Entradas</th>
                <th className="amount">Saídas</th>
                <th className="amount">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.data}>
                  <td>{dataCurta(d.data)}</td>
                  <td className="amount">{formatarMoeda(d.receitas)}</td>
                  <td className="amount">{formatarMoeda(d.despesas)}</td>
                  <td className="amount">{formatarMoeda(d.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
