package br.com.nexo.venda;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface VendaRepository extends JpaRepository<Venda, Long> {
    List<Venda> findByOrganizacaoIdOrderByCriadoEmDesc(Long organizacaoId);
}
