//Initiate update Algorithm

//Import packages
var zmq = require('zmq');

//Variables
var reqSocket, reqSocketAddress, reqSocketPort;
var service, fileName;
//Verifying arguments
var arg = process.argv;
if (arg.length<6){
    console.log("Incorrect number of arguments.Expected format:\n \
     node initiateUpdate.js <service> <fileName> <reqSocketAddress> <reqSocketPort>");
    process.exit(0);
}

//Get Arguments
service = arg[2].toString();
fileName = arg[3].toString();
reqSocketAddress = arg[4].toString();
reqSocketPort = arg[5].toString();

//Create and connect Socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);

//Send message to request update.
var update = {
    fileName: fileName,
	service: service,
	text: "Start update"
};

reqSocket.send(JSON.stringify(update));

reqSocket.on('message',function(reply){
	console.log("Updating algorithm has been started"); 
	process.exit(0);
});