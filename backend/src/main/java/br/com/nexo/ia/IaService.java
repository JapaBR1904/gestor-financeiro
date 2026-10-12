package br.com.nexo.ia;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class IaService {
    private static final String MODELO = "gemini-3.8-flash";
    private static final String URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

    private final JdbcTemplate jdbcTemplate;
    private final RestClient restClient;

    public IaService(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
        this.restClient = RestClient.create();
    }

    public RespostaIa perguntar(Long organizacaoId, String pergunta) {
        garantirPlanoPro(organizacaoId);

        String chave = System.getenv("GEMINI_API_KEY");
        if (chave == null || chave.isBlank()) {
            throw new IllegalStateException("A variável GEMINI_API_KEY não está configurada no servidor.");
        }

        String texto = normalizarPergunta(pergunta);
        String instrucao = """
                Você é a inteligência operacional do Nexo, um sistema de gestão financeira para pequenos negócios.
                Responda em português do Brasil, de forma prática, curta e clara.
                Seu papel é ajudar com cálculos, planejamento, precificação, custos, margem, ponto de equilíbrio e decisões operacionais.
                Quando faltar algum dado necessário para um cálculo, diga exatamente qual dado falta em vez de inventar números.
                Não afirme que consultou preços, tarifas, leis ou informações atuais da internet, porque esta integração ainda não possui busca externa habilitada.
                Quando fizer estimativas, mostre as premissas usadas.
                Não dê respostas excessivamente longas.

                Solicitação do usuário:
                """ + texto;

        Map<String, Object> corpo = Map.of(
                "model", MODELO,
                "input", instrucao
        );

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> resposta = restClient.post()
                    .uri(URL)
                    .header("x-goog-api-key", chave)
                    .header("Content-Type", "application/json")
                    .body(corpo)
                    .retrieve()
                    .body(Map.class);

            String respostaTexto = extrairTexto(resposta);
            if (respostaTexto.isBlank()) {
                throw new IllegalStateException("A IA respondeu sem conteúdo. Tente novamente.");
            }

            return new RespostaIa(respostaTexto, MODELO);
        } catch (RestClientResponseException e) {
            String detalhe = e.getResponseBodyAsString();
            if (e.getStatusCode().value() == 429) {
                throw new IllegalStateException("O limite gratuito da IA foi atingido. Tente novamente mais tarde.");
            }
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new IllegalStateException("A chave do Gemini não foi aceita. Confira a GEMINI_API_KEY no servidor.");
            }
            throw new IllegalStateException("Não foi possível consultar a IA agora. Código " + e.getStatusCode().value() + ". " + resumirDetalhe(detalhe));
        }
    }

    private void garantirPlanoPro(Long organizacaoId) {
        String plano = jdbcTemplate.queryForObject("""
                SELECT plano
                FROM assinaturas
                WHERE organizacao_id = ?
                """, String.class, organizacaoId);

        if (!"pro".equals(plano) && !"business".equals(plano)) {
            throw new IllegalArgumentException("Este recurso exige o plano Pro ou Business.");
        }
    }

    private String normalizarPergunta(String pergunta) {
        String valor = pergunta == null ? "" : pergunta.trim();
        if (valor.isBlank()) throw new IllegalArgumentException("Escreva o que você quer calcular ou entender.");
        if (valor.length() > 3000) throw new IllegalArgumentException("A solicitação está muito longa.");
        return valor;
    }

    private String extrairTexto(Map<String, Object> resposta) {
        if (resposta == null) return "";

        Object outputText = resposta.get("output_text");
        if (outputText instanceof String texto && !texto.isBlank()) return texto.trim();

        Object steps = resposta.get("steps");
        if (!(steps instanceof List<?> lista)) return "";

        StringBuilder resultado = new StringBuilder();
        for (Object item : lista) {
            if (!(item instanceof Map<?, ?> step)) continue;
            if (!"model_output".equals(step.get("type"))) continue;
            Object content = step.get("content");
            if (!(content instanceof List<?> blocos)) continue;
            for (Object blocoItem : blocos) {
                if (!(blocoItem instanceof Map<?, ?> bloco)) continue;
                Object texto = bloco.get("text");
                if (texto instanceof String valor && !valor.isBlank()) {
                    if (!resultado.isEmpty()) resultado.append("\n\n");
                    resultado.append(valor.trim());
                }
            }
        }
        return resultado.toString();
    }

    private String resumirDetalhe(String detalhe) {
        if (detalhe == null || detalhe.isBlank()) return "";
        String limpo = detalhe.replaceAll("\\s+", " ").trim();
        return limpo.length() > 240 ? limpo.substring(0, 240) + "…" : limpo;
    }

    public record RespostaIa(String resposta, String modelo) {}
}
