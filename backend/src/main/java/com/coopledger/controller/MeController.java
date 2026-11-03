package com.coopledger.controller;

import com.coopledger.dto.LoanDetailDto;
import com.coopledger.dto.LoanDto;
import com.coopledger.dto.MemberDto;
import com.coopledger.dto.SavingsSummaryDto;
import com.coopledger.dto.TransactionDto;
import com.coopledger.exception.BadRequestException;
import com.coopledger.security.CurrentUserService;
import com.coopledger.service.LoanService;
import com.coopledger.service.MemberService;
import com.coopledger.service.SavingsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/me")
@PreAuthorize("hasRole('MEMBER')")
public class MeController {

    private final MemberService memberService;
    private final SavingsService savingsService;
    private final LoanService loanService;
    private final CurrentUserService currentUser;

    public MeController(MemberService memberService, SavingsService savingsService,
                        LoanService loanService, CurrentUserService currentUser) {
        this.memberService = memberService;
        this.savingsService = savingsService;
        this.loanService = loanService;
        this.currentUser = currentUser;
    }

    @GetMapping("/member")
    public MemberDto member() {
        return memberService.getCurrent();
    }

    @GetMapping("/savings")
    public SavingsSummaryDto savings() {
        return savingsService.summary(memberId());
    }

    @GetMapping("/transactions")
    public List<TransactionDto> transactions() {
        return savingsService.transactions(memberId());
    }

    @GetMapping("/loans")
    public List<LoanDto> loans() {
        return loanService.listMine();
    }

    @GetMapping("/loans/{id}")
    public LoanDetailDto loan(@PathVariable Long id) {
        return loanService.getMine(id);
    }

    private Long memberId() {
        Long memberId = currentUser.user().getMemberId();
        if (memberId == null) {
            throw new BadRequestException("Current user is not linked to a member");
        }
        return memberId;
    }
}
