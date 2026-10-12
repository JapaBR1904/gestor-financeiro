package br.com.nexo.email;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public final class EmailDesabilitadoProvider implements EmailProvider {
    private static final Logger log = LoggerFactory.getLogger(EmailDesabilitadoProvider.class);
    @Override public String enviar(EmailMensagem mensagem) {
        log.error("E-mail despacho={} etapa=envio_desabilitado", EmailLogs.despacho());
        throw new IllegalStateException("O envio de e-mail está indisponível. Tente novamente mais tarde.");
    }
}
