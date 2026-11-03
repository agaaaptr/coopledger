package com.coopledger.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public record InstallmentDto(
        Long id,
        Integer installmentNumber,
        LocalDate dueDate,
        BigDecimal amount,
        BigDecimal paidAmount,
        String status,
        LocalDateTime paidAt
) {}
