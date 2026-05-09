use serde::{Deserialize, Serialize};
use shared_contracts::ApplicantProfile;
use tiny_http::{Header, Method, Response, Server, StatusCode};

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
        let path = request.url().to_string();
        match (request.method(), path.as_str()) {
            (&Method::Get, "/health") => {
                respond_json(
                    request,
                    StatusCode(200),
                    serde_json::json!({"status": "ok", "service": "rust-risk"}),
                );
            }
            (&Method::Post, "/score") => {
                let mut body = String::new();
                if request.as_reader().read_to_string(&mut body).is_err() {
                    respond_json(
                        request,
                        StatusCode(400),
                        serde_json::json!({"error": "invalid body"}),
                    );
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
                        respond_json(request, StatusCode(200), resp);
                    }
                    Err(err) => {
                        respond_json(
                            request,
                            StatusCode(400),
                            serde_json::json!({"error": format!("invalid json: {err}")}),
                        );
                    }
                }
            }
            _ => {
                respond_json(
                    request,
                    StatusCode(404),
                    serde_json::json!({"error": "not found"}),
                );
            }
        }
    }
}

fn respond_json<T: Serialize>(request: tiny_http::Request, status: StatusCode, payload: T) {
    let body = serde_json::to_string(&payload).unwrap_or_else(|_| "{}".to_string());
    let response = Response::from_string(body)
        .with_status_code(status)
        .with_header(
            Header::from_bytes("Content-Type", "application/json").expect("json content type"),
        );
    let _ = request.respond(response);
}
