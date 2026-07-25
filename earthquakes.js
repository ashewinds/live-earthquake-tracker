// earthquakes.js
let earthquakeList = new Map();
let lifespanManagerIntervals = new Map();
let initialLoad = true;
let totalTime; // max time for countdown to replay
let replaying = false;
const replayDuration = 30000; // total time for replay in milliseconds
const newQuakeSound = document.getElementById('new-quake-alert');
const timelapseQuakeSound = document.getElementById('timelapse-quake-alert');

// setting to turn timelapse sound on or off
const toggleButton = document.getElementById('toggleButton');
let timelapseSound = false;
let newQuakeSoundEnabled = true;
toggleButton.classList.toggle('active', newQuakeSoundEnabled);

toggleButton.addEventListener('click', () => {
    newQuakeSoundEnabled = !newQuakeSoundEnabled;
    toggleButton.classList.toggle('active');
});

window.addEventListener('resize', () => {
    map.resize();
});

mapboxgl.accessToken = 'pk.eyJ1IjoiYXNoZXdpbmRzIiwiYSI6ImNtczB0dGVvNTBsd3UyeHE2ODJpeWl6a2MifQ.ee3nqDSWcOScWd7T0N00fQ';

const map = new mapboxgl.Map({
    container: 'map-container', // container ID
    center: [0, 0], // starting position [lng, lat]. Note that lat must be set between -90 and 90
    style: 'mapbox://styles/ashewinds/cm1r8bip800mx01pd8u55anu6',
    zoom: 1, // starting zoom
    maxBounds: [[-180, -90], [180, 90]]
});
console.log('map top: ' + map.style.top)

map.on('load', () => {
    //map.dragPan.disable();
    console.log('map top: ' + map.style.top)
    //map.resize();
    console.log('map top: ' + map.style.top)
    map.setCenter([11, 0]);
    //sizeTargetWindow();
});

var sock;

function connect() {
    sock = new SockJS('https://www.seismicportal.eu/standing_order');

    sock.onopen = function() {
        console.log('connected');
    };

    sock.onmessage = function(e) {
        let msg = JSON.parse(e.data);
        console.log('message received:', msg);
        if (msg.action == 'create' && !isDuplicate(msg)){
            if (replaying) {
                setTimeout(() => {
                    addEmscMarker(msg);
                    console.log('adding an emsc earthquake');
                }, 32000);
            } else {
                addEmscMarker(msg);
            }
        }
    };

    sock.onclose = function() {
        console.log('disconnected');
        // Attempt to reconnect after a delay
        setTimeout(connect, 2000); // Reconnect after 2 seconds
    };

    sock.onerror = function(error) {
        console.log('WebSocket error:', error);
    };
}

// Initial connection
connect();



function endMarkerLifespan(el){
    el.style.opacity = 0;
    if (el.getAttribute('tsunami') == 1){
        let el_tsunami = document.getElementById('tsunami-' + el.getAttribute('id'));
        el_tsunami.style.opacity = 0;
        el_tsunami.remove();
    }
    earthquakeList.delete(el.getAttribute('id'));
    const intervalId = lifespanManagerIntervals.get(el.getAttribute('id'));
    clearInterval(intervalId);
    el.remove();
}

function updateMarkerLifespan(el){
    const startTime = el.getAttribute('startTime');
    const maxLifeDuration = 24 * 60 * 60 * 1000; // 24 * 60 * 60 * 1000; One day, in milliseconds
    const elapsedTime = Date.now() - startTime; // elapsed time in milliseconds
    if (elapsedTime > maxLifeDuration) {
        endMarkerLifespan(el);
    } else {
        el.style.zIndex = 24 - Math.floor(elapsedTime / (60 * 60 * 1000)); // convert milliseconds to hours, this shows hours passed
        let opacity = 1 - (elapsedTime / maxLifeDuration);
        el.style.opacity = opacity;
        //console.log('elapsedTime in hours: ' + (elapsedTime/(60*60*1000)) + ' opacity: ' + el.style.opacity);
        if (el.getAttribute('tsunami') == 1){
            let el_tsunami = document.getElementById('tsunami-' + el.getAttribute('id'));
            el_tsunami.style.zIndex = 24 - Math.floor(elapsedTime / (60 * 60 * 1000)); // convert milliseconds to hours, this shows hours passed
            //let opacity = 1 - (elapsedTime / maxLifeDuration);
            el_tsunami.style.opacity = opacity;
            void el_tsunami.offsetWidth;  // forces a reflow
        }
    }
    void el.offsetWidth; // forces a reflow
}

