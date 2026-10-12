package br.com.nexo.diagnostico;

import java.io.OutputStream;
import java.util.Objects;
import java.util.Properties;
import java.util.StringJoiner;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.ContentType;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Profile;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;

@Profile("(dev | test) & !prod & !production")
public class DiagnosticoSmtpService {
    private static final Logger log = LoggerFactory.getLogger(DiagnosticoSmtpService.class);
    private final JavaMailSender sender;
    private final boolean habilitado;
    private final String remetente;
    private final String destinatario;

    public DiagnosticoSmtpService(JavaMailSender sender,
            @Value("${nexo.mail.enabled:false}") boolean habilitado,
            @Value("${nexo.mail.from:}") String remetente,
            @Value("${NEXO_SMTP_DIAGNOSTIC_TO:}") String destinatario) {
        this.sender = sender;
        this.habilitado = habilitado;
        this.remetente = remetente;
        this.destinatario = destinatario;
    }

    public Resultado executar() {
        UUID id = UUID.randomUUID();
        long inicio = System.nanoTime();
        String etapa = "configuracao";
        log.info("SMTP diagnostico id={} etapa=inicio fromConfigurado={} destinatarioConfigurado={} habilitado={}",
                id, preenchido(remetente), preenchido(destinatario), habilitado);
        try {
            exigir(habilitado, "envio_desabilitado");
            exigir(preenchido(destinatario), "destinatario_ausente");
            exigir(preenchido(remetente), "remetente_ausente");
            exigir(sender instanceof JavaMailSenderImpl, "sender_nao_inspecionavel");
            var efetivo = (JavaMailSenderImpl) sender;
            Properties propriedades = efetivo.getJavaMailProperties();
            exigir(!flag(propriedades, "mail.debug") && !flag(propriedades, "mail.debug.auth"), "debug_protocolo_bloqueado");
            // Usa a sessão efetiva do bean, inclusive quando configurada pelo Spring via JNDI.
            var sessao = efetivo.getSession();
            exigir(!sessao.getDebug(), "debug_protocolo_bloqueado");
            propriedades = sessao.getProperties();
            exigir(!flag(propriedades, "mail.debug.auth"), "debug_protocolo_bloqueado");
            String protocolo = efetivo.getProtocol();
            if (!preenchido(protocolo)) protocolo = propriedades.getProperty("mail.transport.protocol", "smtp");
            exigir(protocolo.equals("smtp") || protocolo.equals("smtps"), "protocolo_nao_smtp");
            String prefixo = "mail." + protocolo + ".";
            int conexao = timeout(propriedades, prefixo + "connectiontimeout");
            int leitura = timeout(propriedades, prefixo + "timeout");
            int escrita = timeout(propriedades, prefixo + "writetimeout");
            log.info("SMTP diagnostico id={} etapa=sender_configurado host={} portaConfigurada={} protocolo={} usernameConfigurado={} passwordConfigurada={} auth={} starttls={} starttlsRequired={} ssl={} conexaoTimeoutMs={} leituraTimeoutMs={} escritaTimeoutMs={}",
                    id, hostSeguro(efetivo.getHost()), efetivo.getPort(), protocolo,
                    preenchido(efetivo.getUsername()), preenchido(efetivo.getPassword()),
                    flag(propriedades, prefixo + "auth"), flag(propriedades, prefixo + "starttls.enable"),
                    flag(propriedades, prefixo + "starttls.required"), flag(propriedades, prefixo + "ssl.enable"), conexao, leitura, escrita);
            exigir(conexao > 0 && leitura > 0 && escrita > 0, "timeouts_invalidos");

            etapa = "criacao_mensagem";
            var from = endereco(remetente);
            var to = endereco(destinatario);
            MimeMessage mensagem = sender.createMimeMessage();
            var helper = new MimeMessageHelper(mensagem, false, "UTF-8");
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Diagnóstico SMTP Nexo [" + id + "]");
            helper.setText("Teste de diagnóstico SMTP do Nexo.\n\ndiagnosticoId=" + id, false);
            mensagem.setHeader("X-Nexo-Diagnostico-Id", id.toString());
            mensagem.saveChanges();

            etapa = "validacao_mime";
            var froms = mensagem.getFrom();
            var tos = mensagem.getRecipients(Message.RecipientType.TO);
            exigir(froms != null && froms.length == 1 && froms[0] instanceof InternetAddress, "from_invalido");
            var fromEfetivo = (InternetAddress) froms[0];
            boolean fromExato = from.getAddress().equals(fromEfetivo.getAddress()) && Objects.equals(from.getPersonal(), fromEfetivo.getPersonal());
            exigir(fromExato, "from_diferente_configuracao");
            exigir(tos != null && tos.length == 1 && to.equals(tos[0]), "to_diferente_configuracao");
            exigir(mensagem.getSubject() != null && mensagem.getSubject().contains(id.toString()), "subject_invalido");
            var contentType = new ContentType(mensagem.getContentType());
            exigir(contentType.getBaseType().equalsIgnoreCase("text/plain") && "UTF-8".equalsIgnoreCase(contentType.getParameter("charset")), "content_type_invalido");
            String messageId = mensagem.getMessageID();
            exigir(preenchido(messageId), "message_id_ausente");
            var contador = new ContadorBytes();
            mensagem.writeTo(contador);
            String envelope = envelopeDaMensagem(mensagem);
            String origem = "smtp_message";
            if (envelope == null || envelope.isEmpty()) { envelope = propriedades.getProperty(prefixo + "from"); origem = "propriedade_smtp"; }
            if (envelope == null || envelope.isEmpty()) { envelope = fromEfetivo.getAddress(); origem = "cabecalho_from"; }
            log.info("SMTP diagnostico id={} etapa=mime_validado fromExato={} toPresente=true subjectPresente=true contentType=text/plain charset=UTF-8 messageIdGerado={} tamanhoBytes={} envelopeOrigem={} envelopeIgualFrom={}",
                    id, fromExato, preenchido(messageId), contador.bytes, origem, envelope.equals(fromEfetivo.getAddress()));

            etapa = "chamada_sender";
            long envioInicio = System.nanoTime();
            log.info("SMTP diagnostico id={} etapa=chamada_sender", id);
            sender.send(mensagem);
            log.info("SMTP diagnostico id={} etapa=sender_retornou duracaoMs={} messageIdPreservado={}",
                    id, duracao(envioInicio), messageId.equals(mensagem.getMessageID()));
            log.info("SMTP diagnostico id={} etapa=sucesso duracaoTotalMs={}", id, duracao(inicio));
            return new Resultado(id, true);
        } catch (Exception exception) {
            String motivo = exception instanceof Recusado recusado ? recusado.motivo : "falha_operacao";
            log.error("SMTP diagnostico id={} etapa=falha fase={} motivo={} tipos={} duracaoTotalMs={}",
                    id, etapa, motivo, tipos(exception), duracao(inicio));
            return new Resultado(id, false);
        }
    }

