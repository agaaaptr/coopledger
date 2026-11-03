package com.coopledger.dto;

import java.time.LocalDateTime;
import java.util.Map;

public record ApiError(
        String code,
        String message,
        String traceId,
        LocalDateTime timestamp,
        Map<String, String> fieldErrors
) {}
