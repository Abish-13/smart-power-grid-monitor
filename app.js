// --- 0. FIREBASE & API CONFIGURATION ---

// 🔥 PASTE YOUR FIREBASE CONFIG OBJECT HERE
const firebaseConfig = {
    apiKey: "AIzaSyBhDaOgifzZOET13EnDa0gP3WJ47YHSvRc",
    authDomain: "smart-powerline-monitor.firebaseapp.com",
    databaseURL: "https://smart-powerline-monitor-default-rtdb.firebaseio.com",
    projectId: "smart-powerline-monitor",
    storageBucket: "smart-powerline-monitor.firebasestorage.app",
    messagingSenderId: "337038810191",
    appId: "1:337038810191:web:bb785fd79024a9d09dde3a"
};

// 🔥 PASTE YOUR GEMINI API KEY HERE
const geminiApiKey = "AIzaSyD9EEoYETvmQ55HZAOpFaDXs3UMfAfmG1I";

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();


document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE & DATA ---
    
    // Updated with coordinates to match our new database structure
    const initialPowerLinesState = [
        null, // To align index 1 with ID 1
        { id: 1, location: "Sector 1A", status: "healthy", faultTime: null, "lat": 20.27, "lng": 85.82 },
        { id: 2, location: "Sector 1B", status: "healthy", faultTime: null, "lat": 20.275, "lng": 85.825 },
        { id: 3, location: "Sector 2A", status: "healthy", faultTime: null, "lat": 20.28, "lng": 85.83 },
        { id: 4, location: "Sector 2B", status: "healthy", faultTime: null, "lat": 20.285, "lng": 85.835 },
        { id: 5, location: "Substation 3", status: "healthy", faultTime: null, "lat": 20.265, "lng": 85.84 },
        { id: 6, location: "Sector 4A", status: "healthy", faultTime: null, "lat": 20.26, "lng": 85.845 },
        { id: 7, location: "Sector 4B", status: "healthy", faultTime: null, "lat": 20.255, "lng": 85.85 },
        { id: 8, location: "Downtown Core", status: "healthy", faultTime: null, "lat": 20.27, "lng": 85.855 },
        { id: 9, location: "North Industrial", status: "healthy", faultTime: null, "lat": 20.28, "lng": 85.815 },
        { id: 10, location: "West Residential", status: "healthy", faultTime: null, "lat": 20.29, "lng": 85.825 },
        { id: 11, location: "East Park", status: "healthy", faultTime: null, "lat": 20.25, "lng": 85.83 },
        { id: 12, location: "South Hub", status: "healthy", faultTime: null, "lat": 20.245, "lng": 85.84 }
    ];

    let currentPowerLines = []; // This will be filled by Firebase
    let faultLogHistory = []; // This will be filled by Firebase
    let logEmpty = true;

    // --- NEW: Map & Chart State ---
    let map;
    let mapMarkers = {}; // Object to store Leaflet marker instances
    let faultChart; // Variable to store the Chart.js instance

    // --- 2. DOM SELECTORS ---
    const grid = document.getElementById('dashboard-grid');
    const simulateBtn = document.getElementById('simulate-fault-btn');
    const resetBtn = document.getElementById('reset-all-btn');
    const logContainer = document.getElementById('fault-log');
    const notificationContainer = document.getElementById('notification-container');
    const analyzePatternsBtn = document.getElementById('analyze-patterns-btn');

    // Modal Selectors
    const modal = document.getElementById('fault-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalTitle = document.getElementById('modal-title');
    const modalInfo = document.getElementById('modal-info');
    const modalGenerateBtn = document.getElementById('modal-generate-btn');
    const modalResult = document.getElementById('modal-result');
    const modalLoader = document.getElementById('modal-loader');
    const aiResultContainer = document.getElementById('ai-result-container');


    // --- 3. GEMINI API FUNCTIONS --- (Unchanged)

    const apiBaseUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${geminiApiKey}`;
    const maxRetries = 3;

    async function fetchWithBackoff(url, options, retryCount = 0) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 429 && retryCount < maxRetries) {
                    const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchWithBackoff(url, options, retryCount + 1);
                }
                throw new Error(`API Error: ${response.statusText}`);
            }
            return response.json();
        } catch (error) {
            if (retryCount < maxRetries) {
                const delay = Math.pow(2, retryCount) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                return fetchWithBackoff(url, options, retryCount + 1);
            }
            throw error;
        }
    }

    async function callGeminiAPI(userQuery, systemPrompt, resultEl, loaderEl) {
        loaderEl.classList.remove('hidden');
        resultEl.innerHTML = '';
        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
        };
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        };
        try {
            const result = await fetchWithBackoff(apiBaseUrl, options);
            if (result.candidates && result.candidates[0].content?.parts?.[0]?.text) {
                const text = result.candidates[0].content.parts[0].text;
                resultEl.innerHTML = marked.parse(text);
            } else {
                throw new Error("Invalid API response structure.");
            }
        } catch (error) {
            resultEl.innerHTML = `<p class="text-red-400">Error generating report. ${error.message}. Please try again.</p>`;
        } finally {
            loaderEl.classList.add('hidden');
        }
    }


    // --- 4. MODAL FUNCTIONS --- (Updated for Chart)
    
    function openFaultModal(line) {
        modalTitle.textContent = `Fault Report: Line ${line.id}`;
        modalInfo.textContent = `Location: ${line.location} | Fault Time: ${line.faultTime}`;
        modalResult.innerHTML = '';
        
        // --- NEW: Hide chart and result container initially ---
        if (faultChart) faultChart.destroy(); // Clear old chart
        aiResultContainer.classList.add('hidden'); // Hide the whole AI section
        modalGenerateBtn.classList.remove('hidden'); // Ensure generate button is visible
        // ---

        modal.classList.remove('hidden');
        
        const newGenerateBtn = modalGenerateBtn.cloneNode(true);
        modalGenerateBtn.parentNode.replaceChild(newGenerateBtn, modalGenerateBtn);
        const modalGenerateBtnNewRef = document.getElementById('modal-generate-btn');

        modalGenerateBtnNewRef.addEventListener('click', () => {
            // --- NEW: Show AI container when generating ---
            aiResultContainer.classList.remove('hidden');
            // ---

            const systemPrompt = "You are an expert power grid maintenance assistant. Provide clear, concise, and actionable advice. Format your response clearly using Markdown headings and lists.";
            const userQuery = `A power line fault occurred on Line ${line.id} at ${line.location} at ${line.faultTime}.
Generate a concise initial assessment report for the maintenance team. Include:
1.  **Summary:** A brief summary of the event.
2.  **Likely Causes:** A list of 3 likely potential causes (e.g., 'severe weather', 'equipment failure', 'vegetation contact').
3.  **Recommended Actions:** A list of 3 immediate recommended actions (e.g., 'dispatch local crew', 'check nearby line sensors', 'isolate the grid section').`;
            
            callGeminiAPI(userQuery, systemPrompt, modalResult, modalLoader);
        });
    }

    function closeModal() {
        modal.classList.add('hidden');
    }

    // --- 5. NEW: MAP & CHART FUNCTIONS ---

    /**
     * 🗺️ Initializes the Leaflet map and sets the view
     */
    function initMap() {
        map = L.map('map-container').setView([20.27, 85.83], 13); // Centered on our data
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);
    }

    /**
     * 🗺️ Updates map markers based on power line status
     */
    function updateMapMarkers(powerLines) {
        // Define custom icons
        const healthyIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzE2QTYzIiB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4Ij48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4IDIgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptLTIgMTVMMCAxMmwyLjgyOC0yLjgyOEwxMCAxMy4xNzJsNi4xNzItNi4xNzJMMTggMTBsLTggN3oiLz48L3N2Zz4=',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        const faultyIcon = L.icon({
            iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI0RDMjYyNiIgd2lkdGg9IjMycHgiIGhlaWdodD0iMzJweCI+PHBhdGggZD0iTTEgMjEuNzVMMTIgMi41TDIzIDIxLjc1SDF6TTEzIDE4LjI1aC0yVjE2LjI1aDJWMTguMjV6TTEzIDE0LjI1aC0yVjkuMjVoMlYxNC4yNXoiLz48L3N2Zz4=',
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32]
        });

        powerLines.forEach(line => {
            if (!line || !line.lat) return;

            const markerId = `line-${line.id}`;
            const isHealthy = line.status === 'healthy';
            const icon = isHealthy ? healthyIcon : faultyIcon;
            
            if (mapMarkers[markerId]) {
                // Marker exists, just update icon and popup
                mapMarkers[markerId].setIcon(icon);
                mapMarkers[markerId].setPopupContent(`<b>Line ${line.id}</b> (${line.location})<br>Status: ${line.status}`);
            } else {
                // New marker, create it
                const marker = L.marker([line.lat, line.lng], { icon: icon })
                    .addTo(map)
                    .bindPopup(`<b>Line ${line.id}</b> (${line.location})<br>Status: ${line.status}`);
                mapMarkers[markerId] = marker;
            }
        });
    }

    /**
     * 📊 Creates or updates the fault analysis chart
     */
    function renderFaultChart(logData) {
        if (faultChart) {
            faultChart.destroy(); // Destroy old chart instance
        }
        
        // Process data: count faults per location
        const faultCounts = {};
        logData.forEach(entry => {
            if (entry.type === 'error') {
                faultCounts[entry.location] = (faultCounts[entry.location] || 0) + 1;
            }
        });

        const labels = Object.keys(faultCounts);
        const data = Object.values(faultCounts);

        if (labels.length === 0) return; // Don't render an empty chart

        const ctx = document.getElementById('fault-chart').getContext('2d');
        faultChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Faults per Location',
                    data: data,
                    backgroundColor: 'rgba(239, 68, 68, 0.6)', // Red
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#E5E7EB' } // Light text for legend
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { 
                            color: '#9CA3AF', // Light text for y-axis
                            stepSize: 1
                        },
                        grid: { color: '#4B5563' } // Darker grid lines
                    },
                    x: {
                        ticks: { color: '#9CA3AF' }, // Light text for x-axis
                        grid: { display: false }
                    }
                }
            }
        });
    }


    // --- 6. CORE FUNCTIONS --- (Updated)

    /**
     * Renders the entire dashboard grid based on the powerLines array
     */
    function renderDashboard(powerLines) {
        if (!grid) return;
        grid.innerHTML = ''; // Clear the grid first
        
        powerLines.forEach(line => {
            if (!line) return; // Skip the null item at index 0
            const isHealthy = line.status === 'healthy';
            const bgColor = isHealthy ? 'bg-green-600' : 'bg-red-600';
            const hoverBgColor = isHealthy ? 'hover:bg-green-700' : 'hover:bg-red-700';
            const pulseClass = isHealthy ? '' : 'animate-pulse';
            const icon = isHealthy 
                ? `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`
                : `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;

            const card = document.createElement('div');
            card.className = `p-4 rounded-lg shadow-lg text-white ${bgColor} ${hoverBgColor} ${pulseClass} transition-all duration-300 flex flex-col justify-between h-40`;
            
            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-start">
                        <span class="font-bold text-lg">Line ${line.id}</span>
                        <span>${icon}</span>
                    </div>
                    <div class="text-sm mt-1">
                        <p>${line.location}</p>
                        <p class="font-semibold uppercase">${line.status}</p>
                        <p class="text-xs mt-1">${line.faultTime ? `Fault at: ${line.faultTime}` : ''}</p>
                    </div>
                </div>
                <div class="mt-auto pt-2">
                    <button class="details-btn w-full bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-semibold py-1.5 px-3 rounded-md shadow-sm transition-all ${isHealthy ? 'hidden' : ''}">
                        Details
                    </button>
                </div>
            `;
            
            grid.appendChild(card);

            if (!isHealthy) {
                card.querySelector('.details-btn').addEventListener('click', () => {
                    openFaultModal(line);
                });
            }
        });
    }

    /**
     * Simulates a fault on a random healthy line
     */
    function simulateFault() {
        const healthyLines = currentPowerLines.filter(line => line && line.status === 'healthy');
        if (healthyLines.length === 0) {
            showNotification("All lines are already faulty!", "info");
            return;
        }
        const randomLine = healthyLines[Math.floor(Math.random() * healthyLines.length)];
        const timestamp = new Date().toLocaleTimeString();
        
        // --- 🔥 UPDATE FIREBASE ---
        const updatedLineData = {
            ...randomLine, // copy existing data
            status: 'faulty',
            faultTime: timestamp
        };
        database.ref(`powerLines/${randomLine.id}`).set(updatedLineData);
        
        const logMessage = `FAULT on Line ${randomLine.id} (${randomLine.location}) at ${timestamp}`;
        const logEntry = {
            lineId: randomLine.id,
            location: randomLine.location,
            time: timestamp,
            message: logMessage,
            type: 'error'
        };
        database.ref('faultLog').push(logEntry);
        
        showNotification(`Fault Detected: Line ${randomLine.id} (${randomLine.location})`, 'error');
    }

    /**
     * Resets all lines to 'healthy'
     */
    function resetAll() {
        // --- 🔥 UPDATE FIREBASE ---
        database.ref('powerLines').set(initialPowerLinesState);
        database.ref('faultLog').set(null);
        
        const logEntry = {
            time: new Date().toLocaleTimeString(),
            message: "All lines reset to 'healthy' by operator.",
            type: 'success'
        };
        database.ref('faultLog').push(logEntry);

        showNotification("All lines reset to healthy.", "success");
    }

    /**
     * Renders the fault log from an array of log entries
     */
    function renderLog(logEntries) {
        if (!logContainer) return;
        logContainer.innerHTML = '';
        
        if (logEntries.length === 0) {
            logContainer.innerHTML = '<p class="text-gray-500 italic">No faults detected yet...</p>';
            logEmpty = true;
            return;
        }

        logEmpty = false;
        logEntries.reverse().forEach(entry => {
            const color = entry.type === 'error' ? 'text-red-400' : 'text-green-400';
            const logElement = document.createElement('p');
            logElement.className = `text-sm ${color} font-mono`;
            logElement.textContent = `> ${entry.message}`;
            logContainer.appendChild(logElement);
        });
    }

    /**
     * Displays a toast notification
     */
    // ... (showNotification function is unchanged)
    function showNotification(message, type = 'error') {
        let bgColor, icon;
        switch (type) {
            case 'success':
                bgColor = 'bg-green-600';
                icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                break;
            case 'info':
                bgColor = 'bg-blue-600';
                icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                break;
            default:
                bgColor = 'bg-red-600';
                icon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>`;
                break;
        }
        const toast = document.createElement('div');
        toast.className = `flex items-center ${bgColor} text-white p-4 rounded-lg shadow-lg mb-3 toast-fade-in`;
        toast.innerHTML = `<div class="mr-3">${icon}</div><div class="font-medium">${message}</div>`;
        notificationContainer.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('toast-fade-in');
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }

    /**
     * ✨ Handles click on Analyze Fault Patterns button
     */
    function handleAnalyzePatterns() {
        modalTitle.textContent = "✨ Fault Pattern Analysis";
        
        // --- NEW: Show AI container, hide generate button ---
        aiResultContainer.classList.remove('hidden');
        modalGenerateBtn.classList.add('hidden');
        // ---

        if (faultLogHistory.length === 0) {
            modalInfo.textContent = "No fault data available to analyze.";
            modalResult.innerHTML = '';
            if (faultChart) faultChart.destroy(); // Clear chart
            modal.classList.remove('hidden');
            return;
        }
        
        modalInfo.textContent = `Analyzing ${faultLogHistory.length} recent fault(s).`;
        modal.classList.remove('hidden');

        // --- NEW: Render the chart ---
        renderFaultChart(faultLogHistory);
        // ---

        const systemPrompt = "You are an expert power grid analyst. Your job is to identify high-level patterns from a list of fault logs. Be concise and clear. If no patterns exist, state that.";
        const userQuery = `Analyze the following list of power line fault logs and provide a 1-paragraph summary of any emerging patterns (e.g., "frequent faults in Sector 2", "failures clustering in the afternoon").
        
Fault Logs:
${JSON.stringify(faultLogHistory, null, 2)}`;

        callGeminiAPI(userQuery, systemPrompt, modalResult, modalLoader);
    }


    // --- 7. EVENT LISTENERS ---
    simulateBtn.addEventListener('click', simulateFault);
    resetBtn.addEventListener('click', resetAll);
    modalCloseBtn.addEventListener('click', closeModal);
    analyzePatternsBtn.addEventListener('click', handleAnalyzePatterns);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });


    // --- 8. FIREBASE DATA BINDING & INITIALIZATION ---
    
    // Listen for changes to powerLines
    const powerLinesRef = database.ref('powerLines');
    powerLinesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        currentPowerLines = data; // Update global state
        renderDashboard(data);
        
        // --- NEW: Update map markers on data change ---
        if (map) { // Check if map is initialized
            updateMapMarkers(data);
        }
        // ---
    });
    
    // Listen for changes to faultLog
    const faultLogRef = database.ref('faultLog');
    faultLogRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            faultLogHistory = Object.values(data);
            renderLog(faultLogHistory);
        } else {
            faultLogHistory = [];
            renderLog([]);
        }
    });

    // --- NEW: Initialize the map on first load ---
    initMap();
    // ---

});