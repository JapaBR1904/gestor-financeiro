package br.com.nexo.auth;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RecuperacaoAssistidaService {
    private final CodigoAutenticacaoRepository codigos;
    private final UsuarioRepository usuarios;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public RecuperacaoAssistidaService(CodigoAutenticacaoRepository codigos, UsuarioRepository usuarios) {
        this.codigos = codigos; this.usuarios = usuarios;
    }

    @Transactional
    public Solicitacao solicitar(String informado, String provaAtual) {
        String email = informado == null ? "" : informado.trim().toLowerCase(Locale.ROOT);
        if (email.length() > 180 || !email.matches("^[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}$")) throw new IllegalArgumentException("Informe um e-mail válido.");
        // Mantém a ordem usuário -> código usada no fluxo de senha existente.
        usuarios.buscarParaAutenticacao(email);
        if (provaAtual != null && provaAtual.matches("[A-Za-z0-9_-]{43}")) {
            var atual = codigos.findLockedByProvaHash(AuthService.sha256(provaAtual)).orElse(null);
            if (atual != null && email.equals(atual.getEmail()) && (atual.assistidaPendente() || atual.provaValida()))
                return new Solicitacao(atual.getId(), provaAtual);
        }
        OffsetDateTime agora = OffsetDateTime.now();
        var anterior = codigos.findFirstByEmailIgnoreCaseAndFinalidadeOrderByCriadoEmDesc(email, "recuperacao_senha").orElse(null);
        if ((anterior != null && anterior.getCriadoEm().isAfter(agora.minusSeconds(45)))
                || codigos.countByEmailIgnoreCaseAndCriadoEmAfter(email, agora.minusHours(1)) >= 6)
            throw new IllegalArgumentException("Aguarde antes de solicitar outra recuperação.");
        codigos.invalidarRecuperacoes(email, agora);
        String prova = AuthService.gerarTokenSeguro();
        // Nenhum código curto é enviado nem conhecido pelo solicitante ou pelo administrador.
        var registro = new CodigoAutenticacao(email, encoder.encode(AuthService.gerarTokenSeguro()), "recuperacao_senha", agora.plusMinutes(10));
        registro.emitirProva(AuthService.sha256(prova));
        registro = codigos.saveAndFlush(registro);
        return new Solicitacao(registro.getId(), prova);
    }

    @Transactional
    public Estado consultar(String prova) {
        if (prova == null || !prova.matches("[A-Za-z0-9_-]{43}")) return new Estado(null, "ausente");
        var registro = codigos.findLockedByProvaHash(AuthService.sha256(prova)).orElse(null);
        if (registro == null) return new Estado(null, "ausente");
        if (registro.provaValida()) return new Estado(registro.getId(), "liberada");
        if (registro.assistidaPendente()) return new Estado(registro.getId(), "aguardando");
        return new Estado(null, "expirada");
    }

    @Transactional(readOnly = true)
    public List<Pedido> pendentes() {
        return codigos.buscarAssistidasPendentes(OffsetDateTime.now(), PageRequest.of(0, 50)).stream()
                .map(c -> new Pedido(c.getId(), c.getEmail(), c.getCriadoEm())).toList();
    }

    @Transactional
    public void decidir(Long protocolo, boolean aprovar, boolean identidadeConfirmada) {
        if (aprovar && !identidadeConfirmada) throw new IllegalArgumentException("Confirme a identidade por um canal conhecido antes de liberar.");
        var inicial = codigos.findById(protocolo).orElseThrow(() -> new IllegalArgumentException("Solicitação indisponível."));
        var usuario = usuarios.buscarParaAutenticacao(inicial.getEmail()).orElse(null);
        var registro = codigos.buscarAssistidaBloqueada(protocolo).orElseThrow(() -> new IllegalArgumentException("Solicitação indisponível."));
        if (!registro.assistidaPendente()) throw new IllegalArgumentException("Solicitação expirada ou já tratada.");
        if (aprovar && (usuario == null || !usuario.isAtivo())) throw new IllegalArgumentException("Não foi possível liberar esta solicitação.");
        registro.marcarUsado();
        if (!aprovar) registro.consumirProva();
        // Nunca registrar email, token ou conteúdo de senha no log.
        org.slf4j.LoggerFactory.getLogger(getClass()).info("Recuperação assistida protocolo={} decisao={}", protocolo, aprovar ? "liberada" : "recusada");
    }

    public record Solicitacao(Long protocolo, String prova) { @Override public String toString() { return "Solicitacao[prova protegida]"; } }
    public record Estado(Long protocolo, String estado) {}
    public record Pedido(Long protocolo, String email, OffsetDateTime criadoEm) {}
}
