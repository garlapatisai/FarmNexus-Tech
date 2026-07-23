# 🌾 FarmNexus Tech

**Live Demo:** [https://frontend-pink-three-62.vercel.app](https://frontend-pink-three-62.vercel.app)

**FarmNexus Tech** is a peer-to-peer digital marketplace that connects Indian farmers directly with buyers. By providing real-time listing tools, secure digital escrow payments, live order-based chat, and Google Gemini AI insights, FarmNexus empowers farmers to sell their produce at fair market prices while enabling buyers to access fresh, high-quality crop yields directly from the source.

---

## 💡 How It Works

### 1. The Farmer's Journey
- **List Produce:**
  - Farmers create detailed listings for their crops (specifying the category, quantity, availability date, and location) and upload photos.
- **Get AI Price Suggestions:**
  - Farmers can request price recommendations from the built-in Gemini AI assistant to list their crops at fair Indian wholesale mandi rates.
- **Monitor Analytics & Demand:**
  - Farmers view interactive charts showing their sales distribution and revenue metrics, along with predicted regional crop demand forecasts.
- **Interact with AI Farm Assistant:**
  - Farmers can chat with an agricultural assistant chatbot for advice on crop health, soil quality, storage, and weather.

### 2. The Buyer's Journey
- **Browse & Search:**
  - Buyers explore live crop listings on an interactive map or grid.
- **Use Smart AI Search:**
  - Instead of standard filters, buyers can search using natural language (e.g., *"fresh mangoes under 100 per kg in Guntur"*). The system uses Gemini AI to parse the request and filter listings automatically.
- **Secure Purchases:**
  - Buyers add items to their cart and checkout using the Razorpay payment gateway.
- **Track Orders & Rate:**
  - Buyers check order history, rate the farmers, and coordinate delivery.

### 3. Order Coordination & Escrow Payments
- **Direct Messaging:**
  - Once an order is placed, a dedicated chat channel opens between the farmer and buyer to coordinate pickup or shipping.
- **Cryptographic Signature Verification:**
  - The system verifies transaction authenticity securely to ensure reliable order verification.

---

## ✨ Core Features

### 👨‍🌾 Farmer Dashboard
- **Produce Listings:** Manage crop category, pricing, available quantities, geographic location, and photos.
- **Dynamic Analytics:** Visualize overall revenue, monthly trends, and product distribution charts.
- **Regional Demand Forecasting:** Fetch state-wise crop demand predictions.
- **RAG-Powered AI Farm Assistant:** Consult a grounded agricultural knowledge assistant. Queries are embedded via vector search against a curated Indian agriculture knowledge base (~55 topics including PM-KISAN, crop cultivation, soil health, drip irrigation, and pest management) to provide verified answers with expandable source citations.

### 🛍️ Buyer Platform
- **Visual Map Search:** Look up listings by distance and proximity on an interactive map.
- **Natural Language Search Parser:** Instantly translates unstructured query inputs into exact category, price, and keyword parameters.
- **Direct Checkout:** Quick online payments integrated with Razorpay.
- **Order-scoped Chat:** Instant direct messaging with the seller for order details.

---

## 🏗️ Architecture & Tech Stack

The platform is built on a modern, modular architecture:

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, Zustand, Leaflet maps, and Recharts.
- **Backend:** Node.js, Express, and the Razorpay Node SDK.
- **Database & Realtime Services:** Supabase (PostgreSQL), utilizing Row-Level Security (RLS) and real-time database subscription channels for messaging.
- **Artificial Intelligence & RAG:** 
  - **Generation:** Google Gemini AI integration (`gemini-2.5-flash` model REST API).
  - **RAG Vector Search:** Client-side vector embedding pipeline (`text-embedding-004` / local TF-IDF fallback vectorizer) with in-memory cosine similarity search over curated Indian agricultural knowledge bases, featuring source citations and `localStorage` vector caching.

---

## 📁 Repository Structure

```text
├── backend/               # Express server for Razorpay payments & Agentic AI orchestrator
│   ├── src/
│   │   ├── server.js      # Main Express API entrypoint & agent route (/api/ai/agent)
│   │   └── services/      # Agent tool definitions (agent.js)
│   └── .env.example       # Backend environment variables template
├── frontend/              # React + Vite application (styled with Tailwind CSS)
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Farmer Dashboard, Buyer Home, Analytics, etc.
│   │   └── services/      # RAG engine (ragEngine.ts), knowledgeBase.ts, agentService.ts
│   └── .env.example       # Frontend environment variables template
├── supabase/
│   └── policies.sql       # RLS policies and bucket setups
├── supabase-schema.sql    # Database schema tables and enums
├── package.json           # Root package defining workspaces & scripts
└── README.md              # Main project documentation
```

---

## 🚀 Setup & Local Running Instructions

Follow these steps to set up the project locally:

### 1. Prerequisites
Ensure you have **Node.js** (v18+) and **npm** installed.

### 2. Environment Variables Configuration
Configure environment variables for both the frontend and backend:

#### Frontend (`frontend/.env`)
Create a file named `.env` in the `frontend` folder based on `frontend/.env.example`:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_RAZORPAY_KEY_ID=rzp_test_xxxx
VITE_GEMINI_API_KEY=your-gemini-api-key
```

#### Backend (`backend/.env`)
Create a file named `.env` in the `backend` folder based on `backend/.env.example`:
```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
RAZORPAY_KEY_ID=rzp_test_xxxx
RAZORPAY_KEY_SECRET=your_key_secret
```

### 3. Database Setup (Supabase)
1. Set up a new project on [Supabase](https://supabase.com/).
2. Open the **SQL Editor** in the Supabase Dashboard.
3. Paste and run the contents of `supabase-schema.sql` to create tables, custom types, and profiles.
4. Paste and run the contents of `supabase/policies.sql` to set up Row-Level Security (RLS) policies and storage buckets.
5. In **Database** -> **Replication**, enable replication for the `messages` (and optionally `orders`) table so that the real-time order chat functions properly.

### 4. Install Dependencies
Run the following command in the **root** directory of the project to install all root workspace dependencies (including `concurrently`):
```bash
npm install
```

### 5. Run the Application
Start both the Vite frontend server and Express backend concurrently:
```bash
npm run dev
```
The frontend will start on [http://localhost:5173](http://localhost:5173) and the backend on [http://localhost:3001](http://localhost:3001).

---

### 🌐 Vercel Production Deployment
The frontend is pre-configured for Vercel deployment. 

1. **Deploying the Frontend:**
   Inside the `/frontend` directory, run the following Vercel command to deploy to production:
   ```bash
   npx vercel deploy --prod --yes
   ```
2. **Environment Variables in Vercel:**
   Ensure you add the following Environment Variables in your Vercel Project Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_RAZORPAY_KEY_ID`
   - `VITE_GEMINI_API_KEY`

---

### 💡 Important Notes on Authentication & Session Storage

1. **Local Fallback Mode:**
   - If Supabase environment variables are missing, placeholder values, or unconfigured, the application automatically enters **Local Mode**.
   - It will fall back to using a client-side proxy database (`frontend/src/lib/localDb.ts`) that persists in your browser storage. This allows you to test the entire application (Farmer listings, Buyer checkout, Escrow, AI search, and chat features) offline/locally without setting up any cloud databases.
2. **"Remember Me" Toggle:**
   - Checking **Remember me** on the login screen causes the local session state to be stored in `localStorage`, maintaining access indefinitely (across reloads and tab closures).
   - Unchecking **Remember me** stores the session state in `sessionStorage`. Closing the browser tab/session will safely log the user out.
3. **User Profile Sync:**
   - Whenever the application initializes, local sessions automatically sync their profile state with `localUsersRef` in browser memory to immediately pick up any administrative modifications (such as suspensions).
