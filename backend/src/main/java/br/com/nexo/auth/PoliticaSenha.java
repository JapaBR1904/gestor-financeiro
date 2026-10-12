package br.com.nexo.auth;

import java.nio.charset.StandardCharsets;
import java.util.regex.Pattern;

public final class PoliticaSenha {
    private static final Pattern MAIUSCULA = Pattern.compile("\\p{Lu}");
    private static final Pattern MINUSCULA = Pattern.compile("\\p{Ll}");
    private static final Pattern NUMERO = Pattern.compile("\\p{Nd}");
    private static final Pattern ESPECIAL = Pattern.compile("[\\p{P}\\p{S}]");

    private PoliticaSenha() {}

    public static void validar(String senha, String confirmacao) {
        if (senha == null || senha.isBlank()) throw new IllegalArgumentException("Informe sua senha.");
        if (senha.codePointCount(0, senha.length()) < 16) {
            throw new IllegalArgumentException("A senha deve ter pelo menos 16 caracteres.");
        }
        if (!MAIUSCULA.matcher(senha).find()) throw new IllegalArgumentException("Inclua pelo menos uma letra maiúscula na senha.");
        if (!MINUSCULA.matcher(senha).find()) throw new IllegalArgumentException("Inclua pelo menos uma letra minúscula na senha.");
        if (!NUMERO.matcher(senha).find()) throw new IllegalArgumentException("Inclua pelo menos um número na senha.");
        if (!ESPECIAL.matcher(senha).find()) throw new IllegalArgumentException("Inclua pelo menos um caractere especial na senha.");
        // BCrypt admite até 72 bytes; caracteres Unicode podem ocupar mais de um byte.
        if (senha.getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("A senha ultrapassa o limite de 72 bytes. Use uma senha menor.");
        }
        if (confirmacao == null || confirmacao.isEmpty()) throw new IllegalArgumentException("Confirme sua senha.");
        if (!senha.equals(confirmacao)) throw new IllegalArgumentException("As senhas não coincidem.");
    }
}
