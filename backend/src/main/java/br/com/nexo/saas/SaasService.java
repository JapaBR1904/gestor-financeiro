package br.com.nexo.saas;

import java.util.List;
import java.util.Map;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaasService {
    private static final List<String> PERFIS = List.of("pessoal", "negocio", "empresa");
    private static final List<String> PLANOS = List.of("free", "pro", "business");

    private final JdbcTemplate jdbcTemplate;
    private final ObjectMapper objectMapper;

    public SaasService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
        this.jdbcTemplate = jdbcTemplate;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ConfiguracaoSaas carregar(Long organizacaoId) {
        garantirEstrutura(organizacaoId);

        Map<String, Object> dados = jdbcTemplate.queryForMap("""
                SELECT c.perfil_uso,
                       c.objetivos::text AS objetivos,
                       c.onboarding_concluido,
                       a.plano,
                       a.status
                FROM configuracoes_saas c
                JOIN assinaturas a ON a.organizacao_id = c.organizacao_id
                WHERE c.organizacao_id = ?
                """, organizacaoId);

        return new ConfiguracaoSaas(
                (String) dados.get("perfil_uso"),
                lerObjetivos((String) dados.get("objetivos")),
                Boolean.TRUE.equals(dados.get("onboarding_concluido")),
                (String) dados.get("plano"),
                (String) dados.get("status")
        );
    }

    @Transactional
    public ConfiguracaoSaas salvarOnboarding(Long organizacaoId, String perfil, List<String> objetivos, boolean concluido) {
        validarPerfil(perfil);
        garantirEstrutura(organizacaoId);
        String objetivosJson = escreverObjetivos(objetivos == null ? List.of() : objetivos);

        jdbcTemplate.update("""
                UPDATE configuracoes_saas
                SET perfil_uso = ?, objetivos = ?::jsonb, onboarding_concluido = ?, atualizado_em = NOW()
                WHERE organizacao_id = ?
                """, perfil, objetivosJson, concluido, organizacaoId);

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

    private void validarPerfil(String perfil) {
        if (perfil == null || !PERFIS.contains(perfil.trim().toLowerCase())) {
            throw new IllegalArgumentException("Perfil de uso inválido.");
        }
    }

    private String escreverObjetivos(List<String> objetivos) {
        try {
            return objectMapper.writeValueAsString(objetivos.stream()
                    .filter(item -> item != null && !item.isBlank())
                    .map(String::trim)
                    .distinct()
                    .limit(12)
                    .toList());
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Não foi possível salvar os objetivos.", e);
        }
    }

    private List<String> lerObjetivos(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public record ConfiguracaoSaas(
            String perfilUso,
            List<String> objetivos,
            boolean onboardingConcluido,
            String plano,
            String statusAssinatura
    ) {}
}
