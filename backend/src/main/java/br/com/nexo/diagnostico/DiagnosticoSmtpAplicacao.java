package br.com.nexo.diagnostico;

import java.util.Map;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.autoconfigure.ImportAutoConfiguration;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.boot.mail.autoconfigure.MailSenderAutoConfiguration;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.env.MapPropertySource;

/** Entrada de console isolada: não inicia o NexoApplication, banco, HTTP ou recuperação. */
public final class DiagnosticoSmtpAplicacao {
    private static final Logger log = LoggerFactory.getLogger(DiagnosticoSmtpAplicacao.class);

    // Sem @Configuration/@Component: o component scan da aplicação normal não descobre este contexto.
    @Profile("(dev | test) & !prod & !production")
    @ImportAutoConfiguration(MailSenderAutoConfiguration.class)
    @Import(DiagnosticoSmtpService.class)
    public static class Configuracao {}

    public static void main(String[] args) { System.exit(executar(args)); }

    static int executar(String[] args) {
        var aplicacao = new SpringApplication(Configuracao.class);
        aplicacao.setWebApplicationType(WebApplicationType.NONE);
        aplicacao.setBannerMode(Banner.Mode.OFF);
        aplicacao.setLogStartupInfo(false);
        aplicacao.setRegisterShutdownHook(false);
        aplicacao.setAddCommandLineProperties(false);
        aplicacao.addListeners(new LogsIsolados());
        try (var contexto = aplicacao.run(args)) {
            if (!contexto.getEnvironment().matchesProfiles("(dev | test) & !prod & !production")) {
                log.error("SMTP diagnostico id={} etapa=perfil_bloqueado", UUID.randomUUID());
                return 2;
            }
            return contexto.getBean(DiagnosticoSmtpService.class).executar().aceito() ? 0 : 1;
        } catch (Exception exception) {
            // Não anexar exceção de binding/configuração, que pode conter valores de ambiente.
            log.error("SMTP diagnostico id={} etapa=falha_inicializacao tipo={}", UUID.randomUUID(), exception.getClass().getSimpleName());
            return 2;
        }
    }

    private static class LogsIsolados implements ApplicationListener<ApplicationEnvironmentPreparedEvent>, Ordered {
        @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE + 15; }
        @Override public void onApplicationEvent(ApplicationEnvironmentPreparedEvent evento) {
            // Antes de inicializar logging; só este processo de diagnóstico usa estes níveis.
            evento.getEnvironment().getPropertySources().addFirst(new MapPropertySource("logsSmtpDiagnostico", Map.of(
                    "logging.level.root", "OFF",
                    "logging.level.org.springframework", "OFF",
                    "logging.level.br.com.nexo.diagnostico", "INFO")));
        }
    }
}