function startMarkerLifespan(el){
    el.style.opacity = 1;
    el.style.zIndex = 24;
    if (lifespanManagerIntervals.has(el.getAttribute('id'))) {
        clearInterval(lifespanManagerIntervals.get(el.getAttribute('id')));
    }
    const markerLifespanManager = setInterval(() => {
        updateMarkerLifespan(el);
    }, 60000);
    lifespanManagerIntervals.set(el.getAttribute('id'), markerLifespanManager);
    setTimeout(() => {
        updateMarkerLifespan(el);
    }, 500);
    //updateMarkerLifespan(el);
}

function refreshMarkersOnMapEvents(){
    sizeTargetWindow();
    earthquakeList.forEach((_, id) => {
        const el = document.getElementById(id);
        if (el) {
            setTimeout(() => {
                updateMarkerLifespan(el);
            }, 100);
        }
    });
}

map.on('zoomend', refreshMarkersOnMapEvents);
map.on('moveend', refreshMarkersOnMapEvents);

function fetchEarthquakeData(){
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // 1 day
    const endTime = new Date().toISOString(); // now
    
    const url = `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=${startTime}&endtime=${endTime}`;
    
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok.');
            }
            return response.json();
        })
        .then(data => {
            const earthquakes = data.features;

            earthquakes.forEach(eq => {
                //isDuplicate(eq);
                //if (!earthquakeList.has(eq.id)){
                if (!isDuplicate(eq, 'usgs')){
                    if (replaying) {
                        setTimeout(() => {
                            addUsgsMarker(eq);
                        }, 32000);
                    } else {
                        addUsgsMarker(eq);
                    }
                } 
            })
            console.log('fecth earthquake ran but no new earthquakes');
            initialLoad = false;
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation.', error);
    });
}

function isDuplicate(eq, source){
    let id, lng, lat, mag, time, depth;
    const epsilon = 59000;
    if (source == 'usgs'){
        id = eq.id;
        lng = parseFloat((eq.geometry.coordinates[0]).toFixed(3));
        lat = parseFloat((eq.geometry.coordinates[1]).toFixed(3));
        mag = Math.round(eq.properties.mag * 10) / 10;
        time = eq.properties.time;
        depth = Math.abs(Math.round(eq.geometry.coordinates[2] * 10) / 10);
    } else {
        id = eq.data.id;
        lng = parseFloat((eq.data.geometry.coordinates[0]).toFixed(3));
        lat = parseFloat((eq.data.geometry.coordinates[1]).toFixed(3));
        mag = Math.round(eq.data.properties.mag * 10) / 10;
        time = (new Date(eq.data.properties.time)).getTime();
        depth = Math.abs(Math.round(eq.data.properties.depth) * 10 / 10);
    }    
    for (let [key, value] of earthquakeList){
        if (id == key){
            console.log('matched id');
            return true;
        }
        let sameLng = Math.abs(lng - parseFloat((value.lng).toFixed(3))) < 0.001; // Allow small tolerance
        let sameLat = Math.abs(lat - parseFloat((value.lat).toFixed(3))) < 0.001;
        let sameMag = mag == value.mag;
        let sameDepth = depth == value.depth;
        let sameTime = Math.abs(time - value.time) < epsilon;
        if (sameLng && sameLat && sameMag && sameDepth && sameTime) {
            console.log('duplicate found');
            return true;
        }
        //console.log('eq.id: ' + eq.id + ' key.magnitude: ' + value.magnitude + ' value.time: ' + value.time + ' value.lng: ' + value.lng + ' value.lat: ' + value.lat);
    }
    return false;

    /*
   usgs:
   earthquakeList.set(feature.id, {
        time: feature.properties.time,
        magnitude: Math.round(feature.properties.mag * 10) / 10,
        location: formattedLocation,
        tsunami: feature.properties.tsunami,
        depth: Math.abs(Math.round(feature.geometry.coordinates[2] * 10) / 10),
        source: 'usgs',
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1]
    });
 
    emsc:
    earthquakeList.set(feature.data.id, {
        time: ticks,
        magnitude: Math.round(feature.data.properties.mag * 10) / 10,
        location: formattedLocation,
        tsunami: 0,
        depth: Math.abs(feature.data.properties.depth),
        source: 'emsc',
        lng: feature.data.geometry.coordinates[0],
        lat: feature.data.geometry.coordinates[1]
    });
    */
    
}

