/**
 * @fileoverview dialog.js - defines the dialog class
 * @author Florian Mientjes<florian@mangrove.nl>
 * @version 1.5
 */

/**
 * @class Dialog
 * @lends Dialog
 */
pH8.Dialog = Class.create({
	/**
	 * @constructs
	 * @description create a new dialog object, if this is used multiple times it wil use the one on the page
	 * @param {Object} options 
	 * <pre>
	 * duration: 0.5,
	 * opacity: 0.25,
	 * dialogId: 'IQdialog',
	 * windowClass: 'window'
	 * </pre>
	 */
	initialize: function(options){
		this.options = Object.extend({
			duration: 0.5,
			opacity: 0.25,
			dialogId: 'IQdialog',
			windowClass: 'window',
			hasCloseButton: true
		}, options || {});
		
		this.container = $(this.options.dialogId) || this.createNewDialog(this.options.dialogId);
		this.popup = this.container.down('.'+this.options.windowClass);
		this.overlay = this.container.down('.overlay');
		
		Event.observe(document.onresize ? document : window, "resize",this.calculateOverlay.bindAsEventListener(this));
	},
		
	/**
	 * @description generate a new dialog and add it to the body
	 * @param {String} id id to give the dialog
	 * @returns {Element} new dialog 
	 */
	createNewDialog: function(id){
		var dialog = new Element('div', {'id':id});
		dialog.insert({'bottom':this.createOverlay()});
		dialog.insert(this.createPopup());
		
		$$('body')[0].insert({'bottom':dialog});
		return dialog;
	},
	
	/**
	 * @description create a new window including a close button
	 */
	createPopup: function(){
		var popup = new Element('div', {'class':this.options.windowClass}).hide();
		if(this.options.hasCloseButton){
			var closeButton = new Element('a', {'class':'closeButton', 'href':'#'}).update('<span>close</span>');
			closeButton.observe('click', this.hide.bindAsEventListener(this));
			popup.insert({'bottom': closeButton});
		}
		var content = new Element('div', {'className':'content'});
		popup.insert({'bottom': content});
		
		popup.setStyle({
			top: document.viewport.getScrollOffsets().top + "px"
		});
		
		
		return popup;
	},

	/**
	 * @description generate a new overlay with the right size
	 * @returns {Element} overlay
	 */
	createOverlay: function(){
		this.overlay = new Element('div', {
			'class': 'overlay'
		}).hide();
		this.calculateOverlay();
		return this.overlay;
	},
	/**
	 * @description calculate the dimensions of the full screen overlay
	 */
	calculateOverlay: function(){
		var dimensions = document.viewport.getDimensions();
		var offsets = document.viewport.getScrollOffsets();
		this.middle = {
			x: dimensions.width/2 + offsets.left,
			y: dimensions.height/2 + offsets.top
		};
		this.overlay.setStyle({
			position: 'fixed',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0,
			backgroundColor: '#000'
		});
	},
	/**
	 * @description insert content into the window
	 * @param {Object} content
	 */
	insertContent: function(content){
		var contentElement = this.popup.down('.content');
		contentElement.update(content);
		contentElement.setStyle({
			'top': this.middle.y - contentElement.getHeight()/2,
			'left': this.middle.x - contentElement.getWidth()/2
		});

	},
	/**
	 * @description show the elements of the dialog
	 */
	show: function(){
		this.container.show();
		this.container.down('.overlay').setStyle({'opacity':'0'}).show();
		this.container.down('.overlay').morph('opacity:0.8', {
			duration: 0.2,
			position: 'end'
		});
		this.popup.setStyle({'overflow':'hidden'});
		this.popup.appear({
			duration: 0.5,
			position: 'end'
		});
	},
	/**
	 * @description hide the elements of the dialog
	 */
	hide: function(e){
		if(e){
			e.stop();
		}
		this.popup.morph('opacity:0', {
			duration: 0.5,
			position: 'first'
		});
		this.container.down('.overlay').morph('opacity:0', {
			duration: 0.2,
			position: 'end',
			afterFinish: function(){
				this.container.hide();
			}.bind(this)
		});
		
	}
});

pH8.Dialog.getInstance = function(options) {
	if (pH8.Dialog._instance == null) {
		pH8.Dialog._instance = new pH8.Dialog(options);
	}
	return pH8.Dialog._instance;
};
