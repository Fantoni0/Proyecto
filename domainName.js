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
repSocket.bindSync('tcp://'+repSocketAddress+':'+repSocketPort);
console.log("Domain name service is established in "+ repSocketAddress+":"+repSocketPort);

repSocket.on('message',function(request){
	var message = JSON.parse(request);
	if(message.kind=="Register"){
		services[message.service] = {
			id:message.id,
			address:message.address,
			port: message.port
		}
		//Responder. Asegurarse de que es correcto
		var reply = {
			result:"positive",
			service: message.service
		}
		repSocket.send(JSON.stringify(reply));
	}else if(message.kind=="Consult"){
		var answer;
		if(services[message.service]!=undefined){
			answer = {
				result: "positive",
				item:services[message.service],
				service: message.service
				};
			repSocket.send(JSON.stringify(answer));
		}else{
			answer = {
				result:"negative",
				service: message.service
			};
		}
	}
});
