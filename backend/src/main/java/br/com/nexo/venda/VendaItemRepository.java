package br.com.nexo.venda;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface VendaItemRepository extends JpaRepository<VendaItem, Long> {
    List<VendaItem> findByVendaIdOrderByIdAsc(Long vendaId);
    // Projeção em batch: filtra organização do item, venda e produto, sem inicializar relações por venda.
    @Query("""
            select i.produto.id as produtoId, i.produtoNome as nome,
                   i.quantidade as quantidade, i.subtotal as subtotal
            from VendaItem i
            where i.organizacao.id = :organizacaoId
              and i.venda.organizacao.id = :organizacaoId
              and i.produto.organizacao.id = :organizacaoId
            order by i.id
            """)
    List<ItemRelatorio> listarParaRelatorio(Long organizacaoId);
    interface ItemRelatorio {
        Long getProdutoId();
        String getNome();
        Integer getQuantidade();
        java.math.BigDecimal getSubtotal();
    }
}
