package br.com.nexo.auth;

import java.time.OffsetDateTime;

import br.com.nexo.organizacao.Organizacao;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

@Entity
@Table(name = "usuarios")
public class Usuario {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizacao_id", nullable = false)
    private Organizacao organizacao;

    @Column(nullable = false, length = 160)
    private String nome;

    @Column(nullable = false, length = 180)
    private String email;

    @JsonIgnore
    @Column(name = "senha_hash", length = 255)
    private String senhaHash;

    @Column(name = "tentativas_login", nullable = false)
    private int tentativasLogin;

    @Column(name = "login_janela_em")
    private OffsetDateTime loginJanelaEm;

    @Column(nullable = false, length = 30)
    private String papel = "proprietario";

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "email_verificado_em")
    private OffsetDateTime emailVerificadoEm;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private OffsetDateTime atualizadoEm;

    protected Usuario() {}

    public Usuario(Organizacao organizacao, String nome, String email, String senhaHash) {
        this.organizacao = organizacao;
        this.nome = nome;
        this.email = email;
        this.senhaHash = senhaHash;
    }

    @PrePersist
    void aoCriar() {
        criadoEm = OffsetDateTime.now();
        atualizadoEm = criadoEm;
    }

    @PreUpdate
    void aoAtualizar() { atualizadoEm = OffsetDateTime.now(); }

    @JsonIgnore
    public String getSenhaHash() { return senhaHash; }
    public void definirSenha(String hash) { senhaHash = hash; limparTentativasLogin(); }
    public boolean emailVerificado() { return emailVerificadoEm != null; }
    public void verificarEmail() { emailVerificadoEm = OffsetDateTime.now(); }

    public boolean loginBloqueado(OffsetDateTime agora) {
        if (loginJanelaEm == null || !agora.isBefore(loginJanelaEm.plusMinutes(15))) {
            loginJanelaEm = agora;
            tentativasLogin = 0;
        }
        return tentativasLogin >= 10;
    }

    public void registrarFalhaLogin() { tentativasLogin++; }
    public void limparTentativasLogin() { tentativasLogin = 0; loginJanelaEm = null; }

    public Long getId() { return id; }
    public Organizacao getOrganizacao() { return organizacao; }
    public String getNome() { return nome; }
    public String getEmail() { return email; }
    public String getPapel() { return papel; }
    public boolean isAtivo() { return ativo; }
}
