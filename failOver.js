//Special  client to simulate primary's failover

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var reqSocket, reqSocketAddress, reqSocketPort;

//Verifying arguments
var arg = process.argv;
if (arg.length<5){
    console.log("Incorrect number of arguments.Expected format:\n \
     nodejs failover.js <reqSocketAddress> <reqSocketPort>");
    process.exit(0);
}

//Get Arguments
reqSocketAddress = arg[2].toString();
reqSocketPort = arg[3].toString();

//Create and connect Socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);

//Send message to force the primary to fail
var fail = {
	text: 'Force failover'
}
reqSocket.send(JSON.stringify(fail));

reqSocket.on('message', function(reply){
	console.log('Failover message was received');
	process.exit(0);
})