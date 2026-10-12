package br.com.nexo.auth;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AuthRateLimitFilterTest {
    @Test
    void limitaPorClienteSemBloquearOutroCliente() {
        var filtro = new AuthRateLimitFilter();
        for (int i = 0; i < 60; i++) assertTrue(filtro.permitir("cliente-a"));
        assertFalse(filtro.permitir("cliente-a"));
        assertTrue(filtro.permitir("cliente-b"));
    }
}
