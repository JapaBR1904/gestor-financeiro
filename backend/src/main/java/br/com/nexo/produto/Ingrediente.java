package br.com.nexo.produto;

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
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "ingredientes")
public class Ingrediente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(name = "preco_compra", nullable = false, precision = 14, scale = 2)
    private BigDecimal precoCompra;

    @Column(name = "quantidade_compra", nullable = false, precision = 14, scale = 4)
    private BigDecimal quantidadeCompra;

    @Column(name = "unidade_compra", nullable = false, length = 10)
    private String unidadeCompra;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Ingrediente() {
    }

    public Ingrediente(
            Organizacao organizacao,
            String nome,
            BigDecimal precoCompra,
            BigDecimal quantidadeCompra,
            String unidadeCompra
    ) {
        this.organizacao = organizacao;
        this.nome = nome;
        this.precoCompra = precoCompra;
        this.quantidadeCompra = quantidadeCompra;
        this.unidadeCompra = unidadeCompra;
    }

    @PrePersist
    void aoCriar() {
        OffsetDateTime agora = OffsetDateTime.now();
        criadoEm = agora;
        atualizadoEm = agora;
    }

    @PreUpdate
    void aoAtualizar() {
        atualizadoEm = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public BigDecimal getPrecoCompra() {
        return precoCompra;
    }

    public BigDecimal getQuantidadeCompra() {
        return quantidadeCompra;
    }

    public String getUnidadeCompra() {
        return unidadeCompra;
    }
}
