//Client

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var id;
var reqSocket, reqSocketAddress, reqSocketPort;

//Verifying arguments
var arg = process.argv;
if (arg.length<5){
    console.log("Incorrect number of arguments.Expected format:\n \
     nodejs client.js <id> <reqSocketAddress> <reqSocketPort>");
    process.exit(0);
}

//Get Arguments
id = arg[2].toString();
reqSocketAddress = arg[3].toString();
reqSocketPort = arg[4].toString();

//Create and connect socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort,aux.errorBinding(error,'REQ'));

//Sending random requests each 2s
setInterval(function(){
    var msg = aux.randomRequest(id);
    reqSocket.send(msg);
},2000);

//Getting answer from the primary
reqSocket.on('message',function(msg){
    var res = JSON.parse(msg);
    console.log("Got answer from primary "+res.primaryId+". The request -"+res.kind+"- had a "+res.result+" result");
    if(res.result == 'negative'){
        console.log("Failed to accomplish request due to "+res.cause);
    }
});

