/**
 * @fileoverview Definition of TabRotator, reusable
 * @author Florian Mientjes<florian@mangrove.nl>
 * @author Joris Verbogt <joris@ph8.nl>
 * @version 1.3
 */
/**
 * @class TabRotator
 * @lends TabRotator
 * @version 1.3
 */
TabRotator = Class.create({
	/**
	 * @description rotates through different tabs of content, content is not loaded dynamicaly, but has to be set to display:none; the active item will have the class "active", which must be set to show the item
	 * @constructs
	 * @param {Element} element or id
	 * @param {Object} options (contentselector, tabselector, interval, activator, activeClass)
	 */
	initialize: function(element, options){
		this.element = $(element);
		this.options = Object.extend({
			contentElementSelector: '.detail',
			tabsElementSelector: '.list',
			interval: 3,
			activeClass: 'active',
			animateLoader: false,
			animatingLoaderClass: 'loader-animating',
			animationClassPrefix: 'state-',
			animationDuration: 1,
			animationFrames: 1,
			useActivatorOrder: true
		}, options || { });

		this.contentElement = this.element.down(this.options.contentElementSelector);
		this.contentElements = this.contentElement.childElements();
		this.tabsElement = this.element.down(this.options.tabsElementSelector);
		this.tabElements = this.tabsElement.childElements();
		this.linkElements = this.tabsElement.select('a');
		this.activeIndex = this.tabElements.indexOf(this.tabsElement.down('.' + this.options.activeClass));
		this.zIndex = 2;

		Event.observe(this.tabsElement, 'click', this.clickHandler.bindAsEventListener(this));
		if (this.options.animateLoader) {
			this.frameRegExp = new RegExp('(' + this.options.animationClassPrefix + ')(\\d+)');
			this.frameRegExp.compile();
			this.tabsElement.addClassName(this.options.animatingLoaderClass);
			this.animationInterval = this.options.animationDuration / this.options.animationFrames;
			this.startAnimating();
		}

		if(this.options.interval > 0){
			this.timer = new PeriodicalExecuter(this.timerHandler.bindAsEventListener(this), this.options.interval);
		}
	},
	/**
	 * @description handle all clicks inside the tab element
	 * @param {Object} event
	 */
	clickHandler: function(event){
		var link = event.findElement('a');
		if(link){
			this.stopAnimating();
			var tabOrder = this.linkElements.indexOf(link);
			if (tabOrder >= 0) {
				this.timer.stop();
				this.activateTab(tabOrder);
			}
			link.blur();
			event.stop();
		}
	},
	/**
	 * @description handle the time-out rotation
	 */
	timerHandler: function(){
		if (this.tabElements[this.activeIndex + 1]) {
			this.stopAnimating();
			this.activateTab(this.activeIndex + 1);
			this.startAnimating();
		} else {
			this.stopAnimating();
			this.activateTab(0);
			this.startAnimating();
		}
	},
	/**
	 * Set the frame of an element
	 * @param {Element} element The element
	 */
	setFrame: function(element, frame) {
		element.className = element.className.replace(this.frameRegExp, "$1" + frame);
	},
	/**
	 * Start animating the loader
	 * @param {Element} element The loader element
	 */
	startAnimating: function(element) {
		if (this.options.animateLoader) {
			this.activeFrame = 1;
			this.linkElements[this.activeIndex].addClassName(this.options.animationClassPrefix + this.activeFrame);
			this.animationTimer = new PeriodicalExecuter(this.animationTimerHandler.bindAsEventListener(this), this.animationInterval);
		}
	},
	/**
	 * Stop animating the loader
	 * @param {Element} element The loader element
	 */
	stopAnimating: function(element) {
		if (this.options.animateLoader) {
			this.animationTimer.stop();
			this.setFrame(this.linkElements[this.activeIndex], 1);
		}
	},
	/**
	 * @description handle the animation timer
	 */
	animationTimerHandler: function(){
		if (this.activeFrame == this.options.animationFrames) {
			this.activeFrame = 1;
		} else {
			this.activeFrame += 1;
		}
		this.setFrame(this.linkElements[this.activeIndex], this.activeFrame);
	},
	/**
	 * @description activates the items with the selected value
	 * @param {Integer} tabOrder item to activate
	 */
	activateTab: function(tabOrder){
		if (tabOrder != this.activeIndex) { 
			this.tabElements[this.activeIndex].removeClassName(this.options.activeClass);
			this.contentElements[tabOrder].hide();
			this.contentElements[tabOrder].addClassName(this.options.activeClass);
			this.contentElements[this.activeIndex].setStyle({'z-index': this.zIndex - 1});
			this.contentElements[tabOrder].setStyle({'z-index': this.zIndex});
			new Effect.Appear(this.contentElements[tabOrder],{
				duration: 0.3,
				afterFinish: function(transport) {
					this.contentElements[this.activeIndex].removeClassName(this.options.activeClass);
					this.activeIndex = tabOrder;
				}.bind(this)
			});
			this.tabElements[tabOrder].addClassName(this.options.activeClass);
		}
	}
});