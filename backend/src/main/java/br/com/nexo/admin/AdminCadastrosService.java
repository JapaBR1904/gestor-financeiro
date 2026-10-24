package br.com.nexo.admin;

import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import br.com.nexo.config.AcessoNegadoException;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

/** Credenciais explícitas do operador; não reutiliza o administrador fictício local. */
@Service
public class AdminCadastrosService {
    public static final String COOKIE="nexo_admin_cadastros";
    private final boolean habilitado, seguro;
    private final String usuario, senhaHash, origem;
    private final BCryptPasswordEncoder encoder=new BCryptPasswordEncoder(12);
    private String sessaoHash;
    private Instant expira, bloqueadoAte;
    private int falhas;
    public AdminCadastrosService(Environment ambiente,
            @Value("${nexo.auth.manual-approval-enabled:false}") boolean habilitado,
            @Value("${nexo.admin.cadastros.usuario:}") String usuario,
            @Value("${nexo.admin.cadastros.senha:}") String senha,
            @Value("${nexo.frontend-url:http://localhost:3000}") String origem,
            @Value("${nexo.cookie.secure:false}") boolean seguro) {
        this.habilitado=habilitado; this.usuario=usuario; this.origem=origem; this.seguro=seguro;
        if (habilitado) {
            boolean local=ambiente.matchesProfiles("(dev | test) & !prod & !production");
            URI url;
            try { url=URI.create(origem); } catch (IllegalArgumentException e) { throw new IllegalStateException("Origem administrativa inválida."); }
            boolean origemValida=url.getHost()!=null && url.getUserInfo()==null && url.getQuery()==null && url.getFragment()==null
                    && (url.getPath().isEmpty()) && origem.equals(url.getScheme()+"://"+url.getRawAuthority());
            boolean httpLocal=local && "http".equals(url.getScheme()) && java.util.Set.of("localhost","127.0.0.1","[::1]").contains(url.getHost());
            if (!origemValida || !("https".equals(url.getScheme()) && seguro || httpLocal)) throw new IllegalStateException("Administração exige origem HTTPS e cookie seguro fora de dev/test local.");
            if (usuario==null || usuario.isBlank() || usuario.length()>100 || senha==null || senha.length()<24 || senha.getBytes(StandardCharsets.UTF_8).length>72)
                throw new IllegalStateException("Aprovação manual exige usuário próprio e senha administrativa de 24 a 72 bytes.");
        }
        senhaHash=habilitado ? encoder.encode(senha) : "";
    }
    public boolean habilitado() { return habilitado; }
    public boolean seguro() { return seguro; }
    public String usuario() { return usuario; }
    private void exigirOrigem(HttpServletRequest request) {
        if (!habilitado) throw new AcessoNegadoException("Administração de cadastros indisponível.");
        String informada=request.getHeader("Origin");
        boolean escrita=!java.util.Set.of("GET","HEAD","OPTIONS").contains(request.getMethod());
        if ((escrita && informada==null) || (informada!=null && !origem.equals(informada))) throw new AcessoNegadoException("Origem administrativa inválida.");
    }
    public synchronized String entrar(HttpServletRequest request,String nome,String senha) {
        exigirOrigem(request); Instant agora=Instant.now();
        if (bloqueadoAte!=null && agora.isBefore(bloqueadoAte)) throw new AcessoNegadoException("Aguarde antes de tentar novamente.");
        boolean nomeCorreto=nome!=null && MessageDigest.isEqual(usuario.getBytes(StandardCharsets.UTF_8),nome.getBytes(StandardCharsets.UTF_8));
        boolean senhaCorreta=senha!=null && senha.getBytes(StandardCharsets.UTF_8).length<=72 && encoder.matches(senha,senhaHash);
        if (!nomeCorreto || !senhaCorreta) {
            if (++falhas>=5) { bloqueadoAte=agora.plusSeconds(900); falhas=0; }
            throw new AcessoNegadoException("Não foi possível entrar na administração.");
        }
        falhas=0; bloqueadoAte=null;
        String token=UUID.randomUUID().toString().replace("-","")+UUID.randomUUID().toString().replace("-","");
        sessaoHash=hash(token); expira=agora.plusSeconds(900); return token;
    }
    public synchronized void exigirSessao(HttpServletRequest request,String token) {
        exigirOrigem(request);
        if (token==null || !token.matches("[a-f0-9]{64}") || sessaoHash==null || expira==null || !Instant.now().isBefore(expira)
                || !MessageDigest.isEqual(sessaoHash.getBytes(StandardCharsets.UTF_8),hash(token).getBytes(StandardCharsets.UTF_8)))
            throw new AcessoNegadoException("Entre novamente na administração de cadastros.");
    }
    public synchronized void sair(HttpServletRequest request,String token) { exigirSessao(request,token); sessaoHash=null; expira=null; }
    private String hash(String token) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Não foi possível validar a sessão administrativa."); }
    }
}
