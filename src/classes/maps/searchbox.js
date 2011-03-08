/**
 * @fileoverview Definition of Maps.SearchBox
 * @author Joris Verbogt
 */
/**
 * Create a new SearchBox from a FormElement
 * 
 * The location field value is posted to a google.maps.ClientGeoCoder,
 * the resulting coordinates are the payload of a map:search event.
 * 
 * @class Maps.SearchBox
 * @lends Maps.SearchBox
 */
Maps.SearchBox = Class.create({
	/**
	 * @constructs
	 * @param {FormElement} element The form
	 */
	initialize: function(element, options) {
		Object.extend(this, pH8.Mixin.needsSocialWidgets);
		this.registerWidget(this);
		Object.extend(this, pH8.Mixin.needsDictionary);
		Object.extend(this, pH8.Mixin.needsPages);
		this.element = $(element);
		this.state = 'new';
		this.options = Object.extend({
			locationFieldName: 'location',
			latitudeFieldName: 'latitude',
			longitudeFieldName: 'longitude',
			searchNameFieldName: 'search_name',
			messageElement: null,
			googleViewport: null,
			shouldSubmit: false
		}, options || {});
		this.locationField = $(this.element[this.options.locationFieldName]);
		this.latitudeField = $(this.element[this.options.latitudeFieldName]);
		this.longitudeField = $(this.element[this.options.longitudeFieldName]);
		if (this.options.googleViewport) {
			this.viewPort = new google.maps.LatLngBounds(
				new google.maps.LatLng(this.options.googleViewport.south,this.options.googleViewport.west),
				new google.maps.LatLng(this.options.googleViewport.north,this.options.googleViewport.east)
			);
		}
		this.waitForDictionary(this.onDictionaryLoaded.bind(this));
		this.waitForPages(this.onPagesLoaded.bind(this));
		this.element.observe('submit', this.onSubmit.bindAsEventListener(this));
		this.locationField.observe('focus', this.onFocus.bindAsEventListener(this));
	},
	restoreState: function() {
		var page = new pH8.Page();
		var state = page.getState();
		if (state) {
			$(this.element[this.options.latitudeFieldName]).setValue(state.latitude);
			$(this.element[this.options.longitudeFieldName]).setValue(state.longitude);
			$(this.element[this.options.locationFieldName]).setValue(state.location);
			$(this.element[this.options.searchNameFieldName]).setValue(state.searchName);
			this.state = 'save';
		}
	},
	/**
	 * Save the state of this widget to URI
	 */
	saveState: function() {
		var page = new pH8.Page();
		page.setState('latitude', $(this.element[this.options.latitudeFieldName]).getValue());
		page.setState('longitude', $(this.element[this.options.longitudeFieldName]).getValue());
		page.setState('location', $(this.element[this.options.locationFieldName]).getValue());
		page.setState('searchName', $(this.element[this.options.searchNameFieldName]).getValue());
		document.location.href = document.location.href.addHashParam('restoreState', 1);
	},
	/**
	 * onFocus event handler, clear the box and set the state to ready
	 * @param {Event} event
	 */
	onFocus: function(event) {
		var me = event.element();
		me.value = '';
		this.state = 'ready';
	},
	/**
	 * onSubmit event handler, clear errors, determine state and go query google
	 * @param {Event} event The event
	 */
	onSubmit: function(event) {
		event.stop();
		if (this.options.messageElement) {
			$(this.options.messageElement).update('');
		}
		if (this.state != 'pending') {
			this.location = $F(this.element[this.options.locationFieldName]);
			if (this.state == 'new' || this.location == '') {
				if (this.options.messageElement) {
					$(this.options.messageElement).update(this.dictionary.getText('error_no_location_entered'));
				}
			} else {
				this.queryGoogle();
			}
		}
	},
	/**
	 * onPositionFound response handler
	 * @param {google.maps.LatLng} position The position
	 */
	onPositionFound: function(results, status) {
		if (status == google.maps.GeocoderStatus.OK && results[0].geometry.location && this.viewPort.contains(results[0].geometry.location)) {
			this.position = results[0].geometry.location;
			this.latitudeField.setValue(this.position.lat());
			this.longitudeField.setValue(this.position.lng());
			this.state = 'success';
			
			
			if (this.options.shouldSubmit) {
				this.element.submit();
			} else {
				this.saveState();
				document.fire('map:search', { 
					position: this.position,
					resetZoom: true,
					searchName: this.element.search_name.value
				});
			}
		} else {
			this.state = 'fail';
			if (this.options.messageElement) {
				$(this.options.messageElement).update(this.dictionary.getText('error_location_notfound'));
			}
		}
	},
	/**
	 * Query Google API 
	 */
	queryGoogle: function() {
		this.state = 'pending';
		var geoCoder = new google.maps.Geocoder();
		var request = {address: this.location + ',NL'};
		if (this.options.googleViewport) {
			request.bounds = this.viewPort;
		}
		geoCoder.geocode(request, this.onPositionFound.bind(this));
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
	 * Everything done
	 */
	onReady: function(){
		if(this.dictionaryLoaded && this.pagesLoaded){
			this.waitForSocialWidgets(this.onPageReady.bindAsEventListener(this));
			this.widgetReady(this);
		}
	},
	hasNewLatLng: function(){
		if(this.latitudeField.getValue() != 52){
			return true;
		}
		
		if(this.longitudeField.getValue() != 5){
			return true;
		}
		
		return false;
	},
	/**
	 * Other widgets are ready
	 * @param {Event} event
	 */
	onPageReady: function(event) {
		// Parse the current URI to see if we have a saved state
		var query = document.location.href.parseExtendedQuery();
		if (query.restoreState) {
			this.restoreState();
		}
		if (this.hasNewLatLng()) {
			if (this.state != 'save') {
				document.fire('map:search', { 
					position: new google.maps.LatLng(this.latitudeField.getValue(),this.longitudeField.getValue()),
					resetZoom: true,
					searchName: $(this.element[this.options.searchNameFieldName]).getValue()
				});
			}
			this.state = 'ready';
		}
	}	
});