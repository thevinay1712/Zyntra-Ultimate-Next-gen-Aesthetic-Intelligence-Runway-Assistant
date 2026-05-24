# 🧥 Zyntra — AI-Powered Virtual Wardrobe Manager

Zyntra helps you digitize your wardrobe, build outfits, and get AI-powered styling recommendations. Your personal stylist, powered by color theory and intelligence.

## ✨ Features

- 🔐 **Authentication** — Secure signup/login with JWT
- 📸 **Upload Clothes** — Photo upload with auto color extraction
- 🔍 **Smart Filtering** — Search & filter by category, season, occasion
- 🤖 **AI Recommendations** — Color theory + occasion-based outfit suggestions
- 👤 **Simple Avatar** — Preview outfits on a visual avatar
- 💾 **Outfit Builder** — Mix, match, and save outfits

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Styling | Vanilla CSS (Design System) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| Image Processing | node-vibrant (color extraction) |
| AI | Rule-based recommendation engine (color harmony + occasion + season) |

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier)

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env` with your MongoDB connection string:

```env
PORT=5000
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/zyntra
JWT_SECRET=your-secret-key-here
```

### 3. Run

```bash
# Terminal 1 — Start server
cd server
npm run dev

# Terminal 2 — Start client
cd client
npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000

## 📁 Project Structure

```
Zyntra/
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth & Toast contexts
│   │   ├── lib/            # API client
│   │   ├── pages/          # Route pages
│   │   └── index.css       # Design system
│   └── index.html
│
├── server/                 # Express Backend
│   ├── config/             # DB connection
│   ├── middleware/          # JWT auth
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API endpoints
│   ├── services/           # Business logic
│   ├── utils/              # Color harmony utils
│   └── index.js            # Entry point
│
└── README.md
```

## 📝 License

MIT — Built with ❤️ by Vinay Sinnur
