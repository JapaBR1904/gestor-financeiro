package br.com.nexo.auth;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface SessaoUsuarioRepository extends JpaRepository<SessaoUsuario, Long> {
    Optional<SessaoUsuario> findByTokenHash(String tokenHash);
}
