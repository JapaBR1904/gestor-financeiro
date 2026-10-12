package br.com.nexo.diagnostico;

import java.util.UUID;
import br.com.nexo.email.EmailLogs;
import br.com.nexo.email.EmailMensagem;
import br.com.nexo.email.EmailProvider;
import br.com.nexo.email.ResendEmailProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;

@Profile("(dev | test) & !prod & !production")
public final class DiagnosticoResendService {
    private static final Logger log = LoggerFactory.getLogger(DiagnosticoResendService.class);
    private final EmailProvider provider;
    private final String destino;
    public DiagnosticoResendService(EmailProvider provider, @Value("${NEXO_RESEND_DIAGNOSTIC_TO:}") String destino) {
        this.provider = provider; this.destino = destino;
    }
    public Resultado executar() {
        UUID id = UUID.randomUUID();
        try (var contexto = MDC.putCloseable("nexoDespachoRecuperacao", id.toString())) {
            log.info("Resend diagnostico id={} etapa=inicio", id);
            if (!ResendEmailProvider.enderecoValido(destino)) {
                log.error("Resend diagnostico id={} etapa=configuracao_invalida motivo=destinatario_ausente_ou_invalido", id);
                return new Resultado(id, false);
            }
            if (!(provider instanceof ResendEmailProvider)) {
                log.error("Resend diagnostico id={} etapa=configuracao_invalida motivo=resend_nao_habilitado", id);
                return new Resultado(id, false);
            }
            String mensagemId = provider.enviar(new EmailMensagem(destino, "Diagnóstico Resend Nexo [" + id + "]",
                    null, "Teste de diagnóstico Resend do Nexo.\n\ndiagnosticoId=" + id));
            log.info("Resend diagnostico id={} etapa=sucesso mensagemId={}", id, mensagemId);
            return new Resultado(id, true);
        } catch (RuntimeException exception) {
            log.error("Resend diagnostico id={} etapa=falha tipos={}", id, EmailLogs.tipos(exception));
            return new Resultado(id, false);
        }
    }
    public record Resultado(UUID diagnosticoId, boolean aceito) {}
}
