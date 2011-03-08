/**
 * @fileoverview Definition of Maps namespace
 * @author Joris Verbogt
 */

/**
 * @namespace Maps
 */
Maps = {};
Maps.Version = '2.0';
Maps.CompatibleWithPH8 = '2';

if (pH8.Version.indexOf(Maps.CompatibleWithPH8) !== 0 && console && console.warn)
  console.warn("This version of Maps extensions is tested with pH8 " + Maps.CompatibleWithPH8 + 
                  " it may not work as expected with this version (" + pH8.Version + ")");

if (!window.google || !window.google.maps && console && console.warn)
	  console.warn("Maps extensions needs Google Maps API");