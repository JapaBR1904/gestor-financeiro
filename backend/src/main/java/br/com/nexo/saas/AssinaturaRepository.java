package br.com.nexo.saas;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class AssinaturaRepository {
    private final JdbcTemplate jdbc;
    public AssinaturaRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

    public void garantir(Long organizacaoId) {
        jdbc.update("INSERT INTO assinaturas (organizacao_id, plano, status) VALUES (?, 'free', 'prototipo') ON CONFLICT (organizacao_id) DO NOTHING", organizacaoId);
    }
    public Estado carregar(Long organizacaoId, boolean bloquear) {
        if (bloquear) garantir(organizacaoId);
        var itens = jdbc.query("SELECT plano, status, versao, atualizado_em, provedor FROM assinaturas WHERE organizacao_id = ?" + (bloquear ? " FOR UPDATE" : ""),
                (rs, n) -> new Estado(rs.getString("plano"), rs.getString("status"), rs.getLong("versao"), rs.getObject("atualizado_em", OffsetDateTime.class), rs.getString("provedor")), organizacaoId);
        return itens.isEmpty() ? new Estado("free", "prototipo", 0, null, null) : itens.getFirst();
    }
    public Checkout porChave(Long organizacaoId, UUID chave) {
        var itens = jdbc.query("SELECT * FROM checkouts_assinatura WHERE organizacao_id = ? AND chave_idempotencia = ?", this::mapear, organizacaoId, chave);
        return itens.isEmpty() ? null : itens.getFirst();
    }
    public Checkout checkout(Long organizacaoId, UUID id, boolean bloquear) {
        var itens = jdbc.query("SELECT * FROM checkouts_assinatura WHERE organizacao_id = ? AND id = ?" + (bloquear ? " FOR UPDATE" : ""), this::mapear, organizacaoId, id);
        return itens.isEmpty() ? null : itens.getFirst();
    }
    public Checkout criar(Long organizacaoId, Long usuarioId, UUID chave, Estado atual, Plano destino, String tipo) {
        UUID id = UUID.randomUUID();
        jdbc.update("""
                INSERT INTO checkouts_assinatura
                    (id, organizacao_id, usuario_id, chave_idempotencia, plano_anterior, plano_destino, assinatura_versao, tipo, valor, expira_em)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW() + INTERVAL '15 minutes')
                """, id, organizacaoId, usuarioId, chave, Plano.efetivo(atual.plano(), atual.status()).id(), destino.id(), atual.versao(), tipo, destino.valor());
        return checkout(organizacaoId, id, false);
    }
    public void concluir(Checkout checkout, String status, ProvedorPagamento.Metodo metodo) {
        jdbc.update("UPDATE checkouts_assinatura SET status = ?, metodo = ?, concluido_em = NOW() WHERE id = ? AND organizacao_id = ?",
                status, metodo == null ? null : metodo.name(), checkout.id(), checkout.organizacaoId());
    }
    public void aplicar(Checkout checkout, Long usuarioId) {
        jdbc.update("""
                UPDATE assinaturas SET plano = ?, status = ?, provedor = 'simulado', cancelamento_agendado = FALSE,
                    versao = versao + 1, atualizado_em = NOW() WHERE organizacao_id = ?
                """, checkout.planoDestino(), "cancelamento".equals(checkout.tipo()) ? "cancelada" : "ativa", checkout.organizacaoId());
        jdbc.update("""
                INSERT INTO historico_assinaturas (organizacao_id, usuario_id, checkout_id, plano_anterior, plano_novo, tipo, origem)
                VALUES (?, ?, ?, ?, ?, ?, 'simulado')
                """, checkout.organizacaoId(), usuarioId, checkout.id(), checkout.planoAnterior(), checkout.planoDestino(), checkout.tipo());
    }
    public List<Historico> historico(Long organizacaoId) {
        return jdbc.query("SELECT plano_anterior, plano_novo, tipo, origem, criado_em FROM historico_assinaturas WHERE organizacao_id = ? ORDER BY id DESC LIMIT 50",
                (rs, n) -> new Historico(rs.getString("plano_anterior"), rs.getString("plano_novo"), rs.getString("tipo"), rs.getString("origem"), rs.getObject("criado_em", OffsetDateTime.class)), organizacaoId);
    }
    public int usuarios(Long organizacaoId) {
        return jdbc.queryForObject("""
                SELECT count(*) FROM usuarios u LEFT JOIN membros_organizacao m ON m.usuario_id=u.id AND m.organizacao_id=?
                WHERE u.ativo AND ((m.organizacao_id IS NOT NULL AND m.ativo) OR (m.organizacao_id IS NULL AND u.organizacao_id=?))
                """, Integer.class, organizacaoId, organizacaoId);
    }
    public List<Membro> membros(Long organizacaoId) {
        return jdbc.query("""
                SELECT u.id,u.nome,CASE WHEN u.organizacao_id=? THEN u.papel ELSE m.papel END AS papel,
                       u.ativo AND COALESCE(m.ativo,TRUE) AS ativo
                FROM usuarios u LEFT JOIN membros_organizacao m ON m.usuario_id=u.id AND m.organizacao_id=?
                WHERE u.organizacao_id=? OR m.organizacao_id IS NOT NULL ORDER BY u.id
                """, (rs, n) -> new Membro(rs.getLong("id"), rs.getString("nome"), rs.getString("papel"), rs.getBoolean("ativo")), organizacaoId, organizacaoId, organizacaoId);
    }
    private Checkout mapear(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        return new Checkout(rs.getObject("id", UUID.class), rs.getLong("organizacao_id"), rs.getLong("usuario_id"), rs.getString("plano_anterior"), rs.getString("plano_destino"), rs.getLong("assinatura_versao"), rs.getString("tipo"), rs.getBigDecimal("valor"), rs.getString("status"), rs.getString("metodo"), rs.getObject("expira_em", OffsetDateTime.class));
    }
    public record Estado(String plano, String status, long versao, OffsetDateTime atualizadoEm, String provedor) {}
    public record Checkout(UUID id, Long organizacaoId, Long usuarioId, String planoAnterior, String planoDestino, long versao,
                           String tipo, BigDecimal valor, String status, String metodo, OffsetDateTime expiraEm) {}
    public record Historico(String planoAnterior, String planoNovo, String tipo, String origem, OffsetDateTime criadoEm) {}
    public record Membro(Long id, String nome, String papel, boolean ativo) {}
}
