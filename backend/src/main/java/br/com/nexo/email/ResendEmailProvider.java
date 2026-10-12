package br.com.nexo.email;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import jakarta.mail.internet.InternetAddress;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import tools.jackson.databind.json.JsonMapper;

public final class ResendEmailProvider implements EmailProvider, AutoCloseable {
    private static final Logger log = LoggerFactory.getLogger(ResendEmailProvider.class);
    private static final URI API = URI.create("https://api.resend.com/emails");
    private static final Set<String> ERROS_PUBLICOS = Set.of("validation_error", "missing_api_key", "invalid_api_key",
            "restricted_api_key", "rate_limit_exceeded", "daily_quota_exceeded", "monthly_quota_exceeded",
            "application_error", "internal_server_error", "invalid_from_address", "not_found");
    private final String chave;
    private final String remetente;
    private final String replyTo;
    private final HttpClient cliente;
    private final URI endpoint;
    private final Duration timeout;
    private final JsonMapper json = JsonMapper.builder().build();

    public ResendEmailProvider(String chave, String remetente, String replyTo, boolean dev) {
        this(chave, remetente, replyTo, dev, clientePadrao(chave, remetente, replyTo, dev), API, Duration.ofSeconds(10));
    }

    // Endpoint alternativo somente no código de testes, nunca por variável/request de produção.
    ResendEmailProvider(String chave, String remetente, String replyTo, boolean dev,
                        HttpClient cliente, URI endpoint, Duration timeout) {
        validar(chave, remetente, replyTo, dev);
        this.chave = chave; this.remetente = remetente; this.replyTo = replyTo;
        this.cliente = cliente; this.endpoint = endpoint; this.timeout = timeout;
        log.info("E-mail etapa=resend_configuracao chaveConfigurada=true remetenteConfigurado=true replyToConfigurado={} conexaoMs=5000 totalMs={}",
                replyTo != null && !replyTo.isBlank(), timeout.toMillis());
    }

    private static HttpClient clientePadrao(String chave, String remetente, String replyTo, boolean dev) {
        validar(chave, remetente, replyTo, dev);
        return HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).followRedirects(HttpClient.Redirect.NEVER).build();
    }
    private static void validar(String chave, String remetente, String replyTo, boolean dev) {
        if (chave == null || chave.isBlank() || chave.chars().anyMatch(c -> c <= 32 || c >= 127))
            throw new IllegalStateException("Resend habilitado exige RESEND_API_KEY válida e configurada.");
        if (!enderecoValido(remetente)) throw new IllegalStateException("Resend habilitado exige RESEND_FROM válido e configurado.");
        if (!dev && endereco(remetente).toLowerCase(java.util.Locale.ROOT).endsWith("@resend.dev"))
            throw new IllegalStateException("Remetente de teste do Resend permitido somente em dev/test.");
        if (replyTo != null && !replyTo.isBlank() && !enderecoValido(replyTo))
            throw new IllegalStateException("RESEND_REPLY_TO deve conter um endereço válido.");
    }

    public static boolean enderecoValido(String valor) {
        if (valor == null || valor.isBlank() || valor.contains("\r") || valor.contains("\n")) return false;
        try {
            var enderecos = InternetAddress.parse(valor, true);
            if (enderecos.length != 1) return false;
            enderecos[0].validate();
            return enderecos[0].getAddress().contains("@") && enderecos[0].getAddress().substring(enderecos[0].getAddress().indexOf('@') + 1).contains(".");
        } catch (Exception exception) { return false; }
    }
    private static String endereco(String valor) {
        try { return InternetAddress.parse(valor, true)[0].getAddress(); }
        catch (Exception exception) { throw new IllegalStateException("Endereço de e-mail inválido."); }
    }

    @Override public String enviar(EmailMensagem email) {
        long inicio = System.nanoTime();
        int status = 0;
        String erroPublico = "indisponivel";
        CompletableFuture<HttpResponse<String>> chamada = null;
        try {
            log.debug("E-mail despacho={} etapa=resend_preparando", EmailLogs.despacho());
            if (!enderecoValido(email.destinatario()) || email.assunto() == null || email.assunto().isBlank()
                    || email.assunto().contains("\r") || email.assunto().contains("\n"))
                throw new IllegalStateException("Mensagem de e-mail inválida.");
            var corpo = new LinkedHashMap<String, Object>();
            corpo.put("from", remetente); corpo.put("to", List.of(email.destinatario()));
            corpo.put("subject", email.assunto());
            if (email.html() != null && !email.html().isBlank()) corpo.put("html", email.html());
            if (email.texto() != null && !email.texto().isBlank()) corpo.put("text", email.texto());
            if (replyTo != null && !replyTo.isBlank()) corpo.put("reply_to", List.of(replyTo));
            var request = HttpRequest.newBuilder(endpoint).timeout(timeout)
                    .header("Authorization", "Bearer " + chave).header("Content-Type", "application/json")
                    .header("Accept", "application/json").header("User-Agent", "nexo-resend/1")
                    .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(corpo))).build();
            log.debug("E-mail despacho={} etapa=resend_chamada", EmailLogs.despacho());
            chamada = cliente.sendAsync(request, HttpResponse.BodyHandlers.ofString());
            // Limita também a leitura do corpo, inclusive se o servidor parar depois dos headers.
            var resposta = chamada.get(timeout.toMillis(), TimeUnit.MILLISECONDS);
            status = resposta.statusCode();
            if (status < 200 || status >= 300) {
                try {
                    String nome = json.readTree(resposta.body()).path("name").asString();
                    if (ERROS_PUBLICOS.contains(nome)) erroPublico = nome;
                } catch (RuntimeException ignored) { /* Nunca registrar corpo de erro do provedor. */ }
                throw new IllegalStateException("Resend recusou o envio.");
            }
            String id = json.readTree(resposta.body()).path("id").asString();
            // Só um UUID canônico pode ser registrado; uma resposta inesperada não entra no log.
            if (id == null || !UUID.fromString(id).toString().equals(id)) throw new IllegalStateException("Resposta Resend inválida.");
            log.info("E-mail despacho={} etapa=resend_aceitou mensagemId={} duracaoMs={}", EmailLogs.despacho(), id, decorrido(inicio));
            return id;
        } catch (Exception exception) {
            if (chamada != null) chamada.cancel(true);
            if (exception instanceof InterruptedException) Thread.currentThread().interrupt();
            log.error("E-mail despacho={} etapa=resend_falha status={} erroPublico={} tipos={} duracaoMs={}",
                    EmailLogs.despacho(), status, erroPublico, EmailLogs.tipos(exception), decorrido(inicio));
            // Não propagar causa/corpo externos: podem conter credencial ou código.
            throw new IllegalStateException("Não foi possível enviar o código por e-mail agora.");
        }
    }
    private static long decorrido(long inicio) { return TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - inicio); }
    @Override public void close() { cliente.shutdownNow(); }
}
