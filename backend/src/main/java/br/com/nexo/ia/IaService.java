package br.com.nexo.ia;

import java.util.List;
import java.util.Map;

import br.com.nexo.saas.AcessoPlanoService;
import br.com.nexo.saas.RecursoPlano;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class IaService {
    private static final String MODELO = "gemini-3.8-flash";
    private static final String URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

    private final AcessoPlanoService acessoPlanoService;
    private final RestClient restClient;

    public IaService(AcessoPlanoService acessoPlanoService) {
        this.acessoPlanoService = acessoPlanoService;
        this.restClient = RestClient.create();
    }

    public RespostaIa perguntar(Long organizacaoId, String pergunta) {
        acessoPlanoService.exigir(organizacaoId, RecursoPlano.IA_BASICA);

        String chave = System.getenv("GEMINI_API_KEY");
        if (chave == null || chave.isBlank()) {
            throw new IllegalStateException("A inteligência do Nexo não está configurada no servidor.");
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

        Map<String, Object> corpo = Map.of("model", MODELO, "input", instrucao);

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
            if (respostaTexto.isBlank()) throw new IllegalStateException("A IA respondeu sem conteúdo. Tente novamente.");
            return new RespostaIa(respostaTexto, "nexo-ia");
        } catch (RestClientResponseException e) {
            if (e.getStatusCode().value() == 429) {
                throw new IllegalStateException("O limite temporário da inteligência foi atingido. Tente novamente mais tarde.");
            }
            if (e.getStatusCode().value() == 401 || e.getStatusCode().value() == 403) {
                throw new IllegalStateException("A inteligência do Nexo não está disponível agora.");
            }
            throw new IllegalStateException("Não foi possível consultar a inteligência do Nexo agora.");
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
            if (!(item instanceof Map<?, ?> step) || !"model_output".equals(step.get("type"))) continue;
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

    public record RespostaIa(String resposta, String modelo) {}
}
