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

# Install dependencies

npm install

# Set up your environment variables

cp .env.example .env

```

### Database Setup


```
