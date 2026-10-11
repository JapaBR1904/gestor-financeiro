package br.com.nexo.saas;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaasService {
    private static final List<String> PERFIS = List.of("pessoal", "negocio", "empresa");
    private static final List<String> PLANOS = List.of("free", "pro", "business");

    private final JdbcTemplate jdbcTemplate;

    public SaasService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Transactional
    public ConfiguracaoSaas carregar(Long organizacaoId) {
        garantirEstrutura(organizacaoId);

        Map<String, Object> dados = jdbcTemplate.queryForMap("""
                SELECT c.perfil_uso,
                       c.onboarding_concluido,
                       a.plano,
                       a.status
                FROM configuracoes_saas c
                JOIN assinaturas a ON a.organizacao_id = c.organizacao_id
                WHERE c.organizacao_id = ?
                """, organizacaoId);

        List<String> objetivos = jdbcTemplate.queryForList("""
                SELECT jsonb_array_elements_text(objetivos) AS objetivo
                FROM configuracoes_saas
                WHERE organizacao_id = ?
                """, String.class, organizacaoId);

        return new ConfiguracaoSaas(
                (String) dados.get("perfil_uso"),
                objetivos,
                Boolean.TRUE.equals(dados.get("onboarding_concluido")),
                (String) dados.get("plano"),
                (String) dados.get("status")
        );
    }

    @Transactional
    public ConfiguracaoSaas salvarOnboarding(Long organizacaoId, String perfil, List<String> objetivos, boolean concluido) {
        String perfilNormalizado = validarPerfil(perfil);
        garantirEstrutura(organizacaoId);
        String objetivosJson = escreverObjetivos(objetivos == null ? List.of() : objetivos);

        jdbcTemplate.update("""
                UPDATE configuracoes_saas
                SET perfil_uso = ?, objetivos = CAST(? AS jsonb), onboarding_concluido = ?, atualizado_em = NOW()
                WHERE organizacao_id = ?
                """, perfilNormalizado, objetivosJson, concluido, organizacaoId);

        return carregar(organizacaoId);
    }

    @Transactional
    public ConfiguracaoSaas alterarPlano(Long organizacaoId, String plano) {
        String planoNormalizado = plano == null ? "" : plano.trim().toLowerCase();
        if (!PLANOS.contains(planoNormalizado)) {
            throw new IllegalArgumentException("Plano inválido.");
        }

        garantirEstrutura(organizacaoId);
        jdbcTemplate.update("""
                UPDATE assinaturas
                SET plano = ?, status = 'prototipo', atualizado_em = NOW()
                WHERE organizacao_id = ?
                """, planoNormalizado, organizacaoId);

        return carregar(organizacaoId);
    }

    private void garantirEstrutura(Long organizacaoId) {
        jdbcTemplate.update("""
                INSERT INTO configuracoes_saas (organizacao_id)
                VALUES (?)
                ON CONFLICT (organizacao_id) DO NOTHING
                """, organizacaoId);

        jdbcTemplate.update("""
                INSERT INTO assinaturas (organizacao_id, plano, status)
                VALUES (?, 'free', 'prototipo')
                ON CONFLICT (organizacao_id) DO NOTHING
                """, organizacaoId);
    }

    private String validarPerfil(String perfil) {
        String perfilNormalizado = perfil == null ? "" : perfil.trim().toLowerCase();
        if (!PERFIS.contains(perfilNormalizado)) {
            throw new IllegalArgumentException("Perfil de uso inválido.");
        }
        return perfilNormalizado;
    }

    private String escreverObjetivos(List<String> objetivos) {
        return objetivos.stream()
                .filter(item -> item != null && !item.isBlank())
                .map(String::trim)
                .distinct()
                .limit(12)
                .map(this::comoStringJson)
                .collect(Collectors.joining(",", "[", "]"));
    }

    private String comoStringJson(String valor) {
        String escapado = valor
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
                .replace("\t", "\\t");
        return "\"" + escapado + "\"";
    }

    public record ConfiguracaoSaas(
            String perfilUso,
            List<String> objetivos,
            boolean onboardingConcluido,
            String plano,
            String statusAssinatura
    ) {}
}
