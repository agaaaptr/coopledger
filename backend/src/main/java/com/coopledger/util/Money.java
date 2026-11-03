package com.coopledger.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {

    private Money() {}

    /** Round to 2 decimal places (HALF_UP) — the only scale used on any money path. */
    public static BigDecimal round(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }
}
