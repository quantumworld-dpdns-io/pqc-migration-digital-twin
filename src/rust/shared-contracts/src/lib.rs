#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ApplicantProfile {
    pub credit_score: u16,
    pub debt_to_income_bps: u16,
    pub late_payments: u8,
    pub existing_loans: u8,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RiskScore {
    pub value: u16,
    pub band: RiskBand,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RiskBand {
    Low,
    Medium,
    High,
}
