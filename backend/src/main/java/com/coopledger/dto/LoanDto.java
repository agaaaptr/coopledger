package com.coopledger.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record LoanDto(
        Long id,
        Long memberId,
        String memberNumber,
        BigDecimal principal,
        BigDecimal interestRate,
        Integer termMonths,
        String status,
        BigDecimal totalInterest,
        BigDecimal monthlyInstallment,
        BigDecimal totalRepayment,
        LocalDateTime appliedAt,
        LocalDateTime approvedAt,
        LocalDateTime disbursedAt,
        String notes
) {}
