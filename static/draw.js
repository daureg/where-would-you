var MINI = require('minified'); 
var $ = MINI.$, $$ = MINI.$$, EE = MINI.EE;

/* return the LatLng in the middle of an array of LatLng */
function barycenter(points) {
    var lat = 0, lng = 0, n = points.length;
    for (var i = n - 1; i >= 0; i--) {
        lat += points[i].lat;
        lng += points[i].lng;
    }
    return new L.LatLng(lat/n, lng/n);
}

/* take a array of {name: "", url: ""} an return a list of link */
function format_venues(venues, zone_id) {
    var res = '<div id="venues"><p>Are you thinking of any of these places:<ul>';
    for (var i = venues.length - 1; i >= 0; i--) {
        var vid = venues[i].url.substr(25);
        res += '<li>';
        res += '<input name="'+vid+'" type="checkbox">&nbsp';
        res += '<a href="'+venues[i].url+'">'+venues[i].name+'</a>';
        res += '</li>';
    }
    res += '<button class="pure-button" id="y_'+zone_id+'">Yes</button>';
    res += '<button class="pure-button" id="n_'+zone_id+'">No</button></ul></p></div>';
    return res;
}

function create_map(div_id, center, main_layer, bbox) {
    var offset = 0;
    var southWest = new L.LatLng(bbox[0][0] - offset, bbox[0][1] - offset);
    var northEast = new L.LatLng(bbox[2][0] + offset, bbox[2][1] + offset);
    var bounds = new L.LatLngBounds(southWest, northEast);
    //TODO http://leafletjs.com/reference.html#map-fitbounds
    var map = new L.Map(div_id, {zoom: 12, minZoom: 11, center: center, layers: [main_layer],
                                 maxBounds: bounds})
        .fitBounds(bounds);
    L.polygon(bbox, {fill: false, weight: 3}).addTo(map);
    return map;
}
var bbox = $BBOX.b;
var OpenStreetMap_Mapnik = L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {attribution: '&copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'});
var center = new L.LatLng(0.5*(bbox[0][0]+bbox[2][0]),
                          0.5*(bbox[0][1]+bbox[2][1]));
map = create_map('map', center, OpenStreetMap_Mapnik, bbox);

var drawnItems = new L.FeatureGroup();
map.addLayer(drawnItems);

// call layer and feature area (or zone?)
L.drawLocal.draw.handlers.polyline.error = "Please, use only simple shape!";
L.drawLocal.edit.toolbar.buttons.edit = "Modify areas.";
L.drawLocal.edit.toolbar.buttons.editDisabled = "No area to modify yet.";
L.drawLocal.edit.handlers.edit.tooltip.text = "Drag handles to modify area.";

var drawControl = new L.Control.Draw({
    position: 'topleft',
    draw: {
        polyline: false,
        marker: false,
        polygon: {
            allowIntersection: false,
        },
        circle: {
            shapeOptions: {
                color: '#662d91'
            },
        }
    },
    edit: false
});

map.addControl(drawControl);

map.on('draw:created', function (e) {
    var type = e.layerType,
        zone = e.layer,
        id_ = ANSWER.length,
        geo = zone.toGeoJSON().geometry;
    // TODO discard geo not within bbox
    if (id_ > 2) {
        return;
    }
    var radius = 0;
    console.log(zone);
    if (type === 'circle') {
        radius = zone._mRadius;
        center = zone._latlng;
    }
    else {
        type = 'polygon';
        center = barycenter(zone._latlngs);
    }
    ANSWER.push({id_: id_, type: type, geo: geo, radius: radius, venues: []});
    var query = {geo: JSON.stringify(geo), radius: radius};
    $.request('post', $SCRIPT_ROOT + '/venues', query)
    .then(function(data) {
        var res = $.parseJSON(data);
        console.log(res.r);
        if (res.r.length > 0) {
            var popup = L.popup({closeButton: false})
            .setLatLng(center)
            .setContent(format_venues(res.r, id_))
            .openOn(map);
            focus_on_popup();
            $('#n_'+id_).on('click', function(e) {
                e.preventDefault();
                close_popup(popup);
                return false;
            });
            $('#y_'+id_).on('click', function(e) {
                e.preventDefault();
                var choices = $('#venues li input');
                for (var i = 0; i < choices.length; i++) {
                    if (choices[i].checked) {
                        ANSWER[id_].venues.push(choices[i].name);
                    }
                }
                console.log(ANSWER[id_]);
                close_popup(popup);
                return false;
            });
        }
    })
    .error(function(status, statusText, responseText) {
        console.log(status, statusText, responseText);
    });
    drawnItems.addLayer(zone);
});

function done_answering() {
    map.removeControl(drawControl);
    map.dragging.disable();
    $('#time').animate({$$fade: 1}, 500);
    $('#done-ctn').animate({$$fade: 0}, 100);
    $('#skip').animate({$$fade: 0}, 100);
}
function collect_time_answer() {
    var fields = $('#time input');
    var timing = {};
    for (var i = 0; i < fields.length; i++) {
        if (fields[i].type == 'range') {
            timing.hour = parseInt(fields[i].value);
        }
        else {
            timing[fields[i].name] = fields[i].checked;
        }
    }
    ANSWER.timing = timing;
}
function submit_answer(next_question, next_city) {
    collect_time_answer();
    var ans = $.toJSON({"a": ANSWER, "nq": next_question, "nc": next_city});
    console.log(ans);
    console.log($SCRIPT_ROOT + window.location.pathname);
    $.request('post', $SCRIPT_ROOT + window.location.pathname, {send: ans})
        .then(function(data) {
            console.log(data)
            window.location = window.location.origin + '/' + next_question + '/' + next_city;
            // var res = $.parseJSON(data);
            // console.log(res);
        })
    .error(function(status, statusText, responseText) {
        console.log(status, statusText, responseText);
    });
}

var show_hour = $('#hour-value');
$('#done').on('click', function(e) {
    console.log('click');
    done_answering();
    e.preventDefault();
});
$('#hour').on('change', function(e) {
    show_hour.fill($(e.srcElement).get('value'));
});
/* Disable all interactions but the current popup */
function focus_on_popup() {
	map.removeControl(drawControl);
	map.dragging.disable();
	$('#done-ctn').animate({$$fade: 0}, 0);
	$('#skip').animate({$$fade: 0}, 0);
}
/* Enable back some interactions */
function close_popup(p) {
    map.closePopup(p);
	map.addControl(drawControl);
	map.dragging.enable();
	$('#done-ctn').animate({$$fade: 1}, 0);
    /* there no point skipping user has already started to answer
	$('#skip').animate({$$fade: 0}, 0);
    */
    if (ANSWER.length === 2)  {
        done_answering();
    }
}
