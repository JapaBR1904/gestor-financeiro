package br.com.nexo.financeiro;

import br.com.nexo.saas.AcessoPlanoService;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class CalendarioFinanceiroTest {
    @ParameterizedTest
    @CsvSource({
        "2026-10-15T01:30:00Z, UTC, 2026-10-14",
        "2026-10-15T01:30:00Z, Asia/Tokyo, 2026-10-14",
        "2026-10-15T01:30:00Z, America/Sao_Paulo, 2026-10-14",
        "2026-11-01T02:59:59Z, UTC, 2026-10-31",
        "2026-11-01T03:00:00Z, Asia/Tokyo, 2026-11-01",
        "2027-01-01T01:30:00Z, UTC, 2026-12-31"
    })
    void dataEPeriodoSeguemFusoDoDominioNaViradaDoDiaMesEAno(String instante,String zona,String dia) {
        var calendario=new CalendarioFinanceiro(Clock.fixed(Instant.parse(instante),ZoneId.of(zona)));
        var esperado=LocalDate.parse(dia);
        assertEquals(esperado,calendario.hoje());
        var service=new FinanceiroService(mock(JdbcTemplate.class),mock(AcessoPlanoService.class),calendario);
        assertEquals(esperado,service.periodo(null,null).fim());
        assertEquals(esperado.withDayOfMonth(1),service.periodo(null,null).inicio());
        assertEquals(esperado.minusDays(1),service.periodo(esperado.minusDays(2),esperado.minusDays(1)).fim());
    }
}
