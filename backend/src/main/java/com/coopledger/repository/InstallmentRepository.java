package com.coopledger.repository;

import com.coopledger.entity.Installment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InstallmentRepository extends JpaRepository<Installment, Long> {
    List<Installment> findByLoanIdOrderByInstallmentNumber(Long loanId);
}
