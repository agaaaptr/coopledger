package com.coopledger.repository;

import com.coopledger.entity.Loan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LoanRepository extends JpaRepository<Loan, Long> {
    List<Loan> findByMemberIdOrderByIdDesc(Long memberId);
}
