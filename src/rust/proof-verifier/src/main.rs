use std::env;
use std::fs;
use std::process;

use zk_proof::{verify_bundle, ProofBundle};

fn main() {
    let mut args = env::args();
    let program = args.next().unwrap_or_else(|| "proof-verifier".to_string());

    let Some(bundle_path) = args.next() else {
        eprintln!("usage: {program} <proof-bundle.json>");
        process::exit(2);
    };

    if args.next().is_some() {
        eprintln!("usage: {program} <proof-bundle.json>");
        process::exit(2);
    }

    let bundle_raw = match fs::read_to_string(&bundle_path) {
        Ok(data) => data,
        Err(err) => {
            eprintln!("verification failed: cannot read '{bundle_path}': {err}");
            process::exit(1);
        }
    };

    let bundle: ProofBundle = match serde_json::from_str(&bundle_raw) {
        Ok(bundle) => bundle,
        Err(err) => {
            eprintln!("verification failed: invalid JSON bundle: {err}");
            process::exit(1);
        }
    };

    if verify_bundle(&bundle) {
        println!("verification passed: proof bundle is valid");
        return;
    }

    eprintln!("verification failed: statement/score/proof_hash mismatch");
    process::exit(1);
}
