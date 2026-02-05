# Data Schema (Core Tables)

This section is based on TypeORM definitions in `src/domain/mapper/entity.ts`.

> Field types may differ slightly at runtime; use migrations/DDL as the source of truth.

## ER Diagram (Overview)
```mermaid
erDiagram
  USERS ||--o{ APPLICATIONS : owns
  USERS ||--o{ SERVICES : owns
  AUDITS ||--o{ COMMENTS : has
  SERVICES ||--o{ SERVICE_CONFIGS : config
  APPLICATIONS ||--o{ APPLICATION_CONFIGS : config

  USERS {
    varchar did PK
  }
  USER_STATE {
    varchar did PK
  }
  APPLICATIONS {
    uuid uid PK
    varchar did
  }
  SERVICES {
    uuid uid PK
    varchar did
  }
  SERVICE_CONFIGS {
    uuid uid PK
    varchar service_uid
    varchar applicant
  }
  AUDITS {
    uuid uid PK
    text app_or_service_metadata
  }
  APPLICATION_CONFIGS {
    uuid uid PK
    varchar application_uid
    varchar applicant
  }
  COMMENTS {
    uuid uid PK
    text audit_id
  }
```

## users
| Field | Type | Notes |
| --- | --- | --- |
| did | varchar(128) PK | User DID |
| name | varchar(128) | Display name |
| avatar | text | Avatar |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |
| signature | varchar(192) | Signature (not verified) |

## mpc_sessions
| Field | Type | Notes |
| --- | --- | --- |
| id | varchar(64) PK | Session ID |
| type | varchar(16) | keygen/sign/refresh |
| wallet_id | varchar(128) | Wallet ID |
| threshold | int | Threshold |
| participants | text | Participant list JSON |
| status | varchar(32) | Session status |
| round | int | Current round |
| curve | varchar(32) | Curve |
| key_version | int | Key version |
| share_version | int | Share version |
| created_at | varchar(64) | Created time (epoch ms) |
| expires_at | varchar(64) | Expiry time (epoch ms) |

## mpc_session_participants
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Participant ID |
| session_id | varchar(64) | Session ID |
| participant_id | varchar(64) | Participant ID |
| device_id | varchar(128) | Device fingerprint |
| identity | varchar(256) | DID identity |
| e2e_public_key | text | E2E public key |
| signing_public_key | text | Signing public key |
| status | varchar(32) | Status |
| joined_at | varchar(64) | Joined time (epoch ms) |

## mpc_messages
| Field | Type | Notes |
| --- | --- | --- |
| id | varchar(64) PK | Message ID |
| session_id | varchar(64) | Session ID |
| sender | varchar(64) | Sender |
| receiver | varchar(64) | Receiver (optional) |
| round | int | Round |
| type | varchar(64) | Message type |
| seq | int | Sequence |
| envelope | text | Encrypted envelope JSON |
| created_at | varchar(64) | Created time (epoch ms) |

## mpc_sign_requests
| Field | Type | Notes |
| --- | --- | --- |
| id | varchar(64) PK | Request ID |
| wallet_id | varchar(128) | Wallet ID |
| session_id | varchar(64) | Session ID |
| initiator | varchar(64) | Initiator |
| payload_type | varchar(32) | Payload type |
| payload_hash | varchar(256) | Payload hash |
| chain_id | int | Chain ID |
| status | varchar(32) | Status |
| approvals | text | Approvals JSON |
| created_at | varchar(64) | Created time (epoch ms) |

## mpc_audit_logs
| Field | Type | Notes |
| --- | --- | --- |
| id | varchar(64) PK | Audit ID |
| wallet_id | varchar(128) | Wallet ID |
| session_id | varchar(64) | Session ID |
| level | varchar(16) | Level |
| action | varchar(64) | Action |
| actor | varchar(64) | Actor |
| message | text | Message |
| time | varchar(64) | Time (epoch ms) |
| metadata | text | Metadata JSON |

## user_state
| Field | Type | Notes |
| --- | --- | --- |
| did | varchar(128) PK | User DID |
| role | varchar(64) | Role |
| status | varchar(64) | Status |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |
| signature | varchar(192) | Signature (not verified) |

## services
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Service ID |
| did | varchar(128) | Service DID |
| version | int | Version |
| owner | varchar(128) | Owner DID |
| owner_name | varchar(128) | Owner name |
| network | varchar(64) | Network |
| address | varchar(128) | Address |
| name | varchar(64) | Name |
| description | text | Description |
| code | varchar(64) | Service code |
| api_codes | text | API codes (comma-separated) |
| proxy | varchar(256) | Proxy endpoint |
| grpc | varchar(256) | gRPC endpoint |
| avatar | text | Avatar |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |
| signature | varchar(192) | Signature (not verified) |
| code_package_path | text | Package path |
| status | varchar(64) | Business status (BUSINESS_STATUS_*) |
| is_online | boolean | Online flag |

## applications
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Application ID |
| did | varchar(128) | Application DID |
| version | int | Version |
| owner | varchar(128) | Owner DID |
| owner_name | varchar(128) | Owner name |
| network | varchar(64) | Network |
| address | varchar(128) | Address |
| name | varchar(64) | Name |
| description | text | Description |
| code | varchar(64) | Application code |
| location | text | Location / entry |
| service_codes | text | Service codes (comma-separated) |
| avatar | text | Avatar |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |
| signature | varchar(192) | Signature (not verified) |
| code_package_path | text | Package path |
| status | varchar(64) | Business status (BUSINESS_STATUS_*) |
| is_online | boolean | Online flag |

## service_configs
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Config ID |
| service_uid | varchar(64) | Service UID |
| service_did | varchar(128) | Service DID |
| service_version | int | Service version |
| applicant | varchar(128) | Applicant address |
| config_json | text | Config JSON (code/instance list) |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |

## application_configs
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Config ID |
| application_uid | varchar(64) | Application UID |
| application_did | varchar(128) | Application DID |
| application_version | int | Application version |
| applicant | varchar(128) | Applicant address |
| config_json | text | Config JSON (code/instance list) |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |

## audits
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Ticket ID |
| app_or_service_metadata | text | Metadata JSON |
| audit_type | text | application / service |
| applicant | text | applicant (did::name) |
| approver | text | audit policy (JSON object or list); object shape `{ "approvers": [...], "requiredApprovals": 2 }` |
| reason | text | Reason |
| created_at | timestamp | Created time |
| updated_at | timestamp | Updated time |
| signature | varchar(192) | Signature (not verified) |
| target_type | varchar(32) | Target type (application/service) |
| target_did | varchar(128) | Target DID |
| target_version | int | Target version |
| target_name | varchar(128) | Target name |

## comments
| Field | Type | Notes |
| --- | --- | --- |
| uid | uuid PK | Comment ID |
| audit_id | text | audits.uid |
| text | text | Comment |
| status | text | COMMENT_STATUS_AGREE / COMMENT_STATUS_REJECT |
| created_at | varchar(64) | Created time |
| updated_at | varchar(64) | Updated time |
| signature | varchar(192) | Signature (not verified) |
