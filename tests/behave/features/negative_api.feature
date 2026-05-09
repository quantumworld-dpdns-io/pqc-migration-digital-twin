Feature: Gateway negative API cases
  Validate unsupported methods and malformed payload behavior.

  Scenario: GET risk endpoint is rejected
    Given the gateway base url is configured
    When I send a GET request to "/api/v1/risk"
    Then the response status should be 405

  Scenario: POST risk endpoint with malformed json is rejected
    Given the gateway base url is configured
    When I send a malformed JSON POST request to "/api/v1/risk"
    Then the response status should be 400
