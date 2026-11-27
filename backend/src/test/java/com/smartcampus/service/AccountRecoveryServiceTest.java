package com.smartcampus.service;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.util.List;
import java.sql.ResultSet;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class AccountRecoveryServiceTest {
    @Mock JdbcTemplate jdbc;
    @Mock JavaMailSender mail;
    AccountRecoveryService service;

    @BeforeEach void setUp() {
        service = new AccountRecoveryService(jdbc, mail, "noreply@test.local", "http://frontend.test/");
    }

    @Test void emailChangeRejectsInvalidInputAndPassword() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.requestEmailChange(1L, new AccountRecoveryService.EmailChange("bad", "x"))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.requestEmailChange(1L, new AccountRecoveryService.EmailChange("new@test.local", ""))).getStatusCode());
        when(jdbc.query(contains("SELECT password_hash"), org.mockito.ArgumentMatchers.<RowMapper<String[]>>any(), eq(1L)))
                .thenReturn(java.util.Collections.singletonList(new String[] {new BCryptPasswordEncoder().encode("correct"), "old@test.local"}));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.requestEmailChange(1L, new AccountRecoveryService.EmailChange("new@test.local", "wrong"))).getStatusCode());
    }

    @Test void emailChangeRejectsSameOrTakenAddress() {
        when(jdbc.query(contains("SELECT password_hash"), org.mockito.ArgumentMatchers.<RowMapper<String[]>>any(), eq(1L)))
                .thenReturn(java.util.Collections.singletonList(new String[] {new BCryptPasswordEncoder().encode("correct"), "old@test.local"}));
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.requestEmailChange(1L, new AccountRecoveryService.EmailChange(" OLD@test.local ", "correct"))).getStatusCode());
        when(jdbc.queryForObject(contains("count(*) FROM users"), eq(Integer.class), eq("new@test.local"), eq(1L))).thenReturn(1);
        assertEquals(HttpStatus.CONFLICT, assertThrows(ResponseStatusException.class,
                () -> service.requestEmailChange(1L, new AccountRecoveryService.EmailChange("new@test.local", "correct"))).getStatusCode());
    }

    @Test void emailChangeSendsTokenToNormalizedAddress() {
        when(jdbc.query(contains("SELECT password_hash"), org.mockito.ArgumentMatchers.<RowMapper<String[]>>any(), eq(1L)))
                .thenReturn(java.util.Collections.singletonList(new String[] {new BCryptPasswordEncoder().encode("correct"), "old@test.local"}));
        service.requestEmailChange(1L, new AccountRecoveryService.EmailChange(" NEW@test.local ", "correct"));
        var sent = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(sent.capture());
        assertArrayEquals(new String[] {"new@test.local"}, sent.getValue().getTo());
        assertTrue(sent.getValue().getText().contains("http://frontend.test/verify-personal-email?token="));
        verify(jdbc).update(contains("INSERT INTO account_action_tokens"), eq(1L), eq("EMAIL_CHANGE"), eq("new@test.local"), anyString(), any());
    }

    @Test void resetRequestIsUniformAndRateLimited() {
        service.requestReset(new AccountRecoveryService.RecoveryRequest("invalid"));
        when(jdbc.query(contains("SELECT user_id FROM users"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq("found@test.local"))).thenReturn(List.of(4L));
        when(jdbc.queryForObject(contains("count(*) FROM account_action_tokens"), eq(Integer.class), eq(4L))).thenReturn(1);
        service.requestReset(new AccountRecoveryService.RecoveryRequest("found@test.local"));
        verifyNoInteractions(mail);
    }

    @Test void resetRequestSendsEmailWhenEligible() {
        when(jdbc.query(contains("SELECT user_id FROM users"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq("found@test.local"))).thenReturn(List.of(4L));
        service.requestReset(new AccountRecoveryService.RecoveryRequest(" FOUND@test.local "));
        verify(mail).send(any(SimpleMailMessage.class));
        verify(jdbc).update(contains("INSERT INTO account_action_tokens"), eq(4L), eq("PASSWORD_RESET"), isNull(), anyString(), any());
    }

    @Test void resetAndVerificationRejectInvalidTokens() {
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.resetPassword(new AccountRecoveryService.ResetRequest("token", "short"))).getStatusCode());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.resetPassword(new AccountRecoveryService.ResetRequest(" ", "longpassword"))).getStatusCode());
        when(jdbc.query(contains("FROM account_action_tokens"), org.mockito.ArgumentMatchers.<RowMapper<?>>any(), anyString(), eq("EMAIL_CHANGE"))).thenReturn(List.of());
        assertEquals(HttpStatus.BAD_REQUEST, assertThrows(ResponseStatusException.class,
                () -> service.verifyEmailChange(new AccountRecoveryService.TokenRequest("expired"))).getStatusCode());
    }

    @Test void resetTokenFromCapturedEmailChangesPasswordAndIsConsumed() throws Exception {
        when(jdbc.query(contains("SELECT user_id FROM users"), org.mockito.ArgumentMatchers.<RowMapper<Long>>any(), eq("found@test.local")))
                .thenReturn(List.of(4L));
        service.requestReset(new AccountRecoveryService.RecoveryRequest("found@test.local"));
        var sent = org.mockito.ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mail).send(sent.capture());
        String token = sent.getValue().getText().split("/reset-password\\?token=")[1].split("\\s")[0];
        ResultSet row = mock(ResultSet.class);
        when(row.getLong(1)).thenReturn(9L);
        when(row.getLong(2)).thenReturn(4L);
        when(jdbc.query(contains("FROM account_action_tokens"), org.mockito.ArgumentMatchers.<RowMapper<?>>any(), anyString(), eq("PASSWORD_RESET")))
                .thenAnswer(call -> List.of(call.<RowMapper<?>>getArgument(1).mapRow(row, 0)));
        service.resetPassword(new AccountRecoveryService.ResetRequest(token, "newpassword123"));
        verify(jdbc).update(contains("auth_version=auth_version+1"), anyString(), eq(4L));
        verify(jdbc).update(contains("UPDATE account_action_tokens SET used_at"), eq(4L));
    }
}
