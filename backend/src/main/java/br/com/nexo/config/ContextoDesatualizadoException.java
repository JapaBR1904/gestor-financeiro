package br.com.nexo.config;

public class ContextoDesatualizadoException extends RuntimeException {
    public ContextoDesatualizadoException() {
        super("O espaço mudou. Atualize a tela e revise os dados antes de tentar novamente.");
    }
}
