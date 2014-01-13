var util = require('util');
var stream = require('stream');
var exec = require('child_process').exec;

util.inherits(Driver,stream);
util.inherits(Device,stream);

//var updateInterval = 10000; // interval in milliseconds to check the state of the pins
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
var pinNo = 18; // BCM GPIO pin No. See http://wiringpi.com/ documentation or man gpio
var timeToLeaveButtonPressed = 750;  // time in milliseconds to leave the garage door button pressed before releasing it


function Driver(opts, app) {
	var self = this;
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
	var setOutCmd = "gpio -g mode " + pinNo + " out";
	exec(setOutCmd, function(error, stdout, stderr) {
		app.log.info("garageDoorBtn set raspberry pi BCM GPIO pin " + pinNo + " as output. Executed command : " + setOutCmd + " -- result : " + stdout);
	});
};

Device.prototype.write = function(dataRcvd) {
	var app = this._app;
	var self = this;
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
	// *** TODO: update state to off when done here (just so it always shows off)
	// *** also getting error (client disconnedcted) when this function is called...
};	

/*
Driver.prototype.config = function(rpc,cb) {
	// *** TODO: add config window to configure pinNo and timeToLeaveButtonPressed
}
*/

module.exports = Driver;
