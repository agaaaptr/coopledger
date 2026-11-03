package com.coopledger.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RbacTest {

    @Autowired
    MockMvc mockMvc;

    @Test
    void unauthenticatedRequestIsRejectedWith401() throws Exception {
        mockMvc.perform(get("/api/members"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void tellerCannotCreateMember() throws Exception {
        mockMvc.perform(post("/api/members")
                        .with(user("teller").roles("TELLER"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"fullName\":\"Someone\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void memberCannotReadShuReport() throws Exception {
        mockMvc.perform(get("/api/reports/shu")
                        .param("year", "2026")
                        .param("pool", "1000000")
                        .with(user("member").roles("MEMBER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanListMembers() throws Exception {
        mockMvc.perform(get("/api/members")
                        .with(user("admin").roles("ADMIN")))
                .andExpect(status().isOk());
    }
}
