package com.example.socialservice.service.impl;

import com.example.socialservice.service.OtpMailService;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.nio.charset.StandardCharsets;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Slf4j
public class OtpMailServiceImpl implements OtpMailService {

    final JavaMailSender mailSender;
    final TemplateEngine templateEngine;

    @Value("${app.mail.from}")
    String from;

    @Value("${app.mail.from-name:VNLaw OTP}")
    String fromName;

    @Value("${app.otp.ttl-seconds:600}")
    int ttlSeconds;

    @Async
    @Override
    public void sendRegisterOtp(String email, String otp) {
        sendOtpEmail(email, otp, "Xác thực tài khoản VNLaw", "Đăng ký tài khoản");
    }

    @Async
    @Override
    public void sendResetOtp(String email, String otp) {
        sendOtpEmail(email, otp, "Phiên quên mật khẩu VNLaw", "Khôi phục tài khoản");
    }

    private void sendOtpEmail(String email, String otp, String subject, String purpose) {
        try {
            Context context = new Context();
            context.setVariable("otp", otp);
            context.setVariable("purpose", purpose);
            context.setVariable("ttlMinutes", Math.max(1, (ttlSeconds + 59) / 60));
            context.setVariable("supportEmail", from);

            String htmlContent = templateEngine.process("email/otp", context);
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            InternetAddress fromAddress = new InternetAddress(from, fromName, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(email);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("OTP email sent to {} for {}", email, purpose);
        } catch (Exception ex) {
            log.error("Unable to send OTP email to {}: {}", email, ex.getMessage(), ex);
        }
    }
}
