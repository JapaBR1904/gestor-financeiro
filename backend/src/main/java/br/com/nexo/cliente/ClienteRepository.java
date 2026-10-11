package br.com.nexo.cliente;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClienteRepository extends JpaRepository<Cliente, Long> {
    List<Cliente> findByOrganizacaoIdOrderByNomeAsc(Long organizacaoId);
    Optional<Cliente> findByIdAndOrganizacaoId(Long id, Long organizacaoId);
}
