package br.com.nexo.venda;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VendaItemRepository extends JpaRepository<VendaItem, Long> {
    List<VendaItem> findByVendaIdOrderByIdAsc(Long vendaId);
}
