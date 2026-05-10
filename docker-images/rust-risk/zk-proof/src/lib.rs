use serde::{Deserialize, Serialize};
use shared_contracts::RiskScore;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Proof {
    pub statement_hash: String,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProofBundle {
    pub statement: String,
    pub score: RiskScore,
    pub proof_hash: String,
}

/// MVP scaffold API for deterministic proving integration.
pub fn prove(statement: &str, public_score: &RiskScore) -> Proof {
    let payload = format!(
        "risk-proof-v1|{}|{}|{:?}",
        statement, public_score.value, public_score.band
    );
    Proof {
        statement_hash: stable_hash_hex(payload.as_bytes()),
    }
}

/// MVP scaffold verifier that checks statement + score against proof hash.
pub fn verify(statement: &str, public_score: &RiskScore, proof: &Proof) -> bool {
    if proof.statement_hash.len() != 16
        || !proof.statement_hash.chars().all(|c| c.is_ascii_hexdigit())
    {
        return false;
    }

    let expected = prove(statement, public_score);
    expected == *proof
}

/// Verifies a full proof bundle payload.
pub fn verify_bundle(bundle: &ProofBundle) -> bool {
    verify(
        &bundle.statement,
        &bundle.score,
        &Proof {
            statement_hash: bundle.proof_hash.clone(),
        },
    )
}

fn stable_hash_hex(bytes: &[u8]) -> String {
    // FNV-1a 64-bit for deterministic lightweight hashing in this MVP scaffold.
    let mut hash: u64 = 0xcbf29ce484222325;
    for b in bytes {
        hash ^= *b as u64;
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("{hash:016x}")
}

#[cfg(test)]
mod tests {
    use super::{prove, verify, verify_bundle, ProofBundle};
    use shared_contracts::{RiskBand, RiskScore};

    #[test]
    fn verify_accepts_matching_statement() {
        let score = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let statement = "applicant-42";
        let proof = prove(statement, &score);

        assert!(verify(statement, &score, &proof));
    }

    #[test]
    fn verify_rejects_tampered_statement() {
        let score = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let proof = prove("applicant-42", &score);

        assert!(!verify("applicant-43", &score, &proof));
    }

    #[test]
    fn verify_rejects_tampered_score() {
        let original = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let tampered = RiskScore {
            value: 411,
            band: RiskBand::Medium,
        };
        let statement = "applicant-42";
        let proof = prove(statement, &original);

        assert!(!verify(statement, &tampered, &proof));
    }

    #[test]
    fn verify_rejects_malformed_proof_hash() {
        let score = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let statement = "applicant-42";
        let mut proof = prove(statement, &score);
        proof.statement_hash = "not-hex".to_string();

        assert!(!verify(statement, &score, &proof));
    }

    #[test]
    fn verify_bundle_accepts_valid_bundle() {
        let score = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let statement = "applicant-42";
        let proof = prove(statement, &score);
        let bundle = ProofBundle {
            statement: statement.to_string(),
            score,
            proof_hash: proof.statement_hash,
        };

        assert!(verify_bundle(&bundle));
    }

    #[test]
    fn verify_bundle_rejects_tampered_bundle() {
        let score = RiskScore {
            value: 410,
            band: RiskBand::Medium,
        };
        let statement = "applicant-42";
        let proof = prove(statement, &score);
        let bundle = ProofBundle {
            statement: statement.to_string(),
            score: RiskScore {
                value: 411,
                band: RiskBand::Medium,
            },
            proof_hash: proof.statement_hash,
        };

        assert!(!verify_bundle(&bundle));
    }
}
