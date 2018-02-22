var apiURL = "https://api.darksky.net/forecast/";

var apiFlags = {
    exclude: "minutely,daily,flags"
};

var blocks = {
    now : "currently",
    min : "minutely",
    hrs : "hourly",
    day : "daily",
    msg : "alerts",
    flg : "flags"
};

var units = "F";

var dataCache = {};

var displayedGrids = {};

document.addEventListener('DOMContentLoaded', function () {
    setup();
});

function clickHandler(e) {
    if (!e || !e.target) {
        return;
    }

    if (e.target.className == 'units') {
        var units = e.target.innerText;
        setOption('units', units);
    }
}

var mousedrag;
function mousedownHandler(e) {
    if (!e || !e.target) {
        return;
    }

    if (e.target.className == "tile" && !mousedrag) {

        var tilebox = e.target.parentElement;
        var tile = e.target;
        var rect = tile.getBoundingClientRect();

        index = 1; //getGridIndexFromLoc(tilebox, rect, e.clientX, e.clientY);

        mousedrag = {
            parent: tilebox,
            object: tile,
            dim: rect,
            lastIndex: index
        };

        mousedrag.object.style.visibility = 'hidden';

        if (tile && tile.tagName == 'canvas') {
            tile.toBlob((function (blob) {
                var newImg = document.createElement("img");
                var url = URL.createObjectURL(blob);

                newImg.onload = function () {
                    URL.revokeObjectURL(url);
                    this.style.display = 'block';
                };

                newImg.style.position = 'absolute';
                newImg.style.display = 'none';

                newImg.src = url;
                document.body.appendChild(newImg);

                this.image = newImg;
            }).bind(mousedrag));
        }

        e.target.parentElement.removeChild(e.target);
    }
}

function mousemoveHandler(e) {
    if (mousedrag) {
        var tilebox = mousedrag.parent;
        var tile = mousedrag.object;

        var img = mousedrag.image;
        if (img) {
            img.style.top = (e.clientY - (img.clientHeight / 2)) + 'px';
            img.style.left = (e.clientX - (img.clientWidth / 2)) + 'px';
        }
    }
}

function mouseupHandler(e) {
    if (mousedrag) {

        mousedrag.object.style.visibility = 'visible';

        if (mousedrag.image) {
            mousedrag.image.remove();
        }

        // var index = getGridIndexFromLoc(tilebox,
        //     mousedrag.dim,
        //     e.clientX,
        //     e.clientY
        // );
        var index = 1;

        tilebox.insertBefore(mousedrag.object, tilebox.children[index]);

        mousedrag = undefined;
    }
}

function setup() {
    /* Set first use defaults */
	asyncGetOption('units').then(x => setUnits(x['units'])).catch(setOption('units', 'C'));
	asyncGetOption('grids').catch(setupDefaultGrids());
	asyncGetOption('merge').catch(setOption('merge', false));
	
    /* poll user location using Geolocation API */
    getLocation().then(pos => {
        refreshForcast(pos);
        getAddr(pos);
    }).catch(err => {
        displayError(err);
    });

    document.addEventListener('click', clickHandler);

    tilebox = tilebox || $('#tiles');
    tilebox.addEventListener('mousedown', mousedownHandler);
    tilebox.addEventListener('mouseup', mouseupHandler);
    tilebox.addEventListener('mousemove', mousemoveHandler);

    chrome.storage.onChanged.addListener(changes => {
        for (key in changes) {
            switch (key) {
                case 'merge':
                    repaint();
                    break;
                case 'grids':
                    repaint();
                    break;
                case 'units':
                    setUnits(changes[key].newValue);
                    repaint();
                    break;
            }
        }
    });
}

function setupDefaultGrids() {
    var defaultGrids = {
        temp: {
            title: "temp",
            datapoint: "temperature",
            args: {
                points: 12,
                labelMinMax: true
            }
        },
        rain: {
            title: "rain",
            datapoint: "precipProbability",
            args: {
                points: 12,
                color: '#3F51B5'
            }
        },
        pressure: {
            title: "mmHg",
            datapoint: "pressure",
            args: {
                points: 12,
                color: 'grey',
                zeroValue: 1013.25,
                showZero: true
            }
        },
        windspeed: {
            title: "wind",
            datapoint: "windSpeed",
            args: {
                points: 12,
                color: 'grey',
                labelMinMax: true
            }
        },
        humidity: {
            title: "humidity",
            datapoint: "humidity",
            args: {
                points: 12,
                color: 'grey',
                maxVal: 100,
                minVal: 0
            }
        }
    };

    setOption('grids', defaultGrids);
}

function repaint() {
    $("#tempReal > .data").innerText = formatTemp(dataCache.tempReal);

    var feelsLikeTemp = formatTemp(dataCache.tempFeel);
    $("#tempFeel > .data").innerText = feelsLikeTemp;

    updateBadge(feelsLikeTemp);
    // $("#rightNow > .label").innerText = dataCache.summary;
    //$("#rightNow > .wi").className = "wi" + " " + dataCache.showIcon;

    asyncGetOption(['merge', 'grids']).then(
        (x) => {
            if (x['merge']) {
                drawConsolidatedGrid(x['grids']);
            } else {
                drawGrids(x['grids']);
            }
        }
    ).catch(err => {
        displayError(err);
    });


    drawAlerts();
}

function displayError(err) {
    var errGrid = createLargeGrid();
    errGrid.plotText(
        err,
        (errGrid.width() / 2),
        (errGrid.height() / 2),
        {}
    );
}