    private static InternetAddress endereco(String valor) throws MessagingException {
        exigir(!valor.contains("\r") && !valor.contains("\n"), "endereco_invalido");
        var enderecos = InternetAddress.parse(valor, true);
        exigir(enderecos.length == 1, "endereco_deve_ser_unico");
        enderecos[0].validate();
        return enderecos[0];
    }
    private static String envelopeDaMensagem(MimeMessage mensagem) throws ReflectiveOperationException {
        // Angus é dependência runtime; observar sua API opcional sem adicionar dependência de compilação.
        for (Class<?> tipo = mensagem.getClass(); tipo != null; tipo = tipo.getSuperclass()) {
            if (tipo.getName().equals("org.eclipse.angus.mail.smtp.SMTPMessage")) {
                return (String) tipo.getMethod("getEnvelopeFrom").invoke(mensagem);
            }
        }
        return null;
    }
    private static boolean preenchido(String valor) { return valor != null && !valor.isBlank(); }
    private static boolean flag(Properties propriedades, String chave) { return Boolean.parseBoolean(propriedades.getProperty(chave, "false")); }
    private static int timeout(Properties propriedades, String chave) {
        try { return Integer.parseInt(propriedades.getProperty(chave, "-1")); }
        catch (NumberFormatException exception) { return -1; }
    }
    private static String hostSeguro(String host) { return host != null && host.matches("[a-zA-Z0-9.:-]+") ? host : "nao_exibido"; }
    private static long duracao(long inicio) { return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio); }
    private static void exigir(boolean condicao, String motivo) { if (!condicao) throw new Recusado(motivo); }
    private static String tipos(Throwable falha) {
        var tipos = new StringJoiner(" -> ");
        for (int i = 0; falha != null && i < 8; i++) {
            tipos.add(falha.getClass().getSimpleName());
            if (falha.getCause() != null) falha = falha.getCause();
            else if (falha instanceof MailSendException envio && envio.getMessageExceptions().length > 0) falha = envio.getMessageExceptions()[0];
            else if (falha instanceof MessagingException mensagem) falha = mensagem.getNextException();
            else falha = null;
        }
        return tipos.toString();
    }
    private static class Recusado extends IllegalArgumentException {
        private final String motivo;
        Recusado(String motivo) { super("Diagnóstico SMTP recusado."); this.motivo = motivo; }
    }
    private static class ContadorBytes extends OutputStream {
        long bytes;
        @Override public void write(int valor) { bytes++; }
        @Override public void write(byte[] valor, int inicio, int tamanho) { bytes += tamanho; }
    }
    public record Resultado(UUID diagnosticoId, boolean aceito) {}
}
