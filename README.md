garageDoorBtn
=============

Driver for Ninja Blocks to interface with a gpio pin on the raspberry pi to be connected to a relay that attaches to your garage door. Actuating data to the driver (any actuate data can be sent) simulates pressing the garage door button by setting the gpio pin high for a short time (activating your relay), then back low.

Basically, the idea is to connect a relay circuit to your raspberry pi, which realy is activated when the chosen raspberry pi pin is set high. The relay is atached to to the "button" circuit on your garage door opener (for example, attach the relay (switch side) in parrallel with the typical "doorbell" style garage button inside your garage. When the garageDoorBtn driver is actuated, it will set the pin high, causing the relay to connect, momentarily simulating pressing the garage door button. After the specified period of time (usually less than a second or so), the relay is "released" via the driver setting the pin back to the "low" state.

Requires the wiringPi library to be installed on your raspberry pi. See http://wiringpi.com/download-and-install/

References to the raspberry pi pins on the gpio headers are very confusing. This driver uses the BCM GPIO reference for the pins. See http://wiringpi.com/pins/ documentation or "man gpio".

<h5>Raspberry Pi Pins:</h5>
	GPIO7 - BCMGPIO4 - pin 7
	GPIO0 - BCMGPIO17 - pin 11
	GPIO2 - BCMGPIO21 (rev 1) or BCMGPIO22 (rev 2) - pin 13
	GPIO3 - BCMGPIO22 - pin 15
	GPIO1 - BCMGPIO18 - pin 12
	GPIO4 - BCMGPIO23 - pin 16
	GPIO5 - BCMGPIO24 - pin 18
	GPIO6 - BCMGPIO25 - pin 22
<h5>Secondary GPIO connector (rev 2 only):</h5>
	GPIO8 - BCMGPIO28 - header pin 3
	GPIO10 - BCMGPIO30 - header pin 5
	GPIO9 - BCMGPIO29 - header pin 4
	GPIO11 - BCMGPIO31 - header pin 6

