package br.com.nexo.email;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import br.com.nexo.auth.LogEmailTeste;
import static org.junit.jupiter.api.Assertions.*;

class ResendEmailProviderTest {
    private EmailMensagem mensagem() { return new EmailMensagem("destino-fixture@example.com", "Recupere sua senha — Nexo", "<p>Código: 123456</p>", "Código: 123456"); }

    @Test void enviaContratoOficialComHtmlTextoReplyToERecebeIdSemLogarSegredos() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            assertEquals(ResendHttpTeste.ID, provider.enviar(mensagem()));
            var requisicao = api.receber(); assertNotNull(requisicao);
            assertEquals("POST", requisicao.metodo()); assertEquals("/emails", requisicao.caminho());
            assertEquals("Bearer " + ResendHttpTeste.CHAVE, requisicao.autorizacao()); assertEquals("application/json", requisicao.contentType());
            var corpo = requisicao.json();
            assertEquals(ResendHttpTeste.REMETENTE, corpo.path("from").asString());
            assertEquals("destino-fixture@example.com", corpo.path("to").get(0).asString());
            assertEquals("Recupere sua senha — Nexo", corpo.path("subject").asString());
            assertEquals("<p>Código: 123456</p>", corpo.path("html").asString());
            assertEquals("Código: 123456", corpo.path("text").asString());
            assertEquals("suporte-fixture@example.com", corpo.path("reply_to").get(0).asString());
            assertEquals(6, corpo.size()); assertFalse(requisicao.corpo().contains(ResendHttpTeste.CHAVE));
            for (String etapa : List.of("resend_preparando", "resend_chamada", "resend_aceitou")) assertTrue(logs.contem("etapa=" + etapa));
            assertTrue(logs.contem(ResendHttpTeste.ID));
            logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456", "destino-fixture@example.com", "Authorization", "Bearer");
            assertFalse(mensagem().toString().contains("123456"));
        }
    }
    @Test void replyToEHtmlOpcionaisNaoGeramCamposVazios() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(Duration.ofSeconds(2), "")) {
            provider.enviar(new EmailMensagem("destino-fixture@example.com", "Diagnóstico", null, "Somente texto"));
            var corpo = api.receber().json(); assertFalse(corpo.has("reply_to")); assertFalse(corpo.has("html")); assertEquals(4, corpo.size());
        }
    }
    @ParameterizedTest @ValueSource(ints = {400, 401, 403, 429, 500, 503})
    void errosHttpSaoControladosSemRetrySemCausaOuMensagemExterna(int status) throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            api.status = status;
            api.resposta = "{\"name\":\"validation_error\",\"message\":\"" + ResendHttpTeste.CHAVE + " 123456 destino-fixture@example.com\"}";
            var erro = assertThrows(IllegalStateException.class, () -> provider.enviar(mensagem()));
            assertNull(erro.getCause()); assertEquals("Não foi possível enviar o código por e-mail agora.", erro.getMessage());
            assertTrue(logs.contem("status=" + status)); assertTrue(logs.contem("erroPublico=validation_error"));
            logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456", "destino-fixture@example.com"); assertEquals(1, api.quantidade());
        }
    }
    @ParameterizedTest @ValueSource(strings = {"{}", "{\"id\":\"chave-resend-fixture\"}", "{\"id\":\"destino-fixture@example.com\"}", "nao-json"})
    void respostaInesperadaNaoVazaConteudo(String resposta) throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            api.resposta = resposta;
            assertThrows(IllegalStateException.class, () -> provider.enviar(mensagem()));
            logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456", "destino-fixture@example.com"); assertEquals(1, api.quantidade());
        }
    }
    @Test void erroPublicoDesconhecidoNuncaEntraNoLog() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            api.status = 400; api.resposta = "{\"name\":\"chave-resend-fixture 123456\"}";
            assertThrows(IllegalStateException.class, () -> provider.enviar(mensagem()));
            assertTrue(logs.contem("erroPublico=indisponivel")); logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456");
        }
    }
    @ParameterizedTest @ValueSource(booleans = {false, true})
    void timeoutLimitaHeadersELeituraTotalDoCorpo(boolean depoisDosHeaders) throws Exception {
        var liberar = new CountDownLatch(1);
        try (var api = new ResendHttpTeste(); var provider = api.provider(Duration.ofMillis(250), ""); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            Runnable bloquear = () -> { try { liberar.await(5, TimeUnit.SECONDS); } catch (InterruptedException e) { Thread.currentThread().interrupt(); } };
            if (depoisDosHeaders) api.depoisDosHeaders = bloquear; else api.antesDaResposta = bloquear;
            try {
                assertTimeout(Duration.ofSeconds(2), () -> assertThrows(IllegalStateException.class, () -> provider.enviar(mensagem())));
                assertTrue(logs.contem("TimeoutException")); assertEquals(1, api.quantidade());
                logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456");
            } finally { liberar.countDown(); }
        }
    }
    @Test void falhaDeRedeControladaSemRetry() throws Exception {
        java.net.URI endpoint;
        try (var api = new ResendHttpTeste()) { endpoint = api.endpoint(); }
        try (var provider = new ResendEmailProvider(ResendHttpTeste.CHAVE, ResendHttpTeste.REMETENTE, "", true,
                java.net.http.HttpClient.newHttpClient(), endpoint, Duration.ofSeconds(1)); var logs = new LogEmailTeste(ResendEmailProvider.class)) {
            assertThrows(IllegalStateException.class, () -> provider.enviar(mensagem()));
            assertTrue(logs.contem("ConnectException")); logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "123456");
        }
    }
    @Test void entradaInvalidaNaoChamaApi() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider()) {
            assertThrows(IllegalStateException.class, () -> provider.enviar(new EmailMensagem("um@example.com,dois@example.com", "Assunto", null, "123456")));
            assertThrows(IllegalStateException.class, () -> provider.enviar(new EmailMensagem("um@example.com", "Assunto\r\nInjected", null, "123456")));
            assertEquals(0, api.quantidade());
        }
    }
}
