package br.com.nexo.meta;

import java.math.BigDecimal;
import java.sql.Date;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.RecursoPlano;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MetaService {
    private static final List<String> UNIDADES = List.of("moeda", "percentual", "quantidade");

    private final JdbcTemplate jdbcTemplate;
    private final AcessoPlanoService acessoPlanoService;

    public MetaService(JdbcTemplate jdbcTemplate, AcessoPlanoService acessoPlanoService) {
        this.jdbcTemplate = jdbcTemplate;
        this.acessoPlanoService = acessoPlanoService;
    }

    @Transactional(readOnly = true)
    public List<MetaResumo> listar(Long organizacaoId) {
        acessoPlanoService.exigir(organizacaoId, RecursoPlano.METAS);
        return jdbcTemplate.query("""
                SELECT id, titulo, unidade, valor_meta, valor_atual, prazo, status
                FROM metas
                WHERE organizacao_id = ? AND status <> 'arquivada'
                ORDER BY CASE WHEN status = 'ativa' THEN 0 ELSE 1 END, criado_em DESC
                """, (rs, rowNum) -> new MetaResumo(
                rs.getLong("id"),
                rs.getString("titulo"),
                rs.getString("unidade"),
                rs.getBigDecimal("valor_meta"),
                rs.getBigDecimal("valor_atual"),
                rs.getObject("prazo", LocalDate.class),
                rs.getString("status")
        ), organizacaoId);
    }

    @Transactional
    public MetaResumo criar(Long organizacaoId, String titulo, String unidade, BigDecimal valorMeta, BigDecimal valorAtual, LocalDate prazo) {
        acessoPlanoService.exigir(organizacaoId, RecursoPlano.METAS);
        String tituloNormalizado = validarTitulo(titulo);
        String unidadeNormalizada = validarUnidade(unidade);
        BigDecimal meta = validarValorMeta(valorMeta);
        BigDecimal atual = validarValorAtual(valorAtual);

        Long id = jdbcTemplate.queryForObject("""
                INSERT INTO metas (organizacao_id, titulo, unidade, valor_meta, valor_atual, prazo)
                VALUES (?, ?, ?, ?, ?, ?)
                RETURNING id
                """, Long.class, organizacaoId, tituloNormalizado, unidadeNormalizada, meta, atual, prazo == null ? null : Date.valueOf(prazo));

        return buscar(organizacaoId, id);
    }

    @Transactional
    public MetaResumo atualizarProgresso(Long organizacaoId, Long metaId, BigDecimal valorAtual) {
        acessoPlanoService.exigir(organizacaoId, RecursoPlano.METAS);
        BigDecimal atual = validarValorAtual(valorAtual);

        int alteradas = jdbcTemplate.update("""
                UPDATE metas
                SET valor_atual = ?,
                    status = CASE WHEN ? >= valor_meta THEN 'concluida' ELSE 'ativa' END,
                    atualizado_em = NOW()
                WHERE id = ? AND organizacao_id = ? AND status <> 'arquivada'
                """, atual, atual, metaId, organizacaoId);

        if (alteradas == 0) throw new IllegalArgumentException("Meta não encontrada.");
        return buscar(organizacaoId, metaId);
    }

    @Transactional
    public void arquivar(Long organizacaoId, Long metaId) {
        acessoPlanoService.exigir(organizacaoId, RecursoPlano.METAS);
        int alteradas = jdbcTemplate.update("""
                UPDATE metas
                SET status = 'arquivada', atualizado_em = NOW()
                WHERE id = ? AND organizacao_id = ? AND status <> 'arquivada'
                """, metaId, organizacaoId);
        if (alteradas == 0) throw new IllegalArgumentException("Meta não encontrada.");
    }

    private MetaResumo buscar(Long organizacaoId, Long metaId) {
        Map<String, Object> dados = jdbcTemplate.queryForMap("""
                SELECT id, titulo, unidade, valor_meta, valor_atual, prazo, status
                FROM metas
                WHERE id = ? AND organizacao_id = ?
                """, metaId, organizacaoId);

        Date prazo = (Date) dados.get("prazo");
        return new MetaResumo(
                ((Number) dados.get("id")).longValue(),
                (String) dados.get("titulo"),
                (String) dados.get("unidade"),
                (BigDecimal) dados.get("valor_meta"),
                (BigDecimal) dados.get("valor_atual"),
                prazo == null ? null : prazo.toLocalDate(),
                (String) dados.get("status")
        );
    }

    private String validarTitulo(String titulo) {
        String valor = titulo == null ? "" : titulo.trim().replaceAll("\\s+", " ");
        if (valor.isBlank()) throw new IllegalArgumentException("Informe o título da meta.");
        if (valor.length() > 140) throw new IllegalArgumentException("O título da meta é muito longo.");
        return valor;
    }

    private String validarUnidade(String unidade) {
        String valor = unidade == null ? "" : unidade.trim().toLowerCase();
        if (!UNIDADES.contains(valor)) throw new IllegalArgumentException("Unidade de meta inválida.");
        return valor;
    }

    private BigDecimal validarValorMeta(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("O valor da meta deve ser maior que zero.");
        }
        return valor;
    }

    private BigDecimal validarValorAtual(BigDecimal valor) {
        BigDecimal atual = valor == null ? BigDecimal.ZERO : valor;
        if (atual.compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("O progresso atual não pode ser negativo.");
        }
        return atual;
    }

    public record MetaResumo(Long id, String titulo, String unidade, BigDecimal valorMeta, BigDecimal valorAtual, LocalDate prazo, String status) {}
}
