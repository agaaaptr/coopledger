package com.coopledger.controller;

import com.coopledger.dto.SavingsDepositRequest;
import com.coopledger.dto.SavingsSummaryDto;
import com.coopledger.dto.TransactionDto;
import com.coopledger.service.SavingsService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members/{memberId}")
public class SavingsController {

    private final SavingsService savingsService;

    public SavingsController(SavingsService savingsService) {
        this.savingsService = savingsService;
    }

    @GetMapping("/savings")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public SavingsSummaryDto summary(@PathVariable Long memberId) {
        return savingsService.summary(memberId);
    }

    @PostMapping("/savings/deposit")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public SavingsSummaryDto deposit(@PathVariable Long memberId, @Valid @RequestBody SavingsDepositRequest request) {
        return savingsService.deposit(memberId, request);
    }

    @GetMapping("/transactions")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public List<TransactionDto> transactions(@PathVariable Long memberId) {
        return savingsService.transactions(memberId);
    }
}
