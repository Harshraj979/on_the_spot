# On The Spot 🚨

**On The Spot** is a real-time platform designed to streamline accident reporting, insurance claims management, and dispute resolution. It leverages AI-powered assistance and live chat to provide immediate support to users during critical moments.

![Aesthetic Dashboard Preview](https://img.shields.io/badge/Status-Active-brightgreen)
![Tech Stack](https://img.shields.io/badge/Stack-Node.js%20|%20Express%20|%20MongoDB%20|%20Socket.io-blue)

## ✨ Features

- **🚨 Instant Accident Reporting:** Easy-to-use forms with location detection and evidence upload.
- **📋 Claims Management:** Digital claim filing with status tracking.
- **⚖️ Dispute Mediation:** AI-assisted guidance for insurance disputes.
- **💬 Live Chat:** Real-time support via WebSocket (Socket.io).
- **🤖 AI Advisor:** Intelligent suggestions powered by **Google Gemini API**.
- **📊 Interactive Dashboard:** Overview of all reported incidents and claims.
- **🔐 Secure Authentication:** JWT-based user login and registration system.

## 🛠️ Technology Stack

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+).
- **Backend:** Node.js, Express.js.
- **Database:** MongoDB (Mongoose).
- **Real-time:** Socket.io for live chat.
- **AI Integration:** Google Generative AI (Gemini).

## 🚀 Getting Started

### 1. Prerequisites
- Node.js installed.
- MongoDB instance (local or Atlas).
- Google Gemini API Key.

### 2. Installation
Clone the repository:
```bash
git clone https://github.com/Harshraj979/on_the_spot.git
cd on_the_spot
```

### 3. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend` folder and add your credentials:
   ```env
   PORT=5000
   MONGO_URI=your_mongodb_uri
   JWT_SECRET=your_secret_key
   GEMINI_API_KEY=your_gemini_key
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 4. Frontend Setup
The frontend is served statically by the backend server. Once the backend is running, visit:
`http://localhost:5000`

## 📁 Project Structure

```text
├── backend/
│   ├── ai.js           # Gemini AI Logic
│   ├── server.js       # Express Server & Entry Point
│   ├── sockets.js      # Socket.io Chat Logic
│   ├── routes.js       # Business Logic Routes
│   └── models.js       # MongoDB Schemas
└── frontend/
    ├── css/            # Style sheets
    ├── js/             # Client-side logic
    └── *.html          # UI Pages
```

## 📜 License
This project is licensed under the MIT License.

---
*Developed with ❤️ to make insurance simpler.*
