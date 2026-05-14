use serde::{Deserialize, Serialize};
use shared_contracts::ApplicantProfile;
use tiny_http::{Header, Method, Response, Server, StatusCode};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;
use std::time::{SystemTime, UNIX_EPOCH};

static REQUEST_COUNTER: AtomicU64 = AtomicU64::new(1);
static METRIC_REQUEST_COUNT: AtomicU64 = AtomicU64::new(0);
static METRIC_ERROR_COUNT: AtomicU64 = AtomicU64::new(0);
static METRIC_LATENCY_MS_SUM: AtomicU64 = AtomicU64::new(0);
static METRIC_LATENCY_MS_MAX: AtomicU64 = AtomicU64::new(0);

#[derive(Debug, Deserialize)]
struct ScoreRequest {
    statement: Option<String>,
    credit_score: u16,
    debt_to_income_bps: u16,
    late_payments: u8,
    existing_loans: u8,
}

#[derive(Debug, Serialize)]
struct ScoreResponse {
    statement: String,
    score_value: u16,
    score_band: String,
    proof_hash: String,
}

fn main() {
    let server = Server::http("0.0.0.0:8083").expect("start risk service");
    eprintln!("rust risk service listening on :8083");

    for mut request in server.incoming_requests() {
        let started = Instant::now();
        let path = request.url().to_string();
        let method = request.method().as_str().to_string();
        let request_id = extract_or_generate_request_id(&request);
        match (request.method(), path.as_str()) {
            (&Method::Get, "/metrics") => {
                respond_metrics(request, &request_id);
                log_event(&method, &path, 200, &request_id, None);
                record_metrics(200, started.elapsed().as_millis() as u64);
            }
            (&Method::Get, "/health") => {
                respond_json(
                    request,
                    StatusCode(200),
                    &request_id,
                    serde_json::json!({"status": "ok", "service": "rust-risk"}),
                );
                log_event(&method, &path, 200, &request_id, None);
                record_metrics(200, started.elapsed().as_millis() as u64);
            }
            (&Method::Get, "/live") | (&Method::Get, "/ready") => {
                respond_json(
                    request,
                    StatusCode(200),
                    &request_id,
                    serde_json::json!({"status": "ok", "service": "rust-risk"}),
                );
                log_event(&method, &path, 200, &request_id, None);
                record_metrics(200, started.elapsed().as_millis() as u64);
            }
            (&Method::Post, "/score") => {
                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_err() {
                    respond_json(
                        request,
                        StatusCode(400),
                        &request_id,
                        serde_json::json!({"error": "invalid body"}),
                    );
                    log_event(&method, &path, 400, &request_id, Some("invalid body"));
                    record_metrics(400, started.elapsed().as_millis() as u64);
                    continue;
                }

                let parsed: Result<ScoreRequest, _> = serde_json::from_str(&body);
                match parsed {
                    Ok(input) => {
                        let profile = ApplicantProfile {
                            credit_score: input.credit_score,
                            debt_to_income_bps: input.debt_to_income_bps,
                            late_payments: input.late_payments,
                            existing_loans: input.existing_loans,
                        };
                        let score = risk_engine::score(&profile);
                        let statement = input
                            .statement
                            .unwrap_or_else(|| "pqc-risk-statement".to_string());
                        let proof = zk_proof::prove(&statement, &score);
                        let resp = ScoreResponse {
                            statement,
                            score_value: score.value,
                            score_band: format!("{:?}", score.band).to_lowercase(),
                            proof_hash: proof.statement_hash,
                        };
                        respond_json(request, StatusCode(200), &request_id, resp);
                        log_event(&method, &path, 200, &request_id, None);
                        record_metrics(200, started.elapsed().as_millis() as u64);
                    }
                    Err(err) => {
                        respond_json(
                            request,
                            StatusCode(400),
                            &request_id,
                            serde_json::json!({"error": format!("invalid json: {err}")}),
                        );
                        log_event(&method, &path, 400, &request_id, Some("invalid json"));
                        record_metrics(400, started.elapsed().as_millis() as u64);
                    }
                }
            }
            _ => {
                respond_json(
                    request,
                    StatusCode(404),
                    &request_id,
                    serde_json::json!({"error": "not found"}),
                );
                log_event(&method, &path, 404, &request_id, Some("not found"));
                record_metrics(404, started.elapsed().as_millis() as u64);
            }
        }
    }
}

