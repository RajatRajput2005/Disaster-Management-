// Global variables and constants
let map;
let alertData = [];
let allMarkers = [];
let markerCluster;
let helpCenterMarkers; // Layer for help center markers
let currentHelpAlertId = null; // To track the currently active help centers
const CACHE_TIME = 15 * 60 * 1000; // 15 minutes cache

// OpenWeatherMap API key:
const OPENWEATHER_API_KEY = 'caeac236cd3b75916ea889d87b0e0db4';

/**
 * Initialize the map using OpenStreetMap tiles.
 */
async function initMap() {
  try {
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    markerCluster = L.markerClusterGroup();
    map.addLayer(markerCluster);
    // Create and add layer for help center markers
    helpCenterMarkers = L.layerGroup();
    map.addLayer(helpCenterMarkers);
    await loadDisasterData();
    setupEventListeners();
    initializeLocalStorage();
  } catch (error) {
    showError('Failed to initialize map. Please check your internet connection.');
    console.error('initMap error:', error);
  }
}

/**
 * Load earthquake alerts from the USGS API.
 */
async function loadDisasterData() {
  showLoading(true);
  try {
    const cachedData = localStorage.getItem('alertData');
    const cacheTime = localStorage.getItem('alertDataTime');
    if (cachedData && cacheTime && Date.now() - cacheTime < CACHE_TIME) {
      alertData = JSON.parse(cachedData);
      alertData.forEach(alert => { 
        alert.date = alert.date ? new Date(alert.date) : new Date();
      });
      console.log('Using cached alert data.');
    } else {
      console.log('Fetching earthquake data from USGS...');
      const usgsResponse = await fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson');
      if (!usgsResponse.ok) throw new Error("USGS HTTP error: " + usgsResponse.status);
      const usgsData = await usgsResponse.json();
      alertData = usgsData.features
        .filter(feature => feature.geometry && Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length >= 2)
        .map(feature => ({
          id: feature.id,
          type: 'EQ',
          title: feature.properties.place,
          date: new Date(feature.properties.time),
          severity: feature.properties.mag >= 6 ? 'Red' : feature.properties.mag >= 4 ? 'Orange' : 'Yellow',
          // Swap coordinates from [lon, lat, depth] to [lat, lon]
          coordinates: [feature.geometry.coordinates[1], feature.geometry.coordinates[0]],
          country: ''
        }));
      localStorage.setItem('alertData', JSON.stringify(alertData));
      localStorage.setItem('alertDataTime', Date.now());
      console.log('Alert data fetched and cached.');
    }
    plotMarkersOnMap();
    updateAlertList();
    showLoading(false);
  } catch (error) {
    console.error('Error loading disaster data:', error);
    showError('Failed to load alerts. Retrying with cached data...');
    const cachedData = localStorage.getItem('alertData');
    if (cachedData) {
      alertData = JSON.parse(cachedData);
      alertData.forEach(alert => { 
        alert.date = alert.date ? new Date(alert.date) : new Date();
      });
      plotMarkersOnMap();
      updateAlertList();
    }
    showLoading(false);
  }
}

/**
 * Plot markers on the map for each earthquake alert.
 */
function plotMarkersOnMap() {
  clearMarkers();
  allMarkers = alertData.map(alert => {
    const marker = L.marker(alert.coordinates, {
      icon: getMarkerIcon(alert.type),
      title: alert.title
    });
    marker.bindPopup(createPopupContent(alert));
    marker.on('popupopen', function() {
      getWeather(alert.coordinates[0], alert.coordinates[1])
        .then(weatherHtml => {
          const weatherDiv = document.getElementById(`weather-${alert.id}`);
          if (weatherDiv) weatherDiv.innerHTML = weatherHtml;
        })
        .catch(() => {
          const weatherDiv = document.getElementById(`weather-${alert.id}`);
          if (weatherDiv) weatherDiv.innerHTML = "<em>Weather data not available</em>";
        });
    });
    marker.on('click', function() {
      map.panTo(alert.coordinates);
    });
    return marker;
  });
  markerCluster.addLayers(allMarkers);
}

