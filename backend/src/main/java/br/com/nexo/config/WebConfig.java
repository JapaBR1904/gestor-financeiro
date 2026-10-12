package br.com.nexo.config;

import java.util.Arrays;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    private final String[] origensPermitidas;

    public WebConfig(@Value("${nexo.allowed-origins:http://localhost:3000}") String origens) {
        this.origensPermitidas = Arrays.stream(origens.split(","))
                .map(String::trim)
                .filter(valor -> !valor.isBlank())
                .toArray(String[]::new);
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(origensPermitidas)
                .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                .allowedHeaders("Content-Type", "Accept", "X-Requested-With")
                .allowCredentials(true)
                .maxAge(3600);
    }
}
