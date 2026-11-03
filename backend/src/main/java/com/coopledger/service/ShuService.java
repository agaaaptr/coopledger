package com.coopledger.service;

import com.coopledger.dto.ShuMemberDto;
import com.coopledger.dto.ShuReportDto;
import com.coopledger.entity.Member;
import com.coopledger.entity.SavingsAccount;
import com.coopledger.repository.MemberRepository;
import com.coopledger.repository.SavingsAccountRepository;
import com.coopledger.util.Money;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * MVP SHU (sisa hasil usaha): surplus pool distributed proportionally to each member's total savings.
 * Real cooperative accounting (SAK ETAP/EP) is on the roadmap.
 */
@Service
public class ShuService {

    private final MemberRepository members;
    private final SavingsAccountRepository savings;

    public ShuService(MemberRepository members, SavingsAccountRepository savings) {
        this.members = members;
        this.savings = savings;
    }

    public ShuReportDto compute(Integer year, BigDecimal pool) {
        BigDecimal surplus = Money.round(pool);
        List<Member> active = members.findAll().stream()
                .filter(m -> "ACTIVE".equals(m.getStatus()))
                .toList();

        Map<Long, BigDecimal> totals = new HashMap<>();
        for (Member m : active) {
            BigDecimal total = savings.findByMemberIdOrderByType(m.getId()).stream()
                    .map(SavingsAccount::getBalance)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            totals.put(m.getId(), Money.round(total));
        }
        BigDecimal grandTotal = totals.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean hasSavings = grandTotal.compareTo(BigDecimal.ZERO) > 0;
        List<ShuMemberDto> rows = active.stream().map(m -> {
            BigDecimal total = totals.get(m.getId());
            BigDecimal share = hasSavings
                    ? Money.round(surplus.multiply(total).divide(grandTotal, 10, RoundingMode.HALF_UP))
                    : BigDecimal.ZERO;
            return new ShuMemberDto(m.getId(), m.getMemberNumber(), m.getFullName(), total, share);
        }).toList();

        return new ShuReportDto(year, surplus, Money.round(grandTotal), rows.size(), rows);
    }
}
