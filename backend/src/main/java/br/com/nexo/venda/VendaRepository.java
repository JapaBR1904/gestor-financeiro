package br.com.nexo.venda;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

public interface VendaRepository extends JpaRepository<Venda, Long> {
    List<Venda> findByOrganizacaoIdOrderByCriadoEmDesc(Long organizacaoId);
    @EntityGraph(attributePaths = "cliente")
    @Query("select v from Venda v where v.organizacao.id = :organizacaoId order by v.criadoEm desc, v.id desc")
    List<Venda> listarParaRelatorio(Long organizacaoId);
    Optional<Venda> findByIdAndOrganizacaoId(Long id, Long organizacaoId);
}