setInterval(fetchEarthquakeData, 60000);

function updateListPanels(){
    const quakeTotalsDiv = document.getElementById('quakes-total');
    quakeTotalsDiv.innerHTML = "";
    quakeTotalsDiv.innerHTML = earthquakeList.size;  // the total number of earthquakes
    
    const recentPanel = document.getElementById('recent-list');  // rename to recent-list. **********************************
    recentPanel.innerHTML = '';
    
    const listItems = Array.from(earthquakeList.entries())
        .sort((a, b) => b[1].time - a[1].time);
    
    for (let i = 0; i < Math.min(9, listItems.length); i++) {
        let [recentId, recentData] = listItems[i];
        const recentPanelEntry = buildPanelEntry(recentId, recentData);
        recentPanel.appendChild(recentPanelEntry);
        if (recentData.tsunami == 1){
            recentPanelEntry.appendChild(buildTsunamiEntry(recentId));
        } 
    }
    
    // calculate quakes per magnitudes and identify the strongest quake
    let strongestMag = 0;
    let strongestMagIndex = 0;
    const magTotals = new Array(10).fill(0);
    let magToIncrement = 0;
    
    for (let i = 0; i < listItems.length; i++){
        magToIncrement = 0;
        
        const [id, data] = listItems[i];
        
        if (data.magnitude > strongestMag) {
            strongestMag = data.magnitude;
            strongestMagIndex = i;
        }
        
        if (data.magnitude < 1) {
            magToIncrement = 0;
        } else if (data.magnitude >= 9) {
            magToIncrement = 9;
        } else {
            magToIncrement = Math.floor(data.magnitude)
        }
        magTotals[magToIncrement] += 1;
    }
    
    for (let i = 0; i < magTotals.length; i++){
        document.getElementById('mag' + i + '-totals').innerHTML = '[' + magTotals[i] + ']';
    }
    
    // list the strongest quake on right panel
    const strongestPanel = document.getElementById('strongest-list');
    strongestPanel.innerHTML = '';
    //console.log('strongestMagIndex: ' + strongestMagIndex);
    const [strongestId, strongestData] = listItems[strongestMagIndex];
    
    const strongestPanelEntry = buildPanelEntry(strongestId, strongestData);
    strongestPanel.appendChild(strongestPanelEntry);
    if (strongestData.tsunami == 1){
        strongestPanelEntry.appendChild(buildTsunamiEntry(strongestId));
    }
}


function buildPanelEntry(id, data) {
    const currentTime = Date.now();
    let listItemDiv = document.createElement('div');
        
        const formattedTime = new Date(data.time).toUTCString();
        const location = data.location;
        const depth = data.depth;
        let magnitude = data.magnitude;
        if (magnitude < 0){
            magnitude = 0;
        } else if (magnitude > 9){
            magnitude = 9;
        }
        const magColorClass = 'mag-' + Math.floor(magnitude) + '-color';
        const source = data.source;
        const timeDiff = currentTime - data.time;
        const hoursPassed = Math.floor(timeDiff / (1000 * 60 * 60)); // convert time to hours
        const minsPassed = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        let timeSinceQuakeString = "";
        if (hoursPassed >= 2) {
            timeSinceQuakeString = hoursPassed + " Hours";
        } else if (hoursPassed > 0) {
            timeSinceQuakeString = hoursPassed + " Hour";
        }
        if (minsPassed > 0) {
            if (hoursPassed > 0) {
                timeSinceQuakeString += ", ";
            }
            if (minsPassed == 1) {
                timeSinceQuakeString += minsPassed + " Minute";
            } else {
                timeSinceQuakeString += minsPassed + " Minutes";   
            }
        }
       
        listItemDiv.innerHTML = `<div class="top-row"><div class="div-mag"> MAG ${magnitude}</div><div class="div-depth">Depth ${depth} Km</div></div><div class="div-location"> ${location} </div><div class="bottom-row"><div class="div-time"> ${formattedTime}</div><div class="div-source">&nbsp;&nbsp;${source}</div></div><div class="time-since-quake">${timeSinceQuakeString} ago</div>`;
        listItemDiv.classList.add('panel-entry', magColorClass);
        
        //panel.appendChild(listItemDiv);
        return listItemDiv;
    
}

