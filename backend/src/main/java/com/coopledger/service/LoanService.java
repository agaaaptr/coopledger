package com.coopledger.service;

import com.coopledger.domain.InstallmentStatus;
import com.coopledger.domain.LoanStatus;
import com.coopledger.domain.Role;
import com.coopledger.domain.TransactionType;
import com.coopledger.dto.*;
import com.coopledger.entity.Installment;
import com.coopledger.entity.Loan;
import com.coopledger.entity.Member;
import com.coopledger.entity.Transaction;
import com.coopledger.entity.User;
import com.coopledger.exception.BadRequestException;
import com.coopledger.exception.ResourceNotFoundException;
import com.coopledger.repository.InstallmentRepository;
import com.coopledger.repository.LoanRepository;
import com.coopledger.repository.MemberRepository;
import com.coopledger.repository.TransactionRepository;
import com.coopledger.security.CurrentUserService;
import com.coopledger.util.LoanMath;
import com.coopledger.util.Money;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class LoanService {

    private final LoanRepository loans;
    private final InstallmentRepository installments;
    private final MemberRepository members;
    private final TransactionRepository transactions;
    private final CurrentUserService currentUser;

    public LoanService(LoanRepository loans, InstallmentRepository installments, MemberRepository members,
                       TransactionRepository transactions, CurrentUserService currentUser) {
        this.loans = loans;
        this.installments = installments;
        this.members = members;
        this.transactions = transactions;
        this.currentUser = currentUser;
    }

    @Transactional
    public LoanDto apply(LoanCreateRequest request) {
        Long memberId = request.memberId();
        User user = currentUser.user();
        if (user.getRole() == Role.MEMBER) {
            if (user.getMemberId() == null) {
                throw new BadRequestException("Member user has no linked member record");
            }
            memberId = user.getMemberId(); // members can only apply for themselves
        }
        Member member = member(memberId);

        BigDecimal principal = Money.round(request.principal());
        BigDecimal totalInterest = LoanMath.totalInterest(principal, request.interestRate(), request.termMonths());
        BigDecimal monthly = LoanMath.schedule(principal, totalInterest, request.termMonths()).getFirst();

        Loan loan = loans.save(Loan.builder()
                .memberId(memberId)
                .principal(principal)
                .interestRate(request.interestRate())
                .termMonths(request.termMonths())
                .status(LoanStatus.APPLIED)
                .totalInterest(totalInterest)
                .monthlyInstallment(monthly)
                .appliedAt(LocalDateTime.now())
                .notes(request.notes())
                .build());
        return toDto(loan, member.getMemberNumber());
    }

    public List<LoanDto> list(Long memberId) {
        List<Loan> result = (memberId == null)
                ? loans.findAll()
                : loans.findByMemberIdOrderByIdDesc(memberId);
        return result.stream().map(l -> toDto(l, memberNumber(l.getMemberId()))).toList();
    }

    public List<LoanDto> listMine() {
        Long memberId = currentUser.user().getMemberId();
        if (memberId == null) {
            throw new BadRequestException("Current user is not linked to a member");
        }
        return list(memberId);
    }

    public LoanDetailDto get(Long id) {
        return detail(loan(id), installments.findByLoanIdOrderByInstallmentNumber(id));
    }

    public LoanDetailDto getMine(Long id) {
        Loan loan = loan(id);
        Long memberId = currentUser.user().getMemberId();
        if (memberId == null || !memberId.equals(loan.getMemberId())) {
            throw new BadRequestException("Loan does not belong to the current member");
        }
        return detail(loan, installments.findByLoanIdOrderByInstallmentNumber(id));
    }

    @Transactional
    public LoanDto approve(Long id) {
        Loan loan = loan(id);
        if (loan.getStatus() != LoanStatus.APPLIED) {
            throw new BadRequestException("Only APPLIED loans can be approved");
        }
        loan.setStatus(LoanStatus.APPROVED);
        loan.setApprovedAt(LocalDateTime.now());
        loan.setApprovedBy(currentUser.user().getId());
        loans.save(loan);
        return toDto(loan, memberNumber(loan.getMemberId()));
    }

    @Transactional
    public LoanDto reject(Long id) {
        Loan loan = loan(id);
        if (loan.getStatus() != LoanStatus.APPLIED) {
            throw new BadRequestException("Only APPLIED loans can be rejected");
        }
        loan.setStatus(LoanStatus.REJECTED);
        loans.save(loan);
        return toDto(loan, memberNumber(loan.getMemberId()));
    }

    @Transactional
    public LoanDetailDto disburse(Long id) {
        Loan loan = loan(id);
        if (loan.getStatus() != LoanStatus.APPROVED) {
            throw new BadRequestException("Only APPROVED loans can be disbursed");
        }
        List<BigDecimal> amounts = LoanMath.schedule(loan.getPrincipal(), loan.getTotalInterest(), loan.getTermMonths());
        LocalDate firstDue = LocalDate.now().withDayOfMonth(1).plusMonths(1);

        List<Installment> created = new ArrayList<>(amounts.size());
        for (int i = 0; i < amounts.size(); i++) {
            created.add(Installment.builder()
                    .loanId(loan.getId())
                    .installmentNumber(i + 1)
                    .dueDate(firstDue.plusMonths(i))
                    .amount(amounts.get(i))
                    .paidAmount(BigDecimal.ZERO)
                    .status(InstallmentStatus.PENDING)
                    .build());
        }
        installments.saveAll(created);

        loan.setStatus(LoanStatus.DISBURSED);
        loan.setDisbursedAt(LocalDateTime.now());
        loans.save(loan);

        transactions.save(Transaction.builder()
                .memberId(loan.getMemberId())
                .type(TransactionType.LOAN_DISBURSEMENT)
                .loanId(loan.getId())
                .amount(loan.getPrincipal())
                .note("Loan disbursement")
                .createdAt(LocalDateTime.now())
                .build());

        return detail(loan, created);
    }

    @Transactional
    public LoanDetailDto payInstallment(Long loanId, Integer installmentNumber, InstallmentPayRequest request) {
        Loan loan = loan(loanId);
        if (loan.getStatus() != LoanStatus.DISBURSED) {
            throw new BadRequestException("Loan is not in DISBURSED state");
        }
        List<Installment> all = installments.findByLoanIdOrderByInstallmentNumber(loanId);
        Installment target = all.stream()
                .filter(i -> i.getInstallmentNumber().equals(installmentNumber))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Installment " + installmentNumber));
        if (target.getStatus() == InstallmentStatus.PAID) {
            throw new BadRequestException("Installment already paid");
        }
        BigDecimal amount = Money.round(request.amount());
        if (amount.compareTo(target.getAmount()) > 0) {
            throw new BadRequestException("Payment exceeds installment amount of " + target.getAmount());
        }
        target.setPaidAmount(amount);
        target.setStatus(InstallmentStatus.PAID);
        target.setPaidAt(LocalDateTime.now());
        installments.save(target);

        transactions.save(Transaction.builder()
                .memberId(loan.getMemberId())
                .type(TransactionType.INSTALLMENT_PAYMENT)
                .loanId(loan.getId())
                .amount(amount)
                .note("Installment " + installmentNumber + " payment")
                .createdAt(LocalDateTime.now())
                .build());

        boolean allPaid = all.stream().allMatch(i -> i.getStatus() == InstallmentStatus.PAID);
        if (allPaid) {
            loan.setStatus(LoanStatus.COMPLETED);
            loans.save(loan);
        }
        return detail(loan, all);
    }

    private LoanDetailDto detail(Loan loan, List<Installment> installmentList) {
        List<InstallmentDto> dtos = installmentList.stream()
                .map(i -> new InstallmentDto(i.getId(), i.getInstallmentNumber(), i.getDueDate(),
                        i.getAmount(), i.getPaidAmount(), i.getStatus().name(), i.getPaidAt()))
                .toList();
        return new LoanDetailDto(toDto(loan, memberNumber(loan.getMemberId())), dtos);
    }

    private Loan loan(Long id) {
        return loans.findById(id).orElseThrow(() -> new ResourceNotFoundException("Loan " + id));
    }

    private Member member(Long id) {
        return members.findById(id).orElseThrow(() -> new ResourceNotFoundException("Member " + id));
    }

    private String memberNumber(Long memberId) {
        return member(memberId).getMemberNumber();
    }

    private static LoanDto toDto(Loan l, String memberNumber) {
        return new LoanDto(
                l.getId(), l.getMemberId(), memberNumber, l.getPrincipal(), l.getInterestRate(),
                l.getTermMonths(), l.getStatus().name(), l.getTotalInterest(), l.getMonthlyInstallment(),
                l.totalRepayment(), l.getAppliedAt(), l.getApprovedAt(), l.getDisbursedAt(), l.getNotes());
    }
}
