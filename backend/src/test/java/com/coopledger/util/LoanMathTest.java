package com.coopledger.util;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class LoanMathTest {

    @Test
    void scheduleSumsExactlyToPrincipalPlusInterest() {
        BigDecimal principal = new BigDecimal("10000000.00");
        BigDecimal rate = new BigDecimal("12");
        int term = 12;
        BigDecimal totalInterest = LoanMath.totalInterest(principal, rate, term);

        List<BigDecimal> amounts = LoanMath.schedule(principal, totalInterest, term);
        BigDecimal sum = amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        assertEquals(term, amounts.size());
        assertEquals(0, Money.round(principal.add(totalInterest)).compareTo(Money.round(sum)),
                "sum(installments) must equal principal + total interest");
        assertTrue(amounts.stream().allMatch(a -> a.compareTo(BigDecimal.ZERO) >= 0),
                "installment amounts must never be negative");
    }

    @Test
    void flatInterestIsPrincipalTimesRateTimesTermOverTwelve() {
        BigDecimal interest = LoanMath.totalInterest(new BigDecimal("12000000.00"), new BigDecimal("6"), 12);
        assertEquals(0, new BigDecimal("720000.00").compareTo(interest));
    }
}
