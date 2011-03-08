/** @namespace */
pH8.Storage = (function() {
	/**
	 * only one Storage instance needed
	 * @private
	 */
	var _instance = null;
	/**
	 * Public interface
	 */
	return function(type) {
		if (_instance !== null) {
			return _instance;
		}
		_instance = this;
		this.ttl = 3600;
		this.set = function(name, value, ttl) {
			ttl = ttl || this.ttl;
			var time = new Date();
			time.setTime(time.getTime() + ttl);
			document.cookie = name + '=' + escape(Object.toJSON(value)) + ';expires=' + time.toLocaleString();
		};
		this.get = function(name) {
			var value = null;
			var cookie = document.cookie.match(name + '=([^;]+)');
			if(cookie){
				value = unescape(cookie[1].gsub('+', '%20')).evalJSON(true);
			}
			return value;
		};
	};
})();