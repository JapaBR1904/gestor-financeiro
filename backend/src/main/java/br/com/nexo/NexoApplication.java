package br.com.nexo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.mail.autoconfigure.MailSenderAutoConfiguration;
import org.springframework.boot.mail.autoconfigure.MailSenderValidatorAutoConfiguration;

// SMTP legado só é inicializado quando o provider smtp é selecionado explicitamente.
@SpringBootApplication(exclude = {MailSenderAutoConfiguration.class, MailSenderValidatorAutoConfiguration.class})
public class NexoApplication {

    public static void main(String[] args) {
        SpringApplication.run(NexoApplication.class, args);
    }
}
