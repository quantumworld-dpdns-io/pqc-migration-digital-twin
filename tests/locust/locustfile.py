from locust import HttpUser, task


class NegativeApiUser(HttpUser):
    @task
    def get_risk_is_rejected(self):
        with self.client.get('/api/v1/risk', name='NEG GET /api/v1/risk', catch_response=True) as response:
            if response.status_code != 405:
                response.failure(f'expected 405, got {response.status_code}')
            else:
                response.success()

    @task
    def malformed_risk_payload_is_rejected(self):
        with self.client.post(
            '/api/v1/risk',
            data='{"asset_id":"A1",',
            headers={'Content-Type': 'application/json'},
            name='NEG POST /api/v1/risk malformed json',
            catch_response=True,
        ) as response:
            if response.status_code != 400:
                response.failure(f'expected 400, got {response.status_code}')
            else:
                response.success()
