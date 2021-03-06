;(function(window) {
	var HAS_HASHCHANGE = (function() {
		var doc_mode = window.documentMode;
		return ('onhashchange' in window) &&
			(doc_mode === undefined || doc_mode > 7);
	})();

	google.maps.Hash = function(map) {
		this.onHashChange = this.onHashChange.bind(this);
		
		if (map) {
			this.init(map);
		}
	};

	google.maps.Hash.parseHash = function(hash) {
		if(hash.indexOf('#') === 0) {
			hash = hash.substr(1);
		}
		var args = hash.split("/");
		if (args.length) {
		// if (args.length == 3) {
			var zoom = parseInt(args[0], 10),
			lat = parseFloat(args[1]),
			lon = parseFloat(args[2]),
			basemap = args[3] || this.map.getMapTypeId() || 'roadmap',
			tilt = parseInt(args[4]) || this.map.getTilt() || 0,
			heading = parseInt(args[5]) || this.map.getHeading() || 0;

			if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
				return false;
			} else {
				return {
					center: new google.maps.LatLng(lat, lon),
					zoom: zoom,
					mapTypeId: basemap,
					tilt: tilt,
					heading: heading
				};
			}
		} else {
			return false;
		}
	};

	google.maps.Hash.formatHash = function(map) {
		var center = map.getCenter(),
		    zoom = map.getZoom(),
		    basemap = map.getMapTypeId(),
		    tilt = map.getTilt(),
		    heading = map.getHeading(),
		    precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

		return "#" + [zoom,
			center.lat().toFixed(precision),
			center.lng().toFixed(precision),
			basemap,
			tilt,
			heading,
			this.layerConfigs || ''
		].join("/");
	},

	google.maps.Hash.prototype = {
		map: null,
		lastHash: null,

		parseHash: google.maps.Hash.parseHash,
		formatHash: google.maps.Hash.formatHash,

		init: function(map) {
			this.map = map;

			// reset the hash
			this.lastHash = null;
			this.onHashChange();

			if (!this.isListening) {
				this.startListening();
			}
		},

		trigger: google.maps.event.trigger,
		addListener: google.maps.event.addListener,
		addListenerOnce: google.maps.event.addListenerOnce,
		addListenerDom: google.maps.event.addDomListener,
		addListenerDomOnce: google.maps.event.addDomListenerOnce,
		removeListener: google.maps.event.removeListener,

		removeFrom: function(map) {
			if (this.changeTimeout) {
				clearTimeout(this.changeTimeout);
			}

			if (this.isListening) {
				this.stopListening();
			}

			this.map = null;
		},

		onMapMove: function(map) {
			// bail if we're moving the map (updating from a hash),
			// or if the map is not yet loaded

			if (this.movingMap) { // || !this.map._loaded) {
				return false;
			}

			var hash = this.formatHash(this.map);
			if (this.lastHash != hash) {
				location.replace(hash);
				this.lastHash = hash;
			}
		},

		movingMap: false,
		update: function() {
			var hash = location.hash;
			if (hash === this.lastHash) {
				return;
			}
			var parsed = this.parseHash(hash);
			if (parsed) {
				this.movingMap = true;

				// if(parsed.center)
				// 	this.map.setCenter(parsed.center)
				// if(parsed.zoom)
				// 	this.map.setZoom(parsed.zoom)
				// if(parsed.mapTypeId)
				// 	this.map.setMapTypeId(parsed.mapTypeId)
				// if(parsed.tilt)
				// 	this.map.setTilt(parsed.tilt)
				// if(parsed.heading)
				// 	this.map.setHeading(parsed.heading)

				this.map.setOptions({
					center: parsed.center,
					zoom: parsed.zoom,
					mapTypeId: parsed.mapTypeId,
					tilt: parsed.tilt,
					heading: parsed.heading
				})
				// this.map.setView(parsed.center, parsed.zoom);

				this.movingMap = false;
			} else {
				this.onMapMove(this.map);
			}
		},

		// defer hash change updates every 100ms
		changeDefer: 100,
		changeTimeout: null,
		onHashChange: function() {
			// throttle calls to update() so that they only happen every
			// `changeDefer` ms
			if (!this.changeTimeout) {
				var that = this;
				this.changeTimeout = setTimeout(function() {
					that.update();
					that.changeTimeout = null;
				}, this.changeDefer);
			}
		},

		isListening: false,
		hashChangeInterval: null,
		startListening: function() {
			this.mapMoveListener = this.addListener(this.map, "bounds_changed", this.onMapMove.bind(this), this)

			if (HAS_HASHCHANGE) {
				this.addListenerDom(window, "hashchange", this.onHashChange);
			} else {
				clearInterval(this.hashChangeInterval);
				this.hashChangeInterval = setInterval(this.onHashChange, 50);
			}
			this.isListening = true;
		},

		stopListening: function() {
			this.removeListener(this.map, "moveend", this.onMapMove, this);
			this.removeListener(this.map, "moveend", this.mapMoveListener);


			if (HAS_HASHCHANGE) {
				google.maps.removeListener(window, "hashchange", this.onHashChange);
			} else {
				clearInterval(this.hashChangeInterval);
			}
			this.isListening = false;
		}
	};
	google.maps.hash = function(map) {
		return new google.maps.Hash(map);
	};
	google.maps.Map.prototype.addHash = function() {
		this._hash = google.maps.hash(this);
	};
	google.maps.Map.prototype.removeHash = function() {
		this._hash.removeFrom();
	};
})(window);
