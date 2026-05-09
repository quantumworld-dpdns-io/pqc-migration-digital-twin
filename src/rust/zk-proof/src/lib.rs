use shared_contracts::RiskScore;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Proof {
    pub statement_hash: String,
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
    if proof.statement_hash.len() != 16 || !proof.statement_hash.chars().all(|c| c.is_ascii_hexdigit())
    {
        return false;
    }

    let expected = prove(statement, public_score);
    expected == *proof
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
    use super::{prove, verify};
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
}
