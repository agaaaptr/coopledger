package com.coopledger.dto;

import jakarta.validation.constraints.NotBlank;

public record MemberCreateRequest(
        @NotBlank String fullName,
        String memberNumber,
        String nik,
        String phone,
        String email,
        String address,
        String username,
        String password
) {}
