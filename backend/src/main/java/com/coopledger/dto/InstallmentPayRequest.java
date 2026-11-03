package com.coopledger.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record InstallmentPayRequest(
        @NotNull @DecimalMin(value = "0.01") BigDecimal amount
) {}
