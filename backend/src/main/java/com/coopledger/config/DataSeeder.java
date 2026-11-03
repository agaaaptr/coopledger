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
        seed("admin2", "admin123", "Ratna Dewi", Role.ADMIN, null);
        seed("teller", "teller123", "Teller Koperasi", Role.TELLER, null);
        seed("teller2", "teller123", "Andi Wijaya", Role.TELLER, null);
        // demo member logins for the first five seeded members (M-0001..M-0005)
        for (int i = 1; i <= 5; i++) {
            final String number = String.format("M-%04d", i);
            final String username = i == 1 ? "member" : "member" + i;
            members.findByMemberNumber(number).ifPresent(m ->
                    seed(username, "member123", m.getFullName(), Role.MEMBER, m.getId()));
        }
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
