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
locationInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        fetchRecommendations();
    }
});

// Event Listener for viewing crop database
document.getElementById('view-database-button').addEventListener('click', fetchCropDatabase);

// Event Listener for closing crop database
document.getElementById('close-database-button').addEventListener('click', closeCropDatabase);

// Add event listener for ESC key to close database
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape' && cropDatabase.style.display === 'block') {
        closeCropDatabase();
    }
});

// Function to fetch crop database
async function fetchCropDatabase() {
    // Show loader
    loader.style.display = 'flex';
    results.style.display = 'none';
    errorMessage.style.display = 'none';
    cropDatabase.style.display = 'none'; // Hide crop database initially

    try {
        // Fetch crop database from API
        const response = await fetch(`${https://seek0.onrender.com}/crops`);
        const data = await response.json();

        // Hide loader
        loader.style.display = 'none';

        // Display crop database
        displayCropDatabase(data);
    } catch (error) {
        console.error('Error:', error);
        loader.style.display = 'none';
        showError('Failed to fetch crop database. Please try again later.');
    }
}

// Function to display crop database
function displayCropDatabase(crops) {
    // Create search and filter elements if they don't exist
    if (!document.querySelector('.database-search')) {
        const searchDiv = document.createElement('div');
        searchDiv.className = 'database-search';
        searchDiv.innerHTML = `<input type="text" id="crop-search" placeholder="Search crops...">`;
        cropDatabase.insertBefore(searchDiv, cropDatabase.querySelector('h2').nextSibling);
        
        // Add event listener for search
        document.getElementById('crop-search').addEventListener('input', function() {
            filterCrops(this.value);
        });
    }

    cropDatabaseContainer.innerHTML = ''; // Clear previous entries

    // Create and append crop entries
    crops.forEach(crop => {
        const cropElement = document.createElement('div');
        cropElement.className = 'crop-entry';
        
        // Format the requirements to be more readable
        const requirements = `
            <div class="crop-requirements">
                <span class="req-temp">🌡️ ${crop.requirements.min_temp}°C - ${crop.requirements.max_temp}°C</span>
                <span class="req-humid">💧 ${crop.requirements.min_humidity}% - ${crop.requirements.max_humidity}%</span>
                <span class="req-rain">🌧️ ${crop.requirements.min_rainfall}mm - ${crop.requirements.max_rainfall}mm</span>
            </div>
        `;

        cropElement.innerHTML = `
            <h3>${capitalizeFirstLetter(crop.name)}</h3>
            ${requirements}
            <p><strong>Description:</strong> ${crop.info.description}</p>
            <p><strong>Growing Period:</strong> ${crop.info.growing_period}</p>
            <p><strong>Soil Type:</strong> ${crop.info.soil_type}</p>
            <p><strong>Water Needs:</strong> ${crop.info.water_needs}</p>
        `;
        
        // Add data attributes for filtering
        cropElement.dataset.name = crop.name.toLowerCase();
        cropElement.dataset.temp = (crop.requirements.min_temp + crop.requirements.max_temp) / 2;
        cropElement.dataset.water = getWaterNeedsValue(crop.info.water_needs);
        
        cropDatabaseContainer.appendChild(cropElement);
    });

    // Add filter buttons if they don't exist
    if (!document.querySelector('.database-filters')) {
        const filtersDiv = document.createElement('div');
        filtersDiv.className = 'database-filters';
        filtersDiv.innerHTML = `
            <button class="filter-button active" data-filter="all">All Crops</button>
            <button class="filter-button" data-filter="cold">Cold Weather</button>
            <button class="filter-button" data-filter="warm">Warm Weather</button>
            <button class="filter-button" data-filter="low-water">Low Water Needs</button>
            <button class="filter-button" data-filter="high-water">High Water Needs</button>
        `;
        
        cropDatabase.insertBefore(filtersDiv, document.querySelector('.database-search').nextSibling);
        
        // Add event listeners for filter buttons
        const filterButtons = document.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                this.classList.add('active');
                // Apply filter
                applyCropFilter(this.dataset.filter);
            });
        });
    }

    // Show crop database section with animation
    cropDatabase.style.display = 'block';
    cropDatabase.classList.add('active');
}

// Function to filter crops based on search input
function filterCrops(searchTerm) {
    const cropEntries = document.querySelectorAll('.crop-entry');
    searchTerm = searchTerm.toLowerCase();
    
    cropEntries.forEach(entry => {
        const cropName = entry.dataset.name;
        if (cropName.includes(searchTerm)) {
            entry.style.display = 'block';
        } else {
            entry.style.display = 'none';
        }
    });
}

