package br.com.nexo.auth;

import java.util.Optional;
import java.time.OffsetDateTime;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessaoUsuarioRepository extends JpaRepository<SessaoUsuario, Long> {
    @Modifying
    @Query("update SessaoUsuario s set s.revogadaEm = :agora where s.usuario.id = :usuarioId and s.revogadaEm is null")
    void revogarDoUsuario(@Param("usuarioId") Long usuarioId, @Param("agora") OffsetDateTime agora);

    @Modifying
    @Query("update SessaoUsuario s set s.ultimoAcessoEm = :agora where s.tokenHash = :hash and s.revogadaEm is null and s.expiraEm > :agora")
    int registrarAcesso(@Param("hash") String hash, @Param("agora") OffsetDateTime agora);

    Optional<SessaoUsuario> findByTokenHash(String tokenHash);
}
