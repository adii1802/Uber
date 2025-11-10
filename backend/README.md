## POST /users/register

Description
---------
Register a new user account. This endpoint accepts JSON and creates a new user when the provided data passes validation.

Base path
---------
This route is defined as `router.post('/register', ...)` in `user.routes.js` and is typically mounted at `/users`. The full endpoint URL is:

    POST /users/register

Request headers
---------------
- Content-Type: application/json

Request body (JSON)
-------------------
The endpoint expects the following JSON structure:

```json
{
  "fullname": {
    "firstname": "string",
    "lastname": "string"
  },
  "email": "user@example.com",
  "password": "secret123"
}
```

Validation rules (enforced server-side)
-------------------------------------
- `fullname.firstname`: required, string, minimum 3 characters.
- `fullname.lastname`: string, minimum 3 characters (not required in schema but validated if provided).
- `email`: required, must be a valid email address, minimum length 5, must be unique.
- `password`: required, minimum length 6.

Typical responses and status codes
---------------------------------
- 201 Created
  - Description: User registered successfully.
  - Body (example):
    ```json
    {
      "message": "User created successfully",
      "userId": "<user id>",
      "token": "<jwt token>"
    }
    ```

- 400 Bad Request
  - Description: Validation failed (missing/invalid fields).
  - Body (example):
    ```json
    {
      "errors": [
        { "msg": "Invalid email address", "param": "email" },
        { "msg": "Firstname must be at least 3 characters long", "param": "fullname.firstname" }
      ]
    }
    ```

- 409 Conflict
  - Description: Email already exists (unique constraint violation).
  - Body (example):
    ```json
    {
      "message": "Email already registered"
    }
    ```

- 500 Internal Server Error
  - Description: Unexpected server error (DB or other). Returns an error message.

Examples
--------

Sample request (minimal valid):

```json
{
  "fullname": { "firstname": "Ada", "lastname": "Lovelace" },
  "email": "ada@example.com",
  "password": "password123"
}
```

Sample validation error response (missing/invalid fields):

```json
{
  "errors": [
    { "msg": "Invalid email address", "param": "email" },
    { "msg": "Password must be at least 6 characters long", "param": "password" }
  ]
}
```

How the data is required (summary)
----------------------------------
- fullname.firstname (required): string, min length 3.
- fullname.lastname (optional): string, min length 3 when present.
- email (required): string, valid email format, min length 5, must be unique.
- password (required): string, min length 6.

Notes and implementation hints
------------------------------
- The project enforces some validations using `express-validator` in `user.routes.js` and Mongoose schema-level constraints in `user.model.js`.
- Ensure requests include `Content-Type: application/json` and send a JSON body.
- If you change validation logic in code, update this README accordingly.

File location
-------------
This documentation file is located at `backend/README.md`.

## POST /users/login

Description
---------
Authenticate a user and return an access token (JWT). This endpoint accepts JSON and validates credentials.

Base path
---------
This route is defined as `router.post('/login', ...)` in `user.routes.js` and is typically mounted at `/users`. The full endpoint URL is:

    POST /users/login

Request headers
---------------
- Content-Type: application/json

Request body (JSON)
-------------------
The endpoint expects the following JSON structure:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Validation rules (enforced server-side)
-------------------------------------
- `email`: required, must be a valid email address.
- `password`: required, minimum length 6.

Typical responses and status codes
---------------------------------
- 200 OK
  - Description: Authentication successful.
  - Body (example):
    ```json
    {
      "message": "Login successful",
      "token": "<jwt token>",
      "userId": "<user id>"
    }
    ```

- 400 Bad Request
  - Description: Validation failed (missing/invalid fields).
  - Body (example):
    ```json
    {
      "errors": [
        { "msg": "Invalid email address", "param": "email" },
        { "msg": "Password must be at least 6 characters long", "param": "password" }
      ]
    }
    ```

- 401 Unauthorized
  - Description: Authentication failed (wrong credentials).
  - Body (example):
    ```json
    {
      "message": "Invalid email or password"
    }
    ```

- 500 Internal Server Error
  - Description: Unexpected server error (DB or other). Returns an error message.

Examples
--------

Sample request:

```json
{
  "email": "ada@example.com",
  "password": "password123"
}
```

Sample authentication failure response:

```json
{
  "message": "Invalid email or password"
}
```

How the data is required (summary)
----------------------------------
- email (required): string, valid email format.
- password (required): string, min length 6.

Notes and implementation hints
------------------------------
- The project validates login inputs using `express-validator` in `user.routes.js` and checks credentials in `user.controller.js`/`user.service.js`.
- On success the controller should return a JWT (e.g., created with `user.generateAuthToken()` or similar) for use in authenticated requests.
- If you change the login flow, update this README accordingly.
