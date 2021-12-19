console.log("The script is going to start...");


// Hier wird die verwendete API für Geolocations gewählt.


GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
let gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    let tryLocate = function (onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function (error) {
                let msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    let getLatitude = function (position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    let getLongitude = function (position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    let apiKey = "G6JwmA3aQQIrd1dhtZ1MY9y8mQiGEMdz";

    /**
     * Funktion erzeugt eine URL, die auf die Karte verweist.
     * Falls die Karte geladen werden soll, muss oben ein API Key angegeben
     * sein.
     *
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    let getLocationMapSrc = function (lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        let tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function (tag) {
            tagList += "|" + tag.name + "," + tag.latitude + "," + tag.longitude;
        });

        let urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Map Url: " + urlString);
        return urlString;
    };


    return {

        // Public Member

        updateLocation: function (tagList = undefined) {
            let latitude = document.getElementById("latitude").value;
            let longitude = document.getElementById("longitude").value;
            if ((latitude === "") || (longitude === "")) {
                tryLocate(function (position) {
                        latitude = getLatitude(position);
                        longitude = getLongitude(position);

                        document.getElementById("latitude").value = latitude;
                        document.getElementById("longitude").value = longitude;

                        console.log("Calling Geo-Locator api");
                        gtaLocator.synchronizeMap(tagList);
                    },

                    function (error) {
                        alert(error);
                    }
                );
            } else
                gtaLocator.synchronizeMap(tagList);

        },
        synchronizeMap: function (tagList = undefined) {
            console.log("Requesting image ");
            let latitude = document.getElementById("latitude").value;
            let longitude = document.getElementById("longitude").value;

            document.getElementById("result-img").src = getLocationMapSrc(latitude, longitude, tagList, 15);
        }

    }; // ... End of public part
})(GEOLOCATIONAPI);

/**
 * $(function(){...}) wartet, bis die Seite komplett geladen wurde. Dann wird die
 * angegebene Funktion aufgerufen.
 */
$(function () {


    //synced die Map bei Seiten-refresh (F5)
    gtaLocator.synchronizeMap();

    //Beim ersten Aufruf, bzw. laden der Seite wird getTags aufgerufen
    getTags();

    //Beim Klicken des tagging-button's wird postTags aufgerufen
    document.getElementById("tagging-button").addEventListener("click", postTags);


    //Wenn discovery button gedrückt wird, wird getTags aufgerufen
    document.getElementById("discovery-button").addEventListener("click", getTags);


});

//Funktion um Liste zu laden und um Tag zu erweitern
function refreshTags(tagList) {
    let ul = document.getElementById("results");
    ul.innerHTML = "";                                            //cleared list
    tagList.forEach(tag => {
        let entry = document.createElement("li");
        entry.appendChild(document.createTextNode(tag.name + " (" + tag.latitude + ", " + tag.longitude + ") " + tag.hashtag));
        ul.appendChild(entry);
    });
}

/**Sendet eine GET Anfrage (für die tagList) an den Server und aktualisiert anschließend die Map,
 * sowie die Liste in der die Tags stehen
 */
function getTags() {
    let ajax = new XMLHttpRequest();
    let searchTerm = document.getElementById("searchTerm").value;
    if (searchTerm !== "")
        //Sendet GET mit Suchwort (z.B. /discovery/abc)
        ajax.open("GET", "/geotags/" + searchTerm, true);
    else
        //Sendet GET ohne Suchwort
        ajax.open("GET", "/geotags", true);

    //Wenn die Anfrage beendet ist und die tagList vom Server vorliegt, rufe refreshTags auf
    ajax.onreadystatechange = function () {
        if (ajax.readyState === 4) {
            let tagList = JSON.parse(ajax.response);        //Parsed die response des Server von JSON in ein tagList array
            console.log("GET DISCOVERY: " + ajax.response);
            refreshTags(tagList);
            gtaLocator.updateLocation(tagList);                 //Aktualisiert die Map
            refreshTags(tagList);                            //Aktualisiert die Liste in der die Tags stehen
        }
    }
    ajax.send();
}


//Sendet eine POST Anfrage mit einem neuen Tag an den Server und bekommt anschließend die vollständige TagList zurück
//danach werden Map sowie die HTML List in der die Tags stehen aktualisiert
function postTags() {
    //Lädt die Werte aus dem Formular in Variablen
    let latitude = document.getElementById("latitude").value;
    let longitude = document.getElementById("longitude").value;
    let name = document.getElementById("name").value;
    let hashtag = document.getElementById("hashtag").value;
    if (hashtag === "") {
        hashtag = "#"
    }

    let ajax = new XMLHttpRequest();
    ajax.open("POST", "/tagging", true);
    ajax.setRequestHeader("Content-Type", "application/json;charset=UTF-8");

    //Wenn die Anfrage beendet ist und die tagList vom Server vorliegt, rufe refreshTags auf
    ajax.onreadystatechange = function () {
        if (ajax.readyState === 4) {
            let tagList = JSON.parse(ajax.responseText);         //Parsed die response des Server von JSON in ein tagList array
            console.log("Tag added, complete List: " + ajax.responseText);
            gtaLocator.updateLocation(tagList);                  //Aktualisiert die Map
            refreshTags(tagList);                              //Aktualisiert die Liste in der die Tags stehen
        }
    }
    //Sende den Tag an den Server
    ajax.send(JSON.stringify({
        "latitude": latitude,
        "longitude": longitude,
        "name": name,
        "hashtag": hashtag,
    }));
}