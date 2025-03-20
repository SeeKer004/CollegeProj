import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# OpenWeatherMap API key (you'll need to register for one)
# Set this as an environment variable in production
WEATHER_API_KEY = "1c2db9c186555007c1f77990dcfb0601"

# Load crop data from JSON file
def load_crop_data():
    file_path = os.path.join(os.path.dirname(__file__), 'database.json')  # Get absolute path
    with open(file_path, 'r') as f:
        data = json.load(f)
    return data['crop_database'], data['crop_info']

# Load the crop database and info
crop_database, crop_info = load_crop_data()
print("Database Path:", os.path.abspath('database.json'))
print("File Exists:", os.path.exists('database.json'))

def get_weather_data(location):
    """
    Fetch weather data from OpenWeatherMap API
    Returns temperature, humidity, and estimated rainfall
    """
    try:
        url = f"http://api.openweathermap.org/data/2.5/weather?q={location}&appid={WEATHER_API_KEY}&units=metric"
        response = requests.get(url)
        data = response.json()
        
        if response.status_code != 200:
            return {"error": f"Error fetching weather data: {data.get('message', 'Unknown error')}"}, response.status_code
        
        # Extract relevant weather information
        temperature = data["main"]["temp"]
        humidity = data["main"]["humidity"]
        
        # Calculate estimated rainfall based on weather conditions
        weather_id = data["weather"][0]["id"]
        rainfall = 0
        
        if 200 <= weather_id < 300:  # Thunderstorm
            rainfall = 50  # mm/day estimate
        elif 300 <= weather_id < 400:  # Drizzle
            rainfall = 10
        elif 500 <= weather_id < 600:  # Rain
            if weather_id < 510:
                rainfall = 25  # Light/moderate rain
            else:
                rainfall = 75  # Heavy rain
        elif 600 <= weather_id < 700:  # Snow
            rainfall = 15  # Snow equivalent
        
        return {
            "temperature": temperature,
            "humidity": humidity,
            "rainfall": rainfall,
            "location": data["name"],
            "country": data["sys"]["country"],
            "weather_description": data["weather"][0]["description"],
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    
    except Exception as e:
        return {"error": f"Error processing weather data: {str(e)}"}, 500

def recommend_crops(weather_data):
    """
    Recommends suitable crops based on current weather conditions
    Returns a list of recommended crops with their details
    """
    temperature = weather_data["temperature"]
    humidity = weather_data["humidity"]
    rainfall = weather_data["rainfall"]
    
    recommendations = []
    
    for crop_name, requirements in crop_database.items():
        # Check if current conditions match crop requirements
        temp_suitable = requirements["min_temp"] <= temperature <= requirements["max_temp"]
        humidity_suitable = requirements["min_humidity"] <= humidity <= requirements["max_humidity"]
        rainfall_suitable = requirements["min_rainfall"] <= rainfall <= requirements["max_rainfall"]
        
        # Calculate suitability score (0-100)
        temp_score = 100 - min(100, abs(temperature - (requirements["min_temp"] + requirements["max_temp"])/2) * 10)
        humidity_score = 100 - min(100, abs(humidity - (requirements["min_humidity"] + requirements["max_humidity"])/2) * 2)
        rainfall_score = 100 - min(100, abs(rainfall - (requirements["min_rainfall"] + requirements["max_rainfall"])/2) * 0.5)
        
        overall_score = (temp_score + humidity_score + rainfall_score) / 3
        
        # Only recommend if the crop has at least a 60% match
        if overall_score >= 60:
            recommendations.append({
                "name": crop_name.title(),
                "score": round(overall_score, 1),
                "temperature_match": temp_suitable,
                "humidity_match": humidity_suitable,
                "rainfall_match": rainfall_suitable,
                "info": crop_info[crop_name]
            })
    
    # Sort recommendations by suitability score (highest first)
    recommendations.sort(key=lambda x: x["score"], reverse=True)
    
    return recommendations

@app.route('/api/recommend', methods=['GET'])
def get_recommendations():
    """
    API endpoint to get crop recommendations based on location
    Example: /api/recommend?location=London
    """
    location = request.args.get('location')
    
    if not location:
        return jsonify({"error": "Please provide a location"}), 400
    
    # Get weather data
    weather_data = get_weather_data(location)
    
    # Check if there was an error fetching weather data
    if isinstance(weather_data, tuple) and len(weather_data) > 1:
        return jsonify(weather_data[0]), weather_data[1]
    
    # Get crop recommendations
    recommendations = recommend_crops(weather_data)
    
    # Return both weather data and recommendations
    return jsonify({
        "weather": weather_data,
        "recommendations": recommendations
    })

@app.route('/api/crops', methods=['GET'])
def get_all_crops():
    """
    API endpoint to get all available crops in the database
    """
    crops_list = []
    for crop_name in crop_database:
        crops_list.append({
            "name": crop_name.title(),
            "requirements": crop_database[crop_name],
            "info": crop_info[crop_name]
        })
    
    return jsonify(crops_list)

@app.route('/')
def index():
    """
    Basic route to confirm API is working
    """
    return jsonify({
        "status": "ok",
        "message": "Smart Crop Recommendation API is running",
        "endpoints": {
            "/api/recommend": "GET - Recommend crops based on location weather",
            "/api/crops": "GET - List all crops in the database"
        }
    })

if __name__ == '__main__':
    # For development use only - use a proper WSGI server for production
    port = int(os.environ.get('PORT', 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
