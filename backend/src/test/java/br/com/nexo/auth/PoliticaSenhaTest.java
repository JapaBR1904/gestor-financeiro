package br.com.nexo.auth;

import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import static org.junit.jupiter.api.Assertions.*;

class PoliticaSenhaTest {
    @ParameterizedTest(name = "{0}")
    @MethodSource("senhasInvalidas")
    void rejeitaCadaRequisitoSemExporSenha(String caso, String senha, String mensagem) {
        var erro = assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar(senha, senha));
        assertEquals(mensagem, erro.getMessage());
        if (senha != null && !senha.isBlank()) assertFalse(erro.getMessage().contains(senha));
    }

    static Stream<Arguments> senhasInvalidas() {
        return Stream.of(
                Arguments.of("senha ausente", null, "Informe sua senha."),
                Arguments.of("senha vazia", "", "Informe sua senha."),
                Arguments.of("menos de 16 caracteres", "Abcdefg1!", "A senha deve ter pelo menos 16 caracteres."),
                Arguments.of("sem maiúscula", "abcdefghijklmn1!", "Inclua pelo menos uma letra maiúscula na senha."),
                Arguments.of("sem minúscula", "ABCDEFGHIJKLMN1!", "Inclua pelo menos uma letra minúscula na senha."),
                Arguments.of("sem número", "Abcdefghijklmno!", "Inclua pelo menos um número na senha."),
                Arguments.of("sem especial", "Abcdefghijklmn12", "Inclua pelo menos um caractere especial na senha."),
                Arguments.of("espaço não é especial", "Abcdefghijklm1  ", "Inclua pelo menos um caractere especial na senha."),
                Arguments.of("73 bytes", "Aa1!" + "a".repeat(69), "A senha ultrapassa o limite de 72 bytes. Use uma senha menor."),
                Arguments.of("Unicode acima de 72 bytes", "Aa1!" + "😀".repeat(18), "A senha ultrapassa o limite de 72 bytes. Use uma senha menor."),
                Arguments.of("Unicode conta como um caractere", "Aa1!" + "😀".repeat(11), "A senha deve ter pelo menos 16 caracteres.")
        );
    }

    @Test
    void aceitaSenhaCompletaELimiteDoBCryptSemTruncar() {
        for (String senha : new String[]{"Senha-Forte-Teste123!", "Aa1!" + "a".repeat(68), "Á" + "é".repeat(13) + "1!", "Aa1!" + "😀".repeat(12)}) {
            assertDoesNotThrow(() -> PoliticaSenha.validar(senha, senha));
        }
    }

    @Test
    void exigeConfirmacaoIgualSemExporValores() {
        String senha = "Senha-Forte-Teste123!";
        assertEquals("Confirme sua senha.", assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar(senha, "")).getMessage());
        assertEquals("Confirme sua senha.", assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar(senha, null)).getMessage());
        assertEquals("As senhas não coincidem.", assertThrows(IllegalArgumentException.class, () -> PoliticaSenha.validar(senha, "Outra-Senha-Teste456!")).getMessage());
    }
}
