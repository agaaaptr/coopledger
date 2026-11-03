package com.coopledger.dto;

import java.math.BigDecimal;

public record ShuMemberDto(
        Long memberId,
        String memberNumber,
        String fullName,
        BigDecimal totalSavings,
        BigDecimal share
) {}
