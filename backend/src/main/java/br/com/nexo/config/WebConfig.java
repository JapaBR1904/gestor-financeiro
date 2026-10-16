package br.com.nexo.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String[] origensPermitidas;
    private final PermissoesInterceptor permissoes;
    private final ContextoOrganizacaoInterceptor contexto;

    public WebConfig(@Value("${nexo.allowed-origins:http://localhost:3000}") String origens, PermissoesInterceptor permissoes, ContextoOrganizacaoInterceptor contexto) {
        this.permissoes = permissoes;
        this.contexto = contexto;
        this.origensPermitidas = Arrays.stream(origens.split(","))
                .map(String::trim)
                .filter(valor -> !valor.isBlank())
                .toArray(String[]::new);
    }

    @Override public void addInterceptors(org.springframework.web.servlet.config.annotation.InterceptorRegistry registry) {
        registry.addInterceptor(contexto).addPathPatterns("/api/produtos/**", "/api/vendas/**", "/api/despesas/**", "/api/clientes/**",
                "/api/metas/**", "/api/relatorios/**", "/api/financeiro/**", "/api/ia/**", "/api/documentos/**",
                "/api/saas/**", "/api/assinatura/**", "/api/equipe/**", "/api/organizacoes/atual")
                .excludePathPatterns("/api/equipe/convites/consulta", "/api/equipe/convites/aceitar");
        registry.addInterceptor(permissoes).addPathPatterns("/api/produtos/**", "/api/vendas/**", "/api/despesas/**", "/api/clientes/**",
                "/api/metas/**", "/api/relatorios/**", "/api/financeiro/**", "/api/ia/**", "/api/documentos/**",
                "/api/saas/onboarding", "/api/organizacoes/atual");
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origensPermitidas)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Accept", "X-Requested-With", "Idempotency-Key", "X-Nexo-Organizacao")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
