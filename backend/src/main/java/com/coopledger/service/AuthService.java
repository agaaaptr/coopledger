package com.coopledger.service;

import com.coopledger.dto.LoginRequest;
import com.coopledger.dto.LoginResponse;
import com.coopledger.entity.User;
import com.coopledger.exception.UnauthorizedException;
import com.coopledger.repository.UserRepository;
import com.coopledger.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository users;

    public AuthService(AuthenticationManager authenticationManager, JwtService jwtService, UserRepository users) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.users = users;
    }

    public LoginResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.username(), request.password()));
        } catch (AuthenticationException e) {
            throw new UnauthorizedException("Invalid username or password");
        }
        User user = users.findByUsername(request.username()).orElseThrow();
        return new LoginResponse(
                jwtService.generateToken(user),
                user.getUsername(),
                user.getFullName(),
                user.getRole().name());
    }
}
