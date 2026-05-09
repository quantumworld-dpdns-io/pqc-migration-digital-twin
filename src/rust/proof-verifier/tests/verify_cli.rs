use assert_cmd::Command;

#[test]
fn accepts_valid_bundle_fixture() {
    let mut cmd = Command::cargo_bin("proof-verifier").expect("binary exists");
    cmd.arg("tests/fixtures/valid_bundle.json");

    cmd.assert()
        .success()
        .stdout("verification passed: proof bundle is valid\n");
}

#[test]
fn rejects_tampered_bundle_fixture() {
    let mut cmd = Command::cargo_bin("proof-verifier").expect("binary exists");
    cmd.arg("tests/fixtures/tampered_bundle.json");

    cmd.assert()
        .failure()
        .stderr("verification failed: statement/score/proof_hash mismatch\n");
}
