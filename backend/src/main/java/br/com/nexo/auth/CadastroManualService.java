package br.com.nexo.auth;

import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Aprovação de acesso separada de comprovação de posse do e-mail. */
@Service
public class CadastroManualService {
    private final JdbcTemplate jdbc;
    private final boolean habilitado;
    public CadastroManualService(JdbcTemplate jdbc, @Value("${nexo.auth.manual-approval-enabled:false}") boolean habilitado) {
        this.jdbc=jdbc; this.habilitado=habilitado;
    }
    public boolean habilitado() { return habilitado; }
    private void exigir() { if (!habilitado) throw new br.com.nexo.config.AcessoNegadoException("A aprovação manual não está habilitada."); }
    public void solicitar(Long usuarioId) {
        exigir(); jdbc.update("INSERT INTO cadastros_manuais(usuario_id) VALUES (?)", usuarioId);
    }
    public boolean acessoPermitido(Long usuarioId, boolean emailVerificado) {
        if (!habilitado) return emailVerificado;
        Boolean permitido=jdbc.queryForObject("SELECT COALESCE((SELECT estado='aprovado' FROM cadastros_manuais WHERE usuario_id=?), ?)",Boolean.class,usuarioId,emailVerificado);
        return Boolean.TRUE.equals(permitido);
    }
    @Transactional(readOnly=true)
    public List<Pedido> pendentes() {
        exigir();
        return jdbc.query("SELECT c.usuario_id,u.nome,u.email,c.criado_em FROM cadastros_manuais c JOIN usuarios u ON u.id=c.usuario_id WHERE c.estado='pendente' ORDER BY c.criado_em,c.usuario_id LIMIT 100",
                (rs,n) -> new Pedido(rs.getLong(1),rs.getString(2),rs.getString(3),rs.getObject(4,OffsetDateTime.class)));
    }
    @Transactional
    public void decidir(Long id, boolean aprovar, boolean identidadeConfirmada, String administrador) {
        exigir();
        if (aprovar && !identidadeConfirmada) throw new IllegalArgumentException("Confirme a identidade antes de aprovar o cadastro.");
        if (administrador == null || administrador.isBlank() || administrador.length()>100) throw new IllegalArgumentException("Administrador inválido.");
        int alterados=jdbc.update("UPDATE cadastros_manuais SET estado=?,decidido_em=CURRENT_TIMESTAMP,decidido_por=? WHERE usuario_id=? AND estado='pendente'", aprovar ? "aprovado" : "recusado", administrador,id);
        if (alterados != 1) throw new IllegalArgumentException("Este cadastro não está mais pendente. Atualize a lista.");
    }
    public record Pedido(Long usuarioId,String nome,String email,OffsetDateTime criadoEm) {}
}
