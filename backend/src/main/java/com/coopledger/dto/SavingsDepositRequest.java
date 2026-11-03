package com.coopledger.dto;

import com.coopledger.domain.SavingsType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record SavingsDepositRequest(
        @NotNull SavingsType type,
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount,
        String note
) {}
