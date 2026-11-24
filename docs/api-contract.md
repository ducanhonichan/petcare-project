# PetCare API Contract (T04)

REST API used by the React frontend. This file is the written contract; the same
information is available online and can be tried live in **Swagger UI**.

- API base URL (online): `https://petcare-project-et4v.onrender.com`
- Swagger UI: `/api-docs` (raw OpenAPI JSON: `/api-docs.json`)
- Local base URL: `http://localhost:3000`
- Source of truth in code: `backend/src/docs/openapi.js` and `backend/src/routes/`

> The free Render service sleeps after 15 minutes without traffic. The first request after a pause can take about a minute.

## 1. Conventions

- Requests and responses are JSON. Dates are `YYYY-MM-DD` unless stated otherwise.
- **Authentication:** log in with `POST /api/auth/login`, then send `Authorization: Bearer <token>` on every protected endpoint. The token (JWT, payload `{ id, role }`) is valid for 7 days.
- **Roles:** `USER` and `ADMIN`. Endpoints under `/api/admin` need role `ADMIN`. Banned accounts cannot log in and their tokens stop working.
- **Error format:** every error is `{ "message": "..." }`.
- **Status codes:** `200` OK, `201` created, `400` invalid input, `401` missing / invalid / expired token, `403` not allowed (banned account, not an admin), `404` not found, `409` conflict (duplicate), `413` payload too large, `500` server error.
- Unknown routes answer `404 { "message": "Route not found" }` and malformed JSON answers `400 { "message": "Invalid JSON body" }`.
- **Ownership rule (R1):** a pet, weight record, visit or vaccination that belongs to another user answers **404**, exactly like one that does not exist, so other people's data is never revealed.
- **Soft delete (R6):** deleting a pet sets `is_active = false`. The pet disappears from every list, but its history is kept.
- Decimal columns (`weight_kg`, `cost`) are returned as strings such as `"4.20"` to keep their exact value.

## 2. Business rules

