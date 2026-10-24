package br.com.nexo.admin;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Set;
import br.com.nexo.config.AcessoNegadoException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.stereotype.Service;

/** Administração temporária exclusivamente local, com dados de teste. */
@Service
public class AdminLocalService {
    public static final String COOKIE = "nexo_admin_local";
    private final boolean ambientePermitido;
    private String sessaoHash;
    private Instant expira;
    private int falhas;
    private Instant bloqueadoAte;

    public AdminLocalService(Environment ambiente, @Value("${spring.datasource.url:}") String banco) {
        boolean teste = false;
        try {
            URI destino = URI.create(banco.startsWith("jdbc:") ? banco.substring(5) : "");
            teste = "postgresql".equals(destino.getScheme()) && local(destino.getHost())
                    && "/nexo_test".equals(destino.getPath()) && destino.getUserInfo() == null && destino.getQuery() == null;
        } catch (IllegalArgumentException ignored) { /* Falha fechada em configurações desconhecidas. */ }
        ambientePermitido = ambiente.matchesProfiles("(dev | test) & !prod & !production")
                && !ambiente.acceptsProfiles(Profiles.of("prod", "production")) && teste;
    }

    private static boolean local(String host) {
        return host != null && Set.of("localhost", "127.0.0.1", "[::1]", "::1", "0:0:0:0:0:0:0:1").contains(host);
    }

    public boolean disponivel(HttpServletRequest request) {
        if (!ambientePermitido || !local(request.getRemoteAddr())) return false;
        String origem = request.getHeader("Origin");
        if (origem == null) return true;
        try { URI uri = URI.create(origem); return local(uri.getHost()) && ("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) && uri.getUserInfo() == null; }
        catch (IllegalArgumentException e) { return false; }
    }

    public void exigirAmbiente(HttpServletRequest request) {
        if (!disponivel(request)) throw new AcessoNegadoException("A administração temporária só está disponível no ambiente local de testes.");
    }

    public synchronized String entrar(HttpServletRequest request, String usuario, String senha) {
        exigirAmbiente(request);
        Instant agora = Instant.now();
        if (bloqueadoAte != null && agora.isBefore(bloqueadoAte)) throw new AcessoNegadoException("Aguarde antes de tentar novamente.");
        // Credenciais fictícias pedidas para a demonstração. Não existem fora do ambiente acima.
        boolean correto = MessageDigest.isEqual("admin".getBytes(StandardCharsets.UTF_8), (usuario == null ? "" : usuario).getBytes(StandardCharsets.UTF_8));
        correto &= MessageDigest.isEqual("admin".getBytes(StandardCharsets.UTF_8), (senha == null ? "" : senha).getBytes(StandardCharsets.UTF_8));
        if (!correto) {
            if (++falhas >= 5) { bloqueadoAte = agora.plusSeconds(900); falhas = 0; }
            throw new AcessoNegadoException("Não foi possível entrar na administração.");
        }
        falhas = 0; bloqueadoAte = null;
        String token = java.util.UUID.randomUUID().toString().replace("-", "") + java.util.UUID.randomUUID().toString().replace("-", "");
        sessaoHash = hash(token); expira = agora.plusSeconds(900);
        return token;
    }

    public synchronized void exigirSessao(HttpServletRequest request, String token) {
        exigirAmbiente(request);
        if (token == null || !token.matches("[a-f0-9]{64}") || sessaoHash == null || expira == null || !Instant.now().isBefore(expira)
                || !MessageDigest.isEqual(sessaoHash.getBytes(StandardCharsets.UTF_8), hash(token).getBytes(StandardCharsets.UTF_8)))
            throw new AcessoNegadoException("Entre novamente na administração local.");
    }

    public synchronized void sair(HttpServletRequest request, String token) {
        exigirSessao(request, token); sessaoHash = null; expira = null;
    }

    private String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Não foi possível validar a sessão administrativa."); }
    }
}
