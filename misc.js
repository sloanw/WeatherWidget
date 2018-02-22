function removeChildNodes(node) {
    //use innerHTML for now
    node.innerHTML = '';

    // n = node.firstChild;
    // while (n) {
    // 	node.removeChild(n);
    // 	n = node.firstChild;
    // }
}

function $http(url) {
    var main = {
        request: function (method, url, args) {
            var promise = new Promise(function (resolve, reject) {
                var httpRequest = new XMLHttpRequest();
                args = args || {};
                var count = 0;
                for (var i in args) {
                    if (count) {
                        url += "&";
                    } else {
                        url += "?";
                    }

                    url += encodeURIComponent(i) + '=' + encodeURIComponent(args[i]);
                }
                httpRequest.open(method, url);
                httpRequest.send();

                httpRequest.onload = function () {
                    if (this.status >= 200 && this.status < 300) {
                        resolve(this.response);
                    } else {
                        reject(this.statusText);
                    }
                };

                httpRequest.onerror = function (err) {
                    reject(this.statusText || "network error");
                };
            });
            return promise;
        }
    };

    return {
        'get': function (args) {
            return main.request('GET', url, args);
        },
        'post': function (args) {
            return main.request('POST', url, args);
        }
    }
}

function getLocation() {
    var main = {
        request: function () {
            var promise = new Promise(function (resolve, reject) {
                if (!navigator.geolocation) {
                    reject("Missing location support");
                }

                navigator.geolocation.getCurrentPosition(
                    function success(pos) {
                        if (pos) {
                            resolve(pos);
                        }
                        reject("no data");
                    },
                    function error(err) {
                        reject(err.message || err);
                    }
                );
            });
            return promise;
        }
    };
    return main.request();
}

function getAddr(pos) {
    var URL = "http://maps.googleapis.com/maps/api/geocode/json";
    var args = {
        latlng: pos.coords.latitude + "," + pos.coords.longitude
    };
    $http(URL)
        .get(args)
        .then(x => {
            var data = JSON.parse(x);
            if (data) {
                var addr = "";
                for (let i of data.results) {
                    if (i.formatted_address) {
                        addr = i.formatted_address;
                        break;
                    }
                };

                if (addr) {
                    $("#address").innerText = addr;
                }
            }
        })
        .catch(err => {
            displayError(err);
        });
}

function $p(root, sel) {
    return root.querySelector(sel);
}

function $(sel) {
    return document.querySelector(sel);
}

function $$(sel) {
    return document.querySelectorAll(sel);
}



function createField(container, tag, args) {
    var fld = _createField(tag, args);

    container.appendChild(fld);
}

function _createField(tag, args) {
    var fld = document.createElement(tag);

    for (i in args) {
        if (i == 'value') {
            switch (tag) {
            case "input":
                switch (args.type) {
                case "checkbox":
                    fld.checked = args.value;
                    break;
                default:
                    fld.value = args.value;
                }
                break;
            case "div":
                fld.innerText = args.value;
                break;
            default:
                fld.value = args.value;
            }
        } else {
            fld[i] = args[i];
        }
    }
    return fld;
}

function createDropdown(container, values, args) {
    var dropdown = _createField('select', args);

    values.forEach(x => {
        createField(dropdown, 'option', {
            value: x,
            innerText: x
        });
    });

    container.appendChild(dropdown);
}