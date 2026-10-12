package br.com.nexo.diagnostico;

import java.util.Map;
import java.util.UUID;
import br.com.nexo.email.ConfiguracaoEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.Banner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Profile;
import org.springframework.core.Ordered;
import org.springframework.core.env.MapPropertySource;

/** Comando manual isolado; não inicia banco, autenticação, HTTP ou envio no startup normal. */
public final class DiagnosticoResendAplicacao {
    private static final Logger log = LoggerFactory.getLogger(DiagnosticoResendAplicacao.class);
    // Sem @Configuration/@Component: este contexto não é descoberto pelo NexoApplication.
    @Profile("(dev | test) & !prod & !production")
    @Import({ConfiguracaoEmail.class, DiagnosticoResendService.class})
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
                log.error("Resend diagnostico id={} etapa=perfil_bloqueado", UUID.randomUUID()); return 2;
            }
            return contexto.getBean(DiagnosticoResendService.class).executar().aceito() ? 0 : 1;
        } catch (Exception exception) {
            log.error("Resend diagnostico id={} etapa=falha_inicializacao tipo={}", UUID.randomUUID(), exception.getClass().getSimpleName());
            return 2;
        }
    }
    private static class LogsIsolados implements ApplicationListener<ApplicationEnvironmentPreparedEvent>, Ordered {
        @Override public int getOrder() { return Ordered.HIGHEST_PRECEDENCE + 15; }
        @Override public void onApplicationEvent(ApplicationEnvironmentPreparedEvent evento) {
            evento.getEnvironment().getPropertySources().addFirst(new MapPropertySource("logsResendDiagnostico", Map.of(
                    "logging.level.root", "OFF", "logging.level.org.springframework", "OFF",
                    "logging.level.br.com.nexo.diagnostico", "INFO", "logging.level.br.com.nexo.email", "INFO")));
        }
    }
}
