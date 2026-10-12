package br.com.nexo.saas;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AcessoPlanoService {
    private final JdbcTemplate jdbcTemplate;

    public AcessoPlanoService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void exigir(Long organizacaoId, RecursoPlano recurso) {
        String plano = jdbcTemplate.queryForObject("""
                SELECT plano
                FROM assinaturas
                WHERE organizacao_id = ?
                """, String.class, organizacaoId);

        if (nivel(plano) < nivel(recurso.planoMinimo())) {
            throw new SecurityException("Este recurso exige o plano " + nomePlano(recurso.planoMinimo()) + ".");
        }
    }

    public boolean permite(Long organizacaoId, RecursoPlano recurso) {
        try {
            exigir(organizacaoId, recurso);
            return true;
        } catch (SecurityException exception) {
            return false;
        }
    }

    private int nivel(String plano) {
        if ("business".equals(plano)) return 3;
        if ("pro".equals(plano)) return 2;
        return 1;
    }

    private String nomePlano(String plano) {
        if ("business".equals(plano)) return "Business";
        if ("pro".equals(plano)) return "Pro";
        return "Free";
    }
}
