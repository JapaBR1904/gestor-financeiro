package br.com.nexo.auth;

import java.time.OffsetDateTime;
import java.util.Optional;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CodigoAutenticacaoRepository extends JpaRepository<CodigoAutenticacao, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CodigoAutenticacao> findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(String email, String finalidade);
    @Query("select c.email from CodigoAutenticacao c where c.provaHash = :hash")
    Optional<String> buscarEmailDaProva(@Param("hash") String hash);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CodigoAutenticacao> findLockedByProvaHash(String provaHash);

    @Modifying
    @Query("update CodigoAutenticacao c set c.usadoEm = :agora, c.provaUsadaEm = :agora where lower(c.email) = lower(:email) and c.finalidade = 'recuperacao_senha'")
    void invalidarRecuperacoes(@Param("email") String email, @Param("agora") OffsetDateTime agora);

    long countByEmailIgnoreCaseAndCriadoEmAfter(String email, OffsetDateTime instante);
}
