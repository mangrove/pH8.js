/**
 * @fileoverview Definition of Maps.Map
 * @author Joris Verbogt
 */
/**
 * @description Custom google.maps.Map Object for Locations with infoWindows and optional DOM elements
 * @lends Maps.Map
 * @class Maps.Map
 * @scope Maps
 */
Maps.Map = Class.create({
	/**
	 * @description
	 * <pre>
	 *  Maps.Map listens to the following events:
	 *   - map:search		search for an address using the geocoder
	 *   - map:cleardata	remove the markers from the map
	 *   - map:newdata		add new markers to the map
	 *   - map:zoomin		zoom in one level on the map
	 *   - map:highlight	highlight a marker
	 * </pre>
	 * @constructs
	 * @param {DOMElement} element
	 * @param {Object} options (optional)
	 * <pre>
	 *  language String The language, default 'en
	 *  startPoint {google.maps.LatLng} The starting point for the map, default Mangrove HQ
	 *  startZoom Integer The starting zoom level, default 8
	 *  scrollWheel Boolean Use scrollwheel? default false
	 * </pre>
	 * @borrows pH8.Mixin.needsSocialWidgets#waitForSocialWidgets as #waitForSocialWidgets
	 * @borrows pH8.Mixin.needsSocialWidgets#registerWidget as #registerWidget
	 * @borrows pH8.Mixin.needsSocialWidgets#widgetReady as #widgetReady
	 * @borrows pH8.Mixin.needsDictionary#waitForDictionary as #waitForDictionary
	 * @borrows pH8.Mixin.needsPages#waitForPages as #waitForPages
	 * @borrows pH8.Mixin.needsTemplates#waitForTemplates as #waitForTemplates
	 * @borrows pH8.Mixin.needsTemplates#checkTemplates as #checkTemplates
	 */
	initialize: function(element, options) {
		Object.extend(this, pH8.Mixin.needsSocialWidgets);
		this.registerWidget(this);
		Object.extend(this, pH8.Mixin.needsDictionary);
		Object.extend(this, pH8.Mixin.needsPages);
		Object.extend(this, pH8.Mixin.needsTemplates);
		this.element = $(element);
		this.element.setStyle({visibility: 'hidden'});
		this.options = Object.extend({
			language: 'en',
			startPoint: new google.maps.LatLng(51.9247240,4.4744973),
			startZoom: 10,
			minZoom: 6,
			scrollWheel: false,
			allowDuplicateValue: true,
			locationKey: 'locationID'
		}, options || {});
		this.locations = new Hash();
		this.markers = new Hash();
		this.geocoder = new google.maps.Geocoder();
		this.waitForDictionary(this.onDictionaryLoaded.bind(this));
		this.waitForPages(this.onPagesLoaded.bind(this));
		this.waitForTemplates({
			infoWindow: this.options.infoWindowTemplateUrl
		}, this.onTemplatesLoaded.bind(this));
	},
	/**
	 * Save the state of this widget to URI
	 * @param Object data The data to save
	 */
	saveState: function(data) {
		var page = new pH8.Page();
		page.setState('map_lat', this.map.getCenter().lat());
		page.setState('map_lng', this.map.getCenter().lng());
		page.setState('map_zoom', this.map.getZoom());
		document.location.href = document.location.href.addHashParam('restoreState', 1);
	},
	/**
	 * Handle changes in the map
	 */
	mapBoundsChangedHandler: function() {
		if (this.handleEvents) {
			document.fire('map:getdata', {
				position: this.position,
				bounds: this.map.getBounds(),
				cachedBounds: this.calculateCachedBoundingBox(),
				searchName: this.searchName
			});
			this.saveState();
		}
	},
	/**
	 * Handle map:search event
	 * @param {Event} event
	 */
	handleSearch: function(event) {
		this.searchName = event.memo.searchName;
		this.filters = event.memo.filters || {};
		if (event.memo.position) {
			this.position = event.memo.position;
			this.showPosition();
		} else {
			if (!this.geocoder) {
				this.geocoder = new google.maps.Geocoder();
			}
			this.geocoder.geocode({address:event.memo.searchString}, function(results, status) {
				if (status == google.maps.GeocoderStatus.OK && results[0].geometry.location) {
					this.position = results[0].geometry.location;
					this.showPosition();
				}
			}.bind(this));
		}
	},
	/**
	 * Handle map:getdata event. Remove the markers from the map.
	 * @param The event 
	 */
	handleZoomIn: function(event) {
		this.clearMarkers();
		this.map.setZoom(this.map.getZoom()+1);
	},
	/**
	 * Handle map:cleardata event
	 * @param The event
	 */
	handleClearData: function(event) {
		this.clearMarkers();
	},
	/**
	 * Handle map:newdata event. Put the markers on the map.
	 * @param The event 
	 */
	handleNewData: function(event) {
		this.clearMarkers();
		var locations = event.memo.locations;
		var selected = event.memo.selected;
		if (locations) {
			locations.each(function(location) {
				if (selected && selected.get(id)) {
					marker = this.createMarker(new google.maps.LatLng(parseFloat(location.latitude),parseFloat(location.longitude)), 'selected', location.name);
				} else {
					marker = this.createMarker(new google.maps.LatLng(parseFloat(location.latitude),parseFloat(location.longitude)), 'normal', location.name);
				}
				var markerKey = location[this.options.locationKey];
				this.markers.set(markerKey, marker);
				marker.setMap(this.map);
				google.maps.event.addListener(marker, 'click', function() {
					document.fire('map:select', { locationKey: markerKey });
				});
				google.maps.event.addListener(marker, 'mouseover', function() {
					document.fire('map:highlight', { locationKey: markerKey }); 
				});
	  		}.bind(this));
		}
	},
	/**
	 * Handle map:select event. Activate the selected location's marker.
	 * @param The event 
	 */
	handleHighlight: function(event) {
		if (event.memo.locationKey) {
			// Highlight the location's marker
			var marker = this.markers.get(event.memo.locationKey);
			if (this.activeMarker) {
				this.activeMarker.setIcon(this.options.icons.normal.url);
			}
			if (marker) {
				marker.setIcon(this.options.icons.selected.url);
				this.activeMarker = marker;
			}
		}
	},
	/**
	 * Calculate a bounding box to use for pre-loading loactions
	 * Bounding box will be 2x2 the size of the current viewport
	 */
	calculateCachedBoundingBox: function(){

		var sw = this.map.getBounds().getSouthWest();
		var ne = this.map.getBounds().getNorthEast();
		
		var width = ne.lng() - sw.lng();
		var height = ne.lat() - sw.lat();
		
		// Determine a fixed grid of 4 times the size of bounds
		// since Earth is an oblate spheroid, we need a correction in latitude
		// we'll use Google's Mercator projection to transform to tile coordinates 
		var projection = this.map.getProjection();
		var nePixels = projection.fromLatLngToPoint(ne);
		var swPixels = projection.fromLatLngToPoint(sw);
		// longitudes are equidistant, so we don't need a projection adjustment
		// we just round to the previous and next multiple of "width"
		var pixelWidth =  nePixels.x - swPixels.x;
		var leftBound = pixelWidth * Math.floor(swPixels.x / pixelWidth);
		var rightBound = leftBound + 2 * pixelWidth;
		// for latitudes we use the actual bottom coordinates
		var pixelHeight = nePixels.y - swPixels.y;
		var topBound = pixelHeight * Math.ceil(nePixels.y / pixelHeight);
		var bottomBound = pixelHeight * Math.floor(swPixels.y / pixelHeight);
		var neLatLng = projection.fromPointToLatLng(new google.maps.Point(rightBound, topBound));
		var swLatLng = projection.fromPointToLatLng(new google.maps.Point(leftBound, bottomBound));
	
		return new google.maps.LatLngBounds(swLatLng, neLatLng);
	},	
	/**
	 * Show the position marker on the map and center the map
	 * @param {google.maps.LatLng} position
	 */
	showPosition: function() {
		this.handleEvents = false;
		if (this.positionMarker) {
			this.positionMarker.setMap(null);
		}
		this.map.setCenter(this.position);
		this.map.setZoom(this.options.startZoom);
		this.positionMarker = this.createMarker(this.position, 'position', this.dictionary.getText('your position'));
		this.positionMarker.setMap(this.map);
		this.element.setStyle({visibility: 'visible'});
		this.saveState();
		this.handleEvents = true;
		document.fire('map:getdata', {
			position: this.position,
			bounds: this.map.getBounds(),
			cachedBounds: this.calculateCachedBoundingBox(),
			searchName: this.searchName,
			filters: this.filters
		});
	},
	/**
	 * Restore a previous map state
	 */
	restoreState: function() {
		var page = new pH8.Page();
		var savedState = page.getState();
		if (savedState) {
			this.handleEvents = false;
			if (this.positionMarker) {
				this.positionMarker.setMap(null);
			}
			this.position = new google.maps.LatLng(savedState.latitude, savedState.longitude);
			this.searchName = savedState.searchName;
			this.filters = savedState.filters;
			this.map.setCenter(new google.maps.LatLng(savedState.map_lat, savedState.map_lng));
			this.map.setZoom(savedState.map_zoom);
			this.positionMarker = this.createMarker(this.position, 'position', this.dictionary.getText('your position'));
			this.positionMarker.setMap(this.map);
			this.element.setStyle({visibility: 'visible'});
			document.fire('map:getdata', {
				position: this.position,
				bounds: this.map.getBounds(),
				cachedBounds: this.calculateCachedBoundingBox(),
				searchName: this.searchName,
				filters: this.filters
			});
			this.handleEvents = true;
		}
	},
	/**
	 * @description create a new icon marker, based on the baseIcon.
	 * if the baseIcon doesn't exist yet, it is made first.
	 * @param {google.maps.Point} point Point to place the marker at
	 * @param {String} theme classname of the marker, the color of the pin is based on this
	 */
	createMarker: function(point, markerStyle, title){
		if (this.options.icons && this.options.icons[markerStyle]) {
			var icon = new google.maps.MarkerImage(this.options.icons[markerStyle].url,
					new google.maps.Size(this.options.icons[markerStyle].size[0], this.options.icons[markerStyle].size[1])
			);
			return new google.maps.Marker({position: point, icon: icon, title: title});
		}
		return new google.maps.Marker({position: point,  title: title});
	},
	/*
	 * DOM Element methods
	 */
	
	/**
	 * Show the markers
	 */
	showMarkers: function() {
	  var manager = new google.maps.MarkerManager(this.map, {
		borderPadding: 100
	  });
	  manager.addMarkers(this.markers, this.options.markerZoom);
	  manager.refresh();
	  if (this.options.startLocationId && this.markersByLocationId[this.options.startLocationId]) {
		this.showInfo(this.markersByLocationId[this.options.startLocationId]);
	  }
	},
	/**
	 * Clear all markers from the map, clear list of markers
	 */
	clearMarkers: function() {
		this.markers.each(function(pair) {
			pair.value.setMap(null);
			google.maps.event.clearListeners(pair.value, 'mouseover');
			google.maps.event.clearListeners(pair.value, 'click');
		}.bind(this));
		this.markers = new Hash();
		this.activeMarker = null;
	},
	/**
	 * Show the dialog for specific marker
	 * Displays an overlay, loading indicator and fetches company data
	 * @param {google.maps.Marker} marker
	 */
	showInfo: function(marker) {
	  var i = this.markers.values().indexOf(marker);
	  if (i > -1) {
		this.map.panTo(marker.getLatLng());
		var html = this.templates.infoWindow.process({
		  language: this.options.language,
		  dictionary: this.dictionary,
		  location: this.locations.get(this.locations.keys()[i])
		});
		marker.openInfoWindowHtml(html, {maxWidth: 400});
	  }
	},
	/**
	 * Handle dictionary:loaded event
	 * @param {Event}
	 */
	onDictionaryLoaded: function(event) {
		this.dictionary = new pH8.Dictionary();
		this.dictionaryLoaded = true;
		this.onReady();
	},
	/**
	 * Handle pages:loaded event
	 * @param {Event}
	 */
	onPagesLoaded: function(event) {
		this.pages = new pH8.Pages();
		this.pagesLoaded = true;
		this.onReady();
	},
	/**
	 * Templates loaded, what to do next?
	 */	
	onTemplatesLoaded: function() {
		this.templatesLoaded = true;
		this.onReady();
	},
	/**
	 * Everything done, send a map:getdata 
	 */
	onReady: function(){
		if(this.dictionaryLoaded && this.templatesLoaded && this.pagesLoaded) {
			/*
			 * Create a map ...
			 */
			var mapOptions = {
				scrollwheel: false,
				zoomControlOptions: { style: google.maps.ZoomControlStyle.SMALL},
				zoom : this.options.minZoom,
				center : this.options.startPoint,
				mapTypeId : google.maps.MapTypeId.ROADMAP,
				mapTypeControl: false,
				panControl: false,
				streetViewControl: false
			};
			if (this.options.scrollWheel) {
				mapOptions.scrollwheel = true;
			}
			if (this.options.disableDragging) {
				mapOptions.draggable = false;
			}
			this.map = new google.maps.Map(this.element, mapOptions);
			this.element.setStyle({visibility: 'visible'});
			this.waitForSocialWidgets(this.onPageReady.bindAsEventListener(this));
			this.onMapReadyHandler = google.maps.event.addListener(this.map, 'idle', this.onMapReady.bind(this));
		}
	},
	/**
	 * Wait for the map to be idle, so we can start map-related stuff
	 * If we don't wait for this event, things like google.maps.Map.getBounds() will fail
	 */
	onMapReady: function() {
		google.maps.event.removeListener(this.onMapReadyHandler);
		/*
		 * Handle change events
		 */
		google.maps.event.addListener(this.map, 'bounds_changed', this.mapBoundsChangedHandler.bind(this));
		/*
		 * Listen for map: events
		 */
		document.observe('map:search', this.handleSearch.bindAsEventListener(this));
		document.observe('map:cleardata', this.handleClearData.bindAsEventListener(this));
		document.observe('map:zoomin', this.handleZoomIn.bindAsEventListener(this));
		document.observe('map:newdata', this.handleNewData.bindAsEventListener(this));
		document.observe('map:highlight', this.handleHighlight.bindAsEventListener(this));
		this.widgetReady(this);
	},
	/**
	 * Wait for other widgets to be loaded
	 */
	onPageReady: function(event) {
		// Parse the current URI to see if we have a saved state
		var query = document.location.href.parseExtendedQuery();
		if (query.restoreState) {
			this.restoreState();
		}
	}	
});