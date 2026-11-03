package com.coopledger.repository;

import com.coopledger.domain.SavingsType;
import com.coopledger.entity.SavingsAccount;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavingsAccountRepository extends JpaRepository<SavingsAccount, Long> {
    List<SavingsAccount> findByMemberIdOrderByType(Long memberId);
    Optional<SavingsAccount> findByMemberIdAndType(Long memberId, SavingsType type);
}
