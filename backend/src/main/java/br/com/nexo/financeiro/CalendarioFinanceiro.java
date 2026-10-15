package br.com.nexo.financeiro;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import org.springframework.stereotype.Component;

/** O dia financeiro segue São Paulo, independentemente do fuso da JVM. */
@Component
public class CalendarioFinanceiro {
    public static final ZoneId ZONA = ZoneId.of("America/Sao_Paulo");
    private final Clock relogio;
    public CalendarioFinanceiro() { this(Clock.systemUTC()); }
    public CalendarioFinanceiro(Clock relogio) { this.relogio = relogio; }
    public LocalDate hoje() { return LocalDate.now(relogio.withZone(ZONA)); }
}
