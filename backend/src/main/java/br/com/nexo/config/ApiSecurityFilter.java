package br.com.nexo.config;

import java.io.IOException;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class ApiSecurityFilter extends OncePerRequestFilter {
    private static final Set<String> METODOS_SEGUROS = Set.of("GET", "HEAD", "OPTIONS");
    private final Set<String> origensPermitidas;

    public ApiSecurityFilter(@Value("${nexo.allowed-origins:http://localhost:3000}") String origens) {
        this.origensPermitidas = Arrays.stream(origens.split(","))
                .map(String::trim)
                .filter(valor -> !valor.isBlank())
                .collect(Collectors.toUnmodifiableSet());
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().startsWith("/api/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        response.setHeader("Cache-Control", "no-store");

        if (request.isSecure()) {
            response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
        }

        if (!METODOS_SEGUROS.contains(request.getMethod())) {
            String origem = request.getHeader("Origin");
            String secFetchSite = request.getHeader("Sec-Fetch-Site");

            if (origem != null && !origensPermitidas.contains(origem)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Origem não permitida.");
                return;
            }
            if ("cross-site".equalsIgnoreCase(secFetchSite)) {
                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Requisição cross-site bloqueada.");
                return;
            }
        }

        filterChain.doFilter(request, response);
    }
}
