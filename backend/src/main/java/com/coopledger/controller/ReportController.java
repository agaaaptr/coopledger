package com.coopledger.controller;

import com.coopledger.dto.ShuReportDto;
import com.coopledger.service.ShuService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ShuService shuService;

    public ReportController(ShuService shuService) {
        this.shuService = shuService;
    }

    @GetMapping("/shu")
    @PreAuthorize("hasRole('ADMIN')")
    public ShuReportDto shu(@RequestParam Integer year, @RequestParam BigDecimal pool) {
        return shuService.compute(year, pool);
    }
}
