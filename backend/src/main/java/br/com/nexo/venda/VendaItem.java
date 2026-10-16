package br.com.nexo.venda;

import java.math.BigDecimal;

import br.com.nexo.organizacao.Organizacao;
import br.com.nexo.produto.Produto;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "venda_itens")
public class VendaItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "venda_id", nullable = false)
    private Venda venda;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "produto_id", nullable = false)
    private Produto produto;

    @Column(name = "produto_nome", nullable = false, length = 160)
    private String produtoNome;

    @Column(nullable = false)
    private Integer quantidade;

    @Column(name = "preco_unitario", nullable = false, precision = 14, scale = 2)
    private BigDecimal precoUnitario;

    @Column(name = "custo_unitario", precision = 14, scale = 2)
    private BigDecimal custoUnitario;

    @Column(nullable = false, precision = 14, scale = 2)
    private BigDecimal subtotal;

    @Column(name = "custo_subtotal", precision = 14, scale = 2)
    private BigDecimal custoSubtotal;

    @Column(name = "lucro_subtotal", precision = 14, scale = 2)
    private BigDecimal lucroSubtotal;

    protected VendaItem() {}

    public VendaItem(Organizacao organizacao, Venda venda, Produto produto, String produtoNome, Integer quantidade, BigDecimal precoUnitario, BigDecimal custoUnitario, BigDecimal subtotal, BigDecimal custoSubtotal, BigDecimal lucroSubtotal) {
        this.organizacao = organizacao;
        this.venda = venda;
        this.produto = produto;
        this.produtoNome = produtoNome;
        this.quantidade = quantidade;
        this.precoUnitario = precoUnitario;
        this.custoUnitario = custoUnitario;
        this.subtotal = subtotal;
        this.custoSubtotal = custoSubtotal;
        this.lucroSubtotal = lucroSubtotal;
    }

    public Long getId() { return id; }
    public Produto getProduto() { return produto; }
    public String getProdutoNome() { return produtoNome; }
    public Integer getQuantidade() { return quantidade; }
    public BigDecimal getPrecoUnitario() { return precoUnitario; }
    public BigDecimal getCustoUnitario() { return custoUnitario; }
    public BigDecimal getSubtotal() { return subtotal; }
    public BigDecimal getCustoSubtotal() { return custoSubtotal; }
    public BigDecimal getLucroSubtotal() { return lucroSubtotal; }
}
