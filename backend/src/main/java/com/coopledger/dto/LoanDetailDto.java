package com.coopledger.dto;

import java.util.List;

public record LoanDetailDto(
        LoanDto loan,
        List<InstallmentDto> installments
) {}
