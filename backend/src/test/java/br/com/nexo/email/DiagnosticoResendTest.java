package br.com.nexo.email;

import java.util.UUID;
import br.com.nexo.auth.LogEmailTeste;
import br.com.nexo.diagnostico.DiagnosticoResendAplicacao;
import br.com.nexo.diagnostico.DiagnosticoResendService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

class DiagnosticoResendTest {
    @Test void diagnosticoUsaProviderRealMasNenhumBancoAuthOuCodigo() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(DiagnosticoResendService.class, ResendEmailProvider.class)) {
            var resultado = new DiagnosticoResendService(provider, "destino-fixture@example.com").executar();
            assertTrue(resultado.aceito()); assertNotNull(resultado.diagnosticoId());
            var corpo = api.receber().json();
            assertEquals("Diagnóstico Resend Nexo [" + resultado.diagnosticoId() + "]", corpo.path("subject").asString());
            assertEquals("Teste de diagnóstico Resend do Nexo.\n\ndiagnosticoId=" + resultado.diagnosticoId(), corpo.path("text").asString());
            assertFalse(corpo.has("html")); assertTrue(logs.contem("etapa=sucesso"));
            logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "destino-fixture@example.com");
        }
    }
    @ParameterizedTest @ValueSource(strings = {"", "invalido", "um@example.com,dois@example.com"})
    void exigeDestinatarioValidoAntesDeChamarProvider(String destino) throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider()) {
            assertFalse(new DiagnosticoResendService(provider, destino).executar().aceito()); assertEquals(0, api.quantidade());
        }
    }
    @Test void providerDesabilitadoNaoPodeExecutarDiagnostico() {
        assertFalse(new DiagnosticoResendService(new EmailDesabilitadoProvider(), "fixture@example.com").executar().aceito());
    }
    @ParameterizedTest @ValueSource(strings = {"dev", "test", "default", "prod", "production", "dev,prod", "test,production"})
    void perfilRestritoNaoCriaProviderNemServicoEmProducao(String perfil) {
        new ApplicationContextRunner().withUserConfiguration(DiagnosticoResendAplicacao.Configuracao.class)
                .withInitializer(context -> context.getEnvironment().setActiveProfiles(perfil.split(",")))
                .withPropertyValues("nexo.email.provider=resend", "nexo.resend.enabled=false").run(context -> {
                    boolean permitido = perfil.equals("dev") || perfil.equals("test");
                    assertEquals(permitido ? 1 : 0, context.getBeansOfType(DiagnosticoResendService.class).size());
                    assertEquals(permitido ? 1 : 0, context.getBeansOfType(EmailProvider.class).size());
                    assertTrue(context.getBeansOfType(javax.sql.DataSource.class).isEmpty());
                    assertTrue(context.getBeansOfType(br.com.nexo.auth.AuthService.class).isEmpty());
                });
    }
    @Test void falhaApiDiagnosticadaSemExporResposta() throws Exception {
        try (var api = new ResendHttpTeste(); var provider = api.provider(); var logs = new LogEmailTeste(DiagnosticoResendService.class, ResendEmailProvider.class)) {
            api.status = 403; api.resposta = "{\"name\":\"restricted_api_key\",\"message\":\"chave-resend-fixture\"}";
            assertFalse(new DiagnosticoResendService(provider, "fixture@example.com").executar().aceito());
            assertTrue(logs.contem("status=403")); assertTrue(logs.contem("etapa=falha")); logs.semDadosSensiveis(ResendHttpTeste.CHAVE, "fixture@example.com");
        }
    }
}
