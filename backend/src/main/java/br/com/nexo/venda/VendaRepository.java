package br.com.nexo.venda;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;

public interface VendaRepository extends JpaRepository<Venda, Long> {
    List<Venda> findByOrganizacaoIdOrderByCriadoEmDesc(Long organizacaoId);
    @EntityGraph(attributePaths = "cliente")
    @Query("select v from Venda v where v.organizacao.id = :organizacaoId and v.status = 'registrada' order by v.criadoEm desc, v.id desc")
    List<Venda> listarParaRelatorio(Long organizacaoId);
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select v from Venda v where v.id = :id and v.organizacao.id = :org")
    Optional<Venda> bloquear(Long id, Long org);
    Optional<Venda> findByIdAndOrganizacaoId(Long id, Long organizacaoId);
}
