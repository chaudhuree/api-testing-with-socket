const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const https = require('https');
const morgan = require('morgan');

app.use(morgan('combined'));

// Cache configuration
let weatherCache = {
    data: null,
    lastUpdated: 0
};
// const CACHE_DURATION = 10000; // Cache for 10 seconds
const CACHE_DURATION = 0; // No cache

// Weather API configuration
const WEATHER_API_KEY = 'd6c3fa7a15384efc97073333232006';
const CITY = 'Dhaka,Bangladesh';
const WEATHER_API_URL = `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${CITY}`;

// Function to fetch weather data
async function fetchWeatherData() {
    return new Promise((resolve, reject) => {
        https.get(WEATHER_API_URL, (resp) => {
            let data = '';
            resp.on('data', (chunk) => data += chunk);
            resp.on('end', () => {
                try {
                    const weatherData = JSON.parse(data);
                    // Filter only required data
                    const filteredData = {
                        temperature: weatherData.current.temp_c,
                        humidity: weatherData.current.humidity,
                        condition: weatherData.current.condition.text,
                        feelslike: weatherData.current.feelslike_c,
                        wind_kph: weatherData.current.wind_kph,
                        timestamp: new Date().toISOString()
                    };
                    resolve(filteredData);
                } catch (error) {
                    reject(error);
                }
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Function to get weather data with caching and return old data if fetch fails
async function getWeatherData() {
    const now = Date.now();
    if (!weatherCache.data || now - weatherCache.lastUpdated > CACHE_DURATION) {
        try {
            weatherCache.data = await fetchWeatherData();
            weatherCache.lastUpdated = now;
        } catch (error) {
            console.error('Error fetching weather data:', error);
            return weatherCache.data;
        }
    }
    return weatherCache.data;
}

// WebSocket functionality
io.on('connection', (socket) => {
    console.log('Client connected');
    
    // Initial weather data setup for the first time
    getWeatherData().then(data => socket.emit('weather_update', data));
    
    // api call for every one second and send to client
    const interval = setInterval(async () => {
        const data = await getWeatherData();
        // console.log({data});
        socket.emit('weather_update', data);
    }, 1000);
    
    socket.on('disconnect', () => {
        clearInterval(interval);
        console.log('Client disconnected');
    });
});

app.use(express.static('public'));

const PORT = 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});