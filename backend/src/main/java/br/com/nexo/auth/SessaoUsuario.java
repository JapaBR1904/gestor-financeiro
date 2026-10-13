package br.com.nexo.auth;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "sessoes_usuario")
public class SessaoUsuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id", nullable = false)
    private Usuario usuario;

    @Column(name = "organizacao_id")
    private Long organizacaoId;

    @Column(name = "token_hash", nullable = false, length = 255)
    private String tokenHash;

    @Column(name = "expira_em", nullable = false)
    private OffsetDateTime expiraEm;

    @Column(name = "revogada_em")
    private OffsetDateTime revogadaEm;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "ultimo_acesso_em", nullable = false)
    private OffsetDateTime ultimoAcessoEm;

    protected SessaoUsuario() {}

    public SessaoUsuario(Usuario usuario, String tokenHash, OffsetDateTime expiraEm) {
        this.usuario = usuario;
        this.organizacaoId = usuario.getOrganizacao().getId();
        this.tokenHash = tokenHash;
        this.expiraEm = expiraEm;
    }

    @PrePersist
    void aoCriar() {
        criadoEm = OffsetDateTime.now();
        ultimoAcessoEm = criadoEm;
    }

    public boolean valida() {
        return revogadaEm == null && OffsetDateTime.now().isBefore(expiraEm);
    }

    public void revogar() { revogadaEm = OffsetDateTime.now(); }
    public Usuario getUsuario() { return usuario; }
    public Long getOrganizacaoId() { return organizacaoId == null ? usuario.getOrganizacao().getId() : organizacaoId; }
    public void selecionarOrganizacao(Long id) { this.organizacaoId = id; }
}
