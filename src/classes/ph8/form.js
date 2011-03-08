/**
 * @fileoverview Definition of form.js
 */
/**
 * Wraps a Form DOMElement to do background submits & checks
 * @class pH8.Form
 * @lends pH8.Form
 */
pH8.Form = Class.create({
	/**
	 * @constructs
	 * @param {Form} element The form
	 * @param {Object} delegate Our delegate object, implementing pH8.Form delegate protocol
	 * @param {Object} options Optional settings
	 * 	- submitButton: {Element} The submit button, defaults to first submit button in the form
	 *  - activityIndicator: {Element} Optional progress indicator, is displayed during requests
	 *  - disableButtonOnSubmit: {Boolean} Whether to disable the button upon submit or not
	 *  - disabledButtonClass: {String} The class for the disabled button (default: 'btn-disabled')
	 *  - disabledButtonText: {String} The text for the disabled button (default: 'submiting...')
	 *  - dataUrl: {String} The URL to post data to 
	 */
	initialize: function(element, delegate, options) {
		Object.extend(this, pH8.Mixin.needsDictionary);
		Object.extend(this, pH8.Mixin.needsTemplates);
		this.element = $(element);
		this.delegate = delegate;
		options = options || {};
		this.options = {};
		this.data = {};
		this.submitButton = options.submitButton || this.element.getInputs('submit')[0];
		this.activityIndicator = options.activityIndicator;
		this.options.disableButtonOnSubmit = options.disableButtonOnSubmit || true;
		this.options.disabledButtonClass = options.disabledButtonClass || 'btn-disabled';
		this.options.disabledButtonText = options.disabledButtonText || 'submitting...';
		this.dataUrl = options.dataUrl;

		// Parse the form elements into a Hash
		this.fields = new Hash();
		this.labels = new Hash();
		this.externalData = new Hash();
		this.element.getElements().each(function(formElement) {
			this.fields.set(formElement.name, formElement);
			if (formElement.id) {
				if ('radio' == formElement.type || 'checkbox' == formElement.type) {
					// Radio buttons & check boxes don't have a label for their form name, use the fieldset's legend instead
					var label = formElement.up('fieldset').down('legend');
				} else {
					var label = this.element.down('label[for=' + formElement.id + ']');
				}
				this.labels.set(formElement.name, label);
			}
		}.bind(this));
		if (this.dataUrl) {
			this.element.observe('submit', this.submit.bindAsEventListener(this));
		}
		if (options.successTemplateUrl) {
			this.waitForTemplates({
				success: options.successTemplateUrl,
				dialog: options.dialogTemplateUrl
			},this.onTemplatesLoaded.bind(this));
		}
		this.waitForDictionary(this.onDictionaryLoaded.bind(this));
	},
	/**
	 * Dictionary is loaded, what to do next?
	 */
	onDictionaryLoaded: function() {
		this.dictionary = new pH8.Dictionary();
		this.dictionaryLoaded = true;
		if (this.templatesLoaded) {
			this.onReady();
		}
	},
	/**
	 * Templates loaded, what to do next?
	 */	
	onTemplatesLoaded: function() {
		this.templatesLoaded = true;
		if (this.dictionaryLoaded) {
			this.onReady();
		}
	},
	/**
	 * Ready to rock
	 */
	onReady: function() {
	},
	/**
	 * Display the success template
	 */
	displaySuccess: function() {
		if(this.delegate && this.delegate.formDidSucceed){
			this.delegate.formDidSucceed(this);
		}else{
			this.element.up().update(this.templates.success.process({
				dictionary: this.dictionary
			}));
		}
	},
	/**
	 * Display a error dialog
	 */
	displayErrorDialog: function(error) {
		if (this.delegate && this.delegate.formDisplayErrorDialog) {
			this.delegate.formDisplayErrorDialog(this, error);
		} else {
			alert(error.message);
		}
	},
	/**
	 * Submit the data
	 * @param {Event} event The submit event
	 */
	submit: function(event) {
		event.stop();
		if (this.delegate && this.delegate.formCanSubmit && this.delegate.formCanSubmit(this)) {
			
			if (this.options.disableButtonOnSubmit) {
				this.submitButton.disabled = true;
				this.submitButton.addClassName(this.options.disabledButtonClass);
				this.submitButton.store('originalValue', this.submitButton.getValue());
				this.submitButton.setValue(this.options.disabledButtonText);
			}
			if (this.activityIndicator) {
				this.activityIndicator.removeClassName('hidden');
			}
			if (this.delegate && this.delegate.formWillSubmit) {
				this.delegate.formWillSubmit(this);
			}
			this.data = $H(this.element.serialize(true)).merge(this.externalData).toObject();
			new Ajax.Request(this.dataUrl, {
				method: 'post',
				parameters: this.data,
				onSuccess: this.parseJSONData.bind(this),
				onException: this.onSubmitError.bind(this),
				onFailure: this.onSubmitError.bind(this)
			});	
			if (this.delegate && this.delegate.formDidSubmit) {
				this.delegate.formDidSubmit(this);
			}
		}
	},
	/**
	 * Handle XHR errors
	 * @param {Ajax.Response} response The response
	 */
	onSubmitError: function(response, data) {
		if (this.options.disableButtonOnSubmit) {
			this.submitButton.removeClassName(this.options.disabledButtonClass);
			this.submitButton.setValue(this.submitButton.retrieve('originalValue'));
			this.submitButton.disabled = false;
		}
		if (this.activityIndicator) {
			this.activityIndicator.addClassName('hidden');
		}
	
		if (data) {
		} else {
		}
	},
	/**
	 * Parse the data from the Ajax request
	 * @param {Ajax.Response} response The response
	 */
	parseJSONData: function(response) {
		if (this.options.disableButtonOnSubmit) {
			this.submitButton.removeClassName(this.options.disabledButtonClass);
			this.submitButton.setValue(this.submitButton.retrieve('originalValue'));
			this.submitButton.disabled = false;
		}
		if (this.activityIndicator) {
			this.activityIndicator.addClassName('hidden');
		}
		var data = response.responseJSON;
		if (data) {
			if ('fail' == data.status) {
				this.handleFormFail(data);
			} else if ('ok' == data.status) {
				this.displaySuccess();
			}
		}
	},
	/**
	 * Handle a form submit failure
	 * @param {Object} data The result from the form handler
	 */
	handleFormFail: function(result) {
		this.fields.each(function(pair) {
			// Check the corresponding form elements as invalid or empty
			if (result.errors[pair.key]) {
				label = this.labels.get(pair.key);
				if (label) {
					label.addClassName('error');
				}
			} else {
				label = this.labels.get(pair.key);
				if (label) {
					label.removeClassName('error');
				}
			}
		}.bind(this));
		if(this.delegate && this.delegate.formDidFail){
			this.delegate.formDidFail(this);
		}
	},
	/**
	 * Add data to the form which is not in form fields
	 * @param {Object} data The data
	 */
	addData: function(data) {
		this.externalData = this.externalData.merge(data);
	}
});