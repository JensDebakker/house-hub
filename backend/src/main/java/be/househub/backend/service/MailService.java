package be.househub.backend.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    private final String frontendUrl;

    public MailService(JavaMailSender mailSender,
                        @Value("${app.mail.from}") String fromAddress,
                        @Value("${app.frontend-url}") String frontendUrl) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.frontendUrl = frontendUrl;
    }

    public void sendVerificationEmail(String toEmail, String token) {
        String link = frontendUrl + "/verify-email?token=" + token;
        String body = "Welcome to House Hub!\n\n"
                + "Verify your email by opening this link:\n" + link + "\n\n"
                + "This link expires in 24 hours.";
        send(toEmail, "Verify your House Hub account", body, link);
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
        String link = frontendUrl + "/reset-password?token=" + token;
        String body = "A password reset was requested for your House Hub account.\n\n"
                + "Reset your password by opening this link:\n" + link + "\n\n"
                + "This link expires in 1 hour. If you didn't request this, you can ignore this email.";
        send(toEmail, "Reset your House Hub password", body, link);
    }

    private void send(String toEmail, String subject, String body, String link) {
        log.info("Email link for {} ({}): {}", toEmail, subject, link);

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(toEmail);
        message.setSubject(subject);
        message.setText(body);

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.warn("Failed to send email to {} ({}). Use the logged link above instead while SMTP is unconfigured.",
                    toEmail, subject, ex);
        }
    }
}
