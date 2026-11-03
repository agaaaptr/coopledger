package com.coopledger.controller;

import com.coopledger.dto.MemberCreateRequest;
import com.coopledger.dto.MemberDto;
import com.coopledger.service.MemberService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/members")
public class MemberController {

    private final MemberService memberService;

    public MemberController(MemberService memberService) {
        this.memberService = memberService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public List<MemberDto> list() {
        return memberService.list();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public MemberDto create(@Valid @RequestBody MemberCreateRequest request) {
        return memberService.create(request);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','TELLER')")
    public MemberDto get(@PathVariable Long id) {
        return memberService.get(id);
    }
}
