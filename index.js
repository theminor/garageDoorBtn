var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;

util.inherits(Driver,stream);
util.inherits(Device,stream);

/*
pins:
	GPIO7 - BCMGPIO4 - pin 7
	GPIO0 - BCMGPIO17 - pin 11
	GPIO2 - BCMGPIO21 (rev 1) or BCMGPIO22 (rev 2) - pin 13
	GPIO3 - BCMGPIO22 - pin 15
	GPIO1 - BCMGPIO18 - pin 12
	GPIO4 - BCMGPIO23 - pin 16
	GPIO5 - BCMGPIO24 - pin 18
	GPIO6 - BCMGPIO25 - pin 22
secondary GPIO connector (rev 2 only):
	GPIO8 - BCMGPIO28 - header pin 3
	GPIO10 - BCMGPIO30 - header pin 5
	GPIO9 - BCMGPIO29 - header pin 4
	GPIO11 - BCMGPIO31 - header pin 6	
*/

var deviceRef = undefined; // sloppy but should work...
var pinNo = undefined;
var timeToLeaveButtonPressed = undefined;                        

function Driver(opts, app) {
	var self = this;
	this.opts = opts;
	if (opts.pinNo) pinNo = opts.pinNo;  // ugly way to track these, but it should work for now...    
	if (opts.timeToLeaveButtonPressed) timeToLeaveButtonPressed = opts.timeToLeaveButtonPressed; 
	app.on('client::up', function(){
		self.emit('register', new Device(app));
	});
};

function Device(app) {
	var self = this;
	this._app = app;
	this.writeable = true;
	this.readable = true;
	this.V = 0;
	this.D = 238;  // Device ID 238 is "relay" -- ID 206 is "switch actuator"
	this.G = "garageDoorBtn";
	this.name = "garageDoorBtn";
	deviceRef = self;
	initialSet(app);
};

function initialSet(app) {
	if (pinNo) {
		var setCmd = "gpio -g mode " + pinNo + " out && gpio -g write " + pinNo + " 0";
		exec(setCmd, function(error, stdout, stderr) {
			app.log.info("garageDoorBtn set raspberry pi BCM GPIO pin " + pinNo + " as output. Executed command : " + setCmd + " -- result : " + stdout);
			if (stdout.trim() == "") { deviceRef.emit('data', 0); }
			else { app.log.warn("garageDoorBtn failed initial setting of pin " + pinNo + " to output mode, low state!"); };
		});
	}
	else { app.log.info("garageDoorBtn pin not specified - need to config the driver!"); };
};

Device.prototype.write = function(dataRcvd) {
	var app = this._app;
	var self = this;
	if (pinNo && timeToLeaveButtonPressed) {	
		app.log.info("garageDoorBtn received data : " + dataRcvd + " -- executing button press on raspberry pi BCM GPIO pin " + pinNo);
		var cmdToSetPinHigh = "gpio -g write " + pinNo + " 1";
		var cmdToSetPinLow = "gpio -g write " + pinNo + " 0";
		var cmdToTestPin = "gpio -g read " + pinNo;
		exec(cmdToSetPinHigh, function(error, stdout, stderr) { // first set pin to high state
			setTimeout(function() {  // wait for "timeToLeaveButtonPressed" seconds
				exec(cmdToTestPin, function(error, stdout, stderr) {  // test to be sure pin is now high
					if (stdout.trim() == "1") {
						exec(cmdToSetPinLow, function(error, stdout, stderr) {  // pin was successfully set high, so now set it back low
							exec(cmdToTestPin, function(error, stdout, stderr) {  // test pin to be sure it was set back low
								if (stdout.trim() != "0") {
									app.log.info("garageDoorBtn failed to reset BCM GPIO pin " + pinNo + " back to low state!");
									self.emit('data', 1);								
								}
								else {
									app.log.info("garageDoorBtn successfully set BCM GPIO pin " + pinNo + " high (for " + timeToLeaveButtonPressed + " milliseconds), then low.");
									self.emit('data', 0);								
								};
							});
						});
					}
					else {  // pin was not successfully set high
						app.log.info("garageDoorBtn failed to set BCM GPIO pin " + pinNo + " to high state!");	
						self.emit('data', 0);								
					};
				});
			}, timeToLeaveButtonPressed);
		});
	}
	else { app.log.warn("garageDoorBtn pin and/or time to leave pressed not specified - need to config the driver!"); };
};	

Driver.prototype.config = function(rpc, cb) {
	var self = this;
	if (!rpc) {
		this._app.log.info("garageDoorBtn main config window called");
		return cb(null, {        // main config window
			"contents":[
				{ "type": "paragraph", "text": "The garageDoorBtn driver simply sets the specified raspberry pi bcm gpio pin to the \"high\" state momentarily, then sets it back to the \"low\" state. The idea is that you can attach a simple relay circuit via this pin and hook the relay to your garage door, which will simulate pressing the garage door button. So you can use this driver to open and close your garage door. Enter the settings below to get started, and please make sure you get a confirmation message after hitting \"Submit\" below. (You may have to click it a couple of times. If you don't get a confirmation message, the settings did not update!)"},
				{ "type": "input_field_text", "field_name": "pin_no", "value": pinNo, "label": "BCM GPIO Pin on Raspberry Pi to actuate", "placeholder": pinNo, "required": true},
				{ "type": "input_field_text", "field_name": "button_time", "value": timeToLeaveButtonPressed, "label": "Time in milliseconds to leach the pin \"high\" before returning the pin to the \"low\" state", "placeholder": timeToLeaveButtonPressed, "required": true},
				{ "type": "paragraph", "text": " "},
				{ "type": "submit", "name": "Submit", "rpc_method": "submt" },
				{ "type": "close", "name": "Cancel" },
			]
		});
	}
	else if (rpc.method == "submt") {
		this._app.log.info("garageDoorBtn config window submitted. Checking for errors..");
		var intRegex = /^\d+$/; // corresponds to a positive integer
		if (!((intRegex.test(rpc.params.pin_no)) && (rpc.params.pin_no > 0) && (rpc.params.pin_no <= 31))) {  // must be an interger 1-31
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The pin number must correspond to a gpio pin on the raspberry pi (must be an integer between 1 and 31, inclusive). See http://wiringpi.com/pins/ regarding confusion with the raspberry pi pins and the way they are numbered and note we are using the BCM GPIO pin numbers! Please try again." },
					{ "type": "close", "name": "Close" }
				]
			});                        
			return;                                
		}
		else if (!(intRegex.test(rpc.params.button_time))) {  // must be a positive integer
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "The button press time must be a positive integer. Note this setting is in milliseconds. Please try again." },
					{ "type": "close", "name": "Close" }
				]
			});                        
			return;                                
		}
		else {  // looks like the submitted values were valid, so update
			this._app.log.info("garageDoorBtn - submitted config appears valid. Updating settings...");
			self.opts.pinNo = rpc.params.pin_no;
			self.opts.timeToLeaveButtonPressed = rpc.params.button_time; // also need this in milliseconds                        
			pinNo = self.opts.pinNo;
			timeToLeaveButtonPressed = self.opts.timeToLeaveButtonPressed;                        
			self.save();
			initialSet(app);
			cb(null, {
				"contents": [
					{ "type": "paragraph", "text": "Configuration was successful!" },
					{ "type": "close"    , "name": "Close" }
				]
			});
		};        
	}
	else {
		this._app.log.info("garageDoorBtn - Unknown rpc method was called!");
	};
};

module.exports = Driver;
