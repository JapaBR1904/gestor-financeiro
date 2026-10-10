package br.com.nexo.produto;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProdutoIngredienteRepository extends JpaRepository<ProdutoIngrediente, Long> {
    List<ProdutoIngrediente> findByProdutoId(Long produtoId);
}