function buildTsunamiEntry(id){
    let tsunamiDiv = document.createElement('div');
    tsunamiDiv.setAttribute('id', 'tsunami-' + id);
    tsunamiDiv.innerHTML = "Tsunami Threat Possible";
    tsunamiDiv.classList.add('tsunami-threat-div');
    return tsunamiDiv;
}

function addUsgsMarker(feature){
    let formattedLocation = formatLocation(feature.properties.place);
    earthquakeList.set(feature.id, {
        time: feature.properties.time,
        magnitude: Math.round(feature.properties.mag * 10) / 10,
        location: formattedLocation,
        tsunami: feature.properties.tsunami,
        depth: Math.abs(Math.round(feature.geometry.coordinates[2] * 10) / 10),
        source: 'usgs',
        lng: feature.geometry.coordinates[0],
        lat: feature.geometry.coordinates[1]
    });
                    
    if (initialLoad == false){
        console.log('calling animate earthquake function from add usgs marker function');
        animateEarthquakeRings(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
        //addTargetCircle(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
    }
    const dot = document.createElement('div');
    
    dot.setAttribute('startTime', feature.properties.time);
    dot.setAttribute('id', feature.id);
    dot.setAttribute('tsunami', feature.properties.tsunami);
    dot.setAttribute('source', 'usgs');
    dot.className = 'marker';
    
    let magnitude = feature.properties.mag;
    
    if (magnitude < 0) {
        magnitude = 0;
    } else if (magnitude > 9){
        magnitude = 9;
    }
    
    const mag = Math.floor(magnitude);
    
    dot.classList.add('mag-' + mag + '-circle-size', 'mag-' + mag + '-color');
   
    new mapboxgl.Marker({
        element: dot,
        anchor: 'center',
        })
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);

    if (feature.properties.tsunami == 1){
        const tsunami_dot = document.createElement('div');
        tsunami_dot.setAttribute('id', 'tsunami-' + feature.id);
        //tsunami_dot.className = 'tsunami-marker';
        
        tsunami_dot.classList.add('tsunami-marker', 'tsunami-mag-' + mag);
        
        new mapboxgl.Marker(tsunami_dot)
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);
        //startMarkerLifespan(tsunami_dot);
    }
    /*
    setTimeout(() => {
        console.log('happening now');
        dot.classList.add('animate');
    }, 3000);
    
    setTimeout(() => {
        startMarkerLifespan(dot);
    }, 5000);
    */
    startMarkerLifespan(dot);
    updateListPanels();
    //console.log('New USGS earthquake added:' + feature.id);
}

function addEmscMarker(feature){
    console.log('calling animate earthquake function from add emsc marker function');
    animateEarthquakeRings(feature.data.geometry.coordinates[0], feature.data.geometry.coordinates[1]);
    //addTargetCircle(feature.data.geometry.coordinates[0], feature.data.geometry.coordinates[1]);
    const ticks = (new Date(feature.data.properties.time)).getTime();
    let formattedLocation = formatLocation(feature.data.properties.flynn_region);
    earthquakeList.set(feature.data.id, {
        time: ticks,
        magnitude: Math.round(feature.data.properties.mag * 10) / 10,
        location: formattedLocation,
        tsunami: 0,
        depth: Math.abs(Math.round(feature.data.properties.depth) * 10 / 10),
        source: 'emsc',
        lng: feature.data.geometry.coordinates[0],
        lat: feature.data.geometry.coordinates[1]
    });
    
    const dot = document.createElement('div');
    
    //const ticks = (new Date(feature.data.properties.time).getTime());
    dot.setAttribute('startTime', ticks);
    //dot.setAttribute('startTime', feature.data.properties.time);
    dot.setAttribute('id', feature.data.id);
    dot.setAttribute('tsunami', 0);
    dot.setAttribute('source', 'emcs');
    dot.className = 'marker';
    
    let magnitude = feature.data.properties.mag;
    
    if (magnitude < 0) {
        magnitude = 0;
    } else if (magnitude > 9){
        magnitude = 9;
    }
    
    const mag = Math.floor(magnitude);
    
    dot.classList.add('mag-' + mag + '-circle-size', 'mag-' + mag + '-color');
   
    new mapboxgl.Marker({
        element: dot,
        anchor: 'center',
        })
        .setLngLat(feature.data.geometry.coordinates)
        .addTo(map);

/*    if (feature.properties.tsunami == 1){
        const tsunami_dot = document.createElement('div');
        tsunami_dot.setAttribute('id', 'tsunami-' + feature.id);
        
        tsunami_dot.classList.add('tsunami-marker', 'tsunami-mag-' + mag);
        
        new mapboxgl.Marker(tsunami_dot)
        .setLngLat(feature.geometry.coordinates)
        .addTo(map);
        //startMarkerLifespan(tsunami_dot);
    } */
    
    //setTimeout(() => {
        //dot.classList.add('animate');
    //}, 0);
    
    startMarkerLifespan(dot);
    updateListPanels();
    console.log('New EMSC earthquake added:' + feature.data.id);
}

