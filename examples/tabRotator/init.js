var rotator_rules = {
   '.tabrotator': function() {
		var tabRotator = new TabRotator(this, {
           contentElementSelector: '.content',
           tabsElementSelector: '.tabs',
           interval: 4
       });
  }
};
Event.addBehavior(rotator_rules);