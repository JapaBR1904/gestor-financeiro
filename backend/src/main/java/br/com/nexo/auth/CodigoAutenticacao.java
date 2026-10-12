package br.com.nexo.auth;

import java.time.OffsetDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

@Entity
@Table(name = "codigos_autenticacao")
public class CodigoAutenticacao {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 180)
    private String email;

    @Column(name = "codigo_hash", nullable = false, length = 255)
    private String codigoHash;

    @Column(nullable = false, length = 20)
    private String finalidade;

    @Column(nullable = false)
    private int tentativas;

    @Column(name = "max_tentativas", nullable = false)
    private int maxTentativas = 5;

    @Column(name = "expira_em", nullable = false)
    private OffsetDateTime expiraEm;

    @Column(name = "usado_em")
    private OffsetDateTime usadoEm;

    @Column(name = "criado_em", nullable = false)
    private OffsetDateTime criadoEm;

    @Column(name = "prova_hash", length = 64, unique = true)
    private String provaHash;

    @Column(name = "prova_expira_em")
    private OffsetDateTime provaExpiraEm;

    @Column(name = "prova_usada_em")
    private OffsetDateTime provaUsadaEm;

    protected CodigoAutenticacao() {}

    public CodigoAutenticacao(String email, String codigoHash, String finalidade, OffsetDateTime expiraEm) {
        this.email = email;
        this.codigoHash = codigoHash;
        this.finalidade = finalidade;
        this.expiraEm = expiraEm;
    }

    @PrePersist
    void aoCriar() { criadoEm = OffsetDateTime.now(); }

    public boolean expirou() { return !OffsetDateTime.now().isBefore(expiraEm); }
    public boolean usado() { return usadoEm != null; }
    public boolean excedeuTentativas() { return tentativas >= maxTentativas; }
    public void registrarTentativa() { tentativas++; }
    public void marcarUsado() { usadoEm = OffsetDateTime.now(); }

    public void emitirProva(String hash) {
        provaHash = hash;
        provaExpiraEm = OffsetDateTime.now().plusMinutes(10);
    }
    public boolean provaValida() {
        return "recuperacao_senha".equals(finalidade) && usado() && provaHash != null
                && provaUsadaEm == null && OffsetDateTime.now().isBefore(provaExpiraEm);
    }
    public void consumirProva() { provaUsadaEm = OffsetDateTime.now(); }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getCodigoHash() { return codigoHash; }
    public String getFinalidade() { return finalidade; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
}
