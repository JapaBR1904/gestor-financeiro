package br.com.nexo.email;

import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import com.sun.net.httpserver.HttpServer;
import tools.jackson.databind.json.JsonMapper;

/** API local de teste: nenhuma conexão com internet ou credencial real. */
public final class ResendHttpTeste implements AutoCloseable {
    public static final String CHAVE = "chave-resend-fixture";
    public static final String REMETENTE = "Nexo <onboarding@resend.dev>";
    public static final String ID = "af418642-8925-46a3-b08a-63447717eb83";
    private final HttpServer servidor;
    private final java.util.concurrent.ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final BlockingQueue<Requisicao> requisicoes = new LinkedBlockingQueue<>();
    private final AtomicInteger total = new AtomicInteger();
    public volatile int status = 200;
    public volatile String resposta = "{\"id\":\"" + ID + "\"}";
    public volatile Runnable antesDaResposta = () -> {};
    public volatile Runnable depoisDosHeaders = () -> {};
    public ResendHttpTeste() {
        try {
            servidor = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            servidor.setExecutor(executor);
            servidor.createContext("/emails", exchange -> {
                total.incrementAndGet();
                String corpo = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                requisicoes.add(new Requisicao(exchange.getRequestMethod(), exchange.getRequestURI().getPath(),
                        exchange.getRequestHeaders().getFirst("Authorization"), exchange.getRequestHeaders().getFirst("Content-Type"), corpo));
                try {
                    antesDaResposta.run();
                    byte[] bytes = resposta.getBytes(StandardCharsets.UTF_8);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(status, bytes.length);
                    depoisDosHeaders.run();
                    exchange.getResponseBody().write(bytes);
                } finally { exchange.close(); }
            });
            servidor.start();
        } catch (java.io.IOException exception) { throw new IllegalStateException(exception); }
    }
    public URI endpoint() { return URI.create("http://127.0.0.1:" + servidor.getAddress().getPort() + "/emails"); }
    public ResendEmailProvider provider() { return provider(Duration.ofSeconds(3), "suporte-fixture@example.com"); }
    public ResendEmailProvider provider(Duration timeout, String replyTo) {
        return new ResendEmailProvider(CHAVE, REMETENTE, replyTo, true,
                HttpClient.newBuilder().connectTimeout(Duration.ofMillis(500)).followRedirects(HttpClient.Redirect.NEVER).build(), endpoint(), timeout);
    }
    public Requisicao receber() throws InterruptedException { return requisicoes.poll(5, TimeUnit.SECONDS); }
    public int quantidade() { return total.get(); }
    @Override public void close() { servidor.stop(0); executor.shutdownNow(); }
    public record Requisicao(String metodo, String caminho, String autorizacao, String contentType, String corpo) {
        public tools.jackson.databind.JsonNode json() { return JsonMapper.builder().build().readTree(corpo); }
        @Override public String toString() { return "Requisicao[conteudo protegido]"; }
    }
}
