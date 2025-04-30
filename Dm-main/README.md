# Global Disaster Alert Dashboard

## What the Project Does

The Global Disaster Alert Dashboard is a web application that displays real-time earthquake alerts worldwide. It fetches live earthquake data from the USGS Earthquake API and shows the alerts on an interactive map using OpenStreetMap tiles with marker clustering. For each earthquake alert, the dashboard displays detailed information including the location, magnitude (with a color-coded severity), date, and current weather conditions (via OpenWeatherMap). Additionally, users can click on any earthquake marker to view nearby help centers (hospitals and clinics) dynamically retrieved from the Overpass API. The dashboard also provides earthquake preparedness tips in a modal popup to help users know how to respond during an emergency.

## Why the Project Is Useful

- **Real-Time Information:**  
  Stay up-to-date with live earthquake alerts from around the world, which is crucial for disaster preparedness and response.
  
- **Interactive Map Integration:**  
  The application uses an interactive map to visually represent earthquake events, making it easy to see where events are occurring.

- **Enhanced Situational Awareness:**  
  In addition to earthquake details, users can see current weather conditions at the event location and find nearby help centers (hospitals/clinics), which can be critical during emergencies.

- **Preparedness Guidance:**  
  The dashboard includes earthquake preparedness tips to educate users on safety measures and emergency response strategies.

- **User-Friendly Search:**  
  A search bar enables users to filter alerts by location, type, severity, or country, ensuring they can quickly find the information relevant to them.

## How Users Can Get Started with the Project

### Prerequisites
- A modern web browser (Chrome, Firefox, Safari, Edge, etc.)
- An active internet connection (to fetch real-time data from the APIs)

### Installation

1. **Clone or Download the Repository:**
   ```bash
   git clone https://github.com/yourusername/global-disaster-alert-dashboard.git

    Alternatively, download the ZIP file and extract it.

1.  **Configure API Keys:**

    -   Open the `script.js` file.

    -   Replace the placeholder OpenWeatherMap API key (`886f7df7c8a769ffa51585853f8763c8`) with your own valid API key from [OpenWeatherMap](https://openweathermap.org/api).

2.  **Run the Application:**

    -   Use a static file server to launch the project locally. For example, in Visual Studio Code:

        1.  Install the **Live Server** extension.

        2.  Right-click on `index.html` and select **Open with Live Server**.

    -   Alternatively, open `index.html` directly in your browser (note: some API calls may require a local server).

## Where Users Can Get Help with the Project
-----------------------------------------

### Documentation

-   This README provides setup and usage instructions.

-   **API References:**

    -   [USGS Earthquake API](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php)

    -   [OpenWeatherMap API](https://openweathermap.org/api)

    -   [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API)

### Issues & Support

-   Contact the maintainer via email at `dhruv.s5510@gmail.com` for urgent inquiries.

## Who Maintains and Contributes to the Project
--------------------------------------------

### Maintainer

-   **DHRUV SHARMA** - Primary maintainer. Contact for project-related queries.

### Contributors

-   Contributions are welcome! To contribute:

    1.  Fork the repository.

    2.  Create a feature branch.

    3.  Commit your changes.

    4.  Open a pull request with a detailed description of your changes.

* * * * *

**Thank you for using the Global Disaster Alert Dashboard!**\
Your feedback and contributions are highly appreciated. 🌍🚨