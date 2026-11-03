package com.coopledger.dto;

import java.time.LocalDate;

public record MemberDto(
        Long id,
        String memberNumber,
        String fullName,
        String nik,
        String phone,
        String email,
        String address,
        LocalDate joinDate,
        String status
) {}
