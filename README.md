# Smart Power Line Fault Monitoring Dashboard

**Repository:** `smart-power-grid-monitor`

**Description:** A full-stack, real-time power line fault dashboard built with JavaScript, Firebase, Leaflet.js, and the Google Gemini AI API.

This is a full-stack web application that serves as a real-time "digital twin" for a power grid, designed to help utility operators detect, visualize, and analyze power line faults instantly.

This project is an end-to-end prototype for a modern IoT monitoring solution, demonstrating a reactive frontend, cloud database integration, and AI-powered decision support.

_**Note to Recruiters:** A live demo is not publicly hosted due to the API keys involved. Please follow the "How to Run" instructions below to run the project locally._

<!-- 
TODO: Add a screenshot of your dashboard here! 
1. Take a screenshot of your running dashboard.
2. Upload it to your GitHub repository (e.g., as `demo-screenshot.png`).
3. Replace the line below with: ![Smart Power Line Dashboard](demo-screenshot.png)
-->


---

## Features

* **Real-Time Database:** Fully connected to **Firebase Realtime Database**. All data is synced live across all clients without needing a page refresh.
* **Reactive Status Grid:** A responsive grid of all power lines that automatically updates, showing `HEALTHY` (green) or `FAULTY` (red, pulsing) status.
* **Live Fault Map:** An interactive **Leaflet.js** map with custom icons that change color from green to red the *instant* a fault is registered in the database.
* **AI-Powered Assessment:** Click "Details" on any fault to call the **Google Gemini API** for an instant report on likely causes and recommended actions.
* **Data Analytics & Visualization:**
    * **Chart.js:** The "Analyze Patterns" modal features a dynamic bar chart showing fault frequency by location, built with Chart.js.
    * **AI Summary:** This modal also uses the Gemini API to provide a high-level text summary of emerging fault patterns.
* **Event Log & Notifications:** Includes a live-updating fault log and toast notifications for new events.
* **IoT Simulation:** A "Simulate Fault" button acts as a placeholder for a real-world IoT sensor (like an Arduino/ESP8266), writing data directly to Firebase to trigger the dashboard's real-time updates.
* **Secure API Key Management:** Uses a `.gitignore` and a local `config.js` file to keep all API keys and Firebase credentials secure and off of GitHub.

---

## Tech Stack

* **Frontend:** HTML5, CSS3, JavaScript (ES6 Modules)
* **Styling:** Tailwind CSS
* **Data Visualization:** Leaflet.js (Maps), Chart.js (Charts)
* **Backend-as-a-Service:** Firebase Realtime Database
* **AI:** Google Gemini API (via REST)

---

## 🚀 How to Run This Project Locally

This project uses API keys that must be kept secret. To run it, you will need to create your own keys.

1.  **Clone the Repository:**
    ```bash
    git clone [https://github.com/YOUR_USERNAME/smart-power-grid-monitor.git](https://github.com/YOUR_USERNAME/smart-power-grid-monitor.git)
    cd smart-power-grid-monitor
    ```

2.  **Get API Keys:**
    * **Firebase:** Go to the [Firebase Console](https://console.firebase.google.com/), create a new project, and set up a **Realtime Database**. In your Project Settings, get your `firebaseConfig` object.
    * **Gemini:** Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and get a new API key.

3.  **Create `config.js`:**
    * In the root of the project, create a new file named `config.js`.
    * **This file is already listed in `.gitignore` and will not be uploaded to GitHub.**
    * Paste your secret keys into it using this format:

    ```javascript
    // config.js

    // 🔥 Your Firebase Config
    const firebaseConfig = {
      apiKey: "...",
      authDomain: "...",
      databaseURL: "...",
      // ...etc
    };

    // 🔥 Your Gemini API Key
    const geminiApiKey = "YOUR_GEMINI_API_KEY_HERE";
    ```

4.  **Import Initial Data:**
    * In your Firebase Realtime Database, import the `database-init.json` file provided in this repository to populate your database with the power line data and coordinates.

5.  **Run a Local Server:**
    * This project uses JavaScript modules (`app.js`) and will not run by just opening `index.html` (due to browser CORS security policies on `file:///` paths).
    * You **must** serve the files from a local server.
    * If you use **VS Code**, the easiest way is the **"Live Server"** extension.
    * Right-click `index.html` and select "Open with Live Server".

The site will now be running on `http://127.0.0.1:5500` and will be fully connected to *your* Firebase database and Gemini API.
