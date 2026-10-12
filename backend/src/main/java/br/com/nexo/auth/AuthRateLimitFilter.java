package br.com.nexo.auth;

import java.io.IOException;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {
    private static final long JANELA = Duration.ofMinutes(15).toNanos();
    private final Map<String, Janela> clientes = new HashMap<>();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !"POST".equals(request.getMethod()) || !request.getRequestURI().startsWith("/api/auth/")
                || request.getRequestURI().equals("/api/auth/logout");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        // Usar o endereço do socket; cabeçalhos de proxy não confiáveis podem ser falsificados.
        if (!permitir(request.getRemoteAddr())) {
            response.setStatus(429);
            response.setHeader("Retry-After", "900");
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"mensagem\":\"Muitas solicitações. Aguarde 15 minutos e tente novamente.\"}");
            return;
        }
        chain.doFilter(request, response);
    }

    synchronized boolean permitir(String cliente) {
        long agora = System.nanoTime();
        clientes.entrySet().removeIf(entry -> agora - entry.getValue().inicio >= JANELA);
        Janela janela = clientes.get(cliente);
        if (janela == null) {
            if (clientes.size() >= 10_000) return false;
            janela = new Janela(agora);
            clientes.put(cliente, janela);
        }
        return ++janela.tentativas <= 60;
    }

    private static class Janela {
        final long inicio;
        int tentativas;
        Janela(long inicio) { this.inicio = inicio; }
    }
}
