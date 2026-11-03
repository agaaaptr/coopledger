package com.coopledger.dto;

import java.math.BigDecimal;
import java.util.List;

public record ShuReportDto(
        Integer year,
        BigDecimal pool,
        BigDecimal totalSavings,
        int memberCount,
        List<ShuMemberDto> members
) {}
