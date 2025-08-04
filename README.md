# bitespeed

The application uses NodeJs with Javascript, Postgres with Sequelize as the ORM.

## 📁 Application Structure

This project follows a modular architecture for better scalability and maintainability. Below is a description of each directory and file:

### 📂 `config/`

Contains database configuration file for connecting to the database.

### 📂 `controllers/`

Houses the route controller logic. This function handle the incoming requests, call services, and return responses.

### 📂 `models/`

Defines the data schema and ORM models.

### 📂 `routes/`

Defines the API endpoints and maps them to corresponding controller functions.

### 📂 `services/`

Business logic is implemented here. Controllers delegate operations to these service layer functions.

### 📂 `validations/`

Contains input validation logic, using Joi to ensure request data integrity.

### 🗃️ Database Schema

### Contact

The application uses a single Contact model to manage user identity records. This model supports identity reconciliation using contact details.

Fields:

- phoneNumber (STRING): Optional phone number of the user.

- email (STRING): Optional email address of the user.

- linkedId (INTEGER): References the primary contact’s ID if the current record is a secondary contact.

- linkPrecedence (ENUM): Indicates whether the contact is "primary" or "secondary". Defaults to "primary".

- createdAt / updatedAt (DATE): Timestamps for record creation and updates.

- deletedAt (DATE): Soft delete timestamp. Records are soft-deleted using Sequelize's paranoid mode.

🧭 Indexes:
Indexes are defined on:

- email

- phoneNumber

- linkedId

This improves performance for identity resolution queries during reconciliation.

The Postgres instance and the application, both are deployed on render.com

Endpoint -
`https://bitespeed-5j9l.onrender.com/identify`

Sample Request:

```
curl --location 'https://bitespeed-5j9l.onrender.com/identify' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email":"new@example.com",
    "phoneNumber":"123456789"
}'
```

If request is taking too much time initally, render has probably spun down the instance as it was idle for a long time. If any other issue is suspected, please leave a comment on any commit.
Thank you!
