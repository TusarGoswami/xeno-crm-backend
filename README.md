# 🚀 Campaign Copilot — CRM Backend

The core backend service for **Campaign Copilot**, an AI-native Mini CRM that lets marketers describe campaigns in plain English. This service uses **Google Gemini AI** to parse natural language into customer segment filters, queries **MongoDB** to find matching audiences, drafts personalized messages, and orchestrates campaign delivery through the Channel Service. It also ingests real-time delivery callbacks to update live campaign statistics.

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

## 📁 Project Structure

```
xeno-crm-backend/
├── src/
│   ├── models/
│   │   ├── Customer.js       # Customer schema with segment-filterable fields
│   │   ├── Order.js          # Order schema with line items
│   │   ├── Campaign.js       # Campaign schema with embedded stats
│   │   └── Message.js        # Message schema with status hierarchy
│   ├── routes/
│   │   ├── ai.js             # POST /api/ai/parse — Gemini integration
│   │   ├── segments.js       # POST /api/segments/preview — dynamic segmentation
│   │   ├── campaigns.js      # CRUD + campaign launch
│   │   ├── receipt.js        # POST /api/receipt — delivery callbacks
│   │   └── customers.js      # Customer listing
│   ├── services/
│   │   └── gemini.js         # Gemini AI service with structured prompting
│   ├── seed/
│   │   └── seedData.js       # Generates 100 Indian customers + orders
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
| `POST` | `/api/receipt` | Receive delivery status callbacks |
| `GET` | `/api/customers` | List customers |
| `GET` | `/health` | Health check |

---

## 🔗 Related Repositories

| Service | Repository |
|---|---|
| **Frontend** | [xeno-crm-frontend](https://github.com/TusarGoswami/xeno-crm-frontend) |
| **Channel Service** | [xeno-channel-service](https://github.com/TusarGoswami/xeno-channel-service) |
| **Backend (this repo)** | [xeno-crm-backend](https://github.com/TusarGoswami/xeno-crm-backend) |

---

## 📄 License

MIT
