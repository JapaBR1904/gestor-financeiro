package br.com.nexo.email;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.support.ResourcePropertySource;
import static org.junit.jupiter.api.Assertions.*;

class ConfiguracaoResendTest {
    private ApplicationContextRunner contexto(String perfil) throws Exception {
        var propriedades = new ResourcePropertySource("classpath:application.properties");
        return new ApplicationContextRunner().withUserConfiguration(ConfiguracaoEmail.class)
                .withInitializer(context -> { context.getEnvironment().setActiveProfiles(perfil.split(",")); context.getEnvironment().getPropertySources().addLast(propriedades); })
                .withPropertyValues("NEXO_EMAIL_PROVIDER=resend", "RESEND_ENABLED=true", "RESEND_API_KEY=" + ResendHttpTeste.CHAVE,
                        "RESEND_FROM=" + ResendHttpTeste.REMETENTE, "RESEND_REPLY_TO=");
    }
    @ParameterizedTest @ValueSource(strings = {"dev", "test"})
    void devTestAceitamOnboardingEVariaveisVinculadas(String perfil) throws Exception {
        contexto(perfil).run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(ResendEmailProvider.class, context.getBean(EmailProvider.class));
            assertFalse(context.containsBean("mailSender"));
        });
    }
    @ParameterizedTest @ValueSource(strings = {"default", "prod", "production", "dev,prod", "test,production"})
    void prodPerfisMistosEDefaultRejeitamRemetenteDeTeste(String perfil) throws Exception {
        contexto(perfil).run(context -> {
            assertNotNull(context.getStartupFailure());
            assertTrue(causa(context.getStartupFailure()).getMessage().contains("somente em dev/test"));
            assertFalse(causa(context.getStartupFailure()).getMessage().contains(ResendHttpTeste.CHAVE));
        });
    }
    @ParameterizedTest @ValueSource(strings = {"RESEND_API_KEY=", "RESEND_API_KEY=chave fixture", "RESEND_FROM=", "RESEND_FROM=invalido", "RESEND_FROM=um@example.com,dois@example.com", "RESEND_REPLY_TO=invalido"})
    void configuracaoInvalidaFalhaInicializacaoSemMostrarValores(String propriedade) throws Exception {
        contexto("dev").withPropertyValues(propriedade).run(context -> {
            assertNotNull(context.getStartupFailure());
            assertInstanceOf(IllegalStateException.class, causa(context.getStartupFailure()));
            for (String valor : List.of(ResendHttpTeste.CHAVE, ResendHttpTeste.REMETENTE, "chave fixture", "um@example.com"))
                assertFalse(causa(context.getStartupFailure()).getMessage().contains(valor));
        });
    }
    @Test void prodAceitaRemetenteExplicitoForaDoDominioDeTeste() throws Exception {
        contexto("prod").withPropertyValues("RESEND_FROM=Nexo <remetente-fixture@example.com>").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(ResendEmailProvider.class, context.getBean(EmailProvider.class));
        });
    }
    @ParameterizedTest @ValueSource(strings = {"prod", "dev"})
    void desabilitadoNaoExigeCredenciaisENuncaEnvia(String perfil) throws Exception {
        contexto(perfil).withPropertyValues("RESEND_ENABLED=false", "RESEND_API_KEY=", "RESEND_FROM=").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class));
            assertThrows(IllegalStateException.class, () -> context.getBean(EmailProvider.class).enviar(new EmailMensagem("fixture@example.com", "Teste", null, "Texto")));
        });
    }
    @Test void providerDisabledIgnoraResendMesmoQuandoHabilitado() throws Exception {
        contexto("prod").withPropertyValues("NEXO_EMAIL_PROVIDER=disabled", "RESEND_API_KEY=").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class));
        });
    }
    @Test void providerInvalidoFalhaSemFallbackNemValorNoErro() throws Exception {
        contexto("prod").withPropertyValues("NEXO_EMAIL_PROVIDER=provider-fixture-invalido").run(context -> {
            assertNotNull(context.getStartupFailure()); assertFalse(causa(context.getStartupFailure()).getMessage().contains("provider-fixture-invalido"));
        });
    }
    @Test void semVariaveisPadraoResendPermaneceDesabilitado() throws Exception {
        contexto("dev").withPropertyValues("RESEND_ENABLED=false").run(context -> assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class)));
    }
    static Throwable causa(Throwable falha) { while (falha.getCause() != null) falha = falha.getCause(); return falha; }
}