/**
 * Create the popup HTML content for an earthquake alert.
 */
function createPopupContent(alert) {
  return `
    <div class="info-window popup-${alert.type.toLowerCase()}">
      <h3>${alert.title}</h3>
      <p>Type: ${getEventType(alert.type)}</p>
      <p>Severity: <span class="severity">${alert.severity}</span></p>
      <p>Date: ${alert.date.toLocaleDateString()}</p>
      ${alert.country ? `<p class="country-info">Country: ${alert.country}</p>` : ''}
      <div class="weather-info" id="weather-${alert.id}"><em class="temperature-info">Loading weather...</em></div>
      <div class="button-group">
        <button class="map-btn zoom-btn" onclick="zoomToMarker(${alert.coordinates[0]}, ${alert.coordinates[1]})">
          <i class="fa-solid fa-magnifying-glass"></i> Zoom
        </button>
        <button class="map-btn help-btn" onclick="toggleHelpCentersDisplay(${alert.coordinates[0]}, ${alert.coordinates[1]}, '${alert.id}')">
          <i class="fa-solid fa-hand-holding-medical"></i> Help
        </button>
        <button class="map-btn tips-btn" onclick="showPreparednessTips('${alert.type}')">
          <i class="fa-solid fa-lightbulb"></i> Tips
        </button>
      </div>
      <div class="help-centers" id="helpCenters-${alert.id}" data-id="${alert.id}"></div>
    </div>
  `;
}

/**
 * Update the sidebar alert list.
 */
function updateAlertList(filteredData = alertData) {
  const alertList = document.getElementById('alertList');
  alertList.innerHTML = '';
  filteredData.forEach(alert => {
    const card = document.createElement('div');
    card.classList.add('alert-card');
    if (alert.severity.toLowerCase() === 'red') {
      card.classList.add('critical');
    }
    card.innerHTML = `<h3>${alert.title}</h3>
                      <p>Type: ${getEventType(alert.type)}</p>
                      <p>Date: ${alert.date.toLocaleDateString()}</p>
                      ${alert.country ? `<p class="country-info">Country: ${alert.country}</p>` : ''}`;
    card.addEventListener('click', () => { zoomToMarker(alert.coordinates[0], alert.coordinates[1]); });
    alertList.appendChild(card);
  });
}

/**
 * Handle search functionality with a debounce.
 */
let searchTimeout;
function handleSearch() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();
    const filteredData = !query ? alertData : alertData.filter(alert =>
      alert.title.toLowerCase().includes(query) ||
      getEventType(alert.type).toLowerCase().includes(query) ||
      alert.severity.toLowerCase().includes(query) ||
      (alert.country && alert.country.toLowerCase().includes(query))
    );
    updateAlertList(filteredData);
    clearMarkers();
    allMarkers = filteredData.map(alert => {
      const marker = L.marker(alert.coordinates, {
        icon: getMarkerIcon(alert.type),
        title: alert.title
      });
      marker.bindPopup(createPopupContent(alert));
      marker.on('popupopen', function() {
        getWeather(alert.coordinates[0], alert.coordinates[1])
          .then(weatherHtml => {
            const weatherDiv = document.getElementById(`weather-${alert.id}`);
            if (weatherDiv) weatherDiv.innerHTML = weatherHtml;
          })
          .catch(() => {
            const weatherDiv = document.getElementById(`weather-${alert.id}`);
            if (weatherDiv) weatherDiv.innerHTML = "<em>Weather data not available</em>";
          });
      });
      marker.on('click', function() {
        map.panTo(alert.coordinates);
      });
      return marker;
    });
    markerCluster.addLayers(allMarkers);
    if (filteredData.length > 0 && query) {
      map.panTo(filteredData[0].coordinates);
    }
  }, 300);
}

