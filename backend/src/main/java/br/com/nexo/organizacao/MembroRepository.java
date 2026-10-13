package br.com.nexo.organizacao;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class MembroRepository {
    private final JdbcTemplate jdbc;
    public MembroRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void garantirOriginal(Long usuarioId) {
        jdbc.update("""
                INSERT INTO membros_organizacao (organizacao_id,usuario_id,papel,ativo)
                SELECT organizacao_id,id,CASE WHEN papel IN ('proprietario','administrador','membro') THEN papel ELSE 'membro' END,ativo
                FROM usuarios WHERE id=? ON CONFLICT DO NOTHING
                """, usuarioId);
    }
    public Vinculo vinculo(Long usuario, Long org) {
        var itens = jdbc.query("""
                SELECT o.id,o.nome,CASE WHEN u.organizacao_id=o.id THEN u.papel ELSE m.papel END AS papel
                FROM membros_organizacao m JOIN organizacoes o ON o.id=m.organizacao_id JOIN usuarios u ON u.id=m.usuario_id
                WHERE m.usuario_id=? AND m.organizacao_id=? AND m.ativo AND u.ativo
                """, (rs,n) -> new Vinculo(rs.getLong("id"), rs.getString("nome"), rs.getString("papel")), usuario, org);
        return itens.isEmpty() ? null : itens.getFirst();
    }
    public List<Vinculo> organizacoes(Long usuario) {
        return jdbc.query("""
                SELECT o.id,o.nome,CASE WHEN u.organizacao_id=o.id THEN u.papel ELSE m.papel END AS papel
                FROM membros_organizacao m JOIN organizacoes o ON o.id=m.organizacao_id JOIN usuarios u ON u.id=m.usuario_id
                WHERE m.usuario_id=? AND m.ativo AND u.ativo ORDER BY o.id
                """, (rs,n) -> new Vinculo(rs.getLong("id"), rs.getString("nome"), rs.getString("papel")), usuario);
    }
    public record Vinculo(Long id, String nome, String papel) {}
    public br.com.nexo.auth.AuthService.UsuarioAutenticado usuarioAtual(br.com.nexo.auth.AuthService.UsuarioAutenticado usuario) {
        var atual = vinculo(usuario.id(), usuario.organizacaoId());
        if (atual == null) throw new br.com.nexo.config.AcessoNegadoException("Você não tem acesso a esta organização.");
        return new br.com.nexo.auth.AuthService.UsuarioAutenticado(usuario.id(), usuario.nome(), usuario.email(), atual.papel(), atual.id(), atual.nome());
    }
}