| Rule | Description |
|---|---|
| R1 | Every pet belongs to exactly one owner; all queries filter by the logged-in user. |
| R3 | `next_due_date` = `given_date` + the vaccine type's `interval_days` when it is not sent. A manual `next_due_date` must not be before `given_date`; `given_date` cannot be in the future. |
| R4 | Reminder status is computed on the server: **OVERDUE** (`next_due_date` before today), **DUE_SOON** (within the user's `remind_before_days`, default 7), **LATER** (everything else). |
| R5 | Only the latest dose of each (pet, vaccine type) pair is used for reminders. |
| R6 | Pets are soft-deleted and excluded from lists, dashboard and reminders. |
| R7 | Banned users cannot log in; admins cannot be banned. |

## 3. Endpoint overview

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | Public | Check that the API is running |
| GET | `/api/health` | Public | Check the database connection |
| POST | `/api/auth/register` | Public | Create an account |
| POST | `/api/auth/login` | Public | Log in |
| GET | `/api/users/me` | User | Get my profile |
| PUT | `/api/users/me` | User | Update my profile |
| GET | `/api/species` | Public | List pet species |
| GET | `/api/dashboard` | User | Health overview for the logged-in user |
| POST | `/api/pets/{id}/photo` | User | Upload a pet photo |
| GET | `/api/pets` | User | List my pets |
| POST | `/api/pets` | User | Add a pet |
| GET | `/api/pets/{id}` | User | Get one pet |
| PUT | `/api/pets/{id}` | User | Replace the details of a pet |
| DELETE | `/api/pets/{id}` | User | Delete a pet (soft delete) |
| GET | `/api/pets/{petId}/weights` | User | Weight history of a pet |
| POST | `/api/pets/{petId}/weights` | User | Add a weight measurement |
| PUT | `/api/pets/{petId}/weights/{weightId}` | User | Update a weight measurement |
| DELETE | `/api/pets/{petId}/weights/{weightId}` | User | Delete a weight measurement |
| GET | `/api/pets/{petId}/visits` | User | Vet visit history of a pet |
| POST | `/api/pets/{petId}/visits` | User | Add a vet visit |
| DELETE | `/api/pets/{petId}/visits/{visitId}` | User | Delete a vet visit |
| GET | `/api/vaccine-types` | User | List vaccine types |
| GET | `/api/pets/{petId}/vaccinations` | User | Vaccination history of a pet |
| POST | `/api/pets/{petId}/vaccinations` | User | Record a vaccination |
| PUT | `/api/vaccinations/{id}` | User | Update a vaccination |
| DELETE | `/api/vaccinations/{id}` | User | Delete a vaccination |
| GET | `/api/reminders/upcoming` | User | Vaccination reminders for all my pets |
| GET | `/api/admin/users` | Admin | List all users |
| PUT | `/api/admin/users/{id}/status` | Admin | Ban or unban a user |
| GET | `/api/admin/vaccine-types` | Admin | List all vaccine types (including hidden) |
| POST | `/api/admin/vaccine-types` | Admin | Create a vaccine type |
| PUT | `/api/admin/vaccine-types/{id}` | Admin | Update a vaccine type |
| DELETE | `/api/admin/vaccine-types/{id}` | Admin | Hide a vaccine type |

## 4. Endpoint details

### System

Service status.

#### `GET /`

**Check that the API is running** · Auth: Public

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | API is up | `API is running` |

Example `200` response:

```json
{
  "message": "API is running"
}
```


#### `GET /api/health`

**Check the database connection** · Auth: Public

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Database reachable | `Database connected` |
| 500 | Database not reachable | `Database connection failed` |

Example `200` response:

```json
{
  "message": "Database connected"
}
```


### Auth

Register and log in.

#### `POST /api/auth/register`

**Create an account** · Auth: Public

Creates a user with role `USER` and signs the user in (returns a token).

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes |  |
| `email` | string (email) | yes |  |
| `password` | string | yes | min 8 chars |

```json
{
  "name": "Bao Phan",
  "email": "bao@example.com",
  "password": "at-least-8-chars"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Account created |  |
| 400 | Missing name, invalid email, or password shorter than 8 characters | `Password must be at least 8 characters` |
| 409 | Email already registered | `Email already in use` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (201):

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | no | JWT, send it as a Bearer token |
| `user` | object | no |  |


#### `POST /api/auth/login`

**Log in** · Auth: Public

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string (email) | yes |  |
| `password` | string | yes |  |

```json
{
  "email": "demo@petcare.com",
  "password": "your-password"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Logged in |  |
| 400 | Email or password missing | `Email and password are required` |
| 401 | Wrong email or wrong password (same message on purpose) | `Invalid email or password` |
| 403 | Account was banned by an admin | `Account is banned` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | no | JWT, send it as a Bearer token |
| `user` | object | no |  |


### Users

Profile of the logged-in user.

#### `GET /api/users/me`

**Get my profile** · Auth: Bearer token

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Profile |  |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | User no longer exists | `User not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `email` | string | no |  |
| `role` | `USER` / `ADMIN` | no |  |
| `remind_before_days` | integer | no | How many days before a due date the reminders start |
| `created_at` | string (date-time) | no |  |


#### `PUT /api/users/me`

**Update my profile** · Auth: Bearer token

Send at least one field. Email and role cannot be changed here.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | no | max 100 chars, min 1 chars |
| `remind_before_days` | integer | no | min 1, max 365 |

```json
{
  "name": "Bao Phan",
  "remind_before_days": 14
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Updated profile |  |
| 400 | Name not 1 to 100 characters, remind_before_days not a whole number 1 to 365, or nothing to update | `remind_before_days must be a whole number from 1 to 365` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | User no longer exists | `User not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `email` | string | no |  |
| `role` | `USER` / `ADMIN` | no |  |
| `remind_before_days` | integer | no | How many days before a due date the reminders start |
| `created_at` | string (date-time) | no |  |


### Species

Pet species (public).

#### `GET /api/species`

**List pet species** · Auth: Public

Public. Sorted by name.

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Species list |  |
| 500 | Unexpected server error | `Internal server error` |

Example `200` response:

```json
[
  {
    "id": 2,
    "name": "Cat"
  },
  {
    "id": 1,
    "name": "Dog"
  },
  {
    "id": 3,
    "name": "Rabbit"
  }
]
```


### Pets

Pet profiles.

#### `GET /api/dashboard`

**Health overview for the logged-in user** · Auth: Bearer token

Counts active owned pets, weight records and vet visits. Returns at most eight health records ordered by record date (not an audit log).

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Overview |  |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `summary` | object | no |  |
| `activities` | array of object | no |  |


#### `POST /api/pets/{id}/photo`

**Upload a pet photo** · Auth: Bearer token

JPEG, PNG or WebP, maximum 5 MB. Requires backend Cloudinary configuration. Only updates avatar_url.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | ID of an active pet owned by the logged-in user. min 1 |

**Request body**

Content type: `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `photo` | string (binary) | yes |  |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Saved photo |  |
| 400 | Invalid file or ID | `Choose a JPEG, PNG or WebP photo.` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Missing, deleted or another owner's pet | `Pet not found` |
| 413 | Photo exceeds 5 MB | `Photo must be 5 MB or smaller.` |
| 500 | Unexpected server error | `Internal server error` |
| 502 | Storage failed | `Could not save the photo. Please try again.` |
| 503 | Storage not configured | `Photo uploads are not configured yet. Please try again later.` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `avatar_url` | string (uri) | no |  |
| `message` | string | no |  |


#### `GET /api/pets`

**List my pets** · Auth: Bearer token

Only active pets of the logged-in user, newest first.

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Pets |  |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `species_id` | integer | no |  |
| `breed` | string, nullable | no |  |
| `gender` | `MALE` / `FEMALE` / `UNKNOWN` | no |  |
| `birth_date` | string (date-time), nullable | no | Returned as an ISO timestamp, the date part is the birth date |
| `color` | string, nullable | no |  |
| `avatar_url` | string, nullable | no |  |
| `note` | string, nullable | no |  |
| `created_at` | string (date-time) | no |  |


#### `POST /api/pets`

**Add a pet** · Auth: Bearer token

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | max 100 chars |
| `species_id` | integer | yes | ID from GET /api/species. min 1 |
| `gender` | `MALE` / `FEMALE` / `UNKNOWN` | no | default `UNKNOWN` |
| `breed` | string, nullable | no | max 100 chars |
| `birth_date` | string (date), nullable | no |  |
| `color` | string, nullable | no | max 100 chars |
| `avatar_url` | string, nullable | no | max 500 chars |
| `note` | string, nullable | no | max 5000 chars |

```json
{
  "name": "Milo",
  "species_id": 1,
  "breed": "Poodle",
  "gender": "MALE",
  "birth_date": "2023-05-12",
  "color": "Brown",
  "note": "Friendly and active"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Pet created | `Pet created successfully` |
| 400 | Missing name or species_id, invalid gender, text too long, or birth_date not YYYY-MM-DD | `Valid name and species_id are required` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 500 | Unexpected server error | `Internal server error` |

Example `201` response:

```json
{
  "message": "Pet created successfully",
  "id": 4
}
```


#### `GET /api/pets/{id}`

**Get one pet** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | Pet ID. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Pet |  |
| 400 | ID is not a positive integer | `Invalid pet ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `species_id` | integer | no |  |
| `breed` | string, nullable | no |  |
| `gender` | `MALE` / `FEMALE` / `UNKNOWN` | no |  |
| `birth_date` | string (date-time), nullable | no | Returned as an ISO timestamp, the date part is the birth date |
| `color` | string, nullable | no |  |
| `avatar_url` | string, nullable | no |  |
| `note` | string, nullable | no |  |
| `created_at` | string (date-time) | no |  |


#### `PUT /api/pets/{id}`

**Replace the details of a pet** · Auth: Bearer token

Full update: `name` and `species_id` are required, optional fields you leave out are set to `null` (`gender` falls back to `UNKNOWN`).

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | Pet ID. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | max 100 chars |
| `species_id` | integer | yes | ID from GET /api/species. min 1 |
| `gender` | `MALE` / `FEMALE` / `UNKNOWN` | no | default `UNKNOWN` |
| `breed` | string, nullable | no | max 100 chars |
| `birth_date` | string (date), nullable | no |  |
| `color` | string, nullable | no | max 100 chars |
| `avatar_url` | string, nullable | no | max 500 chars |
| `note` | string, nullable | no | max 5000 chars |

```json
{
  "name": "Milo",
  "species_id": 1,
  "breed": "Poodle",
  "gender": "MALE",
  "birth_date": "2023-05-12",
  "color": "Brown",
  "note": "Now 5 kg"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Pet updated | `Pet updated successfully` |
| 400 | Invalid ID, name, species_id, gender, text field or birth_date | `Invalid gender` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |
| 500 | Unexpected server error | `Internal server error` |

Example `200` response:

```json
{
  "message": "Pet updated successfully"
}
```


#### `DELETE /api/pets/{id}`

**Delete a pet (soft delete)** · Auth: Bearer token

The pet is hidden from every list and its reminders stop. The data is kept.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | Pet ID. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Pet deleted | `Pet deleted successfully` |
| 400 | ID is not a positive integer | `Invalid pet ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |
| 500 | Unexpected server error | `Internal server error` |

Example `200` response:

```json
{
  "message": "Pet deleted successfully"
}
```


### Weights

Weight history of a pet.

#### `GET /api/pets/{petId}/weights`

**Weight history of a pet** · Auth: Bearer token

Newest measurement first.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Weight history |  |
| 400 | Pet ID is not a positive integer | `Invalid pet ID.` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | array of object | no |  |


#### `POST /api/pets/{petId}/weights`

**Add a weight measurement** · Auth: Bearer token

Only one measurement is allowed per pet at the same date and time.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `weight_kg` | number | yes | Greater than 0, at most 9999.99, up to 2 decimals |
| `measured_at` | string | yes | `YYYY-MM-DD HH:mm` (seconds optional). A `T` instead of the space is accepted. |
| `note` | string, nullable | no | max 5000 chars |

```json
{
  "weight_kg": 4.7,
  "measured_at": "2026-10-01 09:00",
  "note": "Monthly weight check"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Measurement saved |  |
| 400 | weight_kg not a positive number with at most 2 decimals, invalid measured_at, or note too long | `Weight must be a positive number with up to 2 decimal places.` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |
| 409 | There is already a measurement at this date and time | `A weight record already exists at this date and time.` |

Response fields (201):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `PUT /api/pets/{petId}/weights/{weightId}`

**Update a weight measurement** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |
| `weightId` | path | yes | Weight record ID. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `weight_kg` | number | yes | Greater than 0, at most 9999.99, up to 2 decimals |
| `measured_at` | string | yes | `YYYY-MM-DD HH:mm` (seconds optional). A `T` instead of the space is accepted. |
| `note` | string, nullable | no | max 5000 chars |

```json
{
  "weight_kg": 4.8,
  "measured_at": "2026-10-01 09:00",
  "note": "Corrected"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Measurement updated |  |
| 400 | Invalid ID or invalid body | `Invalid weight record ID.` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet or weight record not found | `Weight record not found.` |
| 409 | There is already a measurement at this date and time | `A weight record already exists at this date and time.` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `DELETE /api/pets/{petId}/weights/{weightId}`

**Delete a weight measurement** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |
| `weightId` | path | yes | Weight record ID. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Deleted | `Weight record deleted successfully.` |
| 400 | Invalid ID | `Invalid weight record ID.` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet or weight record not found | `Weight record not found.` |

Example `200` response:

```json
{
  "message": "Weight record deleted successfully."
}
```


### Vet visits

Veterinary visit history of a pet.

#### `GET /api/pets/{petId}/visits`

**Vet visit history of a pet** · Auth: Bearer token

Newest visit first.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Visits |  |
| 400 | Pet ID is not a positive integer | `Invalid pet ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `pet_id` | integer | no |  |
| `visit_date` | string (date) | no |  |
| `clinic` | string, nullable | no |  |
| `reason` | string, nullable | no |  |
| `diagnosis` | string, nullable | no |  |
| `cost` | string, nullable | no | Decimal returned as a string |
| `note` | string, nullable | no |  |


#### `POST /api/pets/{petId}/visits`

**Add a vet visit** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `visit_date` | string (date) | yes |  |
| `clinic` | string, nullable | no | max 255 chars |
| `reason` | string, nullable | no |  |
| `diagnosis` | string, nullable | no |  |
| `cost` | number, nullable | no | Up to 2 decimals. min 0, max 9999999999.99 |
| `note` | string, nullable | no |  |

```json
{
  "visit_date": "2026-07-10",
  "clinic": "PetCare Demo Clinic",
  "reason": "Routine health check",
  "diagnosis": "Healthy",
  "cost": 250000,
  "note": "Annual checkup"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Visit created | `Veterinary visit created` |
| 400 | Invalid visit_date, invalid cost, or a text field that is too long | `A valid visit_date (YYYY-MM-DD) is required` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |

Example `201` response:

```json
{
  "message": "Veterinary visit created",
  "id": 7
}
```


#### `DELETE /api/pets/{petId}/visits/{visitId}`

**Delete a vet visit** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |
| `visitId` | path | yes | Visit ID. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Deleted | `Veterinary visit deleted` |
| 400 | Invalid ID | `Invalid visit ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet or visit not found | `Visit not found` |

Example `200` response:

```json
{
  "message": "Veterinary visit deleted"
}
```


### Vaccinations

Vaccine types and the vaccination history of a pet.

#### `GET /api/vaccine-types`

**List vaccine types** · Auth: Bearer token

Active vaccine types, optionally only the ones for one species.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `speciesId` | query | no | Only vaccine types of this species. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Vaccine types |  |
| 400 | speciesId is not a positive integer | `Invalid speciesId` |
| 401 | Missing, invalid or expired token | `Authentication required` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `species_id` | integer | no |  |
| `interval_days` | integer, nullable | no | Days until the next dose |
| `description` | string, nullable | no |  |


#### `GET /api/pets/{petId}/vaccinations`

**Vaccination history of a pet** · Auth: Bearer token

Newest dose first.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Vaccinations |  |
| 400 | Pet ID is not a positive integer | `Invalid pet ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `pet_id` | integer | no |  |
| `vaccine_type_id` | integer | no |  |
| `vaccine_name` | string | no |  |
| `given_date` | string (date) | no |  |
| `next_due_date` | string (date), nullable | no |  |
| `clinic` | string, nullable | no |  |
| `note` | string, nullable | no |  |


#### `POST /api/pets/{petId}/vaccinations`

**Record a vaccination** · Auth: Bearer token

Rules:
- `vaccine_type_id` must be an active vaccine type of the **same species** as the pet.
- `given_date` must be a real date and cannot be in the future.
- If `next_due_date` is left out, it is calculated as `given_date + interval_days` of the vaccine type.
- A manual `next_due_date` cannot be before `given_date`.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `petId` | path | yes | ID of a pet that belongs to the logged-in user. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `vaccine_type_id` | integer | yes | ID from GET /api/vaccine-types, must match the pet species. min 1 |
| `given_date` | string (date) | yes | Cannot be in the future |
| `next_due_date` | string (date), nullable | no | Optional. Left out, it is given_date + interval_days. Cannot be before given_date. |
| `clinic` | string, nullable | no | max 255 chars |
| `note` | string, nullable | no |  |

```json
{
  "vaccine_type_id": 4,
  "given_date": "2026-05-15",
  "clinic": "PetCare Demo Clinic",
  "note": "First dose"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Vaccination created |  |
| 400 | Invalid input, for example the vaccine is for another species or given_date is in the future | `This vaccine type is not for this pet species` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Pet does not exist, is deleted, or belongs to another user (all answer 404 so other people's data is never revealed) | `Pet not found` |

Response fields (201):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `PUT /api/vaccinations/{id}`

**Update a vaccination** · Auth: Bearer token

Same body and rules as recording a vaccination.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | Vaccination ID. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `vaccine_type_id` | integer | yes | ID from GET /api/vaccine-types, must match the pet species. min 1 |
| `given_date` | string (date) | yes | Cannot be in the future |
| `next_due_date` | string (date), nullable | no | Optional. Left out, it is given_date + interval_days. Cannot be before given_date. |
| `clinic` | string, nullable | no | max 255 chars |
| `note` | string, nullable | no |  |

```json
{
  "vaccine_type_id": 4,
  "given_date": "2026-05-16",
  "next_due_date": "2027-05-16",
  "clinic": "PetCare Demo Clinic"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Vaccination updated |  |
| 400 | Invalid ID or invalid body | `next_due_date cannot be before given_date` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Vaccination does not exist or belongs to another user | `Vaccination not found` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `DELETE /api/vaccinations/{id}`

**Delete a vaccination** · Auth: Bearer token

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | Vaccination ID. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Deleted | `Vaccination deleted` |
| 400 | ID is not a positive integer | `Invalid vaccination ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 404 | Vaccination does not exist or belongs to another user | `Vaccination not found` |

Example `200` response:

```json
{
  "message": "Vaccination deleted"
}
```


### Reminders

Vaccinations that are overdue or due soon.

#### `GET /api/reminders/upcoming`

**Vaccination reminders for all my pets** · Auth: Bearer token

Groups the vaccinations of all my active pets by urgency.
- `OVERDUE`: `next_due_date` is before today.
- `DUE_SOON`: due today or within the reminder window.
- `LATER`: due after the window.

Only the **latest dose** of each (pet, vaccine type) counts, so an old dose is not reminded again after the pet was vaccinated again.
The window is `days` if given, otherwise the `remind_before_days` of my profile.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `days` | query | no | Reminder window in days (1 to 365). min 1, max 365 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Reminders |  |
| 400 | days is not a whole number from 1 to 365 | `days must be a whole number from 1 to 365` |
| 401 | Missing, invalid or expired token | `Authentication required` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `today` | string (date) | no |  |
| `remind_before_days` | integer | no |  |
| `summary` | object | no |  |
| `overdue` | array of object | no |  |
| `due_soon` | array of object | no |  |
| `later` | array of object | no |  |


### Admin

Admin only (role ADMIN): manage users and vaccine types.

#### `GET /api/admin/users`

**List all users** · Auth: Admin (Bearer token, role ADMIN)

Admin only. Newest accounts first.

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Users |  |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `email` | string | no |  |
| `role` | `USER` / `ADMIN` | no |  |
| `is_banned` | boolean | no |  |
| `created_at` | string (date-time) | no |  |
| `pet_count` | integer | no |  |


#### `PUT /api/admin/users/{id}/status`

**Ban or unban a user** · Auth: Admin (Bearer token, role ADMIN)

Admin only. A banned user cannot log in and old tokens stop working. Admin accounts cannot be banned.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | ID of the user. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `is_banned` | boolean | yes |  |

```json
{
  "is_banned": true
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Status changed |  |
| 400 | Invalid ID, is_banned is not a boolean, or target is an admin | `is_banned must be true or false` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 404 | User does not exist | `User not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `user` | object | no |  |


#### `GET /api/admin/vaccine-types`

**List all vaccine types (including hidden)** · Auth: Admin (Bearer token, role ADMIN)

Admin only. Unlike GET /api/vaccine-types this also returns hidden types.

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Vaccine types |  |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200, each item):

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | integer | no |  |
| `name` | string | no |  |
| `species_id` | integer | no |  |
| `species_name` | string | no |  |
| `interval_days` | integer, nullable | no |  |
| `description` | string, nullable | no |  |
| `is_active` | boolean | no |  |


#### `POST /api/admin/vaccine-types`

**Create a vaccine type** · Auth: Admin (Bearer token, role ADMIN)

Admin only.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | max 150 chars |
| `species_id` | integer | yes | min 1 |
| `interval_days` | integer, nullable | no | min 1, max 3650 |
| `description` | string, nullable | no | max 5000 chars |
| `is_active` | boolean | no | Only used by PUT |

```json
{
  "name": "Rabies - Rabbit",
  "species_id": 4,
  "interval_days": 365,
  "description": "Yearly booster"
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 201 | Created |  |
| 400 | Invalid input | `Name must be 1 to 150 characters` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (201):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `PUT /api/admin/vaccine-types/{id}`

**Update a vaccine type** · Auth: Admin (Bearer token, role ADMIN)

Admin only. Send the full object. Send is_active true to show a hidden type again.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | ID of the vaccine type. min 1 |

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | yes | max 150 chars |
| `species_id` | integer | yes | min 1 |
| `interval_days` | integer, nullable | no | min 1, max 3650 |
| `description` | string, nullable | no | max 5000 chars |
| `is_active` | boolean | no | Only used by PUT |

```json
{
  "name": "Rabies - Rabbit",
  "species_id": 4,
  "interval_days": 365,
  "is_active": true
}
```

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Updated |  |
| 400 | Invalid input | `A valid species_id is required` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 404 | Vaccine type does not exist | `Vaccine type not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |
| `data` | object | no |  |


#### `DELETE /api/admin/vaccine-types/{id}`

**Hide a vaccine type** · Auth: Admin (Bearer token, role ADMIN)

Admin only. Sets is_active = false instead of deleting, so old vaccinations keep their vaccine name.

**Parameters**

| Name | In | Required | Notes |
|---|---|---|---|
| `id` | path | yes | ID of the vaccine type. min 1 |

**Responses**

| Status | Meaning | Message / example |
|---|---|---|
| 200 | Hidden |  |
| 400 | ID is not a positive integer | `Invalid vaccine type ID` |
| 401 | Missing, invalid or expired token | `Authentication required` |
| 403 | The user is not an admin | `Admin access required` |
| 404 | Vaccine type does not exist | `Vaccine type not found` |
| 500 | Unexpected server error | `Internal server error` |

Response fields (200):

| Field | Type | Required | Notes |
|---|---|---|---|
| `message` | string | no |  |

## 5. Changing the API

1. Change the route in `backend/src/routes`.
2. Update `backend/src/docs/openapi.js` so Swagger stays correct.
3. Update this file (the endpoint overview and the affected endpoint section).
4. Tell the other team member in the pull request, because the frontend may need to change.
