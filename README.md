# 🧥 Zyntra – Ultimate Next-gen Aesthetic Intelligence & Runway Assistant

Zyntra helps you digitize your wardrobe, build outfits, and get AI-powered styling recommendations. Acting as your personal behind-the-scenes digital runway stylist, Zyntra uses color theory, climate adaptation, and visual matching to ensure you step out with absolute confidence.

---

## ✨ Advanced Features

- 🔐 **Authentication** — Secure, seamless signup/login with JWT authorization.
- 📸 **Smart Upload & Edge Detection** — Digitize clothes by dragging-and-dropping. Zyntra runs local pixel flood-fill background isolation on the canvas.
- 🛑 **Imperfect BG Removal Blocking** — Automatically analyzes edge pixel transparency (border-clearance ratio). If splotches, clutter, or shadow splotches are found, it triggers a warning badge, displays a stop notice card, and blocks upload to guarantee perfect outline isolation.
- 🤖 **Aesthetic AI Matchmaker** — Generates outfit recommendations scored dynamically based on **Color Harmony** (calculating distance in HSL color space), **Occasion Suitability**, **Seasonal Guidelines**, and **Wear History**.
- 💬 **Generative LLM Stylist Critique**:
  - **Online Mode** — Safely queries a Hugging Face serverless endpoint hosting **Meta-Llama-3-8B-Instruct** to draft premium styling reviews.
  - **Local Compiler Fallback** — Gracefully falls back to a highly customized local stylist compiler weaving together fits, cuts, weather, and color psychology.
- ⚠️ **Wardrobe Cold Start Advisor** — Dynamically calculates closet variety. If a low wardrobe count is detected, it alerts the user with a gorgeous glass notice box advising them to upload more clothes to resolve identical styling matches.
- 👤 **Dressing Studio (Planned)** — Features a fully responsive custom 3D Vector claymation avatar (boy/girl models) with clamps and auto-rotation. (Currently paused as a premium upgrade).
- 🔄 **Visual Similarity Swap** — Employs lazy-loaded CPU feature extraction using `clip-vit-base-patch32` on a local Python FastAPI microservice (`ai-service`) to compare items inside Node.js using in-memory **Cosine Similarity**, letting you swap visual matching pairs on-the-fly.

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React + Vite + Vanilla CSS (Glassmorphism & Micro-animations) |
| **Backend API** | Node.js + Express |
| **Database** | MongoDB Atlas + Mongoose |
| **Auth** | JWT + bcrypt |
| **Vector Search** | Python FastAPI (`main.py`) + lazy-loaded Hugging Face `transformers` CLIP model |
| **Color Processing** | `node-vibrant` (Automatic primary color palette extraction) |
| **Inference** | Meta-Llama-3-8B Serverless HF API / Local Dynamic Compiler Fallback |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Python 3.9+ (optional, for visual similarity microservice)
- MongoDB Atlas account (free tier)

### 1. Installation

```bash
# Install Express server dependencies
cd server
npm install

# Install React client dependencies
cd ../client
npm install

# Setup Python FastAPI visual similarity service (Optional)
cd ../ai-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure Environment

Edit `server/.env` with your MongoDB connection string and optional Hugging Face token:

```env
PORT=5000
MONGO_URI=mongodb+srv://your-username:your-password@cluster0.xxxxx.mongodb.net/zyntra
JWT_SECRET=your-secret-key-here
HF_API_TOKEN=your_huggingface_serverless_token_here
```

### 3. Running Locally

Start the three microservices in separate terminals:

```bash
# Terminal 1 — Start Node/Express Server
cd server
npm run dev

# Terminal 2 — Start Vite Client
cd client
npm run dev

# Terminal 3 — Start Python AI Service (Similarity Matching)
cd ai-service
venv\Scripts\activate
python main.py
```

- **Vite Client**: `http://localhost:5173`
- **Express Server**: `http://localhost:5000`
- **Python FastAPI Service**: `http://localhost:8000`

---

## 📁 Project Structure

```
Zyntra/
├── ai-service/             # FastAPI Visual Similarity Vector Extractor (CLIP CPU)
├── client/                 # React + Vite Frontend
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # Auth & Toast contexts
│   │   ├── lib/            # API client
│   │   ├── pages/          # Landing, Dashboard, Recommend, Outfits, Upload, Avatar
│   │   ├── App.jsx         # Conditional layout & Vinay's centered footer
│   │   └── index.css       # Global layout & custom HSL design variables
│
├── server/                 # Express Backend
│   ├── models/             # Mongoose schemas (added styleVector model field)
│   ├── routes/             # API routes (recommendations, clothing similarity endpoints)
│   ├── services/           # Business logic (recommendService Engine)
│   └── utils/              # Color harmony utilities
│
└── README.md
```

---

## 📝 License

MIT — Built with ❤️ by Vinay Sinnur
