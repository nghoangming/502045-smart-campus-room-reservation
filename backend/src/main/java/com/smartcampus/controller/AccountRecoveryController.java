package com.smartcampus.controller;

import com.smartcampus.service.AccountRecoveryService;
import com.smartcampus.service.AccountRecoveryService.EmailChange;
import com.smartcampus.service.AccountRecoveryService.RecoveryRequest;
import com.smartcampus.service.AccountRecoveryService.ResetRequest;
import com.smartcampus.service.AccountRecoveryService.TokenRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AccountRecoveryController {
    private final AccountRecoveryService service;
    public AccountRecoveryController(AccountRecoveryService service) { this.service = service; }

    @PostMapping("/users/me/personal-email-change")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void requestEmailChange(@RequestAttribute("authenticatedUserId") Long userId,
            @RequestBody EmailChange request) { service.requestEmailChange(userId, request); }

    @PostMapping("/auth/verify-personal-email")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void verifyEmail(@RequestBody TokenRequest request) { service.verifyEmailChange(request); }

    @PostMapping("/auth/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@RequestBody RecoveryRequest request) { service.requestReset(request); }

    @PostMapping("/auth/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@RequestBody ResetRequest request) { service.resetPassword(request); }
}
