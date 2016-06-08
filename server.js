//Server

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
var service, id, version,isPrimary,shop;
var repSocket, reqSocket, pubSocket, subPrimarySocket, subBelongingSocket;
var repSocketAddress,repSocketPort;
var reqSocketAddress, reqSocketPort;
var pubSocketAddress, pubSocketPort;

//Verifying arguments
var arg = process.argv;
if (arg.length<10){
    console.log("Incorrect number of arguments.Expected format:\n \
     nodejs server.js <service> <version>  <repSocketAddress> \
     <repSocketPort> <reqSocketAddress> <reqSocketPort> \
     <pubSocketAddress> <pubSocketPort>");
    process.exit(0);
}

//Get Arguments
service = arg[2];
version = arg[3];
repSocketAddress = arg[4];
repSocketPort = arg[5];
reqSocketAddress = arg[6];
reqSocketPort = arg[7];
pubSocketAddress  = arg[8];
pubSocketPort = arg[9];

//Instanstiate shop
shop = aux.getShop();

//Create and start sockets
repSocket = zmq.socket('rep');
reqSocket = zmq.socket('req');
pubSocket = zmq.socket('pub')
subPrimarySocket = zmq.socket('sub')
subBelongingSocket = zmq.socket('sub');

//Connecting pub socket to broadcast updates
pubSocket.bindSync('tcp://'+pubSocketAddress+":"+pubSocketPort);
//Initial request to check if I am the primary.
reqSocket.connect('tcp://'+reqSocketAddress+":"+reqSocketPort);
var initialMsg = JSON.stringify({
    text: "I am a new Server",
    service: service,
    pubAd: pubSocketAddress,
    pubPo: pubSocketPort,
    repAd: repSocketAddress,
    repPo: repSocketPort
});
reqSocket.send(initialMsg);

 
//Listening to belonging layer initial answer
reqSocket.on('message',function(msg){ 
    var response = JSON.parse(msg);
    id = response.idServer;
    isPrimary = response.isPrimary;
    if(!isPrimary){
        console.log("I am registered. I am the server "+id+"\n");
        subPrimarySocket.connect('tcp://'+response.subPriAd+":"+response.subPriPo);
        subPrimarySocket.subscribe('');
    }else{
        console.log("I am registered. I am the server "+id+". And I am the primary.\n");
        repSocket.bindSync('tcp://'+repSocketAddress+":"+repSocketPort);
    }
    subBelongingSocket.connect('tcp://'+response.subLayAd+":"+response.subLayPo);
    subBelongingSocket.subscribe('');
});

//Listening to belonging layer updates
subBelongingSocket.on('message',function(msg){
    //If a message is received the primary is down and a reconfiguration is needed.
    var update = JSON.parse(msg);
    if(update.kind=='newPrimary'){
        if(isPrimary && update.idPrimary!=id)process.exit(0);
        if(update.idPrimary==id){
            isPrimary = true;
            repSocket.bindSync('tcp://'+repSocketAddress+":"+repSocketPort);
            subPrimarySocket.close();
        }else{
            subPrimarySocket.close();
            subPrimarySocket = zmq.socket('sub');
            subPrimarySocket.connect('tcp://'+update.subPriAd+":"+update.subPriPo );
            subPrimarySocket.subscribe('');
        }
    }else if(update.kind=='Sepukku'){
        if(id==update.idServer){
            console.log("Server" +id+" has been shut down. I have dishonored my service. I should kill myself.");
            process.exit(0);
        }
    }
});

//Listening to primary updates
subPrimarySocket.on('message',function(msg){
    processUpdate(msg);
    console.log("<--Server "+id+" processing primary update");
});

//Listening to client requests
repSocket.on('message',function(msg){
    //Broadcast update
    pubSocket.send(msg);
    var answer = processUpdate(msg);
    repSocket.send(JSON.stringify(answer));
});

//Functions
var processUpdate = function(msg){
    var response;
    var request = JSON.parse(msg);
    var kind = request.kind;
    console.log("<--Client "+request.clientId+" requested a "+kind+" operation");
    if(kind == 'get'){
        response = {
            primaryId : id,
            kind: kind,
            result: 'positive',
            item: shop[searchItem(request.ref_number)]
        };
    }
    else if(kind == 'getAll'){
        response ={
            primaryId : id,
            kind: kind,
            result: 'positive',
            item: shop
        };
    }
    else if(kind == 'buy'){
        var index = searchItem(request.ref_number);
        if(index==-1){
            response ={
                primaryId : id,
                kind: kind,
                result: 'negative',
                cause: 'Item not found'
            };
        }else if(request.quantity>shop[index].quantity){
            response ={
                primaryId : id,
                kind: kind,
                result: 'negative',
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
    else if(kind == 'return'){
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
    else if(kind == 'create'){
        shop.push(request.item);
        response ={
                primaryId : id,
                kind: kind,
                result: 'positive'
        };
    }
    else if(kind == 'delete'){
        var index = searchItem(request.ref_number);
        shop.splice(index,1);
        response ={
                primaryId : id,
                kind: kind,
                result: 'positive'
        };
    }
    return response;
}

var searchItem = function(refNum){
    for(var i=0;i<shop.length;i++){
        if(shop[i].ref_number==refNum)return i;
    }
    return -1;
}


