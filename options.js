/* global chrome */
var options = [
    'units',
    'merge',
    'grids'
];
var datapoints = [
    'color',
    'size',
    'thickness',
    'noDots',
    'noLines',
    'maxVal',
    'minVal',
    'points',
    'showZero',
    'zeroValue',
    'labelMinMax',
    'shape'
];

var optionCache = {};

function save_options() {
    Promise.all(
            [
                options.forEach(option => {
                    setOption(option, optionCache[option]);
                })
            ]
        )
        .then(window.close())
        .catch(x => alert(x));
}

function init() {
    asyncGetOption(options)
        .then(function (data) {
            optionCache = data;
            paint();
        })
        .catch(x => alert(x));
}

function paint() {
    for (i in optionCache) {
        if (optionCache.hasOwnProperty(i)) {
            setFieldValue(i, optionCache[i]);
        }
    }
}

function getValue(path) {
    if (!path || !optionCache) {
        return null;
    }

    var value = optionCache;
    path.split('/').forEach(function (lvl) {
        if (value.hasOwnProperty(lvl)) {
            value = value[lvl];
        } else {
            console.log("invalid path : " + path);
            return null;
        }
    });
    return value;
}

function setValue(path, value) {
    if (!path || !optionCache) {
        return false;
    }

    var node = optionCache;
    var target = path.substring(path.lastIndexOf('/') + 1);
    path.split('/').forEach(lvl => {
        if (node.hasOwnProperty(lvl)) {
            if (lvl == target) {
                node[lvl] = value;
            } else {
                node = node[lvl];
            }
        } else {
            return false;
        }
    });

    return true;
}

function addValue(path, value) {
    if (!path || !optionCache) {
        return false;
    }

    var node = optionCache;
    var target = path.substring(path.lastIndexOf('/') + 1);
    path.split('/').forEach(lvl => {
        if (node.hasOwnProperty(lvl)) {
            node = node[lvl];
        } else {
            if (lvl == target) {
                node[lvl] = value;
            } else {
                node[lvl] = {};
            }
        }
    });

    return true;
}

function removeValue(path) {
    if (!path || !optionCache) {
        return false;
    }

    var node = optionCache;
    var target = path.substring(path.lastIndexOf('/') + 1);
    path.split('/').forEach(lvl => {
        if (node.hasOwnProperty(lvl)) {
            if (lvl == target) {
                delete node[lvl];
            } else {
                node = node[lvl];
            }
        } else {
            return false;
        }
    });

    return true;
}

function restore_options() {
    asyncGetOption(options)
        .then(data => {
            setValue('units', data.units, 'C');
            setValue('merge', data.merge, false);
            setValue('grids', data.grids);
        });
}

var gridbox;

function setFieldValue(type, value, def) {
    var fld = $('#' + type)
    switch (type) {
    case 'showZero':
    case 'labelMinMax':
    case 'merge':
    case 'noDots':
    case 'noLines':
        setCheckbox(fld, value);
        break;
    case "units":
        setSelect(fld, value);
        break;
    case "grids":
        gridbox = gridbox || $('#grids');
        frag = document.createDocumentFragment();
        for (i in value) {
            var grid = value[i];
            listGrid(i, grid, frag);
        }
        removeChildNodes(gridbox);
        gridbox.appendChild(frag);
    default:
        fld.value = value || def;
    }
}

function listGrid(id, grid, container) {
    var path = "grids/"
    var box = document.createElement('div');
    box.className = 'grid-tile';
    box.id = id;
    path += id;

    //Title
    createField(box, 'input', {
        className: 'grid-title',
        value: grid['title'],
        path: path + '/' + 'title',
        onblur: function () {
            setValue(this.path, this.value);
        }
    });

    //Datapoint
    createField(box, 'div', {
        className: 'grid-datapoint',
        value: grid['datapoint'],
        path: path + '/' + 'datapoint'
    });

    //Arguments
    var args = document.createElement('div');
    args.className = 'grid-args';

    for (i in grid.args) {
        var val = grid.args[i];
        appendArg(args, path, i, val);
    }

    box.appendChild(args);

    //Footer
    var footer = document.createElement('div');
    footer.className = 'grid-arg-foot';

    var values = datapoints.filter(x => !grid.args.hasOwnProperty(x));
    createDropdown(footer, values, {
        className: 'grid-add-select'
    });

    createField(footer, 'div', {
        className: 'grid-add-button',
        innerText: '+',
        onclick: function (e) {
            var sel = $p(this.parentElement, '.grid-add-select');
            var key = sel.value;
            addValue(path + '/args/' + key, "");
            paint();
        }
    });

    box.appendChild(footer);

    container.appendChild(box);
}

function appendArg(box, path, key, value) {
    var entry = document.createElement('div');
    entry.className = 'grid-arg' + ' ' + key;

    path += '/args/' + key

    //Setup Label
    var title = document.createElement('div');
    title.innerText = key;
    title.className = 'grid-arg-title';

    //Setup Control
    var ctrl = document.createElement('input');
    ctrl.className = 'grid-arg-value';
    ctrl.path = path;

    //add custom handler code here
    switch (key) {
    case 'showZero':
    case 'labelMinMax':
    case 'merge':
    case 'noDots':
    case 'noLines':
        ctrl.type = 'checkbox';
        ctrl.checked = value;
        break;
    case 'color':
        ctrl.type = 'color';
        ctrl.value = value;
        break;
    case 'points':
        ctrl.min = 0;
        ctrl.value = value;
        break;
    default:
        ctrl.value = value;
    }

    switch (ctrl.type) {
    case "checkbox":
        ctrl.onclick = setValueOnChange;
        break;
    default:
        ctrl.onblur = setValueOnChange;
    }


    entry.appendChild(title);
    entry.appendChild(ctrl);

    createField(entry, 'div', {
        className: 'grid-args-del',
        innerHTML: '&ndash;',
        path: path,
        onclick: function () {
            removeValue(this.path);
            paint();
        }
    });


    box.appendChild(entry);
}

function setValueOnChange(altpath) {
    var _path = this.path || altpath;
    var _value = this.value;

    if (isCheckbox.call(this)) {
        _value = this.checked;
    }

    setValue(_path, _value);
}

function isCheckbox() {
    return this.tagName == 'INPUT' && this.type == 'checkbox';
}

function generateSwatch() {
    return _generateSwatch(this.parentElement, this.value);
}

function _generateSwatch(container, color) {
    var swatch = container.getElementsByClassName('swatch')[0];

    if (!swatch) {
        swatch = document.createElement('div');
        swatch.className = 'swatch';
        container.appendChild(swatch);
    }

    swatch.style.backgroundColor = color;
}

function setCheckbox(fld, value) {
    fld.checked = value || false;
}

function setSelect(fld, value, def) {
    fld.value = value || def || undefined;
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById('save').addEventListener('click', save_options);
document.getElementById('merge').addEventListener('click', function () {
    setValue('merge', this.checked);
});
document.getElementById('units').addEventListener('click', function () {
    setValue('units', this.value);
});