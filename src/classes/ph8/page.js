/**
 * @fileoverview Definition of page.js
 * @author Joris Verbogt
 */
/**
 * page object registers widgets which are ready to go
 * @namespace
 */
pH8.Page = (function(){
	/** @private */
	var _widgetList = [];
	
	/** @private */
	var _readyList = [];
	
	/** @private */
	var _instance = null;
	
	/** @private */
	var _status = false;
	
	return function(){

		if(_instance !== null){
			return _instance;
		}
		_instance = this;

		this.registerWidget = function(widget){
			_widgetList[_widgetList.size()] = widget;
			_readyList[_readyList.size()] = false;
		};
		this.widgetReady = function(widget){
			var index = _widgetList.indexOf(widget);
			if (index !== false) {
				_readyList[index] = true;
				var status = true;
				_readyList.each(function(value, key) {
					status = (status == true && value == true);
				});
				if (status) {
					_status = true;
					document.fire('page:ready', {widgets: _widgetList});
				}
			}
		};
		this.widgetsReady = function(){
			return _status;
		};
		this.setState = function(key, value) {
			var storage = new pH8.Storage();
			var state = storage.get('state');
			state = state ? state : {};
			state[key] = value;
			storage.set('state', state);
		};
		this.getState = function(key) {
			var storage = new pH8.Storage();
			var state = storage.get('state');
			if (key) {
				return state[key];
			} else {
				return state;
			}
		};
	};
})();

/**
 * mixin if you need page label support, calls the callback function as soon as the pages labels are available
 * @class
 */
pH8.Mixin.needsSocialWidgets = {
	/**
	 * @lends pH8.Mixin.needsSocialWidgets#
	 */
	waitForSocialWidgets: function(callback){
		var page = new pH8.Page();
		if(page.widgetsReady()){
			callback();
		}else{
			document.observe('page:ready', callback);
		}
	},
	registerWidget: function(widget){
		var page = new pH8.Page();
		page.registerWidget(widget);
	},
	widgetReady: function(widget){
		var page = new pH8.Page();
		page.widgetReady(widget);
	}
};