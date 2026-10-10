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
import jakarta.persistence.Table;

@Entity
@Table(name = "produto_ingredientes")
public class ProdutoIngrediente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ingrediente_id", nullable = false)
    private Ingrediente ingrediente;

    @Column(name = "quantidade_usada", nullable = false, precision = 14, scale = 4)
    private BigDecimal quantidadeUsada;

    @Column(name = "unidade_uso", nullable = false, length = 10)
    private String unidadeUso;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    protected ProdutoIngrediente() {
    }

    public ProdutoIngrediente(
            Organizacao organizacao,
            Produto produto,
            Ingrediente ingrediente,
            BigDecimal quantidadeUsada,
            String unidadeUso
    ) {
        this.organizacao = organizacao;
        this.produto = produto;
        this.ingrediente = ingrediente;
        this.quantidadeUsada = quantidadeUsada;
        this.unidadeUso = unidadeUso;
    }

    @PrePersist
    void aoCriar() {
        criadoEm = OffsetDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Ingrediente getIngrediente() {
        return ingrediente;
    }

    public BigDecimal getQuantidadeUsada() {
        return quantidadeUsada;
    }

    public String getUnidadeUso() {
        return unidadeUso;
    }
}
