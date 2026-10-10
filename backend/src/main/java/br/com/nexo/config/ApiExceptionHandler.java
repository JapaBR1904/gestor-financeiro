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

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> tratarRegra(IllegalArgumentException exception) {
        return ResponseEntity.badRequest().body(Map.of(
                "erro", "dados_invalidos",
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
}
