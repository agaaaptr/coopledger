package com.coopledger.controller;

import com.coopledger.dto.InstallmentPayRequest;
import com.coopledger.dto.LoanCreateRequest;
import com.coopledger.dto.LoanDetailDto;
import com.coopledger.dto.LoanDto;
import com.coopledger.service.LoanService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/loans")
public class LoanController {

    private final LoanService loanService;

    public LoanController(LoanService loanService) {
        this.loanService = loanService;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','TELLER','MEMBER')")
    public LoanDto apply(@Valid @RequestBody LoanCreateRequest request) {
        return loanService.apply(request);
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public List<LoanDto> list(@RequestParam(required = false) Long memberId) {
        return loanService.list(memberId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public LoanDetailDto get(@PathVariable Long id) {
        return loanService.get(id);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public LoanDto approve(@PathVariable Long id) {
        return loanService.approve(id);
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public LoanDto reject(@PathVariable Long id) {
        return loanService.reject(id);
    }

    @PostMapping("/{id}/disburse")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public LoanDetailDto disburse(@PathVariable Long id) {
        return loanService.disburse(id);
    }

    @PostMapping("/{id}/installments/{installmentNumber}/pay")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public LoanDetailDto pay(@PathVariable Long id, @PathVariable Integer installmentNumber,
                             @Valid @RequestBody InstallmentPayRequest request) {
        return loanService.payInstallment(id, installmentNumber, request);
    }
}
