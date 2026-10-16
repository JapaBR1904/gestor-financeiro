package br.com.nexo.validacao;

import java.math.BigDecimal;
import java.math.RoundingMode;

/** Entradas são estritas; somente resultados derivados são arredondados, por HALF_UP. */
public final class ValidacaoFinanceira {
    private ValidacaoFinanceira() {}
    public static void precisao(BigDecimal valor, int inteiros, int casas, String campo) {
        if (valor != null && (valor.scale() > casas || valor.abs().compareTo(BigDecimal.TEN.pow(inteiros).subtract(BigDecimal.ONE.movePointLeft(casas))) > 0))
            throw new DadosInvalidosException(campo, campo + ": use até " + inteiros + " dígitos inteiros e " + casas + " casas decimais.");
    }
    public static BigDecimal moeda(BigDecimal valor, String campo, boolean zero) {
        if (valor == null || (zero ? valor.signum() < 0 : valor.signum() <= 0))
            throw new DadosInvalidosException(campo, campo + (zero ? ": informe um valor não negativo." : ": informe um valor maior que zero."));
        precisao(valor, 12, 2, campo);
        return valor.setScale(2, RoundingMode.UNNECESSARY);
    }
    public static BigDecimal quantidade(BigDecimal valor, String campo) {
        if (valor == null || valor.signum() <= 0) throw new DadosInvalidosException(campo, campo + ": informe uma quantidade maior que zero.");
        precisao(valor, 10, 4, campo);
        return valor.setScale(4, RoundingMode.UNNECESSARY);
    }
    public static BigDecimal calculado(BigDecimal valor, String campo) {
        if (valor == null) return null;
        var arredondado = valor.setScale(2, RoundingMode.HALF_UP);
        precisao(arredondado, 12, 2, campo);
        return arredondado;
    }
}