fetchEarthquakeData();

function formatLocation(input){
    let formattedString 
    if (/\d/.test(input.charAt(0))) {
        return input.replace(/(\d+)\s*k(m)(.*)/i, '$1 Km$3') || input;
    } else {
        return input.charAt(0).toUpperCase() + input.slice(1);   
    }
}

function sizeTargetWindow(){
    map.resize();
}

/*
function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
setInterval(() => {
   setTimeout(() => {
    const lng = getRandomInt(-180, 180);
    const lat = getRandomInt(-85, 85);
    console.log('simulating earthquake: lng: ' + lng + ' lat: ' + lat);
    //animateEarthquakeRings(lng, lat);
    animateEarthquakeRings(21.828, 38.044);
    }, 4000); 
}, 10000);
*/


function animateEarthquakeRings(lng, lat){
    //lng = 0;
    //lat = 0;
    console.log('in animateEarthquakeRings function');
    
    console.log('lng: ' + lng + "  lat: " + lat);
    // convert long/lat to pixel coordinates
    const point = map.project([lng, lat]);
    console.log('point.x: ' + point.x + 'point.y: ' + point.y);
    
    if (newQuakeSoundEnabled) {
        newQuakeSound.currentTime = 0;
    }
    newQuakeSound.play().catch(error => {
        console.error("New earthquake sound failed", error)
    });
    console.log('just played soundn from animatedEarthquakeRings');
    
    
    for (let i = 1; i <= 3; i++) {
        setTimeout(() => {
            //const topLeftCorner = map.project([-168, 85]); // was 87 
            //const mapTop = topLeftCorner.y;
            let c = document.createElement('div');
            c.id = 'target-circle-' + i;
            c.className = 'circle';
            //let c = document.getElementById('target-circle' + i);
            //let cRect = c.getBoundingClientRect();
            if (c){
                console.log('c offsetHeight: ' + c.offsetHeight);
                //c.style.top = point.y - (c.offsetHeight / 2) - 3.3 + 'px';
                //c.style.left = point.x - (c.offsetWidth / 2) - 2.8 + 'px';
                c.style.top = point.y + 'px';
                c.style.left = point.x + 'px';
                c.style.opacity = 1;
                (document.getElementById('target-container')).appendChild(c);
                c.style.animation = 'grow 4s ease-in-out forwards';
                //c.removeEventListener('animationend', resetCircle);
                //c.addEventListener('animationend', resetCircle);
                removeCircle(c);
                console.log('animating ' + c.id);
            } else {
                console.log('no target-circle available, with index: ' + i);
            }
        }, 400 * (i - 1));

        /*setTimeout(() => {
            console.log('removing circle: ' + i);
            (document.getElementById('target-circle' + i)).remove();
        }, 2350);*/
    }
} 

function removeCircle(c){
    setTimeout(() => {
        c.remove();
    }, 1500);
}


