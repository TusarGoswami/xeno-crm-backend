# 🚀 Campaign Copilot — CRM Backend

> **AI-Native Mini CRM for Reaching Shoppers** — Built for [XENO](https://www.xeno.co/) Engineering Take-Home Assignment

🔗 **Live API:** [https://xeno-crm-backend-i0y6.onrender.com](https://xeno-crm-backend-i0y6.onrender.com)

The core backend service for **Campaign Copilot**, an AI-native Mini CRM that lets marketers describe campaigns in plain English. This service uses **Google Gemini AI** to parse natural language into customer segment filters, queries **MongoDB** to find matching audiences, drafts personalized messages, and orchestrates campaign delivery through the Channel Service. It also ingests real-time delivery callbacks to update live campaign statistics and tracks campaign-to-order attribution.

---

## 🏗️ Architecture Overview

```
┌───────────────────────────────────────────────────────────────┐
│                    Campaign Copilot System                    │
├───────────────┬───────────────────────┬───────────────────────┤
│   Frontend    │      Backend          │   Channel Service     │
│   (Vercel)    │    ★ (this repo)      │     (Render)          │
│               │      (Render)         │                       │
│  React + Vite │  Node.js + Express    │  Node.js + Express    │
│  Tailwind CSS │  MongoDB + Gemini AI  │  Delivery Simulator   │
│               │                       │                       │
│  ──API───────>│  ──POST /send───────> │                       │
│               │  <──POST /receipt──── │                       │
└───────────────┴───────────────────────┴───────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Purpose |
|---|---|
| **Node.js** | Runtime |
| **Express.js** | REST API framework |
| **MongoDB Atlas** | Database (via Mongoose ODM) |
| **Google Gemini AI** | Natural language parsing (`gemini-1.5-flash`) |
| **Axios** | HTTP client for Channel Service communication |

---

## ✨ Key Features

- **AI-Powered Campaign Parsing** — Natural language to structured filters via Gemini AI
- **Dynamic Customer Segmentation** — Flexible MongoDB queries with AND/OR logic
- **Multi-Channel Support** — WhatsApp, SMS, Email, RCS
- **Real-Time Delivery Tracking** — Ingests callbacks: sent → delivered → opened → clicked → converted
- **Campaign Attribution** — Links orders back to campaigns for ROI tracking
- **Demo Data Seeding** — 100 realistic Indian customers with order history

---

## 📁 Project Structure

```
xeno-crm-backend/
├── src/
│   ├── models/
│   │   ├── Customer.js       # Customer schema with segment-filterable fields
│   │   ├── Order.js          # Order schema with campaign attribution
│   │   ├── Campaign.js       # Campaign schema with embedded stats
│   │   └── Message.js        # Message schema with status hierarchy
│   ├── routes/
│   │   ├── ai.js             # POST /api/ai/parse — Gemini AI integration
│   │   ├── segments.js       # POST /api/segments/preview — dynamic segmentation
│   │   ├── campaigns.js      # CRUD + campaign launch + channel routing
│   │   ├── receipt.js        # POST /api/receipt — delivery callbacks + attribution
│   │   └── customers.js      # Customer CRUD + order management
│   ├── services/
│   │   └── gemini.js         # Gemini AI service with structured prompting + fallback
│   ├── seed/
│   │   └── seedData.js       # Generates 100 Indian customers + orders (all channels)
│   └── index.js              # Express app entry point
├── .env                       # Environment variables (not committed)
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Google Gemini API key

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/TusarGoswami/xeno-crm-backend.git
cd xeno-crm-backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Then fill in your values (see Environment Variables below)

# 4. Seed the database with sample data
npm run seed

# 5. Start the development server
npm run dev
```

The server will start on `http://localhost:3001`.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

| Variable | Description | Example |
|---|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/campaign-copilot` |
| `GEMINI_API_KEY` | Google Gemini API key | `AIza...` |
| `CHANNEL_SERVICE_URL` | URL of the Channel Service | `http://localhost:4000` |
| `PORT` | Port to run the server on | `3001` |

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ai/parse` | Parse natural language prompt via Gemini AI |
| `POST` | `/api/segments/preview` | Preview matching customers for segment filters |
| `POST` | `/api/campaigns/create` | Create and launch a campaign |
| `GET` | `/api/campaigns` | List all campaigns with stats |
| `GET` | `/api/campaigns/:id` | Get campaign details with message list |
| `POST` | `/api/receipt` | Receive delivery status callbacks from Channel Service |
| `GET` | `/api/customers` | List customers with filtering |
| `POST` | `/api/customers` | Add a new customer |
| `POST` | `/api/customers/:id/orders` | Record an order with optional campaign attribution |
| `GET` | `/health` | Health check |

### AI Parse — Example Request

```bash
curl -X POST https://xeno-crm-backend-i0y6.onrender.com/api/ai/parse \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Send a WhatsApp promo to customers who spent more than 5000 in the last 30 days"}'
```

### AI Parse — Example Response

```json
{
  "filters": {
    "totalSpend": { "operator": ">", "value": 5000 },
    "lastVisit": { "operator": ">", "value": "30_days" }
  },
  "logic": "AND",
  "channel": "whatsapp",
  "suggestedMessage": "🎉 Hey {name}! As one of our top shoppers, enjoy an exclusive 20% off on your next purchase. Shop now!"
}
```

---

## 🌐 Deployed URLs

| Service | URL |
|---|---|
| **Frontend** | [xeno-crm-frontend-blond.vercel.app](https://xeno-crm-frontend-blond.vercel.app) |
| **Backend (this repo)** | [xeno-crm-backend-i0y6.onrender.com](https://xeno-crm-backend-i0y6.onrender.com) |
| **Channel Service** | [xeno-channel-service-kbs0.onrender.com](https://xeno-channel-service-kbs0.onrender.com) |

---

## 🔗 Related Repositories

| Service | Repository |
|---|---|
| **Frontend** | [xeno-crm-frontend](https://github.com/TusarGoswami/xeno-crm-frontend) |
| **Backend (this repo)** | [xeno-crm-backend](https://github.com/TusarGoswami/xeno-crm-backend) |
| **Channel Service** | [xeno-channel-service](https://github.com/TusarGoswami/xeno-channel-service) |

---

## 📄 License

MIT
