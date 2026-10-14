package br.com.nexo.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import static org.junit.jupiter.api.Assertions.*;

class ConfiguracaoCadastroTest {
    private final ApplicationContextRunner contexto = new ApplicationContextRunner().withUserConfiguration(ConfiguracaoCadastro.class);
    @Test void defaultSeguroExigeVerificacao() {
        contexto.run(c -> assertTrue(c.getBean(ConfiguracaoCadastro.class).verificacaoEmailHabilitada()));
    }
    @Test void dispensaExplicitaEmDev() {
        contexto.withPropertyValues("spring.profiles.active=dev", "nexo.auth.email-verification-enabled=false")
                .run(c -> assertFalse(c.getBean(ConfiguracaoCadastro.class).verificacaoEmailHabilitada()));
    }
    @Test void podeReativarEmDev() {
        contexto.withPropertyValues("spring.profiles.active=dev", "nexo.auth.email-verification-enabled=true")
                .run(c -> assertTrue(c.getBean(ConfiguracaoCadastro.class).verificacaoEmailHabilitada()));
    }
    @Test void producaoNuncaDispensaMesmoComDevCombinado() {
        for (String perfil : new String[]{"prod", "production", "dev,prod", "dev,production"}) {
            contexto.withPropertyValues("spring.profiles.active=" + perfil, "nexo.auth.email-verification-enabled=false")
                    .run(c -> assertNotNull(c.getStartupFailure()));
        }
    }
    @Test void producaoComVerificacaoSobe() {
        contexto.withPropertyValues("spring.profiles.active=production", "nexo.auth.email-verification-enabled=true")
                .run(c -> assertNull(c.getStartupFailure()));
    }
}
