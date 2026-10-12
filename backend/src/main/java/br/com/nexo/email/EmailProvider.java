package br.com.nexo.email;

/** Transporte de e-mail; não conhece contas, códigos, transações ou regras de autenticação. */
public interface EmailProvider {
    String enviar(EmailMensagem mensagem);
}
