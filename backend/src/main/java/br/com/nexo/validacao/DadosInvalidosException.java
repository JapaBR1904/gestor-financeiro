package br.com.nexo.validacao;

public class DadosInvalidosException extends IllegalArgumentException {
    private final String campo;
    public DadosInvalidosException(String campo, String mensagem) { super(mensagem); this.campo = campo; }
    public String campo() { return campo; }
}
