package br.com.nexo.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CodigoAutenticacaoRepository extends JpaRepository<CodigoAutenticacao, Long> {
    Optional<CodigoAutenticacao> findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(String email, String finalidade);
}
