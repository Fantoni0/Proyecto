//Client

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var id;
var reqSocket, reqSocketAddress, reqSocketPort;
var shop, isReady=false;
//Verifying arguments
var arg = process.argv;
if (arg.length<5){
    console.log("Incorrect number of arguments.Expected format:\n \
     node client.js <id> <reqSocketAddress> <reqSocketPort>");
    process.exit(0);
}
//Get Arguments
id = arg[2].toString();
reqSocketAddress = arg[3].toString();
reqSocketPort = arg[4].toString();

//Create and connect socket
reqSocket = zmq.socket('req');
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);

//Send initial request to get shop's catalog
var initialRequest = {
    clientId: id,
    kind: "getAll"
}
reqSocket.send(JSON.stringify(initialRequest));
//Sending random requests each 2s
setInterval(function(){
    if(isReady){
        var refNum = randRefNum();
        var msg = aux.randomRequest(id,refNum);
        reqSocket.send(msg);
    }
},2000);

//Getting answer from the primary
reqSocket.on('message',function(reply){
    var res = JSON.parse(reply);
    console.log("-->Got answer from primary "+res.primaryId+". The request -"+res.kind+"- had a "+res.result+" result");
    if(res.result == 'negative'){
        console.log("-->Failed to accomplish request due to "+res.cause);
    }
    if(res.kind=='getAll'){
        console.log("-->Client "+id+" updated catalog")
        isReady = true;
        shop=res.item;
    }
});


var randRefNum = function(){
    return shop[aux.randInteger(shop.length-1,0)].ref_number;
}