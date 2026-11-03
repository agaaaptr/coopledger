package com.coopledger.config;

import com.coopledger.domain.Role;
import com.coopledger.entity.User;
import com.coopledger.repository.MemberRepository;
import com.coopledger.repository.UserRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Seeds demo users on first run. Passwords are BCrypt-hashed here rather than hardcoded in SQL.
 */
@Component
public class DataSeeder implements ApplicationRunner {

    private final UserRepository users;
    private final MemberRepository members;
    private final PasswordEncoder encoder;

    public DataSeeder(UserRepository users, MemberRepository members, PasswordEncoder encoder) {
        this.users = users;
        this.members = members;
        this.encoder = encoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (users.count() > 0) {
            return;
        }
        seed("admin", "admin123", "Admin Koperasi", Role.ADMIN, null);
        seed("teller", "teller123", "Teller Koperasi", Role.TELLER, null);
        members.findByMemberNumber("M-0001").ifPresent(m ->
                seed("member", "member123", m.getFullName(), Role.MEMBER, m.getId()));
    }

    private void seed(String username, String rawPassword, String fullName, Role role, Long memberId) {
        users.save(User.builder()
                .username(username)
                .passwordHash(encoder.encode(rawPassword))
                .fullName(fullName)
                .role(role)
                .memberId(memberId)
                .enabled(true)
                .createdAt(LocalDateTime.now())
                .build());
    }
}
