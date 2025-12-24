package com.example.workshop;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class OrderController {

    private final List<Map<String, Object>> orders = new CopyOnWriteArrayList<>();

    public OrderController() {
        seed("PO-10001", "Aoki", "NEW", LocalDate.now().minusDays(2), 12000);
        seed("PO-10002", "Chen", "IN_PROGRESS", LocalDate.now().minusDays(1), 5600);
        seed("PO-10003", "Sato", "DONE", LocalDate.now(), 8800);
        seed("PO-10004", "Yamada", "NEW", LocalDate.now().minusDays(5), 2200);
    }

    private void seed(String orderNo, String user, String status, LocalDate date, int amount) {
        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", UUID.randomUUID().toString());
        o.put("orderNo", orderNo);
        o.put("user", user);
        o.put("status", status);
        o.put("date", date.toString());
        o.put("amount", amount);
        orders.add(o);
    }

    @GetMapping("/orders")
    public Map<String, Object> list(
            @RequestParam(required = false) String orderNo,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "300") int latencyMs
    ) {
        sleep(latencyMs);

        List<Map<String, Object>> filtered = orders.stream()
                .filter(o -> orderNo == null || orderNo.isBlank() || o.get("orderNo").toString().contains(orderNo))
                .filter(o -> user == null || user.isBlank() || o.get("user").toString().toLowerCase().contains(user.toLowerCase()))
                .filter(o -> status == null || status.isBlank() || o.get("status").toString().equalsIgnoreCase(status))
                .collect(Collectors.toList());

        int total = filtered.size();
        int from = Math.max(0, (page - 1) * size);
        int to = Math.min(total, from + size);
        List<Map<String, Object>> items = from >= to ? List.of() : filtered.subList(from, to);

        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("page", page);
        resp.put("size", size);
        resp.put("total", total);
        resp.put("items", items);
        return resp;
    }

    @GetMapping("/orders/{id}")
    public Map<String, Object> detail(
            @PathVariable String id,
            @RequestParam(defaultValue = "300") int latencyMs
    ) {
        sleep(latencyMs);
        return orders.stream()
                .filter(o -> Objects.equals(o.get("id"), id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found"));
    }

    @PostMapping("/orders")
    public Map<String, Object> create(
            @RequestBody Map<String, Object> body,
            @RequestParam(defaultValue = "500") int latencyMs
    ) {
        sleep(latencyMs);

        String orderNo = Objects.toString(body.getOrDefault("orderNo", "PO-" + (10000 + orders.size() + 1)));
        String user = Objects.toString(body.getOrDefault("user", "Unknown"));
        String status = Objects.toString(body.getOrDefault("status", "NEW"));
        String date = Objects.toString(body.getOrDefault("date", LocalDate.now().toString()));
        int amount = 0;
        try {
            amount = Integer.parseInt(Objects.toString(body.getOrDefault("amount", "0")));
        } catch (Exception ignored) {}

        Map<String, Object> o = new LinkedHashMap<>();
        o.put("id", UUID.randomUUID().toString());
        o.put("orderNo", orderNo);
        o.put("user", user);
        o.put("status", status);
        o.put("date", date);
        o.put("amount", amount);
        orders.add(0, o);

        return Map.of("result", "created", "order", o);
    }

    @GetMapping("/sleep")
    public Map<String, Object> sleepEndpoint(@RequestParam(defaultValue = "500") int ms) {
        sleep(ms);
        return Map.of("sleptMs", ms, "ts", System.currentTimeMillis());
    }

    private void sleep(int ms) {
        if (ms <= 0) return;
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }
}
