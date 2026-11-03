package com.coopledger.dto;

import java.math.BigDecimal;
import java.util.List;

public record SavingsSummaryDto(
        Long memberId,
        String memberNumber,
        List<SavingsAccountDto> accounts,
        BigDecimal total
) {}
