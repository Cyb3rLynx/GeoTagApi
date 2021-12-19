/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */
let http = require('http');
let path = require('path');
let logger = require('morgan');
let bodyParser = require('body-parser');
let express = require('express');
const {send} = require('process');
const {name} = require('ejs');


let app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 */
app.use("/", express.static(path.join(__dirname, 'public')));


/**
 * Konstruktor für GeoTag Objekte.
 */
class GeoTag {
    constructor(body) {
        this.latitude = body.latitude
        this.longitude = body.longitude
        this.name = body.name
        if (body.hashtag.length > 0) {
            if (body.hashtag.includes('#'))
                this.hashtag = body.hashtag
            else
                this.hashtag = '#' + body.hashtag
        }

    }
}

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags, Latitude und Longitude
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum Hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */
let tagList = [];
let filteredList = [];
let latitude;
let longitude;

function searchKoordinate(tag) {
    const RADIUS = 0.005;
    let diff_lat = Math.abs(tag.latitude - tagList[tagList.length - 1].latitude);
    let diff_lon = Math.abs(tag.longitude - tagList[tagList.length - 1].longitude);
    let diff = Math.sqrt(diff_lat * diff_lat + diff_lon * diff_lon);

    if (diff > RADIUS)
        return false;
    else
        return true;
}

function searchName(searchTerm = "") {
    for (let i = 0; i < tagList.length; i++) {
        if (tagList[i].name.includes(searchTerm) || tagList[i].hashtag.includes(searchTerm)) {
            if (searchKoordinate(tagList[i]))
                filteredList.push(getTag(i));
        }
    }
}

function addTag(body) {
    tagList.push(new GeoTag(body));
    console.log("Tag added!");
}

function deleteTag(index) {
    tagList.splice(index, 1);
    console.log("Tag deleted");
}

function getTag(i) {
    let body = {
        latitude: tagList[i].latitude,
        longitude: tagList[i].longitude,
        name: tagList[i].name,
        hashtag: tagList[i].hashtag
    };
    return new GeoTag(body)
}

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function (req, res) {
    res.render('gta', {
        taglist: [],
        latitude,
        longitude
    });
});

app.get('/about', function (req, res) {
    res.render('about.ejs', {});
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */

app.post('/tagging', function (req, res) {
    latitude = req.body.latitude;
    longitude = req.body.longitude;
    console.log(req.body);
    addTag(req.body);
    res.send(tagList);
});

/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */

//GET Request mit SearchTerm
app.get('/geotags/:searchTerm', function (req, res) {
    filteredList = [];
    searchName(req.params.searchTerm || ("#" + req.params.searchTerm));
    console.log('Search for: "' + req.params.searchTerm + '" gave ' + filteredList.length + ' results');
    res.send(JSON.stringify(filteredList));
});

//GET Request ohne SearchTerm
app.get('/geotags', function (req, res) {
    filteredList = [];
    searchName("" && "undefined");
    console.log('Search for: "' + '" gave ' + filteredList.length + ' results');
    res.send(JSON.stringify(filteredList));
});


//POST Request zum Hinzufügen von Tags
app.post('/geotags/add', function (req, res) {
    addTag(req.query);
    console.log("Calling API to add new Tag");
    res.sendStatus(201);    //HTTP Response Code ist 201 (Created)
});

//GET Request zum Lesen einzelner Tags über ID
app.get('/geotags/read/:id', function (req, res) {
    console.log('Calling API to read Tag with id: ' + req.params.id);
    if (req.params.id < tagList.length) {
        res.send(JSON.stringify(tagList[req.params.id]));
    } else {
        res.sendStatus(404) //Fehler: Ressource nicht gefunden
    }

});

//POST Request zum Ändern von Tags
app.post('/geotags/:id/change', function (req, res) {
    console.log("Calling API to add change Tag with id: " + req.params.id);
    if (req.params.id < tagList.length) {
        let ret = JSON.stringify(tagList[req.params.id]);
        tagList[req.params.id] = new GeoTag(req.query);
        res.send(ret);
    } else {
        res.sendStatus(404) //Fehler: Ressource nicht gefunden
    }
});

//POST Request zum Löschen einzelner Tags über ID
app.delete('/geotags/:id/delete', function (req, res) {
    console.log('Calling API to delete Tag with id: ' + req.params.id);
    if (req.params.id < tagList.length) {
        deleteTag(req.params.id);
        res.sendStatus(200) //erfolgreich gelöscht 
    } else
        res.sendStatus(404) //Fehler: Ressource nicht gefunden
});


/**
 * Setze Port und speichere in Express.
 */
let port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */
let server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */
server.listen(port);