fn respond_json<T: Serialize>(
    request: tiny_http::Request,
    status: StatusCode,
    request_id: &str,
    payload: T,
) {
    let body = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_string());
    let response = Response::from_string(body)
        .with_status_code(status)
        .with_header(
            Header::from_bytes("Content-Type", "application/json").expect("json content type"),
        )
        .with_header(
            Header::from_bytes("X-Request-Id", request_id).expect("request id header"),
        );
    let _ = request.respond(response);
}

fn extract_or_generate_request_id(request: &tiny_http::Request) -> String {
    request
        .headers()
        .iter()
        .find(|h| h.field.equiv("X-Request-Id"))
        .and_then(|h| {
            let value = h.value.as_str().trim();
            if value.is_empty() || value.len() > 128 {
                None
            } else {
                Some(value.to_string())
            }
        })
        .unwrap_or_else(generate_request_id)
}

fn record_metrics(status: u16, latency_ms: u64) {
    METRIC_REQUEST_COUNT.fetch_add(1, Ordering::Relaxed);
    if status >= 400 {
        METRIC_ERROR_COUNT.fetch_add(1, Ordering::Relaxed);
    }
    METRIC_LATENCY_MS_SUM.fetch_add(latency_ms, Ordering::Relaxed);
    METRIC_LATENCY_MS_MAX.fetch_max(latency_ms, Ordering::Relaxed);
}

fn metrics_text() -> String {
    let request_count = METRIC_REQUEST_COUNT.load(Ordering::Relaxed);
    let error_count = METRIC_ERROR_COUNT.load(Ordering::Relaxed);
    let latency_sum = METRIC_LATENCY_MS_SUM.load(Ordering::Relaxed);
    let latency_max = METRIC_LATENCY_MS_MAX.load(Ordering::Relaxed);
    let latency_avg = if request_count == 0 {
        0.0
    } else {
        latency_sum as f64 / request_count as f64
    };

    format!(
        "request_count {request_count}\nerror_count {error_count}\nlatency_ms_count {request_count}\nlatency_ms_sum {latency_sum}\nlatency_ms_avg {latency_avg:.3}\nlatency_ms_max {latency_max}\n"
    )
}

fn respond_metrics(request: tiny_http::Request, request_id: &str) {
    let body = metrics_text();
    let response = Response::from_string(body)
        .with_status_code(StatusCode(200))
        .with_header(
            Header::from_bytes("Content-Type", "text/plain; charset=utf-8")
                .expect("metrics content type"),
        )
        .with_header(
            Header::from_bytes("X-Request-Id", request_id).expect("request id header"),
        );
    let _ = request.respond(response);
}

fn generate_request_id() -> String {
    let ts_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0);
    let seq = REQUEST_COUNTER.fetch_add(1, Ordering::Relaxed);
    format!("req-{ts_ms}-{seq}")
}

fn log_event(method: &str, path: &str, status: u16, request_id: &str, error: Option<&str>) {
    let entry = serde_json::json!({
        "ts_ms": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0),
        "service": "rust-risk",
        "method": method,
        "path": path,
        "status": status,
        "request_id": request_id,
        "error": error
    });
    eprintln!("{entry}");
}

#[cfg(test)]
mod tests {
    use super::{generate_request_id, metrics_text, record_metrics};

    #[test]
    fn generated_request_ids_are_prefixed() {
        let request_id = generate_request_id();
        assert!(request_id.starts_with("req-"));
    }

    #[test]
    fn metrics_export_contains_red_fields() {
        record_metrics(200, 4);
        record_metrics(500, 9);
        let out = metrics_text();
        assert!(out.contains("request_count "));
        assert!(out.contains("error_count "));
        assert!(out.contains("latency_ms_sum "));
    }
}
