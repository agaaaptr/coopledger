package com.coopledger.util;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;

/**
 * Flat-rate loan math (common in Indonesian koperasi):
 * total interest = principal * annualRate% * termMonths / 12.
 * The installment schedule guarantees sum(installments) == principal + totalInterest
 * by giving the remainder to the final installment.
 */
public final class LoanMath {

    private LoanMath() {}

    public static BigDecimal totalInterest(BigDecimal principal, BigDecimal annualRatePercent, int termMonths) {
        BigDecimal rate = annualRatePercent.divide(BigDecimal.valueOf(100), 10, RoundingMode.HALF_UP);
        BigDecimal years = BigDecimal.valueOf(termMonths).divide(BigDecimal.valueOf(12), 10, RoundingMode.HALF_UP);
        return Money.round(principal.multiply(rate).multiply(years));
    }

    public static List<BigDecimal> schedule(BigDecimal principal, BigDecimal totalInterest, int termMonths) {
        BigDecimal total = Money.round(principal.add(totalInterest));
        BigDecimal monthly = total.divide(BigDecimal.valueOf(termMonths), 2, RoundingMode.FLOOR);
        List<BigDecimal> amounts = new ArrayList<>(termMonths);
        BigDecimal sum = BigDecimal.ZERO;
        for (int i = 1; i < termMonths; i++) {
            amounts.add(monthly);
            sum = sum.add(monthly);
        }
        amounts.add(Money.round(total.subtract(sum))); // final installment absorbs the rounding remainder
        return amounts;
    }
}
