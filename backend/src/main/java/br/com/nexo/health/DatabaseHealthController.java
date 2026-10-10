package br.com.nexo.health;

import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health/database")
public class DatabaseHealthController {

    private final JdbcTemplate jdbcTemplate;

    public DatabaseHealthController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public Map<String, Object> database() {
        return jdbcTemplate.queryForObject(
                "SELECT current_database() AS banco, current_user AS usuario",
                (resultado, linha) -> Map.of(
                        "status", "ok",
                        "banco", resultado.getString("banco"),
                        "usuario", resultado.getString("usuario")
                )
        );
    }
}
