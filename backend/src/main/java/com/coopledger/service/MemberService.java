package com.coopledger.service;

import com.coopledger.domain.Role;
import com.coopledger.domain.SavingsType;
import com.coopledger.dto.MemberCreateRequest;
import com.coopledger.dto.MemberDto;
import com.coopledger.entity.Member;
import com.coopledger.entity.SavingsAccount;
import com.coopledger.entity.User;
import com.coopledger.exception.BadRequestException;
import com.coopledger.exception.ResourceNotFoundException;
import com.coopledger.repository.MemberRepository;
import com.coopledger.repository.SavingsAccountRepository;
import com.coopledger.repository.UserRepository;
import com.coopledger.security.CurrentUserService;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class MemberService {

    private final MemberRepository members;
    private final UserRepository users;
    private final SavingsAccountRepository savings;
    private final PasswordEncoder encoder;
    private final CurrentUserService currentUser;

    public MemberService(MemberRepository members, UserRepository users, SavingsAccountRepository savings,
                         PasswordEncoder encoder, CurrentUserService currentUser) {
        this.members = members;
        this.users = users;
        this.savings = savings;
        this.encoder = encoder;
        this.currentUser = currentUser;
    }

    public List<MemberDto> list() {
        return members.findAll(Sort.by("id")).stream().map(MemberService::toDto).toList();
    }

    public MemberDto get(Long id) {
        return toDto(find(id));
    }

    public MemberDto getCurrent() {
        Long memberId = currentUser.user().getMemberId();
        if (memberId == null) {
            throw new BadRequestException("Current user is not linked to a member");
        }
        return toDto(find(memberId));
    }

    @Transactional
    public MemberDto create(MemberCreateRequest request) {
        String number = (request.memberNumber() == null || request.memberNumber().isBlank())
                ? nextMemberNumber() : request.memberNumber();
        if (members.findByMemberNumber(number).isPresent()) {
            throw new BadRequestException("Member number already exists: " + number);
        }

        LocalDateTime now = LocalDateTime.now();
        Member member = members.save(Member.builder()
                .memberNumber(number)
                .fullName(request.fullName())
                .nik(request.nik())
                .phone(request.phone())
                .email(request.email())
                .address(request.address())
                .joinDate(LocalDate.now())
                .status("ACTIVE")
                .createdAt(now)
                .build());

        for (SavingsType type : SavingsType.values()) {
            savings.save(SavingsAccount.builder()
                    .memberId(member.getId())
                    .type(type)
                    .balance(BigDecimal.ZERO)
                    .createdAt(now)
                    .updatedAt(now)
                    .build());
        }

        if (request.username() != null && !request.username().isBlank()) {
            if (request.password() == null || request.password().isBlank()) {
                throw new BadRequestException("Password is required when username is provided");
            }
            if (users.existsByUsername(request.username())) {
                throw new BadRequestException("Username already exists: " + request.username());
            }
            users.save(User.builder()
                    .username(request.username())
                    .passwordHash(encoder.encode(request.password()))
                    .fullName(request.fullName())
                    .role(Role.MEMBER)
                    .memberId(member.getId())
                    .enabled(true)
                    .createdAt(now)
                    .build());
        }
        return toDto(member);
    }

    private Member find(Long id) {
        return members.findById(id).orElseThrow(() -> new ResourceNotFoundException("Member " + id));
    }

    // ponytail: count+1 collides if a member is deleted; fine for MVP, use a sequence if that ever matters.
    private String nextMemberNumber() {
        return String.format("M-%04d", members.count() + 1);
    }

    private static MemberDto toDto(Member m) {
        return new MemberDto(
                m.getId(), m.getMemberNumber(), m.getFullName(), m.getNik(), m.getPhone(),
                m.getEmail(), m.getAddress(), m.getJoinDate(), m.getStatus());
    }
}
