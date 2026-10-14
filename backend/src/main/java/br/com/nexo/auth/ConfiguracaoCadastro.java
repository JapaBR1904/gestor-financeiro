package br.com.nexo.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Component;

/** A dispensa é uma conveniência explícita de desenvolvimento, nunca de produção. */
@Component
public class ConfiguracaoCadastro {
    private final boolean verificacaoEmailHabilitada;

    public ConfiguracaoCadastro(@Value("${nexo.auth.email-verification-enabled:true}") boolean habilitada,
                                Environment ambiente) {
        if (!habilitada && ambiente.acceptsProfiles(Profiles.of("prod", "production"))) {
            throw new IllegalStateException("A verificação de e-mail é obrigatória em produção.");
        }
        this.verificacaoEmailHabilitada = habilitada;
    }

    public boolean verificacaoEmailHabilitada() { return verificacaoEmailHabilitada; }
}
