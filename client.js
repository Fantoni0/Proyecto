//Client

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var id,service;
var reqSocketDN, reqDomainNameAddress, reqDomainNamePort;
var reqSocket, reqSocketAddress, reqSocketPort;
var shop, isReady=false;
//Verifying arguments
var arg = process.argv;
if (arg.length<6){
    console.log("Incorrect number of arguments.Expected format:\n \
     node client.js <id> <service> <reqDomainNameAddress> <reqDomainNamePort>");
    process.exit(0);
}

//Get Arguments
id = arg[2].toString();
service = arg[3].toString();
reqDomainNameAddress = arg[4].toString();
reqDomainNamePort = arg[5].toString();

//Create and connect sockets
reqSocket = zmq.socket('req');
reqSocketDN = zmq.socket('req');
reqSocketDN.connect('tcp://'+reqDomainNameAddress+':'+reqDomainNamePort);

//Get primary's address by asking the DNS
var request = {
    kind: "Consult",
    service : service
};

reqSocketDN.send(JSON.stringify(request));

reqSocketDN.on('message', function(reply){
    var message = JSON.parse(reply);
    console.log("connected to primary "+message.id);
    reqSocketAddress = message.Address;
    reqSocketPort = message.Port;
    reqSocket.connect('tcp://'+reqSocketAddress+':'+reqSocketPort);

    //Send initial request to get shop's catalog
    var initialRequest = {
        clientId: id,
        kind: "getAll"
    }
    reqSocket.send(JSON.stringify(initialRequest));
});

//Getting answer from the primary
reqSocket.on('message',function(reply){
    //We got a reply.The primary is Ok
    clearInterval(failPrimary);
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

//Sending random requests each 2.5s
setInterval(function(){
    if(isReady){
        var refNum = randRefNum();
        var msg = aux.randomRequest(id,refNum);
        reqSocket.send(msg);
        //Set timer to detect failures on the primary
        var failPrimary = setInterval(function(){
            //We assume the primary is dead so we have to update the socket configuration to target the new primary
            reqSocketDN.send(JSON.stringify(request));
        },3000);
    }
},2500);

var randRefNum = function(){
    return shop[aux.randInteger(shop.length-1,0)].ref_number;
}

