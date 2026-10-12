package br.com.nexo.email;

public record EmailMensagem(String destinatario, String assunto, String html, String texto) {
    // O toString padrão de um record exporia destinatário e código em diagnósticos acidentais.
    @Override public String toString() { return "EmailMensagem[conteudo protegido]"; }
}
