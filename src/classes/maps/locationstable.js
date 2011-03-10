/**
 * @fileoverview Definition of Maps.LocationsTable
 * @author Joris Verbogt
 */
/**
 * Create a list of Locations, listening for map:getdata events
 * @class Maps.LocationsTable
 * @lends Maps.LocationsTable
 */
Maps.LocationsTable = Class.create({
	/**
	 * @constructs
	 * @description
	 * <pre>
	 *  Maps.LocationsTable listens to the following events:
	 *   - map:getData		
	 *   - map:select		
	 *   - map:highlight	highlight a row by setting "selected" class
	 * </pre>
	 * @param {Element} element The container DOM element
	 */
	initialize: function(element, options) {
	    var page = new pH8.Page();
	    page.registerWidget(this);
		Object.extend(this, pH8.Mixin.needsDictionary);
		Object.extend(this, pH8.Mixin.needsTemplates);
		Object.extend(this, pH8.Mixin.needsPages);
		this.element = $(element);

		this.options = Object.extend({
			locationKey: 'locationID',
			checkForMapDataModifier: false,
			autoZoom: true
		}, options || {});
		this.waitForDictionary(this.onDictionaryLoaded.bind(this));
		this.waitForPages(this.onPagesLoaded.bind(this));
		this.waitForTemplates({
			locationsTable: this.options.locationsTableTemplateUrl
		}, this.onTemplatesLoaded.bind(this));
		this.rowIndexesByLocationKey = {};
		this.currentRequest = null;
	},
	/**
	 * @property
	 */
	eventHandlers: {
		click: function(event) {
			var tr = event.findElement('tr');
			if (tr) {
				var a = tr.down('a');
				if (a) {
					window.location.href = a.href;
				}
			}
			event.stop();
		},
		mouseover: function(event) {
			var tr = event.findElement('tr');
			if (tr) {
				var a = tr.down('a');
				if (a) {
					var query = a.href.toQueryParams();
					document.fire('map:highlight', { locationKey: query[this.options.locationKey] });
				}
			}
		}	
	},
	/**
	 * Build Locations list
	 */
	showLocations: function() {
		var html = this.templates.locationsTable.process({
			state: 'success',
			locations: this.locations,
			dictionary: this.dictionary,
			pages: this.pages.getList()
		});
		this.element.update(html);
	},
	/**
	 * Show loader
	 */
	showLoader: function() {
		var html = this.templates.locationsTable.process({
			state: 'loading',
			dictionary: this.dictionary,
			pages: this.pages.getList()
		});
		this.element.update(html);
	},
	/**
	 * Show an error
	 */
	showError: function(error) {
		var html = this.templates.locationsTable.process({
			state: 'error',
			error: error,
			dictionary: this.dictionary,
			pages: this.pages.getList()
		});
		this.element.update(html);
	},
	/**
	 * Fetched locations data, analyze them
	 * @param {Ajax.Response} response
	 */
	onLocationsFound: function(response) {
		if (response.status != 0) {
			this.currentRequest = null;
			this.locations = [];
			if (response.responseJSON && response.responseJSON.locations) {
				response.responseJSON.locations.each(function(location, index) {
					if (this.bounds.contains(new google.maps.LatLng(location.latitude, location.longitude))) {
						this.locations.push(location);
						this.rowIndexesByLocationKey[location[this.options.locationKey]] = this.locations.size() - 1;
					}
				}.bind(this));
			}
			this.showLocations();
			document.fire('map:newdata', { locations: this.locations });
			this.newSearch = false;
		}
	},
	/**
	 * Error fetching locations, possibly auto-zoom
	 * @param {Ajax.Response} response
	 */
	onLocationsError: function(response) {
		this.currentRequest = null;
		if (response.responseJSON) {
			if (response.status == 416 && this.newSearch && this.options.autoZoom) {
				document.fire('map:zoomin');
			} else {
				this.showError(response.responseJSON);
				document.fire('map:newdata', { locations: [] });
				this.newSearch = false;
			}
		}
	},
	/**
	 * Handle map:getdata event
	 * @param {Event} event
	 */
	handleGetData: function(event) {
		if (event.memo.bounds && event.memo.cachedBounds) {
			this.bounds = event.memo.bounds;
			this.cachedBounds = event.memo.cachedBounds;
		}
		if (event.memo.position) {
			if (this.position != event.memo.position) {
				this.position = event.memo.position;
				this.newSearch = true;
			}
		}
		if (event.memo.searchName) {
			if (this.searchName != event.memo.searchName) {
				this.searchName = event.memo.searchName;
				this.filters = {};
				this.newSearch = true;
			}
		}
		if (event.memo.filters) {
			this.filters = event.memo.filters;
		}
		
		if (this.cachedBounds && this.position && this.searchName) {
			if (this.currentRequest && this.currentRequest.transport.readyState != 0) {
				this.currentRequest.transport.abort();
			}
			this.showLoader();
			document.fire('map:cleardata', {});
			var sw = this.cachedBounds.getSouthWest();
			var ne = this.cachedBounds.getNorthEast();
			this.currentRequest = new Ajax.Request(this.options.dataUrl, {
				method: 'get',
				parameters: Object.extend({
					type: 'json',
					latitude: this.position.lat(),
					longitude: this.position.lng(),
					north: ne.lat(),
					east: ne.lng(),
					south: sw.lat(),
					west: sw.lng(),
					search_name: this.searchName
				}, this.filters),
				onSuccess: this.onLocationsFound.bind(this),
				onFailure: this.onLocationsError.bind(this)
			});
		}
	},
	/**
	 * Handle a map:newzoomlevel event
	 * @param Event event The map:newzoomlevel event
	 */
	handleNewZoomLevel: function(event){
		this.bounds = null;
		this.handleSelect(event);
	},
	/**
	 * Handle map:highlight event
	 * @param {Event} event
	 */
	handleHighlight: function(event) {
		if (event.memo.locationKey) {
			var table = this.element.down('table');
			var rows = table.down('tbody').select('tr');
			rows.each(function(row, index) {
				if (index == this.rowIndexesByLocationKey[event.memo.locationKey]) {
					row.addClassName('selected');
				} else {
					row.removeClassName('selected');
				}
			}.bind(this));
		}
	},
	/**
	 * Handle map:select event
	 * @param {Event} event
	 */
	handleSelect: function(event) {
		if (event.memo.locationKey) {
			var table = this.element.down('table');
			var rows = table.down('tbody').select('tr');
			var index = this.rowIndexesByLocationKey[event.memo.locationKey];
			document.location.href = rows[index].down('a').href;
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
	 * Everything done
	 */
	onReady: function(){
		if(this.dictionaryLoaded && this.templatesLoaded && this.pagesLoaded){
			if (this.options.dataUrl) {
				document.observe('map:getdata', this.handleGetData.bindAsEventListener(this));
				document.observe('map:select', this.handleSelect.bindAsEventListener(this));
				document.observe('map:highlight', this.handleHighlight.bindAsEventListener(this));
				this.element.observe('mouseover', this.eventHandlers.mouseover.bindAsEventListener(this));
				this.element.observe('click', this.eventHandlers.click.bindAsEventListener(this));
			}
			
			document.observe('page:ready', this.onPageReady.bindAsEventListener(this));
		    var page = new pH8.Page();
		    page.widgetReady(this);
		}
	},
	/**
	 * Wait for other widgets to be loaded
	 */
	onPageReady: function(event) {

	}
});