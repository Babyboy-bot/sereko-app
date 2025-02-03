# Sereko API

API server for Sereko payment and notifications handling.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a .env file:
```bash
cp .env.example .env
```

3. Run development server:
```bash
npm run dev
```

4. Build for production:
```bash
npm run build
```

5. Start production server:
```bash
npm start
```

## API Endpoints

### Payments
- POST /api/payments/process
- POST /api/payments/webhook/orange
- POST /api/payments/webhook/mtn

### Notifications
- POST /api/notifications/send
- GET /api/notifications/reminders
