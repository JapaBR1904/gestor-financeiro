package br.com.nexo.email;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.core.io.support.ResourcePropertySource;
import org.springframework.core.env.PropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;
import org.springframework.mail.javamail.JavaMailSender;
import static org.junit.jupiter.api.Assertions.*;

class ConfiguracaoResendTest {
    private ApplicationContextRunner contexto(String perfil) throws Exception {
        var propriedades = new ResourcePropertySource("classpath:application.properties");
        return new ApplicationContextRunner().withUserConfiguration(ConfiguracaoEmail.class)
                .withInitializer(context -> {
                    context.getEnvironment().setActiveProfiles(perfil.split(","));
                    var fontes = context.getEnvironment().getPropertySources();
                    // Reproduz um terminal configurado mesmo quando o processo externo não tem essas variáveis.
                    fontes.addBefore(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                            new SystemEnvironmentPropertySource("terminalResendFixture", Map.of(
                                    "NEXO_EMAIL_PROVIDER", "resend", "RESEND_ENABLED", "true",
                                    "RESEND_API_KEY", "chave-terminal-fixture", "RESEND_FROM", "onboarding@resend.dev")));
                    fontes.addLast(propriedades);
                })
                // Usar o nome Spring efetivamente lido pela factory, acima dos aliases do ambiente.
                .withPropertyValues("nexo.email.provider=resend", "nexo.resend.enabled=true", "nexo.resend.api-key=" + ResendHttpTeste.CHAVE,
                        "nexo.resend.from=" + ResendHttpTeste.REMETENTE, "nexo.resend.reply-to=",
                        "nexo.mail.enabled=true", "nexo.mail.from=remetente-fixture@example.com",
                        "spring.mail.host=localhost", "spring.mail.port=1025", "spring.mail.username=", "spring.mail.password=",
                        "spring.mail.properties.mail.smtp.auth=false", "spring.mail.properties.mail.smtp.starttls.enable=false",
                        "spring.mail.properties.mail.smtp.starttls.required=false", "spring.mail.test-connection=false");
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
    @ParameterizedTest @ValueSource(strings = {"nexo.resend.api-key=", "nexo.resend.api-key=chave fixture", "nexo.resend.from=", "nexo.resend.from=invalido", "nexo.resend.from=um@example.com,dois@example.com", "nexo.resend.reply-to=invalido"})
    void configuracaoInvalidaFalhaInicializacaoSemMostrarValores(String propriedade) throws Exception {
        contexto("dev").withPropertyValues(propriedade).run(context -> {
            assertNotNull(context.getStartupFailure());
            assertInstanceOf(IllegalStateException.class, causa(context.getStartupFailure()));
            for (String valor : List.of(ResendHttpTeste.CHAVE, ResendHttpTeste.REMETENTE, "chave fixture", "um@example.com"))
                assertFalse(causa(context.getStartupFailure()).getMessage().contains(valor));
        });
    }
    @Test void prodAceitaRemetenteExplicitoForaDoDominioDeTeste() throws Exception {
        contexto("prod").withPropertyValues("nexo.resend.from=Nexo <remetente-fixture@example.com>").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(ResendEmailProvider.class, context.getBean(EmailProvider.class));
        });
    }
    @ParameterizedTest @ValueSource(strings = {"prod", "dev"})
    void desabilitadoNaoExigeCredenciaisENuncaEnvia(String perfil) throws Exception {
        contexto(perfil).withPropertyValues("nexo.resend.enabled=false", "nexo.resend.api-key=", "nexo.resend.from=").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class));
            assertThrows(IllegalStateException.class, () -> context.getBean(EmailProvider.class).enviar(new EmailMensagem("fixture@example.com", "Teste", null, "Texto")));
        });
    }
    @Test void providerDisabledIgnoraResendMesmoQuandoHabilitado() throws Exception {
        contexto("prod").withPropertyValues("nexo.email.provider=disabled", "nexo.resend.enabled=true", "nexo.resend.api-key=", "nexo.resend.from=").run(context -> {
            assertNull(context.getStartupFailure()); assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class));
            assertTrue(context.getBeansOfType(ResendEmailProvider.class).isEmpty());
            assertTrue(context.getBeansOfType(JavaMailSender.class).isEmpty());
        });
    }
    @Test void providerInvalidoFalhaSemFallbackNemValorNoErro() throws Exception {
        contexto("prod").withPropertyValues("nexo.email.provider=provider-fixture-invalido").run(context -> {
            assertNotNull(context.getStartupFailure()); assertFalse(causa(context.getStartupFailure()).getMessage().contains("provider-fixture-invalido"));
        });
    }
    @Test void semVariaveisPadraoResendPermaneceDesabilitado() throws Exception {
        contexto("dev").withPropertyValues("nexo.resend.enabled=false").run(context -> assertInstanceOf(EmailDesabilitadoProvider.class, context.getBean(EmailProvider.class)));
    }

    @ParameterizedTest @CsvSource({"disabled,prod", "disabled,dev", "smtp,prod", "smtp,dev"})
    void providerInativoNaoConsultaNenhumaPropriedadeResend(String provider, String perfil) throws Exception {
        contexto(perfil).withPropertyValues("nexo.email.provider=" + provider)
                .withInitializer(context -> context.getEnvironment().getPropertySources().addFirst(new PropertySource<>("resendInacessivelFixture") {
                    @Override public Object getProperty(String nome) {
                        if (nome.startsWith("nexo.resend.") || nome.startsWith("RESEND_"))
                            throw new AssertionError("Provider inativo não deve consultar configuração Resend.");
                        return null;
                    }
                })).run(context -> {
                    assertNull(context.getStartupFailure());
                    Class<? extends EmailProvider> esperado = provider.equals("smtp") ? SmtpEmailProvider.class : EmailDesabilitadoProvider.class;
                    assertInstanceOf(esperado, context.getBean(EmailProvider.class));
                    assertTrue(context.getBeansOfType(ResendEmailProvider.class).isEmpty());
                });
    }

    @ParameterizedTest @CsvSource({"disabled,''", "disabled,'chave invalida fixture'", "smtp,''", "smtp,'chave invalida fixture'"})
    void disabledESmtpIgnoramResendHabilitadoSemChaveOuComChaveInvalida(String provider, String chave) throws Exception {
        contexto("prod").withPropertyValues("nexo.email.provider=" + provider, "nexo.resend.enabled=true",
                        "nexo.resend.api-key=" + chave, "nexo.resend.from=", "nexo.resend.reply-to=invalido")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    Class<? extends EmailProvider> esperado = provider.equals("smtp") ? SmtpEmailProvider.class : EmailDesabilitadoProvider.class;
                    assertInstanceOf(esperado, context.getBean(EmailProvider.class));
                    assertTrue(context.getBeansOfType(ResendEmailProvider.class).isEmpty());
                    assertEquals(provider.equals("smtp") ? 1 : 0, context.getBeansOfType(JavaMailSender.class).size());
                });
    }

    @ParameterizedTest @ValueSource(strings = {"disabled", "smtp", "resend"})
    void variaveisDeAmbienteControladasSelecionamProviderPelaConfiguracaoReal(String provider) throws Exception {
        var propriedades = new ResourcePropertySource("classpath:application.properties");
        new ApplicationContextRunner().withUserConfiguration(ConfiguracaoEmail.class)
                .withInitializer(context -> {
                    context.getEnvironment().setActiveProfiles("dev");
                    var fontes = context.getEnvironment().getPropertySources();
                    fontes.remove(StandardEnvironment.SYSTEM_PROPERTIES_PROPERTY_SOURCE_NAME);
                    fontes.replace(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, new SystemEnvironmentPropertySource(
                            StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME, Map.of(
                                    "NEXO_EMAIL_PROVIDER", provider, "RESEND_ENABLED", "true",
                                    "RESEND_API_KEY", provider.equals("resend") ? ResendHttpTeste.CHAVE : "",
                                    "RESEND_FROM", provider.equals("resend") ? ResendHttpTeste.REMETENTE : "",
                                    "MAIL_ENABLED", "true", "MAIL_FROM", "remetente-fixture@example.com",
                                    "MAIL_HOST", "localhost", "MAIL_PORT", "1025")));
                    fontes.addLast(propriedades);
                }).run(context -> {
                    assertNull(context.getStartupFailure());
                    Class<? extends EmailProvider> esperado = switch (provider) {
                        case "disabled" -> EmailDesabilitadoProvider.class;
                        case "smtp" -> SmtpEmailProvider.class;
                        default -> ResendEmailProvider.class;
                    };
                    assertInstanceOf(esperado, context.getBean(EmailProvider.class));
                });
    }
    static Throwable causa(Throwable falha) { while (falha.getCause() != null) falha = falha.getCause(); return falha; }
}