var conGrid;
function createLargeGrid() {
    var grid = gridObject();
    var frag = document.createDocumentFragment();
    grid.init(frag, {
        class: 'large-tile'
    });

    var tilebox = $('#tiles');
    tilebox.appendChild(frag);
    
    return grid;
}

function drawConsolidatedGrid(grids, target) {
    var tilebox = $('#tiles');

    initLegend();

    asyncInitSingle(tilebox, {}).then(function (grid) {
        grid.plotGrid();

        for (i in grids) {
            var chart = grids[i];

            if (!target || target == i) {
                grid.plotData(
                    getHourlyData(chart.datapoint),
                    chart.args
                );
            }
            addEntryToLegend(chart.title, i, chart.args);
        }
    });
}

var legend;
function initLegend() {
    legend = legend || $('#legend');

    if (!legend) {
        tilebox = tilebox || $('#tiles');
        legend = _createField('div', {
            id: 'legend'
        });
        document.body.insertBefore(legend, tilebox.nextSibling);
    } else {
        removeChildNodes(legend);
    }
}

function addEntryToLegend(label, pt, args) {
    legend = legend || $('#legend');
    var entry = _createField('div', {
        innerText: label,
        datapoint: pt,
        style: 'border-color:' + (args.color || 'black') + ';'
    });

    entry.addEventListener('mouseover', function (e) {
        var current = e.target.datapoint;
        if (current != legend.hovertgt) {
            legend.hovertgt = current;

            asyncGetOption(['grids']).then(
                data => {
                    drawConsolidatedGrid(data['grids'], legend.hovertgt);
                }
            ).catch(err => {
                displayError(err);
            });
        }
    }, true);

    entry.addEventListener('mouseleave', function (e) {
        legend.hovertgt = undefined;

        asyncGetOption(['grids']).then(
            data => {
                drawConsolidatedGrid(data['grids']);
            }
        ).catch(err => {
            displayError(err);
        });
    }, true);

    legend.appendChild(entry);
}

var tilebox;
function drawGrids(grids) {
    tilebox = tilebox || $('#tiles');

    for (i in grids) {
        chart = grids[i];

        args = {
            title: chart.title,
            datapoint: chart.datapoint,
            options: chart.args
        };

        asyncInit(tilebox, args).then(grid =>
            asyncPlotData(
                grid,
                getHourlyData(grid.datapoint),
                grid.options
            )
        );
    }
}

function getHourlyData(pt) {
    return dataCache[blocks.hrs].map(x => formatPoint(pt, x[pt]));
}

function formatPoint(type, datapoint) {
    switch (type) {
        case 'temperature':
            return formatTemp(datapoint);
        case 'humidity':
            return (datapoint * 100);
        default:
            return datapoint;
    }
}

var alertBox;
function drawAlerts() {
    alertBox = alertBox || $('#alerts');
    removeChildNodes(alertBox);

    (dataCache.alerts || []).forEach(alert => {
        createField(alertBox, 'div', {
            className: 'alert',
            innerText: alert.title,
            title: alert.description
        });
    });
}

var unitButtons;
function setUnits(unit) {
    units = unit;
    unitButtons = unitButtons || $$(".units");

    unitButtons.forEach(button => {
        if (button.innerText == unit) {
            button.style.textDecoration = "underline";
        } else {
            button.style.textDecoration = "";
        }
    });
}

function updateBadge(temp) {
    chrome.browserAction.setBadgeBackgroundColor({ color: '#777' });
    chrome.browserAction.setBadgeText({text: "" + Math.round(temp)});
}

function refreshCurrentTemp(pos) {
    var URL = apiURL + getAPIKey() + "/" + pos.coords.latitude + "," + pos.coords.longitude;
    var args = { exclude: blocks.min + "," + blocks.day + "," + blocks.day + "," + blocks.flg };
    $http(URL)
        .get(args)
        .then(response => {
            var data = JSON.parse(response);
            var temp = formatTemp(data[blocks.now].apparentTemperature);
            updateBadge(temp);
        })
        .catch(err => {
            console.log(err);
        });
}

function refreshForcast(pos) {
    var URL = apiURL + getAPIKey() + "/" + pos.coords.latitude + "," + pos.coords.longitude;
    //var args = apiFlags;
    var args = { exclude: blocks.min + "," + blocks.day + "," + blocks.flg }
    $http(URL)
        .get(args)
        .then(response => {
            var data = JSON.parse(response);
            updateCache(data);
            repaint();
        })
        .catch(err => {
            displayError(err);
        });
}

function updateCache(data) {
    /* data was last refreshed */
    dataCache["timeAsOf"] = data[blocks.now].time;

    /* temperature data */
    dataCache["tempReal"] = data[blocks.now].temperature;
    dataCache["tempFeel"] = data[blocks.now].apparentTemperature;

    /* moisture */
    dataCache["humidity"] = data[blocks.now].humidity;
    dataCache["rainProb"] = data[blocks.now].precipProbability * 100;

    dataCache['hourly'] = data[blocks.hrs].data;

    /* human readable stuff */
    var timestamp = new Date(0);
    timestamp.setUTCSeconds(data[blocks.now].time);
    dataCache["timeNice"] = timestamp.toLocaleTimeString();

    dataCache["summary"] = data[blocks.now].summary;
    dataCache["showIcon"] = data[blocks.now].icon;

    dataCache["alerts"] = data.alerts;
}

function formatTemp(temp) {
    return roundToTenth((units == "F") ? temp : FtoC(temp));
}

function FtoC(temp) {
    return (temp - 32) * (5 / 9);
}

function CtoF(temp) {
    return (30.9 * (9 / 5)) + 32;
}

function roundToTenth(val) {
    return Math.round(val * 10) / 10
}