/**
 * @fileoverview Definition of Maps.Filter
 * @author Joris Verbogt
 */
/**
 * create a new LocationSearch from a FormElement
 * @class Maps.Filter
 * @lends Maps.Filter
 */
Maps.Filter = Class.create({
	/**
	 * @constructs
	 * @param {FormElement} element The form
	 */
	initialize: function(element, options) {
		Object.extend(this, pH8.Mixin.needsSocialWidgets);
		this.registerWidget(this);
		Object.extend(this, pH8.Mixin.needsDictionary);
		Object.extend(this, pH8.Mixin.needsPages);
		Object.extend(this, pH8.Mixin.needsTemplates);
		this.element = $(element);
		this.options = Object.extend({
			noSubmitClassName: 'no-submit',
			filterSwitchClassName: 'filter-switch',
			filterSwitchSubfilterClassName: 'filter-switch-subfilter'
		}, options || {});
		this.waitForDictionary(this.onDictionaryLoaded.bind(this));
		this.waitForPages(this.onPagesLoaded.bind(this));
		this.waitForTemplates({
			filter: this.options.filterTemplateUrl
		}, this.onTemplatesLoaded.bind(this));
		this.savedState = {};
	},
	/**
	 * Save the state of this widget to URI
	 * @param Object data The data to save
	 */
	saveState: function(data) {
		var page = new pH8.Page();
		page.setState('filters', data);
		document.location.href = document.location.href.addHashParam('restoreState', 1);
	},
	/**
	 * Restore the state of this widget
	 */
	restoreState: function() {
		var page = new pH8.Page();
		this.savedState = page.getState();
		if (this.savedState) {
			this.loadFilter(this.savedState.searchName);
		}
	},
	/**
	 * Restore the filters from saved state
	 */
	restoreFilters: function() {
		var form = this.element.down('form');
		form.getElements().each(function(element) {
			element = $(element);
			if (this.savedState.filters[element.name]) {
				if (element.tagName == 'INPUT') {
					if (element.type == 'radio') {
						if (element.readAttribute('value') == this.savedState.filters[element.name]) {
							element.checked = true;
						}
					} else {
						element.setValue(this.savedState.filters[element.name]);
					}
				} else if (element.tagName == 'SELECT') {
					element.setValue(this.savedState.filters[element.name]);
				}
				if (element.hasClassName(this.options.filterSwitchSubfilterClassName)) {
					var filter = element.up('fieldset').previous('label').down('input');
					filter.checked = true;
					this.enableFilter(filter);
				}
			}
		}.bind(this));
	},
	/**
	 * Enable filter, disable other filters
	 */
	enableFilter: function(filter) {

		var form = $(filter.form);
		// Disable the other controls
		form.select('input.' + this.options.filterSwitchClassName + '[type=radio]').each(function(switchElement) {
			switchElement.up('label').next('fieldset').select('input,select').each(function(subFilterElement) {

				subFilterElement.disable();
			});
		});
		// Enable our subfilter controls
		filter.up('label').next('fieldset').select('input,select').each(function(subFilterElement) {

			subFilterElement.enable();
		});
	},
	/**
	 * onChange event handler
	 * @param {Event} event 
	 */
	onChange: function(event) {
		var me = event.element();
		var form = $(me.form);
		if (me.hasClassName(this.options.filterSwitchClassName)) {
			this.enableFilter(me);
		}
		// If form element type is filter-switch, check if we should fire
		var fire = true;
		if (!me.hasClassName(this.options.noSubmitClassName)) {
			if (form != document) {
				var activeElements = [];
				form.getElements().each(function(element, index) {
					if (!element.hasClassName(this.options.filterSwitchClassName)) {
						
						if (element.hasClassName(this.options.filterSwitchSubfilterClassName)) {
							var filterElement = element.up('fieldset').previous('label').down('input');
							if (filterElement && filterElement.checked) {
								activeElements.push(element);
								filterElement.removeClassName(this.options.noSubmitClassName);
							}
						} else {
							activeElements.push(element);
						}
					}
				}.bind(this));
				var formData = Form.serializeElements(activeElements, { hash: true });
				document.fire('map:getdata', {filters: formData});
				this.saveState(formData);
			}
		}
	},
	/**
	 * Handle the map:search event
	 * @param {Event} event 
	 */
	handleSearch: function(event) {
		this.removeFilter();
		if (event.memo.searchName) {
			this.loadFilter(event.memo.searchName);
		}
	},
	/**
	 * Load the filter for this specific search
	 */
	loadFilter: function(searchName) {
		new Ajax.Request('/api/filters', {
			parameters: {
				search_name : searchName,
				type: 'json'
			},
			method: 'get',
			onSuccess: this.onFilterLoaded.bind(this)
		});
	},
	/**
	 * Remove the filter HTML
	 */
	removeFilter: function() {
		this.element.update('');
		var page = new pH8.Page();
		page.setState('filters', {});
		this.savedState = {};
	},
	/**
	 * Handle the loading of the template
	 * @param {Ajax.Response} response
	 */
	onFilterLoaded: function(response) {
		if (response.responseJSON && response.responseJSON.length != 0) {
			var html = this.templates.filter.process({
				dictionary: this.dictionary,
				pages: this.pages.getList(),
				filters: response.responseJSON
			});
			this.element.update(html);
			// change doesn't bubble in IE, catch all mouse clicks instead.
			if(!Prototype.BrowserFeatures.XPath){
				this.element.down('form').getElements().each(function(element){
					element.observe('click', this.onChange.bindAsEventListener(this));
				}.bind(this));
			}
		} else {
			this.removeFilter();
		}
		this.filterLoaded = true;
		if (this.savedState) {
			this.restoreFilters();
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
	 * @param {Event} event
	 */
	onPagesLoaded: function(event) {
		this.pages = new pH8.Pages();
		this.pagesLoaded = true;
		this.onReady();
	},
	/**
	 * Templates loaded, what to do next?
	 * @param {Event} event
	 */	
	onTemplatesLoaded: function(event) {
		this.templatesLoaded = true;
		this.onReady();
	},
	/**
	 * Everything done
	 */
	onReady: function(){
		if (this.dictionaryLoaded && this.pagesLoaded && this.templatesLoaded) {
			this.waitForSocialWidgets(this.onPageReady.bindAsEventListener(this));
			this.widgetReady(this);
		}
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
		this.element.observe('change', this.onChange.bindAsEventListener(this));
		document.observe('map:search', this.handleSearch.bindAsEventListener(this));
	}
});