/**
 * Zoom the map to a given location.
 */
function zoomToMarker(lat, lng) {
  map.setView([lat, lng], 8);
}

/**
 * Clear all markers.
 */
function clearMarkers() {
  markerCluster.clearLayers();
  allMarkers = [];
  if (helpCenterMarkers) helpCenterMarkers.clearLayers();
}

/**
 * Initialize localStorage for caching.
 */
function initializeLocalStorage() {
  if (!localStorage.getItem('alertData')) {
    localStorage.setItem('alertData', JSON.stringify([]));
    localStorage.setItem('alertDataTime', Date.now());
  }
}

/**
 * Show or hide the loading indicator.
 */
function showLoading(show) {
  const loader = document.getElementById('loadingIndicator');
  loader.style.display = show ? 'flex' : 'none';
}

/**
 * Display an error message on the page.
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.innerHTML = `❌ ${message} <button class="retry-btn" onclick="location.reload()">Retry</button>`;
  document.body.prepend(errorDiv);
  setTimeout(() => errorDiv.remove(), 5000);
}

/**
 * Fetch current weather data from OpenWeatherMap.
 */
async function getWeather(lat, lon) {
  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather API error: ' + response.status);
    const data = await response.json();
    const temp = data.main.temp;
    const desc = data.weather[0].description;
    return `<p class="temperature-info">Weather: ${desc}, <span>${temp}&deg;C</span></p>`;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return 'Weather data unavailable';
  }
}

/**
 * Fetch nearby help centers (hospitals and clinics) using the Overpass API.
 * The query searches within a 20 km radius.
 */
async function getHelpCenters(lat, lon) {
  try {
    const overpassUrl = "https://overpass-api.de/api/interpreter";
    const query = `[out:json];
      (
        node["amenity"="hospital"](around:20000,${lat},${lon});
        node["amenity"="clinic"](around:20000,${lat},${lon});
      );
      out;`;
    const response = await fetch(overpassUrl, { method: "POST", body: query });
    if (!response.ok) throw new Error("Failed to fetch help centers: " + response.status);
    const data = await response.json();
    if (!data.elements) {
      throw new Error("Overpass API response missing 'elements'");
    }
    return data.elements;
  } catch (error) {
    console.error('Error in getHelpCenters:', error);
    return [];
  }
}

/**
 * Display nearby help centers in the popup and add them as markers on the map.
 * Toggling: if the same alert's help centers are already displayed, clicking Help again will clear them.
 */
async function toggleHelpCentersDisplay(lat, lon, alertId) {
  const helpCentersDivId = `helpCenters-${alertId}`;
  const helpCentersDiv = document.getElementById(helpCentersDivId);
  // If help centers for this alert are already shown, clear them
  if (currentHelpAlertId === alertId) {
    helpCenterMarkers.clearLayers();
    helpCentersDiv.innerHTML = "";
    currentHelpAlertId = null;
    return;
  }
  // Otherwise, set the current help alert and load help centers
  currentHelpAlertId = alertId;
  helpCentersDiv.innerHTML = "<em>Loading help centers...</em>";
  // Clear any existing help center markers
  if (helpCenterMarkers) helpCenterMarkers.clearLayers();
  try {
    const centers = await getHelpCenters(lat, lon);
    if (centers.length === 0) {
      helpCentersDiv.innerHTML = "<em>No help centers found nearby.</em>";
    } else {
      helpCentersDiv.dataset.centers = JSON.stringify(centers);
      renderHelpCentersList(helpCentersDiv, centers, 3, false);
      // Add markers for each help center
      centers.forEach(center => {
        const centerLat = center.lat;
        const centerLon = center.lon;
        const hcMarker = L.marker([centerLat, centerLon], { icon: getHelpCenterIcon() });
        hcMarker.bindPopup(`<strong>${center.tags && center.tags.name ? center.tags.name : "Unnamed Hospital"}</strong>`);
        helpCenterMarkers.addLayer(hcMarker);
      });
    }
  } catch (error) {
    console.error("Error in showHelpCenters:", error);
    helpCentersDiv.innerHTML = `<em>Error fetching help centers: ${error.message}</em>`;
  }
}

