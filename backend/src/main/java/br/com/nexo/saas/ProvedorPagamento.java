package br.com.nexo.saas;

import java.math.BigDecimal;
import java.util.UUID;

public interface ProvedorPagamento {
    Resultado processar(UUID checkoutId, BigDecimal valor, Metodo metodo, Cenario cenario);
    enum Metodo { cartao, pix, boleto }
    enum Cenario { aprovado, recusado, erro }
    enum Resultado { aprovado, recusado }
}
