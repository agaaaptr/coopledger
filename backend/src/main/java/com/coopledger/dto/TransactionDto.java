package com.coopledger.dto;

import com.coopledger.domain.SavingsType;
import com.coopledger.domain.TransactionType;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TransactionDto(
        Long id,
        TransactionType type,
        SavingsType savingsType,
        Long loanId,
        BigDecimal amount,
        String note,
        LocalDateTime createdAt
) {}
