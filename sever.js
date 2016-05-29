//Server

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var service, id, version,isPrimary shop;
var repSocket reqSocket, pubSocket, subPrimarySocket, subBelongingSocket;
var repSocketAddress,repSocketPort;
var reqSocketAddress, reqSocketPort;
var pubSocketAddress, pubSocketPort;

//Verifying arguments
var arg = process.argv;
if (arg.length<10){
    console.log("Incorrect number of arguments.Expected format:\n \
     nodejs server.js <version> <repSocketAddress> <repSocketPort> <reqSocketAddress> <reqSocketPort> <pubSocketAddress> <pubSocketPort>");
    process.exit(0);
}

//Get Arguments
service = arg[2].toString();
version = arg[3].toString();
repSocketAddress = arg[4].toString();
repSocketPort = arg[5].toString();
reqSocketAddress = arg[6].toString();
reqSocketPort = arg[7].toString();
pubSocketAddress  = arg[8].toString();
pubSocketPort = arg[9].toString();

//Instanstiate shop
shop = aux.getShop();

//Create and start sockets
repSocket = zmq.socket('rep');
reqSocket = zmq.socket('req');
pubSocket = zmq.socket('pub')
subPrimarySocket = zmq.socket('sub')
subBelongingSocket = zmq.socket('sub');

//Connecting pub socket to broadcast updates
pubSocket.bindSync('tcp://'+pubSocketAddress+":"+pubSocketPort,function(err){aux.errorBinding(err,"PUB")});
//Initial request to check if I am the primary.
req.connect('tcp://'+reqSocketAddress+":"+reqSocketPort,aux.errorBinding(error,"REQ"));
var initialMsg = JSON.stringify({
    text: "I am a new Server",
    service: service,
    pubAd: pubSocketAddress,
    pubPo: pubSocketPort
});
req.send(initialMsg);


//Listening to belonging layer initial answer
req.on('message',function(msg){
    var response = JSON.parse(msg);
    id = response.idServer;
    console.log("I am registered. I am the server "+id);
    isprimary = response.isPrimary;
    if(!isPrimary){
        subPrimarySocket.connect('tcp://'+response.subPriAd+":"+subPriPo,aux.errorBinnding(err,'SUB'));
    }else{
        repSocket.bindSync('tcp://'+repSocketAddress+":"+repSocketPort,aux.errorBinding(err,"REP"));
    }
    subBelongingSocket.connect('tcp://'+response.subLayAD+":"+subLayPo,aux.errorBinnding(err,'SUB'));
});

//Listening to belonging layer updates
subBelongingSocket.on('message',function(msg){
    //If a message is received the primary is down and a reconfiguration is needed.
    var update = JSON.parse(msg);
    if(isPrimary && update.idPrimary!=id)process.exit(0);
    if(update.idPrimary==id){
        isPrimary = true;
        repSocket.bindSync('tcp://'+repSocketAddress+":"+repSocketPort,aux.errorBinding(err,"REP"));
        subPrimarySocket.close();
    }else{
        subPrimarySocket.close();
        subPrimarySocket = zmq.socket('sub');
        subPrimarySocket.connect('tcp://'+update.subPriAd+":"+update.subPriPo,aux.errorBinnding(err,'SUB'));
    }
});

//Listening to primary updates
subPrimarySocket.on('message',function(msg){
    processUpdate(msg);
});

//Listening to client requests
repSocket.on('message',function(msg){
    //IF PRIMARY
    //Broadcast update
    pubSocket.send(msg);
    processUpdate(msg);
});

//Functions
var processUpdate = function(msg){
    var response;
    var request = JSON.parse(msg);
    var kind = request.kind;
    console.log("Client "+request.clientId+" requested a "+kind+"operation");
    if(kind == 'get'){
        response = {
            primaryId : id,
            kind: kind,
            result: 'positive',
            item: shop[searchItem(request.ref_number)]
        };
    }
    if(kind == 'getAll'){
        response ={
            primaryId : id,
            kind: kind,
            result: 'positive',
            item: shop
        };
    }
    if(kind == 'buy'){
        var index = searchItem(request.ref_number);
        if(index==-1){
            response ={
                primaryId : id,
                kind: kind,
                result: 'negative'
                cause: 'Item not found'
            };
        else if(request.quantity>shop[index].quantity){
            response ={
                primaryId : id,
                kind: kind,
                result: 'negative'
                cause: 'There is not enough stock'
            };
        }else{
            //splice
            shop[index].quantity-=request.quantity;
            response ={
                primaryId : id,
                kind: kind,
                result: 'positive',
                item: {quantity:request.quantity,item:shop[index]}
            };
        }
    }
    if(kind == 'return'){
        var index = searchItem(request.ref_number);
        if(index==-1){
            response ={
                primaryId : id,
                kind: kind,
                result: 'negative',
                cause: 'Item not found'
            };
        }else{
            shop[index].quantity+=request.quantity;
            response ={
                primaryId : id,
                kind: kind,
                result: 'positive'
            };
        }
    }
}

var searchItem = function(refNum){
    for(int i=0;i<shop.lenght;i++){
        if(shop[i].ref_number==refNum)return i;
    }
    return -1;
}


