Feature: Gateway negative API cases
  Validate unsupported methods and malformed payload behavior.

  Scenario: GET risk endpoint is rejected
    Given the gateway base url is configured
    When I send a GET request to "/api/v1/governance/exceptions"
    Then the response status should be 405

  Scenario: POST governance exceptions endpoint with malformed json is rejected
    Given the gateway base url is configured
    When I send a malformed JSON POST request to "/api/v1/governance/exceptions"
    Then the response status should be 400

  Scenario: GET audit events endpoint with invalid limit is rejected
    Given the gateway base url is configured
    When I send a GET request to "/api/v1/audit/events?limit=-1"
    Then the response status should be 400

  Scenario: POST governance exception with missing required fields is rejected
    Given the gateway base url is configured
    When I send an invalid JSON POST request to "/api/v1/governance/exceptions"
    Then the response status should be 400

  Scenario: DELETE governance exceptions endpoint is rejected
    Given the gateway base url is configured
    When I send a DELETE request to "/api/v1/governance/exceptions"
    Then the response status should be 405
