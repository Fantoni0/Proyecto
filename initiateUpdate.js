//Initiate update Algorithm

//Import packages
var zmq = require('zmq');

//Variables
var reqSocket, reqSocketAddress, reqSocketPort;
var service;
//Verifying arguments
var arg = process.argv;
if (arg.length<4){
    console.log("Incorrect number of arguments.Expected format:\n \
     node initiateUpdate.js <service> <reqSocketAddress> <reqSocketPort>");
    process.exit(0);
}

//Get Arguments
service = arg[2].toString();
reqSocketAddress = arg[3].toString();
reqSocketPort = arg[4].toString();

//Create and connect Socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);

var update = {
	service:this.service,
	text: "Start update"
};

reqSocket.send(JSON.stringify(update));

reqSocket.on('message',function(reply){
	console.log("Updating algorithm has been started"); 
});