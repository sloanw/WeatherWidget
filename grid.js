function asyncPlotData(grid, data, args) {
    var promise = new Promise(function (resolve, reject) {
        grid.plotData(data, args);
        resolve(true);
    });

    return promise;
}

function asyncInit(container, args) {
    var promise = new Promise(function (resolve, reject) {
        var grid;
        var id = args.title;
        if (!displayedGrids[id]) {
            grid = gridObject();
            grid.init(container, args);
            displayedGrids[id] = grid;
        } else {
            grid = displayedGrids[id];
        }
        grid.plotGrid();
        resolve(grid);
    });
    return promise;
}

var largeGrid;
function asyncInitSingle(container, args) {
    var promise = new Promise(function (resolve, reject) {
        var grid = largeGrid;
        if (!grid) {
            grid = new gridObject();
            args.class = 'large-tile';
            grid.init(container, args);
        }
        largeGrid = grid;
        resolve(grid);
    });
    return promise;
}

function asyncPlotSingle(grid, data, args) {
    var promise = new Promise(function (resolve, reject) {
        grid.plotData(
            data,
            args
        );
        resolve(grid);
    });
}

var gridObject = function () {
    return {
        id: undefined,
        datapoint: undefined,
        options: [],

        canvas: {},

        params: {
            margin: 5,
            hozLines: 6,
            verLines: 0
        },

        attributes: {
            hPixels: 0,
            vPixels: 0,
            title: ""
        },

        getID: function () {
            this.id = this.id || Date.now();
            return this.id;
        },

        onMouseMove: function (e) {
            var rect = this.canvas.getBoundingClientRect();
            var x = e.clientX - rect.left;
            var y = e.clientY - rect.top;

            var ctx = this.canvas.getContext('2d');
            var h = this.height();
            var w = this.width();
            var margin = this.params.margin;

            if (x > margin && x < (w - margin)) {
                this.plotLine(x, 0, x, h, {
                    color: 'grey',
                    size: 0.5
                });
            }
        },

        init: function (container, args) {
            args = args || {};
            this.id = args.title;
            this.datapoint = args.datapoint;

            this.options = args.options;

            this.setupCanvas(container, args);

            this.canvas.height = args.height || this.canvas.clientHeight;
            this.canvas.width = args.width || this.canvas.clientWidth;

            /* set bounds */
            var margin = this.params.margin;
            this.bounds = {
                minX: margin,
                minY: margin,
                maxX: this.width() - margin,
                maxY: this.height() - margin
            }

            this.attributes.hPixels = (this.width() - (2 * margin));
            this.attributes.vPixels = (this.height() - (2 * margin));

            if (args.title) {
                this.attributes.title = args.title;
            }

            //this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
        },

        setupCanvas: function (c, args) {
            args = args || {};

            var _canvas = document.createElement('canvas');
            _canvas.className = args.class || 'tile';
            _canvas.id = this.getID();
            c.appendChild(_canvas);

            this.canvas = _canvas;
        },

        height: function () {
            return this.canvas.height;
        },

        width: function () {
            return this.canvas.width;
        },

        plotGrid: function () {
            var ctx = this.canvas.getContext('2d');
            if (!ctx) {
                return;
            }

            this.clear();

            var margin = this.params.margin;
            var step;

            /* horizontal lines */
            if (this.params.hozLines > 0) {
                step = (this.height() / this.params.hozLines);
                for (var i = step; i < this.height(); i += step) {
                    this.plotLine(margin, i, (this.width() - margin), i);
                }
            }

            /* vertical lines */
            if (this.params.verLines > 0) {
                step = (this.height() / this.params.verLines);
                for (var i = step; i < this.width(); i += step) {
                    this.plotLine(i, margin, i, (this.height() - margin));
                }
            }
        },

        clear: function () {
            var ctx = this.canvas.getContext('2d');
            if (!ctx) {
                return;
            }

            ctx.clearRect(0, 0, this.width(), this.height());

            this.plotTitle();
        },

        plotTitle: function (title) {
            title = title || this.attributes.title;
            this.plotText(title, (this.width() / 2), 17, {
                fontSize: "22px"
            });
        },

        plotText: function (text, x, y, args) {
            args = args || {};
            var ctx = this.canvas.getContext('2d');

            ctx.textAlign = args.align || 'center';
            ctx.textBaseline = args.baseline || 'alphabetic';

            var fontSize = args.fontSize || "28px";
            var fontName = args.fontName || "Dosis";
            ctx.font = fontSize + " " + fontName;
            ctx.fillStyle = args.fontColor || "black";
            ctx.fillText(text, x, y);
        },

        plotPoint: function (x, y, args) {
            args = args || {};

            var ctx = this.canvas.getContext('2d');
            var size = args.size || 2;
            var color = args.color || 'black';
            var shape = args.shape || 'circle';

            switch (shape) {
                case 'circle':
                    this.plotCircle(x, y, size, color);
                    break;
                case 'square':
                    this.plotSquare(x, y, size, color);
                    break;
                case 'triangle':
                    this.plotTriangle(x, y, size, color);
                    break;
            }
            ctx.fillStyle = color;
            ctx.fill();

            ctx.closePath();
        },
        
        plotCircle: function (x, y, size, color) {
            var ctx = this.canvas.getContext('2d');
            ctx.beginPath();
            ctx.arc(x, y, size, 0, 2 * Math.PI);
            ctx.strokeStyle = color;
            ctx.stroke();
        },

        plotSquare: function (x, y, size, color) {
            var ctx = this.canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect((x - (size / 2)), (y - (size / 2)), size, size); 
        },

        plotTriangle: function (x, y, size, color) {
            var ctx = this.canvas.getContext('2d');
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo((x - (size / 2)), (y - (size / 2)));
            ctx.lineTo(x, (y + (size / 2)));
            ctx.lineTo((x + (size / 2)), (y - (size / 2)));
            ctx.fill(); 
        },

        plotLine: function (x1, y1, x2, y2, args) {
            args = args || {};

            var ctx = this.canvas.getContext('2d');
            var size = args.thickness || 0.2;
            var color = args.color || 'black';

            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.closePath();
        },

        bounds: {},

        plotBorder: function () {
            this.plotLine(
                this.bounds.minX,
                this.bounds.minY,
                this.bounds.minX,
                this.bounds.maxY, {
                    size: 2,
                    color: 'red'
                }
            );

            this.plotLine(
                this.bounds.minX,
                this.bounds.maxY,
                this.bounds.maxX,
                this.bounds.maxY, {
                    size: 2,
                    color: 'blue'
                }
            );

            this.plotLine(
                this.bounds.maxX,
                this.bounds.maxY,
                this.bounds.maxX,
                this.bounds.minY, {
                    size: 2,
                    color: 'green'
                }
            );

            this.plotLine(
                this.bounds.maxX,
                this.bounds.minY,
                this.bounds.minX,
                this.bounds.minY, {
                    size: 2,
                    color: 'yellow'
                }
            );
        },

        plotAxis: function () {
            var midY = (this.bounds.maxY - this.bounds.minY) / 2;
            var midX = (this.bounds.maxX - this.bounds.minX) / 2;
            this.plotText("X", midX, 0, {
                baseline: 'top',
                align: 'left'
            });
            this.plotText("Y", 0, midY, {
                align: 'left'
            });
        },

        plotData: function (data, args) {
            args = args || [];

            var points = args.points || data.length;
            data = data.slice(0, points);

            /* calculate stats */
            var minPt = args.minVal || Math.min(...data);
            var maxPt = args.maxVal || Math.max(...data);

            if (args.showZero) {
                if (minPt > args.zeroValue) {
                    minPt = args.zeroValue;
                }
                if (maxPt < args.zeroValue) {
                    maxPt = args.zeroValue;
                }
            }

            var spread = maxPt - minPt;

            var zeroValue = args.zeroValue || 0;

            var hMax = points;
            var hMin = 0;
            var vMax = Math.max(100, (maxPt + (spread * .1))); /* 100, or max + 10%, whichever is bigger */
            var vMin = Math.min(0, (minPt - (spread * .1))); /* 0, or min - 10%, whichever is smaller */

            var hStep = this.attributes.hPixels / hMax;
            var vStep = this.attributes.vPixels / vMax;

            var margin = 20
            var maxX = this.height() - margin;
            var maxY = this.width() - margin;

            /* map values to new range */
            /* double slope = 1.0 * (output_end - output_start) / (input_end - input_start) */
            /* output = output_start + slope * (input - input_start) */
            var slope = (maxX - margin) / spread;

            /* all zero values break slope */
            if (isNaN(slope) || !isFinite(slope)) {
                slope = 1;
            }

            fittedData = data.map(x => margin + slope * (x - minPt));

            if (args.showZero) {
                var zeroPt = margin + slope * (zeroValue - minPt);
                var zeroY = (maxX - (zeroPt)) + margin;
                this.plotLine(this.params.margin, zeroY, (this.width() - this.params.margin), zeroY, {
                    size: 0.75,
                    color: "black"
                });
            }

            minPt = Math.min(...fittedData);
            maxPt = Math.max(...fittedData);

            var prev = {};

            for (var i = 0; i < points; i++) {
                var pt = fittedData[i];

                var x = ((i + 1) * hStep);
                var y = (maxX - (pt)) + margin;

                if (!(args.noDots || false)) {
                    this.plotPoint(x, y, args)
                }

                if (args.labelMinMax) {
                    if (pt == minPt) {
                        this.plotText(data[i], x, y - 15, {
                            fontSize: "12px"
                        })
                    } else if (pt == maxPt) {
                        this.plotText(data[i], x, y + 15, {
                            fontSize: "12px"
                        })
                    }
                }

                if (prev.x && prev.y) {
                    this.plotLine(prev.x, prev.y, x, y, args);
                }
                prev.x = x;
                prev.y = y;
            }
        },

        toImage: function () {
            return this.canvas.toBlob(function (blob) {
                var img = document.createElement('img');
                var url = URL.createObjectURL(blob);

                img.onload = function () {
                    URL.revokeObjectURL(url);
                };

                img.src = url;
                return img;
            });
        }
    };
}