//Special  client to SIMULATE primary's failover

//Import packages
var zmq = require('zmq');

//Variables
var reqSocket, reqSocketAddress, reqSocketPort;
var service;
var idToShutDown;

//Verifying arguments
var arg = process.argv;
if (arg.length<5){
    console.log("Incorrect number of arguments.Expected format:\n \
     node failover.js <service> <reqSocketAddress> <reqSocketPort> [idToShutDown]");
    process.exit(0);
}

//Get Arguments
service = arg[2].toString();
reqSocketAddress = arg[3].toString();
reqSocketPort = arg[4].toString();
idToShutDown = arg[5];

//Create and connect Socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);

//Send message to force the primary to fail
var id;
if(idToShutDown==undefined){
	id = 0;
}else{ id = idToShutDown;}
var fail = {
	text: 'Force failover',
	service: service,
	serverId: id
}
reqSocket.send(JSON.stringify(fail));

reqSocket.on('message', function(reply){
	if(reply == "Failover started"){
		console.log('Failover message was received');
	}else{
		console.log('Incorrect server Id was provided, try again.');
	}
	process.exit(0);
})