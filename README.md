# Live Earthquake Tracker

A responsive web application that visualizes earthquakes occurring
around the world in real time using an interactive Mapbox map, live
data feeds, and animated visualizations.

The application combines data from multiple public earthquake sources,
plots events on a world map, highlights new earthquakes with animated
target rings, reports tsunami information when available, and optionally
plays an audio notification for newly detected earthquakes.

------------------------------------------------------------------------

## Features

-   Interactive Mapbox GL JS map
-   Near real-time earthquake monitoring
-   Tsunami reporting (when available from source data)
-   Animated earthquake target-ring visualization
-   Live earthquake activity feed
-   Strongest earthquake display
-   Earthquake statistics
-   Optional audio notifications
-   Responsive dashboard layout
-   Custom interface built with HTML, CSS Grid, and JavaScript

------------------------------------------------------------------------

## Technologies

### Frontend

-   HTML5
-   CSS3
-   JavaScript (ES6)

### Mapping

-   Mapbox GL JS

### Data Sources

-   USGS Earthquake API
-   EMSC earthquake feed (WebSocket)

------------------------------------------------------------------------

## Project Highlights

This project demonstrates:

-   Consuming multiple public data sources
-   Working with REST APIs and WebSockets
-   Parsing and displaying JSON data
-   Interactive GIS mapping
-   Responsive dashboard design
-   CSS Grid and Flexbox layouts
-   DOM manipulation
-   Event-driven JavaScript
-   CSS animations
-   Audio notifications
-   Client-side state management
-   Deduplication of earthquake events received from different sources

------------------------------------------------------------------------

## How It Works

The application continuously listens for new earthquake events.

USGS data is retrieved through its public API, while EMSC events are
received through a WebSocket connection to provide timely updates.

When a new earthquake is detected, the application:

1.  Plots the event on the interactive map.
2.  Displays animated target rings at the earthquake location.
3.  Adds the event to the live activity panel.
4.  Updates earthquake statistics.
5.  Reports tsunami information when available.
6.  Optionally plays an audio notification.

------------------------------------------------------------------------

## Running the Project

Clone the repository:

``` bash
git clone https://github.com/YOUR_USERNAME/live-earthquake-tracker.git
```

Because this is a client-side application, you can simply serve the
project from a local web server or deploy it to any static hosting
service such as GitHub Pages, Netlify, or your own web host.

A Mapbox public (`pk.`) access token is required. The repository does
not include any secret credentials.

------------------------------------------------------------------------

## Future Enhancements

-   Persistent database to maintain a long-term earthquake history
-   Full-screen map mode
-   Historical playback improvements

------------------------------------------------------------------------

## License

This project is provided for educational and portfolio purposes.
