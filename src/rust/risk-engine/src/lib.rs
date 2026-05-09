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
    use std::time::{Duration, Instant};

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

    fn profile_from_seed(mut seed: u64) -> ApplicantProfile {
        fn next(seed: &mut u64) -> u64 {
            *seed = seed
                .wrapping_mul(6_364_136_223_846_793_005)
                .wrapping_add(1_442_695_040_888_963_407);
            *seed
        }

        let credit_score = 300 + (next(&mut seed) % 551) as u16;
        let debt_to_income_bps = (next(&mut seed) % 10_001) as u16;
        let late_payments = (next(&mut seed) % 21) as u8;
        let existing_loans = (next(&mut seed) % 21) as u8;

        ApplicantProfile {
            credit_score,
            debt_to_income_bps,
            late_payments,
            existing_loans,
        }
    }

    #[test]
    fn scores_10k_profiles_with_stable_checksum_under_ci_threshold() {
        const SAMPLE_COUNT: usize = 10_000;
        const MAX_DURATION: Duration = Duration::from_millis(1_500);
        const CHECKSUM_EXPECTED: u64 = 17_392_749_781_766_021_131;

        let start = Instant::now();
        let mut checksum: u64 = 0;

        for i in 0..SAMPLE_COUNT {
            let profile = profile_from_seed((i as u64) + 1);
            let scored = score(&profile);
            checksum = checksum
                .wrapping_mul(1_000_003)
                .wrapping_add(scored.value as u64)
                .wrapping_add((scored.band as u64) << 16);
        }

        let elapsed = start.elapsed();
        assert!(
            elapsed <= MAX_DURATION,
            "10k-score run took {:?}, threshold {:?}",
            elapsed,
            MAX_DURATION
        );
        assert_eq!(checksum, CHECKSUM_EXPECTED);
    }
}
