package br.com.nexo.organizacao;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;
import br.com.nexo.auth.AuthService.UsuarioAutenticado;
import br.com.nexo.auth.EmailCodigoService;
import br.com.nexo.config.AcessoNegadoException;
import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.AssinaturaRepository;
import br.com.nexo.saas.PoliticaAssinatura;
import br.com.nexo.saas.RecursoPlano;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipeService {
    private final JdbcTemplate jdbc;
    private final MembroRepository membros;
    private final AssinaturaRepository assinatura;
    private final PoliticaAssinatura planos;
    private final AcessoPlanoService acesso;
    private final PoliticaOrganizacao permissoes;
    private final EmailCodigoService emails;
    private final String frontend;
    private final org.springframework.core.env.Environment ambiente;
    public EquipeService(JdbcTemplate jdbc, MembroRepository membros, AssinaturaRepository assinatura, PoliticaAssinatura planos,
            AcessoPlanoService acesso, PoliticaOrganizacao permissoes, EmailCodigoService emails,
            @Value("${nexo.frontend-url:http://localhost:3000}") String frontend, org.springframework.core.env.Environment ambiente) {
        this.jdbc=jdbc; this.membros=membros; this.assinatura=assinatura; this.planos=planos;
        this.acesso=acesso; this.permissoes=permissoes; this.emails=emails; this.frontend=frontend;
        this.ambiente=ambiente;
    }
    @Transactional public Equipe listar(UsuarioAutenticado usuario) {
        acesso.exigir(usuario.organizacaoId(), RecursoPlano.EQUIPE);
        expirar(usuario.organizacaoId());
        return new Equipe(assinatura.membros(usuario.organizacaoId()),
                permissoes.podeGerenciar(usuario) ? convites(usuario.organizacaoId()) : List.of(),
                planos.planoEfetivo(assinatura.carregar(usuario.organizacaoId(),false)).limiteUsuarios(), permissoes.podeGerenciar(usuario), usuario.papel());
    }
    @Transactional public ConviteCriado convidar(UsuarioAutenticado usuario, String email, String papel) {
        String origem = origemConvite();
        var estado=assinatura.carregar(usuario.organizacaoId(),true);
        usuario=atual(usuario);
        acesso.exigir(usuario.organizacaoId(),RecursoPlano.EQUIPE);
        papel=papel(papel); permissoes.exigirPapel(usuario,papel);
        String destino=email==null?"":email.trim().toLowerCase(java.util.Locale.ROOT);
        if (destino.length()>180 || !br.com.nexo.email.ResendEmailProvider.enderecoValido(destino) || destino.contains("<"))
            throw new IllegalArgumentException("Informe um e-mail válido.");
        expirar(usuario.organizacaoId());
        if (jdbc.queryForObject("SELECT count(*) FROM convites_organizacao WHERE organizacao_id=? AND lower(email)=? AND status='pendente'",Integer.class,usuario.organizacaoId(),destino)>0)
            throw new IllegalArgumentException("Já existe um convite pendente para este e-mail.");
        if (jdbc.queryForObject("""
                SELECT count(*) FROM usuarios u JOIN membros_organizacao m ON m.usuario_id=u.id
                WHERE m.organizacao_id=? AND m.ativo AND lower(u.email)=?
                """,Integer.class,usuario.organizacaoId(),destino)>0) throw new IllegalArgumentException("Esta pessoa já participa da organização.");
        int reservados=jdbc.queryForObject("SELECT count(*) FROM convites_organizacao WHERE organizacao_id=? AND status='pendente'",Integer.class,usuario.organizacaoId());
        if (assinatura.usuarios(usuario.organizacaoId())+reservados>=planos.planoEfetivo(estado).limiteUsuarios())
            throw new IllegalArgumentException("O limite de usuários foi atingido. Revogue um convite ou remova um membro para continuar.");
        byte[] bytes=new byte[32]; new java.security.SecureRandom().nextBytes(bytes);
        String token=java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Long id=jdbc.queryForObject("""
                INSERT INTO convites_organizacao (organizacao_id,email,papel,token_hash,expira_em,criado_por)
                VALUES (?,?,?,?,NOW()+INTERVAL '24 hours',?) RETURNING id
                """,Long.class,usuario.organizacaoId(),destino,papel,hash(token),usuario.id());
        // Fragmento não é enviado no GET ao servidor. O aceite exige sessão verificada do destinatário.
        String link=origem+"/convite#"+token;
        emails.enviarConvite(destino,usuario.organizacaoNome(),link);
        return new ConviteCriado(id,link);
    }
    @Transactional public InformacaoConvite consultar(UsuarioAutenticado usuario,String token) {
        var convite=convite(usuario,token,false);
        return new InformacaoConvite(convite.organizacaoId(),convite.nome(),convite.papel(),convite.expiraEm());
    }
    @Transactional public InformacaoConvite aceitar(UsuarioAutenticado usuario,String token) {
        var preliminar=convite(usuario,token,false);
        var estado=assinatura.carregar(preliminar.organizacaoId(),true);
        acesso.exigir(preliminar.organizacaoId(),RecursoPlano.EQUIPE);
        var convite=convite(usuario,token,true);
        // Lock da assinatura serializa aceite, convite, remoção e downgrade.
        var existente=membros.vinculo(usuario.id(),convite.organizacaoId());
        if (existente==null && assinatura.usuarios(convite.organizacaoId())>=planos.planoEfetivo(estado).limiteUsuarios())
            throw new IllegalArgumentException("A organização atingiu seu limite de usuários.");
        if (existente==null) jdbc.update("""
                INSERT INTO membros_organizacao (organizacao_id,usuario_id,papel,ativo) VALUES (?,?,?,TRUE)
                ON CONFLICT (organizacao_id,usuario_id) DO UPDATE SET papel=EXCLUDED.papel,ativo=TRUE
                """,convite.organizacaoId(),usuario.id(),convite.papel());
        jdbc.update("UPDATE convites_organizacao SET status='aceito',aceito_em=NOW(),token_hash=NULL WHERE id=?",convite.id());
        return new InformacaoConvite(convite.organizacaoId(),convite.nome(),convite.papel(),convite.expiraEm());
    }
    @Transactional public void revogarConvite(UsuarioAutenticado usuario,Long id) {
        assinatura.carregar(usuario.organizacaoId(),true); usuario=atual(usuario);
        acesso.exigir(usuario.organizacaoId(),RecursoPlano.EQUIPE); permissoes.exigirGestao(usuario);
        var papeis=jdbc.queryForList("SELECT papel FROM convites_organizacao WHERE id=? AND organizacao_id=? AND status='pendente'",String.class,id,usuario.organizacaoId());
        if (papeis.isEmpty()) throw new IllegalArgumentException("Convite não encontrado.");
        permissoes.exigirPapel(usuario,papeis.getFirst());
        jdbc.update("UPDATE convites_organizacao SET status='revogado',token_hash=NULL WHERE id=? AND organizacao_id=?",id,usuario.organizacaoId());
    }
    @Transactional public void alterarMembro(UsuarioAutenticado usuario,Long id,String papel,boolean remover) {
        assinatura.carregar(usuario.organizacaoId(),true); usuario=atual(usuario);
        acesso.exigir(usuario.organizacaoId(),RecursoPlano.EQUIPE); permissoes.exigirGestao(usuario);
        var alvo=membros.vinculo(id,usuario.organizacaoId());
        if (alvo==null) throw new IllegalArgumentException("Membro não encontrado.");
        if (alvo.papel().equals("proprietario") || id.equals(usuario.id())) throw new AcessoNegadoException("O proprietário e o seu próprio acesso devem ser preservados.");
        permissoes.exigirPapel(usuario,alvo.papel());
        if (!remover) { papel=papel(papel); permissoes.exigirPapel(usuario,papel); }
        jdbc.update("UPDATE membros_organizacao SET ativo=?,papel=? WHERE usuario_id=? AND organizacao_id=?",!remover,remover?alvo.papel():papel,id,usuario.organizacaoId());
        if (!remover) jdbc.update("UPDATE usuarios SET papel=? WHERE id=? AND organizacao_id=?",papel,id,usuario.organizacaoId());
        jdbc.update("UPDATE sessoes_usuario SET revogada_em=NOW() WHERE usuario_id=? AND organizacao_id=? AND revogada_em IS NULL",id,usuario.organizacaoId());
        if (remover) preservarContaLegada(id, usuario.organizacaoId());
    }
    private void preservarContaLegada(Long usuarioId, Long organizacaoRemovida) {
        var primaria = jdbc.queryForObject("SELECT organizacao_id FROM usuarios WHERE id=?", Long.class, usuarioId);
        if (!organizacaoRemovida.equals(primaria)) return;
        // Contas antigas podiam nascer diretamente na empresa. A remoção cria um espaço pessoal vazio,
        // sem mover os registros financeiros que pertencem à empresa nem excluir a conta.
        Long pessoal = jdbc.queryForObject("INSERT INTO organizacoes (nome) VALUES ('Meu espaço') RETURNING id", Long.class);
        jdbc.update("UPDATE usuarios SET organizacao_id=?,papel='proprietario' WHERE id=?", pessoal, usuarioId);
        jdbc.update("INSERT INTO membros_organizacao (organizacao_id,usuario_id,papel) VALUES (?,?,'proprietario')", pessoal, usuarioId);
    }
    private UsuarioAutenticado atual(UsuarioAutenticado usuario) {
        return membros.usuarioAtual(usuario);
    }
    private String papel(String papel) {
        if (!List.of("administrador","membro").contains(papel==null?"":papel)) throw new IllegalArgumentException("Escolha administrador ou membro.");
        return papel;
    }
    private String origemConvite() {
        try {
            var uri = java.net.URI.create(frontend.trim());
            boolean producao = ambiente.acceptsProfiles(org.springframework.core.env.Profiles.of("prod", "production"));
            boolean local = uri.getHost() != null && java.util.Set.of("localhost", "127.0.0.1", "[::1]").contains(uri.getHost());
            boolean transporte = "https".equals(uri.getScheme()) || (!producao && local && "http".equals(uri.getScheme()));
            if (!transporte || uri.getHost() == null || uri.getUserInfo() != null || uri.getQuery() != null || uri.getFragment() != null
                    || !(uri.getPath().isEmpty() || uri.getPath().equals("/"))) throw new IllegalArgumentException();
            return uri.toString().replaceAll("/$", "");
        } catch (IllegalArgumentException e) {
            throw new IllegalStateException("O endereço do Nexo para convites precisa ser configurado pelo responsável.");
        }
    }
    private void expirar(Long org) { jdbc.update("UPDATE convites_organizacao SET status='expirado',token_hash=NULL WHERE organizacao_id=? AND status='pendente' AND (expira_em IS NULL OR expira_em<=NOW())",org); }
    private List<ConviteResumo> convites(Long org) {
        return jdbc.query("SELECT id,email,papel,status,expira_em FROM convites_organizacao WHERE organizacao_id=? ORDER BY criado_em DESC LIMIT 100",
                (rs,n)->new ConviteResumo(rs.getLong("id"),rs.getString("email"),rs.getString("papel"),rs.getString("status"),rs.getObject("expira_em",OffsetDateTime.class)),org);
    }
    private Convite convite(UsuarioAutenticado usuario,String token,boolean bloquear) {
        if(token==null || !token.matches("[A-Za-z0-9_-]{43}")) throw new IllegalArgumentException("Convite inválido ou expirado.");
        var itens=jdbc.query("""
                SELECT c.id,c.organizacao_id,o.nome,c.papel,c.expira_em FROM convites_organizacao c JOIN organizacoes o ON o.id=c.organizacao_id
                WHERE c.token_hash=? AND c.status='pendente' AND c.expira_em>NOW() AND lower(c.email)=lower(?)
                """+(bloquear?" FOR UPDATE OF c":""),(rs,n)->new Convite(rs.getLong("id"),rs.getLong("organizacao_id"),rs.getString("nome"),rs.getString("papel"),rs.getObject("expira_em",OffsetDateTime.class)),hash(token),usuario.email());
        if(itens.isEmpty()) throw new IllegalArgumentException("Convite inválido, expirado ou destinado a outro e-mail.");
        return itens.getFirst();
    }
    private String hash(String token) {
        try { return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8))); }
        catch(java.security.NoSuchAlgorithmException e) { throw new IllegalStateException("Não foi possível validar o convite."); }
    }
    private record Convite(Long id,Long organizacaoId,String nome,String papel,OffsetDateTime expiraEm) {}
    public record ConviteCriado(Long id,String linkAceite) { @Override public String toString(){return "ConviteCriado[link protegido]";} }
    public record InformacaoConvite(Long organizacaoId,String organizacaoNome,String papel,OffsetDateTime expiraEm) {}
    public record ConviteResumo(Long id,String email,String papel,String status,OffsetDateTime expiraEm) {}
    public record Equipe(List<AssinaturaRepository.Membro> membros,List<ConviteResumo> convites,int limite,boolean podeGerenciar,String papelAtual) {}
}
