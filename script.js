// DOM Elements
const locationInput = document.getElementById('location-input');
const searchButton = document.getElementById('search-button');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const results = document.getElementById('results');
const noRecommendations = document.getElementById('no-recommendations');
const recommendationsContainer = document.getElementById('recommendations-container');
const cropDatabase = document.getElementById('crop-database');
const cropDatabaseContainer = document.getElementById('crop-database-container');

// Weather display elements
const cityElement = document.getElementById('city');
const countryElement = document.getElementById('country');
const temperatureElement = document.getElementById('temperature');
const humidityElement = document.getElementById('humidity');
const rainfallElement = document.getElementById('rainfall');
const weatherDescElement = document.getElementById('weather-desc');
const timestampElement = document.getElementById('timestamp');

// API URL (replace with your actual backend URL if different)
const API_BASE_URL = 'https://seek0.onrender.com';

// Event Listeners
searchButton.addEventListener('click', fetchRecommendations);
locationInput.addEventListener('keypress', function (event) {
    if (event.key === 'Enter') {
        fetchRecommendations();
    }
});

// Event Listener for viewing crop database
document.getElementById('view-database-button').addEventListener('click', fetchCropDatabase);

// Event Listener for closing crop database
document.getElementById('close-database-button').addEventListener('click', closeCropDatabase);

// Add event listener for ESC key to close database
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && cropDatabase.style.display === 'block') {
        closeCropDatabase();
    }
});
function displayResults(data) {
    console.log("Displaying results:", data);
    results.style.display = 'block'; // Make results section visible

    // Ensure results container is empty before adding new content
    results.innerHTML = '';

    // Display weather data
    const weather = data.weather;
    results.innerHTML += `
        <h3>Weather in ${weather.location}, ${weather.country}</h3>
        <p>🌡️ Temperature: ${weather.temperature}°C</p>
        <p>💧 Humidity: ${weather.humidity}%</p>
        <p>🌧️ Rainfall: ${weather.rainfall} mm</p>
        <p>☁️ Description: ${weather.weather_description}</p>
    `;

    // Display crop recommendations
    if (data.recommendations.length > 0) {
        results.innerHTML += `<h3>Recommended Crops:</h3><ul>`;
        data.recommendations.forEach(crop => {
            results.innerHTML += `
                <li>
                    <strong>${crop.name}</strong> - Suitability Score: ${crop.score}%<br>
                    <em>${crop.info.description}</em>
                </li>
            `;
        });
        results.innerHTML += `</ul>`;
    } else {
        results.innerHTML += `<p>No suitable crops found for current conditions.</p>`;
    }
}



// Function to fetch crop database
async function fetchCropDatabase() {
    loader.style.display = 'flex';
    results.style.display = 'none';
    errorMessage.style.display = 'none';
    cropDatabase.style.display = 'none';

    try {
        const response = await fetch(`${API_BASE_URL}/api/crops`);
        const data = await response.json();

        loader.style.display = 'none';
        displayCropDatabase(data);
    } catch (error) {
        console.error('Error fetching crops:', error);
        loader.style.display = 'none';
        showError('Failed to fetch crop database. Please try again later.');
    }
}

// Function to display crop database
function displayCropDatabase(crops) {
    cropDatabaseContainer.innerHTML = '';

    crops.forEach(crop => {
        const cropElement = document.createElement('div');
        cropElement.className = 'crop-entry';

        // Handle missing requirements safely
        const minTemp = crop.requirements?.min_temp ?? 'N/A';
        const maxTemp = crop.requirements?.max_temp ?? 'N/A';
        const minHumidity = crop.requirements?.min_humidity ?? 'N/A';
        const maxHumidity = crop.requirements?.max_humidity ?? 'N/A';
        const minRain = crop.requirements?.min_rainfall ?? 'N/A';
        const maxRain = crop.requirements?.max_rainfall ?? 'N/A';
        const waterNeeds = crop.info?.water_needs ?? 'Unknown';

        cropElement.innerHTML = `
            <h3>${capitalizeFirstLetter(crop.name)}</h3>
            <div class="crop-requirements">
                <span class="req-temp">🌡️ ${minTemp}°C - ${maxTemp}°C</span>
                <span class="req-humid">💧 ${minHumidity}% - ${maxHumidity}%</span>
                <span class="req-rain">🌧️ ${minRain}mm - ${maxRain}mm</span>
            </div>
            <p><strong>Description:</strong> ${crop.info.description}</p>
            <p><strong>Growing Period:</strong> ${crop.info.growing_period}</p>
            <p><strong>Soil Type:</strong> ${crop.info.soil_type}</p>
            <p><strong>Water Needs:</strong> ${waterNeeds}</p>
        `;

        cropElement.dataset.name = crop.name.toLowerCase();
        cropElement.dataset.temp = (parseFloat(minTemp) + parseFloat(maxTemp)) / 2 || 0;
        cropElement.dataset.water = getWaterNeedsValue(waterNeeds);

        cropDatabaseContainer.appendChild(cropElement);
    });

    cropDatabase.style.display = 'block';
    cropDatabase.classList.add('active');
}

// Function to filter crops based on search input
function filterCrops(searchTerm) {
    const cropEntries = document.querySelectorAll('.crop-entry');
    searchTerm = searchTerm.toLowerCase();

    cropEntries.forEach(entry => {
        const cropName = entry.dataset.name;
        entry.style.display = cropName.includes(searchTerm) ? 'block' : 'none';
    });
}

// Function to apply crop filter
function applyCropFilter(filter) {
    const cropEntries = document.querySelectorAll('.crop-entry');

    cropEntries.forEach(entry => {
        const temp = parseFloat(entry.dataset.temp || '0');
        const water = parseInt(entry.dataset.water || '0', 10);

        switch (filter) {
            case 'all':
                entry.style.display = 'block';
                break;
            case 'cold':
                entry.style.display = temp < 20 ? 'block' : 'none';
                break;
            case 'warm':
                entry.style.display = temp >= 20 ? 'block' : 'none';
                break;
            case 'low-water':
                entry.style.display = water <= 2 ? 'block' : 'none';
                break;
            case 'high-water':
                entry.style.display = water > 2 ? 'block' : 'none';
                break;
        }
    });
}

// Helper function to convert water needs to numeric value
function getWaterNeedsValue(waterNeeds) {
    const waterLevels = {
        'low': 1,
        'low to moderate': 2,
        'moderate': 3,
        'moderate to high': 4,
        'high': 5
    };

    return waterLevels[waterNeeds.toLowerCase()] || 3;
}

// Function to fetch crop recommendations
async function fetchRecommendations() {
    const location = locationInput.value.trim();

    if (!location) {
        showError('Please enter a location');
        return;
    }

    localStorage.setItem('lastLocation', location);
    loader.style.display = 'flex';
    results.style.display = 'none';
    errorMessage.style.display = 'none';

    try {
        console.log("Fetching recommendations for:", location); // Debugging step

        const response = await fetch(`${API_BASE_URL}/api/recommend?location=${encodeURIComponent(location)}`);
        const data = await response.json();

        console.log("Received API Response:", data); // Debugging step

        loader.style.display = 'none';

        if (data.error) {
            showError(data.error);
            return;
        }

        displayResults(data);
    } catch (error) {
        console.error('Error fetching recommendations:', error);
        loader.style.display = 'none';
        showError('Failed to fetch data. Please try again later.');
    }
}


// Function to display error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Function to close crop database
function closeCropDatabase() {
    cropDatabase.classList.remove('active');
    setTimeout(() => {
        cropDatabase.style.display = 'none';
    }, 300);
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
