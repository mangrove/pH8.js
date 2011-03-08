/** @namespace */
pH8.Pages = (function() {
	/**
	 * Private var _instance, only one Pages instance needed
	 * @private
	 */
	var _instance = null;
	/**
	 * Private var _list holds the page labels
	 * @private
	 */
	var _list = null;
	/**
	 * Public interface
	 * @scope pH8.Pages
	 */
	return function(language) {
		if (_instance !== null) {
			return _instance;
		}
		_instance = this;
		new Ajax.Request("/api/ajax.php?action=listPages",{
			method: 'get',
			onSuccess: function(transport){
				_list = transport.responseJSON;
				document.fire("pages:loaded");
			}
		});
		this.isLoaded = function() {
			return (null !== _list);
		};
		this.getList = function(){
			return _list;
		};
		this.getPage = function(key) {
			if(_list[key]) {
				return _list[key];
			} else {
				return key;
			}
		};
	};
})();
/**
 * mixin if you need page label support, calls the callback function as soon as the pages labels are available
 * @class
 */
pH8.Mixin.needsPages = {
	/**
	 * @lends pH8.Mixin.needsPages#
	 */
	/**
	 * Call this function in your initializer
	 * @param {Function} callback The function to call on successful dictionary load
	 */
	waitForPages: function(callback){
		var pages = new pH8.Pages();
		if(pages.isLoaded()){
			callback();
		} else {
			document.observe("pages:loaded", callback);
		}
	}
}