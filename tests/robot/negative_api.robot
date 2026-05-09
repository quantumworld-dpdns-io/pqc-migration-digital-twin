*** Settings ***
Library    RequestsLibrary

*** Variables ***
${GATEWAY_BASE_URL}    http://localhost:8080

*** Test Cases ***
Negative GET On Risk Endpoint Returns 405
    ${response}=    GET    ${GATEWAY_BASE_URL}/api/v1/risk    expected_status=405
    Should Be Equal As Integers    ${response.status_code}    405

Negative Malformed JSON On Risk Endpoint Returns 400
    ${headers}=    Create Dictionary    Content-Type=application/json
    ${response}=    POST    ${GATEWAY_BASE_URL}/api/v1/risk    data={"asset_id":"A1",    headers=${headers}    expected_status=400
    Should Be Equal As Integers    ${response.status_code}    400
