# GCMS Core - Global Conflict Monitoring System

A production-ready Real-Time Global Conflict Monitoring System built with Next.js 14, Firebase, and OpenAI.

## 🚀 Features

- **Real-time Tactical UI**: Dark mode, neon accents, grid overlays, and smooth animations.
- **Global Map**: Interactive Leaflet map with pulsing severity markers.
- **Live Intel Feed**: Real-time updates of conflict events.
- **Analytics Dashboard**: Threat assessment charts and trend analysis.
- **AI-Powered**: Automated summarization and severity scoring using OpenAI (GPT-4o).
- **Free-Tier Compatible**: Designed to run on Firebase Spark plan (with external API limits).

## 🛠️ Tech Stack

- **Frontend**: Next.js (App Router), TailwindCSS, Framer Motion, Recharts, Leaflet.
- **Backend**: Firebase Cloud Functions (Node.js), Firestore.
- **AI**: OpenAI API.

## 📦 Setup Instructions

1.  **Navigate to Project Directory**
    ```bash
    cd gcms-core
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env.local` file in the root directory:
    ```env
    NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run Development Server**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## ☁️ Cloud Functions Deployment

1.  **Navigate to functions directory**
    ```bash
    cd functions
    npm install
    ```

2.  **Set OpenAI Key**
    ```bash
    firebase functions:secrets:set OPENAI_API_KEY
    ```

3.  **Deploy**
    ```bash
    firebase deploy --only functions
    ```

## 🔐 Security Notes

-   **API Keys**: Never commit your `.env.local` file.
-   **Firestore Rules**: Ensure your Firestore rules restrict write access to admin only.
-   **Cloud Functions**: The ingestion function is scheduled. Ensure your billing account is linked for external API calls (Blaze plan required for external network requests in Cloud Functions, though Spark allows Google services).

## ⚠️ Data Sources

This system is configured to fetch data from:
-   GDELT Project (GeoJSON API)
-   ReliefWeb API
-   ACLED (Requires API Key)

*Note: The current demo uses realistic mock data for immediate visualization.*
# gcms
