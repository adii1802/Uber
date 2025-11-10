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

-------------------------------------
- `fullname.firstname`: required, string, minimum 3 characters.
- `fullname.lastname`: string, minimum 3 characters (not required in schema but validated if provided).
- `password`: required, minimum length 6.

Typical responses and status codes
---------------------------------
- 201 Created
    ```json
    {
      "userId": "<user id>",
      "token": "<jwt token>"
    }
    ```

- 400 Bad Request
  - Description: Validation failed (missing/invalid fields).
  - Body (example):
    ```json
    {
      ]
    }
- 409 Conflict
  - Description: Email already exists (unique constraint violation).
  - Body (example):
    ```json
    {
      "message": "Email already registered"
    }
    ```

- 500 Internal Server Error

Examples
--------

Sample request (minimal valid):

```json
{
  "fullname": { "firstname": "Ada", "lastname": "Lovelace" },
  "email": "ada@example.com",
  "password": "password123"
```

Sample validation error response (missing/invalid fields):

```json
{
  "errors": [
    { "msg": "Invalid email address", "param": "email" },
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


Base path

Request headers

Description
---------
Return the authenticated user's profile information. This is a protected route and requires a valid access token (JWT) or a session cookie depending on how authentication is implemented.

Base path
---------
This route is defined as `router.get('/profile', ...)` in `user.routes.js` and is typically mounted at `/users`. The full endpoint URL is:

    GET /users/profile

Request headers
---------------
- Authorization: Bearer <token>  OR
- Cookie: token=<jwt token>  (if the app uses cookies)

Request body
------------
None. This endpoint expects no request body.

Typical responses and status codes
---------------------------------
- 200 OK
  - Description: Profile retrieved successfully.
  - Body (example):
    ```json
    {
      "user": {
        "_id": "<user id>",
        "fullname": { "firstname": "Ada", "lastname": "Lovelace" },
        "email": "ada@example.com",
        "socketId": null
      }
    }
    ```

- 401 Unauthorized
  - Description: Missing or invalid authentication token / session.
  - Body (example):
    ```json
    { "message": "Authentication required" }
    ```

- 500 Internal Server Error
  - Description: Unexpected server error.

Examples
--------

Sample success response:

```json
{
  "user": {
    "_id": "642a...",
    "fullname": { "firstname": "Ada", "lastname": "Lovelace" },
    "email": "ada@example.com",
    "socketId": null
  }
}
```

How the data is required (summary)
----------------------------------
- No request body required. Must supply a valid authentication token (Authorization header or cookie).

Notes and implementation hints
------------------------------
- This endpoint uses an authentication middleware (e.g., `authMiddleware.authUser`) to populate `req.user` with the authenticated user's data.
- Ensure middleware returns 401 when unauthenticated and attaches the user object to the request when authenticated.

## GET /users/logout

Description
---------
Log the user out by clearing the server-side session or instructing the client to remove the authentication token/cookie.

Base path
---------
This route is defined as `router.get('/logout', ...)` in `user.routes.js` and is typically mounted at `/users`. The full endpoint URL is:

    GET /users/logout

Request headers
---------------
- Authorization: Bearer <token>  OR
- Cookie: token=<jwt token>

Request body
------------
None.

Typical responses and status codes
---------------------------------
- 200 OK
  - Description: Logout successful. Server cleared session or instructed client to remove token/cookie.
  - Body (example):
    ```json
    { "message": "Logged out successfully" }
    ```

- 401 Unauthorized
  - Description: Missing or invalid authentication token.
  - Body (example):
    ```json
    { "message": "Authentication required" }
    ```

- 500 Internal Server Error
  - Description: Unexpected server error.

Examples
--------

Sample success response:

```json
{ "message": "Logged out successfully" }
```

How the data is required (summary)
----------------------------------
- No request body required. Call must include a valid authentication token (Authorization header or cookie) so the server can identify and clear the session/token.

Notes and implementation hints
------------------------------
- Implementation approaches:
  - If tokens are stateless JWTs, logout on the client by deleting the token (server can also maintain a token blacklist if needed).
  - If sessions/cookies are used, clear the cookie and destroy the server session.
- The endpoint should call the authentication middleware to ensure the user is authenticated before attempting logout.
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
