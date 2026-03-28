<!-- @format -->

# PayPiggy

A secure, full-featured banking API built with Node.js, Express, and MySQL. PayPiggy supports user authentication with multi-channel OTP verification, money transfers, transaction history, and fraud detection.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [OTP Channels](#otp-channels)
- [Fraud Detection](#fraud-detection)
- [Database Schema](#database-schema)

---

## Features

- User registration and login with JWT authentication
- Multi-channel OTP verification (Email, SMS, Firebase Push)
- Money transfers with unique transaction reference numbers
- Ledger entries (debit/credit) per transfer
- Paginated and filtered transaction history
- Real-time fraud detection and risk scoring
- Multi-channel fraud alerts (Email, SMS, Push)
- Transfer limits and velocity checks
- Fraud event logging

---

## Tech Stack

| Layer           | Technology                        |
| --------------- | --------------------------------- |
| Runtime         | Node.js                           |
| Framework       | Express.js                        |
| Database        | MySQL                             |
| Authentication  | JWT + bcryptjs                    |
| OTP / Alerts    | Mailjet, Twilio, Firebase FCM     |
| Fraud Detection | Custom rule engine + risk scoring |

---

## Project Structure

```
paypiggy/
├── config/
│   ├── db.js                  # MySQL connection pool
│   └── firebase.js            # Firebase Admin SDK setup
├── controllers/
│   ├── authController.js      # Register, login, OTP send/verify
│   └── transactionController.js # Transfer, transaction history
├── middleware/
│   └── fraud.middleware.js    # Fraud checks and alerts
├── models/
│   └── userModel.js           # User DB queries
├── routes/
│   ├── authRoutes.js          # Auth endpoints
│   └── transactionRoutes.js   # Transaction endpoints
├── service/
│   └── fraud.service.js       # Risk scoring engine
├── utils/
│   ├── otpUtils.js            # OTP generator
│   └── sendOtp.js             # Email, SMS, Push senders
├── .env                       # Environment variables (gitignored)
├── .gitignore
└── server.js                  # App entry point
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MySQL 8+
- A Mailjet account
- A Twilio account
- A Firebase project

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/paypiggy.git
cd paypiggy

# Install dependencies
npm install

# Set up your environment variables
cp .env.example .env
```

### Database Setup

Run the following SQL in order:

```sql
CREATE DATABASE paypiggy;
USE paypiggy;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  fcm_token VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  sort_code VARCHAR(10) NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  account_type VARCHAR(50) DEFAULT 'standard',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  from_account INT NOT NULL,
  to_account INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reference VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_account) REFERENCES accounts(id),
  FOREIGN KEY (to_account) REFERENCES accounts(id)
);

CREATE TABLE ledger_entries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transaction_id INT NOT NULL,
  account_id INT NOT NULL,
  type ENUM('debit', 'credit') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transaction_id) REFERENCES transactions(id),
  FOREIGN KEY (account_id) REFERENCES accounts(id)
);

CREATE TABLE otps (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp VARCHAR(5) NOT NULL,
  channel ENUM('email', 'sms', 'push') NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE fraud_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  reason VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45),
  amount DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Start the server

```bash
# Development
npm run dev

# Production
npm start
```

---

## Environment Variables

Create a `.env` file in the root of the project:

```env
# Server
PORT=3000
JWT_SECRET=your_jwt_secret_here

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_db_password
DB_NAME=paypiggy

# Mailjet
MAILJET_API_KEY=your_mailjet_api_key
MAILJET_SECRET_KEY=your_mailjet_secret_key
MAILJET_FROM_EMAIL=noreply@paypiggy.com

# Twilio
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Firebase (base64 encoded service account JSON)
FIREBASE_SERVICE_ACCOUNT=your_base64_encoded_service_account
```

To generate FIREBASE_SERVICE_ACCOUNT:

```bash
node -e "console.log(Buffer.from(JSON.stringify(require('./serviceAccountKey.json'))).toString('base64'))"
```

---

## API Endpoints

### Auth

| Method | Endpoint                   | Description                 | Auth Required |
| ------ | -------------------------- | --------------------------- | ------------- |
| POST   | `/api/auth/register`       | Create a new user           | No            |
| POST   | `/api/auth/login`          | Login, returns userId       | No            |
| POST   | `/api/auth/send-otp`       | Send OTP via chosen channel | No            |
| POST   | `/api/auth/verify-otp`     | Verify OTP, returns JWT     | No            |
| POST   | `/api/auth/save-fcm-token` | Save device FCM token       | Yes           |

### Transactions

| Method | Endpoint                               | Description                       | Auth Required |
| ------ | -------------------------------------- | --------------------------------- | ------------- |
| POST   | `/api/transactions/transfer`           | Transfer money between accounts   | Yes           |
| GET    | `/api/transactions/history/:accountId` | Get paginated transaction history | Yes           |

### Accounts

| Method | Endpoint            | Description       | Auth Required |
| ------ | ------------------- | ----------------- | ------------- |
| POST   | `/api/accounts`     | Create an account | Yes           |
| GET    | `/api/accounts`     | Get all accounts  | Yes           |
| GET    | `/api/accounts/:id` | Get account by ID | Yes           |
| PUT    | `/api/accounts/:id` | Update account    | Yes           |
| DELETE | `/api/accounts/:id` | Delete account    | Yes           |

---

## OTP Channels

PayPiggy supports three OTP delivery channels. OTPs are 5 digits, numeric only, and expire after 10 minutes.

### Email (Mailjet)

```json
POST /api/auth/send-otp
{
  "userId": 1,
  "channel": "email"
}
```

### SMS (Twilio)

```json
POST /api/auth/send-otp
{
  "userId": 1,
  "channel": "sms",
  "phone": "+447911123456"
}
```

### Push Notification (Firebase)

```json
POST /api/auth/send-otp
{
  "userId": 1,
  "channel": "push",
  "fcmToken": "device_fcm_token"
}
```

---

## Fraud Detection

Every transfer passes through the fraud middleware before being processed.

### Rules

| Check           | Limit                          | Response                    |
| --------------- | ------------------------------ | --------------------------- |
| Transfer amount | Max 10,000                     | 400 - Amount too large      |
| Velocity        | Max 5 transactions/min         | 429 - Too many transactions |
| Account age     | Min 1 day old                  | 403 - Account too new       |
| IP address      | Max 20 transactions/hr per IP  | 403 - Suspicious IP         |
| Risk score      | Score >= 70 blocks transaction | 403 - Transaction blocked   |

### Alerts

When a transaction is flagged, the user is immediately notified via Email, SMS, and Firebase push notification. All fraud events are logged to the `fraud_logs` table for auditing.

---

## Database Schema

```
users
  └── accounts (user_id -> users.id)
        └── transactions (from_account, to_account -> accounts.id)
              └── ledger_entries (transaction_id -> transactions.id)
                                 (account_id -> accounts.id)

users
  └── otps (user_id -> users.id)
  └── fraud_logs (user_id -> users.id)
```

---

## License

MIT - PayPiggy
