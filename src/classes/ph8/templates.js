/*
 * Mixin
 */
/**
 * @description mixin if you need templates
 */
pH8.Mixin.needsTemplates = {
	/**
	 * Call this function in your initializer
	 * @param {Object} templates The template Urls by name
	 * @param {Function} callback The function to call on successful templates load
	 */
	waitForTemplates: function(templates, callback) {
		this._templatesLoadedCallback = callback;
		this._templateUrlsByName = new Hash(templates);
		this._templateNamesByUrl = new Hash();
		this.templates = {};
		this._templateUrlsByName.each(function(pair) {
			this._templateNamesByUrl.set(pair.value, pair.key);
			new Ajax.Request(pair.value, {
				method: 'get',
				parameters: {'v': pH8.SiteVersion},
				onSuccess: this.checkTemplates.bind(this)
			});
		}.bind(this));
	},
	/**
	 * Check if Templates are loaded
	 * @param {Ajax.Response} response The Ajax response
	 */
	checkTemplates: function(response) {
		var name = this._templateNamesByUrl.get(response.request.url.stripQuery());
		if (name) {
			var check = true;
			this.templates[name] = response.responseText;
			this._templateNamesByUrl.each(function(pair) {
				if (!this.templates[pair.value]) {
					check = false;
				}
			}.bind(this));
			if (check && this._templatesLoadedCallback) {
				this._templatesLoadedCallback();
			}
		}
	}
}