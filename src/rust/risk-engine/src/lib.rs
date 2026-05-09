use shared_contracts::{ApplicantProfile, RiskBand, RiskScore};

/// Deterministic weighted model that returns a score in [0, 1000].
pub fn score(profile: &ApplicantProfile) -> RiskScore {
    let credit_penalty = ((850_u16.saturating_sub(profile.credit_score.min(850))) as u32) * 2;
    let dti_penalty = ((profile.debt_to_income_bps.min(10_000)) as u32 * 3) / 100;
    let late_penalty = (profile.late_payments.min(20) as u32) * 25;
    let loan_penalty = (profile.existing_loans.min(20) as u32) * 15;

    let total = credit_penalty + dti_penalty + late_penalty + loan_penalty;
    let value = total.min(1000) as u16;

    let band = match value {
        0..=299 => RiskBand::Low,
        300..=649 => RiskBand::Medium,
        _ => RiskBand::High,
    };

    RiskScore { value, band }
}

#[cfg(test)]
mod tests {
    use super::score;
    use shared_contracts::{ApplicantProfile, RiskBand};

    #[test]
    fn scoring_is_deterministic() {
        let input = ApplicantProfile {
            credit_score: 720,
            debt_to_income_bps: 3_500,
            late_payments: 1,
            existing_loans: 2,
        };

        let a = score(&input);
        let b = score(&input);

        assert_eq!(a, b);
        assert_eq!(a.value, 420);
        assert_eq!(a.band, RiskBand::Medium);
    }

    #[test]
    fn high_risk_case_maps_to_high_band() {
        let input = ApplicantProfile {
            credit_score: 500,
            debt_to_income_bps: 8_000,
            late_payments: 8,
            existing_loans: 6,
        };

        let scored = score(&input);
        assert!(scored.value >= 650);
        assert_eq!(scored.band, RiskBand::High);
    }
}
