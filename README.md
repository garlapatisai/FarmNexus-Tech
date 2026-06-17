# 🌾 FarmNexus Tech

**FarmNexus Tech** is a peer-to-peer digital marketplace that connects Indian farmers directly with buyers. By providing real-time listing tools, secure digital escrow payments, live order-based chat, and Google Gemini AI insights, FarmNexus empowers farmers to sell their produce at fair market prices while enabling buyers to access fresh, high-quality crop yields directly from the source.

---

## 💡 How It Works

### 1. The Farmer's Journey
- **List Produce:**
- Farmers create detailed listings for their crops (specifying the category, quantity, availability date, and location) and upload photos.
- **Get AI Price Suggestions:**
- Farmers can request price recommendations from the built-in Gemini AI assistant to list their crops at fair Indian wholesale mandi rates.
- **Monitor Analytics & Demand:**
-  Farmers view interactive charts showing their sales distribution and revenue metrics, along with predicted regional crop demand forecasts.
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
-  Once an order is placed, a dedicated chat channel opens between the farmer and buyer to coordinate pickup or shipping.
- **Cryptographic Signature Verification:**
- The system verifies transaction authenticity securely to ensure reliable order verification.

---

## ✨ Core Features

### 👨‍🌾 Farmer Dashboard
- **Produce Listings:**    Manage crop category, pricing, available quantities, geographic location, and photos.
- **Dynamic Analytics:**    Visualize overall revenue, monthly trends, and product distribution charts.
- **Regional Demand Forecasting:** Fetch state-wise crop demand predictions.
- **Interactive Farm Assistant:** Consult a customized AI assistant for storage, crop protection, and cultivation tips.

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
- **Artificial Intelligence:** Google Gemini AI integration (specifically using the `gemini-2.5-flash` model REST API).

---

## 🚀 How to Run

To run the application locally, run the following command in the project root directory:

```bash
npm run dev
```

