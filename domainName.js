//Domain Name

//Import packages
var zmq = require('zmq');

//Variables
var repSocket, repSocketAddress, repSocketPort;
var services = {};

//Verifying arguments
var arg = process.argv;
if (arg.length<4){
    console.log("Incorrect number of arguments.Expected format:\n \
     node domainName.js <repSocketAddress> <repSocketPort>");
    process.exit(0);
}

//Get arguments
repSocketAddress = arg[2].toString();
repSocketPort = arg[3].toString();

//Create and connect sockets
repSocket = zmq.socket('rep');
repSocket.connect('tcp://'+repSocketAddress+':'+repSocketPort);
console.log("Domain name service is established");

repSocket.on('message',function(request){
	console.log("Got message Bruh!");
	var message = JSON.parse(request);
	if(message.kind=="Register"){
		console.log("New address registered");
		services[message.service] = {
			id:message.id,
			address:message.address,
			port: message.port
		}
	}else if(message.kind=="Consult"){
		console.log("Address consulted");
		var answer;
		if(services[message.service]!=undefined){
			answer = services[message.service];
			repSocket.send(JSON.stringify(answer));
		}
	}
});
