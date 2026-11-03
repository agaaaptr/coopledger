package com.coopledger.security;

import com.coopledger.entity.User;
import com.coopledger.exception.BadRequestException;
import com.coopledger.exception.ResourceNotFoundException;
import com.coopledger.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class CurrentUserService {

    private final UserRepository users;

    public CurrentUserService(UserRepository users) {
        this.users = users;
    }

    public String username() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return (auth != null && auth.isAuthenticated()) ? auth.getName() : null;
    }

    public User user() {
        String username = username();
        if (username == null) {
            throw new BadRequestException("Not authenticated");
        }
        return users.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User " + username));
    }
}