/**
 * Render the help centers list in the popup.
 * When collapsed, show only the first 'limit' items with a "Read More" button.
 * When expanded, show all items with a "Show Less" button.
 */
function renderHelpCentersList(container, centers, limit, expand) {
  let html = "<ul class='help-center-list'>";
  if (!expand && centers.length > limit) {
    centers.slice(0, limit).forEach(center => {
      const name = center.tags && center.tags.name ? center.tags.name : "Unnamed Hospital";
      html += `<li>${name}</li>`;
    });
    html += "</ul>";
    html += `<button class="read-more-btn" onclick="event.stopPropagation(); toggleHelpCenters('${container.id}', ${limit}, true)">Read More</button>`;
  } else {
    centers.forEach(center => {
      const name = center.tags && center.tags.name ? center.tags.name : "Unnamed Hospital";
      html += `<li>${name}</li>`;
    });
    html += "</ul>";
    if (centers.length > limit) {
      html += `<button class="read-more-btn" onclick="event.stopPropagation(); toggleHelpCenters('${container.id}', ${limit}, false)">Show Less</button>`;
    }
  }
  container.innerHTML = html;
}

/**
 * Toggle the help centers list between collapsed and expanded states.
 */
function toggleHelpCenters(containerId, limit, expand) {
  const container = document.getElementById(containerId);
  let centers = [];
  try {
    centers = JSON.parse(container.dataset.centers);
  } catch (e) {}
  renderHelpCentersList(container, centers, limit, expand);
}

/**
 * Show the preparedness tips modal based on alert type.
 */
function showPreparednessTips(type) {
  let tips;
  switch (type) {
    case 'EQ':
      tips = `
        <h2>Earthquake Preparedness</h2>
        <ul>
          <li>Drop, Cover, and Hold On during shaking.</li>
          <li>Secure heavy furniture and objects.</li>
          <li>Keep an emergency kit ready.</li>
          <li>Plan and practice an evacuation route.</li>
        </ul>
      `;
      break;
    default:
      tips = `
        <h2>General Disaster Preparedness</h2>
        <p>Stay informed, plan ahead, and prepare an emergency kit with essential supplies.</p>
      `;
  }
  const modal = document.getElementById('modal');
  const modalContent = document.getElementById('modalContent');
  modalContent.innerHTML = `<span class="close" onclick="closeModal()">&times;</span>${tips}`;
  modalContent.style.maxHeight = "80vh";
  modalContent.style.overflowY = "auto";
  modal.style.display = 'block';
}

/**
 * Close the preparedness tips modal.
 */
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

/**
 * Define the marker icon for earthquake alerts.
 */
function getMarkerIcon(type) {
  let iconUrl;
  switch (type) {
    case 'EQ':
      iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
      break;
    default:
      iconUrl = 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png';
  }
  return L.icon({
    iconUrl: iconUrl,
    shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
}

/**
 * Define the marker icon for help centers (hospitals/clinics) using Font Awesome.
 */
function getHelpCenterIcon() {
  return L.divIcon({
    html: '<i class="fa-solid fa-hospital" style="color:#1976d2; font-size:22px;"></i>',
    className: 'help-center-div-icon',
    iconSize: [25, 25],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });
}

/**
 * Map the alert type to a human-readable string.
 */
function getEventType(type) {
  switch (type) {
    case 'EQ': return 'Earthquake';
    default: return 'Other';
  }
}

/**
 * Set up event listeners.
 */
function setupEventListeners() {
  document.getElementById('searchInput').addEventListener('input', handleSearch);
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  // Removed notification functionality.
  document.getElementById('modal').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', initMap);