// Function to apply crop filter
function applyCropFilter(filter) {
    const cropEntries = document.querySelectorAll('.crop-entry');
    
    cropEntries.forEach(entry => {
        const temp = parseFloat(entry.dataset.temp);
        const water = parseInt(entry.dataset.water);
        
        switch(filter) {
            case 'all':
                entry.style.display = 'block';
                break;
            case 'cold':
                entry.style.display = (temp < 20) ? 'block' : 'none';
                break;
            case 'warm':
                entry.style.display = (temp >= 20) ? 'block' : 'none';
                break;
            case 'low-water':
                entry.style.display = (water <= 2) ? 'block' : 'none';
                break;
            case 'high-water':
                entry.style.display = (water > 2) ? 'block' : 'none';
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
    
    return waterLevels[waterNeeds.toLowerCase()] || 3; // Default to moderate
}

// Check if a location is stored in localStorage and pre-fill the input
document.addEventListener('DOMContentLoaded', function() {
    const savedLocation = localStorage.getItem('lastLocation');
    if (savedLocation) {
        locationInput.value = savedLocation;
    }
});

// Main function to fetch crop recommendations
async function fetchRecommendations() {
    const location = locationInput.value.trim();
    
    // Validate input
    if (!location) {
        showError('Please enter a location');
        return;
    }
    
    // Store location in localStorage for convenience
    localStorage.setItem('lastLocation', location);
    
    // Show loader, hide results and error
    loader.style.display = 'flex';
    results.style.display = 'none';
    errorMessage.style.display = 'none';
    
    try {
        // Fetch recommendations from API
        const response = await fetch(`${API_BASE_URL}/recommend?location=${encodeURIComponent(location)}`);
        const data = await response.json();
        
        // Hide loader
        loader.style.display = 'none';
        
        // Handle API errors
        if (data.error) {
            showError(data.error);
            return;
        }
        
        // Display results
        displayResults(data);
        
    } catch (error) {
        console.error('Error:', error);
        loader.style.display = 'none';
        showError('Failed to fetch data. Please try again later.');
    }
}

// Function to display error messages
function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
}

// Function to display weather and crop recommendations
function displayResults(data) {
    // Show results container
    results.style.display = 'block';
    
    // Update weather information
    const weather = data.weather;
    cityElement.textContent = weather.location;
    countryElement.textContent = weather.country;
    temperatureElement.textContent = weather.temperature.toFixed(1);
    humidityElement.textContent = weather.humidity;
    rainfallElement.textContent = weather.rainfall;
    weatherDescElement.textContent = weather.weather_description;
    timestampElement.textContent = weather.timestamp;
    
    // Clear previous recommendations
    recommendationsContainer.innerHTML = '';
    
    // Check if there are any recommendations
    const recommendations = data.recommendations;
    if (!recommendations || recommendations.length === 0) {
        noRecommendations.classList.remove('hidden');
        return;
    }
    
    // Hide the "no recommendations" message
    noRecommendations.classList.add('hidden');
    
    // Create and append crop recommendation cards
    recommendations.forEach(crop => {
        const cropCard = createCropCard(crop);
        recommendationsContainer.appendChild(cropCard);
    });
}

// Function to create crop recommendation card
function createCropCard(crop) {
    const card = document.createElement('div');
    card.className = 'crop-card';
    
    // Calculate the color based on score (green to yellow gradient)
    const scoreColor = getScoreColor(crop.score);
    
    // Create card content
    card.innerHTML = `
        <div class="crop-header">
            <div class="crop-name">${capitalizeFirstLetter(crop.name)}</div>
            <div class="crop-score" style="background-color: ${scoreColor}">
                ${crop.score}% Match
            </div>
        </div>
        <div class="crop-content">
            <div class="crop-description">
                ${crop.info.description}
            </div>
            <div class="crop-details">
                <div class="crop-detail-item">
                    <div class="detail-label">Growing Period</div>
                    <div class="detail-value">${crop.info.growing_period}</div>
                </div>
                <div class="crop-detail-item">
                    <div class="detail-label">Soil Type</div>
                    <div class="detail-value">${crop.info.soil_type}</div>
                </div>
                <div class="crop-detail-item">
                    <div class="detail-label">Water Needs</div>
                    <div class="detail-value">${crop.info.water_needs}</div>
                </div>
            </div>
        </div>
        <div class="match-indicators">
            <div class="match-indicator ${crop.temperature_match ? 'match-good' : 'match-bad'}">
                <span class="indicator-icon">${crop.temperature_match ? '✓' : '✗'}</span>
                Temperature
            </div>
            <div class="match-indicator ${crop.humidity_match ? 'match-good' : 'match-bad'}">
                <span class="indicator-icon">${crop.humidity_match ? '✓' : '✗'}</span>
                Humidity
            </div>
            <div class="match-indicator ${crop.rainfall_match ? 'match-good' : 'match-bad'}">
                <span class="indicator-icon">${crop.rainfall_match ? '✓' : '✗'}</span>
                Rainfall
            </div>
        </div>
    `;
    
    return card;
}

// Function to get color for score (green to yellow gradient)
function getScoreColor(score) {
    // Convert score to a color between green (#2c7a51) and yellow (#f9a825)
    if (score >= 90) {
        return '#2c7a51'; // Green for excellent match
    } else if (score >= 80) {
        return '#4caf50'; // Light green
    } else if (score >= 70) {
        return '#8bc34a'; // Lime green
    } else {
        return '#fdd835'; // Yellow for okay match
    }
}

// Function to close crop database
function closeCropDatabase() {
    cropDatabase.classList.remove('active');
    setTimeout(() => {
        cropDatabase.style.display = 'none';
    }, 300); // Match the animation duration
}

// Helper function to capitalize first letter
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
