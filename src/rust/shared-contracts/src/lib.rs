use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ApplicantProfile {
    pub credit_score: u16,
    pub debt_to_income_bps: u16,
    pub late_payments: u8,
    pub existing_loans: u8,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RiskScore {
    pub value: u16,
    pub band: RiskBand,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum RiskBand {
    Low,
    Medium,
    High,
}
