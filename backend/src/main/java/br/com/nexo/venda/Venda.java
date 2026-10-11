package br.com.nexo.venda;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import br.com.nexo.organizacao.Organizacao;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "vendas")
public class Venda {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @Column(name = "forma_pagamento", nullable = false, length = 30)
    private String formaPagamento;

    @Column(columnDefinition = "TEXT")
    private String observacao;

    @Column(name = "total_venda", nullable = false, precision = 14, scale = 2)
    private BigDecimal totalVenda;

    @Column(name = "custo_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal custoTotal;

    @Column(name = "lucro_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal lucroTotal;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    protected Venda() {}

    public Venda(Organizacao organizacao, String formaPagamento, String observacao, BigDecimal totalVenda, BigDecimal custoTotal, BigDecimal lucroTotal) {
        this.organizacao = organizacao;
        this.formaPagamento = formaPagamento;
        this.observacao = observacao;
        this.totalVenda = totalVenda;
        this.custoTotal = custoTotal;
        this.lucroTotal = lucroTotal;
    }

    @PrePersist
    void aoCriar() { criadoEm = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public Organizacao getOrganizacao() { return organizacao; }
    public String getFormaPagamento() { return formaPagamento; }
    public String getObservacao() { return observacao; }
    public BigDecimal getTotalVenda() { return totalVenda; }
    public BigDecimal getCustoTotal() { return custoTotal; }
    public BigDecimal getLucroTotal() { return lucroTotal; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
