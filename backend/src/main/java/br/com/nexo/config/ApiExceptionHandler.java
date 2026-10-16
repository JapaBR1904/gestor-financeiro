package br.com.nexo.config;

import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(ConflitoOperacaoException.class)
    public ResponseEntity<Map<String, Object>> tratarConflito(ConflitoOperacaoException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("erro", "idempotencia_conflitante", "mensagem", e.getMessage()));
    }

    @ExceptionHandler(br.com.nexo.validacao.DadosInvalidosException.class)
    public ResponseEntity<Map<String, Object>> tratarCampo(br.com.nexo.validacao.DadosInvalidosException e) {
        return ResponseEntity.badRequest().body(Map.of("erro", "validacao", "mensagem", "Confira os campos enviados.", "campos", Map.of(e.campo(), e.getMessage())));
    }


    @ExceptionHandler(ContextoDesatualizadoException.class)
    public ResponseEntity<Map<String, Object>> tratarContexto(ContextoDesatualizadoException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                "erro", "contexto_desatualizado", "mensagem", exception.getMessage()));
    }

    @ExceptionHandler(AutenticacaoException.class)
    public ResponseEntity<Map<String, Object>> tratarAutenticacao(AutenticacaoException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of(
                "erro", "nao_autenticado",
                "mensagem", exception.getMessage()
        ));
    }

    @ExceptionHandler(AcessoNegadoException.class)
    public ResponseEntity<Map<String, Object>> tratarAcesso(AcessoNegadoException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(
                "erro", "acesso_negado",
                "mensagem", exception.getMessage()
        ));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> tratarRegra(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "erro", "dados_invalidos",
                "mensagem", exception.getMessage()
        ));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> tratarEstado(IllegalStateException exception) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(Map.of(
                "erro", "servico_indisponivel",
                "mensagem", exception.getMessage()
        ));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> tratarValidacao(MethodArgumentNotValidException exception) {
        Map<String, String> campos = new LinkedHashMap<>();

        exception.getBindingResult().getFieldErrors().forEach(erro ->
                campos.putIfAbsent(erro.getField(), erro.getDefaultMessage())
        );

        Map<String, Object> corpo = new LinkedHashMap<>();
        corpo.put("erro", "validacao");
        corpo.put("mensagem", "Confira os campos enviados.");
        corpo.put("campos", campos);

        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(corpo);
    }

    @ExceptionHandler({org.springframework.http.converter.HttpMessageNotReadableException.class,
            org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingRequestHeaderException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class})
    public ResponseEntity<Map<String, Object>> tratarFormato(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("erro", "dados_invalidos", "mensagem", "Confira os campos enviados."));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> tratarInesperado(Exception exception) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                "erro", "erro_interno",
                "mensagem", "Não foi possível concluir a operação agora."
        ));
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<Map<String,Object>> tratarArquivoGrande(Exception exception) {
        return ResponseEntity.badRequest().body(Map.of("erro","arquivo_grande","mensagem","O limite por arquivo é 5 MB."));
    }
}
