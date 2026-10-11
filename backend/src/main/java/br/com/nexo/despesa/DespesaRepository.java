package br.com.nexo.despesa;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DespesaRepository extends JpaRepository<Despesa, Long> {
    List<Despesa> findByOrganizacaoIdOrderByDataDespesaDescIdDesc(Long organizacaoId);
    Optional<Despesa> findByIdAndOrganizacaoId(Long id, Long organizacaoId);
}
