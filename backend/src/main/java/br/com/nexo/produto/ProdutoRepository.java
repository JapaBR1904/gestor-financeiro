package br.com.nexo.produto;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProdutoRepository extends JpaRepository<Produto, Long> {
    List<Produto> findByOrganizacaoIdOrderByNomeAsc(Long organizacaoId);

    Optional<Produto> findByIdAndOrganizacaoId(Long id, Long organizacaoId);
}
