package com.coopledger.service;

import com.coopledger.domain.SavingsType;
import com.coopledger.domain.TransactionType;
import com.coopledger.dto.SavingsAccountDto;
import com.coopledger.dto.SavingsDepositRequest;
import com.coopledger.dto.SavingsSummaryDto;
import com.coopledger.dto.TransactionDto;
import com.coopledger.entity.Member;
import com.coopledger.entity.SavingsAccount;
import com.coopledger.entity.Transaction;
import com.coopledger.exception.BadRequestException;
import com.coopledger.exception.ResourceNotFoundException;
import com.coopledger.repository.MemberRepository;
import com.coopledger.repository.SavingsAccountRepository;
import com.coopledger.repository.TransactionRepository;
import com.coopledger.util.Money;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class SavingsService {

    private final SavingsAccountRepository savings;
    private final TransactionRepository transactions;
    private final MemberRepository members;

    public SavingsService(SavingsAccountRepository savings, TransactionRepository transactions, MemberRepository members) {
        this.savings = savings;
        this.transactions = transactions;
        this.members = members;
    }

    public SavingsSummaryDto summary(Long memberId) {
        Member member = member(memberId);
        return buildSummary(member);
    }

    @Transactional
    public SavingsSummaryDto deposit(Long memberId, SavingsDepositRequest request) {
        Member member = member(memberId);
        SavingsAccount account = savings.findByMemberIdAndType(memberId, request.type())
                .orElseThrow(() -> new BadRequestException("No savings account of type " + request.type()));
        BigDecimal amount = Money.round(request.amount());
        account.setBalance(Money.round(account.getBalance().add(amount)));
        account.setUpdatedAt(LocalDateTime.now());
        savings.save(account);

        transactions.save(Transaction.builder()
                .memberId(memberId)
                .type(TransactionType.DEPOSIT)
                .savingsType(request.type())
                .amount(amount)
                .note(request.note())
                .createdAt(LocalDateTime.now())
                .build());
        return buildSummary(member);
    }

    public List<TransactionDto> transactions(Long memberId) {
        member(memberId);
        return transactions.findByMemberIdOrderByCreatedAtDesc(memberId).stream()
                .map(SavingsService::toTransactionDto)
                .toList();
    }

    private SavingsSummaryDto buildSummary(Member member) {
        List<SavingsAccount> accounts = savings.findByMemberIdOrderByType(member.getId());
        List<SavingsAccountDto> dtos = accounts.stream()
                .map(a -> new SavingsAccountDto(a.getType(), a.getBalance()))
                .toList();
        BigDecimal total = accounts.stream()
                .map(SavingsAccount::getBalance)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return new SavingsSummaryDto(member.getId(), member.getMemberNumber(), dtos, Money.round(total));
    }

    private Member member(Long id) {
        return members.findById(id).orElseThrow(() -> new ResourceNotFoundException("Member " + id));
    }

    private static TransactionDto toTransactionDto(Transaction t) {
        return new TransactionDto(t.getId(), t.getType(), t.getSavingsType(), t.getLoanId(),
                t.getAmount(), t.getNote(), t.getCreatedAt());
    }
}
