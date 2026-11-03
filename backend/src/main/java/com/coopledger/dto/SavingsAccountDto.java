package com.coopledger.dto;

import com.coopledger.domain.SavingsType;

import java.math.BigDecimal;

public record SavingsAccountDto(
        SavingsType type,
        BigDecimal balance
) {}
