package com.coopledger.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record LoanCreateRequest(
        @NotNull Long memberId,
        @NotNull @DecimalMin(value = "0.01") BigDecimal principal,
        @NotNull @DecimalMin(value = "0.00") BigDecimal interestRate,
        @NotNull @Min(1) Integer termMonths,
        String notes
) {}
