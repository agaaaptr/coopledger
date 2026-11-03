package com.coopledger.loan;

import com.coopledger.domain.Role;
import com.coopledger.dto.InstallmentDto;
import com.coopledger.dto.InstallmentPayRequest;
import com.coopledger.dto.LoanCreateRequest;
import com.coopledger.dto.LoanDetailDto;
import com.coopledger.dto.LoanDto;
import com.coopledger.dto.MemberCreateRequest;
import com.coopledger.dto.MemberDto;
import com.coopledger.entity.User;
import com.coopledger.repository.UserRepository;
import com.coopledger.service.LoanService;
import com.coopledger.service.MemberService;
import com.coopledger.util.LoanMath;
import com.coopledger.util.Money;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class LoanFlowIntegrationTest {

    @Autowired
    LoanService loanService;

    @Autowired
    MemberService memberService;

    @Autowired
    UserRepository users;

    @BeforeEach
    void authenticateAsAdmin() {
        if (!users.existsByUsername("testadmin")) {
            users.save(User.builder()
                    .username("testadmin")
                    .passwordHash("x")
                    .fullName("Test Admin")
                    .role(Role.ADMIN)
                    .enabled(true)
                    .createdAt(LocalDateTime.now())
                    .build());
        }
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("testadmin", null,
                        List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))));
    }

    @Test
    void disbursedInstallmentsSumToPrincipalPlusInterest() {
        MemberDto member = memberService.create(new MemberCreateRequest(
                "Test Member", null, null, null, null, null, null, null));
        BigDecimal principal = new BigDecimal("1000000.00");
        BigDecimal rate = new BigDecimal("12");
        int term = 12;

        LoanDto applied = loanService.apply(new LoanCreateRequest(member.id(), principal, rate, term, null));
        loanService.approve(applied.id());
        LoanDetailDto disbursed = loanService.disburse(applied.id());

        BigDecimal sum = disbursed.installments().stream()
                .map(InstallmentDto::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal expected = Money.round(principal.add(LoanMath.totalInterest(principal, rate, term)));

        assertEquals(0, expected.compareTo(Money.round(sum)),
                "sum(installments) must equal principal + total interest");
        assertEquals(term, disbursed.installments().size());
    }

    @Test
    void payingAllInstallmentsCompletesTheLoan() {
        MemberDto member = memberService.create(new MemberCreateRequest(
                "Test Member 2", null, null, null, null, null, null, null));
        LoanDto applied = loanService.apply(new LoanCreateRequest(
                member.id(), new BigDecimal("500000.00"), new BigDecimal("10"), 6, null));
        loanService.approve(applied.id());
        LoanDetailDto disbursed = loanService.disburse(applied.id());

        for (InstallmentDto installment : disbursed.installments()) {
            loanService.payInstallment(applied.id(), installment.installmentNumber(),
                    new InstallmentPayRequest(installment.amount()));
        }

        LoanDetailDto completed = loanService.get(applied.id());
        assertEquals("COMPLETED", completed.loan().status());
    }
}
