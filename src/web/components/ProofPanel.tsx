export function ProofPanel() {
  return (
    <div className="proof-panel">
      <div className="proof-item">
        <h3>ZK Proof Stream</h3>
        <p>Latest batched zk proof receipts for migration events are ready for verifier replay.</p>
      </div>
      <div className="proof-item">
        <h3>Attestation Chain</h3>
        <p>Signed checkpoints link each cutover step with timestamped attestation records.</p>
      </div>
      <div className="proof-item">
        <h3>Audit Package</h3>
        <p>Compliance bundle includes control mappings, signer metadata, and export manifest hashes.</p>
      </div>
    </div>
  );
}