function startRecapTimer(){
    totalTime = 5 * 60;
    const liveHeader = document.getElementById('live-header');
    liveHeader.style.visibility = 'visible';
    const timerElement = document.getElementById('recap-timer');
    
    const countdown = setInterval(() => {
        const minutes = Math.floor(totalTime / 60);
        const seconds = totalTime % 60;
        
        const formattedMinutes = String(minutes).padStart(1, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');
        
        timerElement.textContent = `in ${formattedMinutes}:${formattedSeconds}`;
        
        totalTime--;
        
        if (totalTime <= 0) {
            clearInterval(countdown);
            timerElement.textContent = "";
            replaying = true;
            playRecap();
        }
    }, 1000);
}

startRecapTimer();


function playRecap(){
    // hide the markers
    const liveHeader = document.getElementById('live-header');
    liveHeader.style.visibility = 'hidden';
    let scaledTimeUnit = 0.000347222; // used to scale time 24 hours (86,400,000 ms) into 30 seconds (30000 ms) = 2,880,000 ms or 0.000347222 (30/86400000)
    
    const markers = document.querySelectorAll('.marker');
    markers.forEach(marker => {
        marker.setAttribute('data-opacity', marker.style.opacity);
        marker.style.visibility = 'hidden';
        //marker.style.opacity = 1;
    });
    
    const tsunamiMarkers = document.querySelectorAll('.tsunami-marker');
    tsunamiMarkers.forEach(tsunami => {
        tsunami.setAttribute('data-opacity', tsunami.style.opacity);
        tsunami.style.visibility = 'hidden';
        //tsunami.style.opacity = 1;
    })
    
    // get the earthquake list sorted by time
    const listItems = Array.from(earthquakeList.entries())
        .sort((a, b) => a[1].time - b[1].time);
        
    let delay = 0;    // used to simulate time passage and calculate delay between earthquakes
    
    animateProgressBar();
    
    for (let i = 0; i < listItems.length; i++) {
        //let marker = document.getElementById(listItems[i][0]);
        if (i >= 1) {
            delay += (listItems[i][1].time - listItems[i-1][1].time) * scaledTimeUnit;
            //console.log('delay is: ' + delay);
        }
        setTimeout(() => {
            if (timelapseSound) {
                //timelapseQuakeSound.play();
            }
            (document.getElementById(listItems[i][0])).style.visibility = 'visible';
            (document.getElementById(listItems[i][0])).style.opacity = 1;
            if (listItems[i][1].tsunami == 1) {
                document.getElementById('tsunami-' + listItems[i][0]).style.visibility = 'visible';
                document.getElementById('tsunami-' + listItems[i][0]).style.opacity = 1;
            } 
        }, delay);
    }
    setTimeout(() => {
        replaying = false;
        resetOpacity(markers);
        resetOpacity(tsunamiMarkers);
        startRecapTimer();
    }, 30000);
}

function resetOpacity(els){
    els.forEach(el => {
        el.style.opacity = el.getAttribute('data-opacity');
    })
}

function animateProgressBar(){
    const bar = document.getElementById('progress-bar');
    bar.style.width = '0%';
    
    void bar.offsetWidth; // trigger reflow
    bar.classList.add('animated');
    void bar.offsetWidth;
    
    setTimeout(() => {
        bar.style.width = '100%'; // Animate to 100%
    }, 10); 
    
    setTimeout(() => {
        bar.classList.remove('animated');
    }, 31000);
}








/*const geojson = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-77.032, 38.913]
            },
            properties: {
                title: 'Mapbox',
                description: 'Washington, D.C.'
            }
        },
        {
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [-122.414, 37.776]
            },
            properties: {
                title: 'Mapbox',
                description: 'San Francisco, California'
            }
        }
        ]
};*/

/*for (const feature of geojson.features) {
    const el = document.createElement('div');
    el.className = 'marker';
    
    new mapboxgl.Marker(el)
        .setLngLat(feature.geometry.coordinates)
        .setPopup(
            new mapboxgl.Popup({ offset: 25 }) //add popups
                .setHTML(
                    `<h3>${feature.properties.title}</h3><p>${feature.properties.description}</p>`
                )
        )
        .addTo(map);
}*/


map.on('load', () => {
    map.dragPan.disable();
    //const headerContainer = document.getElementById('container-header');
    //const headerHeight = headerContainer.offsetHeight;
    //map.style.top = headerHeight + 'px';
    //console.log('header container height: ' + headerHeight);
    //const mapCont = document.getElementById('map-container');
    //mapCont.style.height = '100%';
    //mapCont.style.top = headerHeight + 'px';
    //const targetCont = document.getElementById('target-container');
    //targetCont.style.top = headerHeight + 'px';
    sizeTargetWindow();
    
});











