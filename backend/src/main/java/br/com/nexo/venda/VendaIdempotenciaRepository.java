package br.com.nexo.venda;

import br.com.nexo.config.ConflitoOperacaoException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** Lock transacional por organização/chave; a unicidade persistida também é obrigatória. */
@Repository
public class VendaIdempotenciaRepository {
    private final JdbcTemplate jdbc;
    private final JsonMapper json = JsonMapper.builder().build();
    public VendaIdempotenciaRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public String fingerprint(Object payload) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("v1:" + json.writeValueAsString(payload)).getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException e) { throw new IllegalStateException("Não foi possível verificar a solicitação."); }
    }
    public Optional<VendaService.VendaDetalhe> original(Long org, UUID chave, String fingerprint) {
        jdbc.queryForObject("SELECT pg_advisory_xact_lock(hashtextextended(?,0))", Object.class, "venda:" + org + ":" + chave);
        var existentes = jdbc.query("SELECT payload_hash,resposta_original::text FROM vendas WHERE organizacao_id=? AND chave_idempotencia=?",
                (rs,n) -> new Registro(rs.getString(1), rs.getString(2)), org, chave);
        if (existentes.isEmpty()) return Optional.empty();
        var registro = existentes.getFirst();
        if (!registro.fingerprint().equals(fingerprint)) throw new ConflitoOperacaoException("Este envio já foi usado para outra venda. Revise a operação antes de iniciar uma nova tentativa.");
        return Optional.of(json.readValue(registro.resposta(), VendaService.VendaDetalhe.class));
    }
    public void guardar(Long org, UUID chave, String fingerprint, VendaService.VendaDetalhe detalhe) {
        jdbc.update("UPDATE vendas SET chave_idempotencia=?,payload_hash=?,resposta_original=?::jsonb WHERE id=? AND organizacao_id=?",
                chave, fingerprint, json.writeValueAsString(detalhe), detalhe.id(), org);
    }
    private record Registro(String fingerprint, String resposta) {}
}
