var storageKey = 'WeatherWidget';

function asyncGetOption(keys) {
	var main = {
		request: function (keys) {
			keys = [].concat(keys);
			var promise = new Promise(function (resolve, reject) {
				var output = {};
				switch (keys.length) {
					case 0:
						chrome.storage.sync.get(
							null,
							function callback(data) {
								if (chrome.runtime.lastError) {
									reject(runtime.lastError);
								} else {
									resolve(data);
								}	
							}
						);		
						break;
					case 1:
						var key = keys[0];
						chrome.storage.sync.get(
							key,
							function callback(x) {
								if (chrome.runtime.lastError) {
									reject(runtime.lastError);
								} else {
									output[key] = x[key];
									resolve(output);
								}	
							}
						);
						break;
					default:
						chrome.storage.sync.get(
							null,
							function callback(data) {
								if (chrome.runtime.lastError) {
									reject(runtime.lastError);
								} else {
									keys.map((x) => {
										if (data.hasOwnProperty(x)) {
											output[x] = data[x];
										}
										resolve(output);
									});
								}	
							}
						);	
				}
			});
			return promise;
		}
	}
	return main.request(keys);
}

function getOption(type, callback) {
	chrome.storage.sync.get(storageKey, x => callback(x[storageKey][type]));
}

function setOption(type, value) {
	var promise = new Promise(function (resolve, reject) {
		var data = {};
		data[type] = value;
		chrome.storage.sync.set(data, function () {
			if (chrome.runtime.lastError) {
				reject(runtime.lastError);
			} else {
				resolve(type);
			}
		});
	});
	return promise;
}

function savePreferences(prefs) {
	prefs = prefs || {};
	chrome.storage.sync.set(data);
}