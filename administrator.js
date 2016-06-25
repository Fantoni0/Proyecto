//Administrator

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
var id, service;
var reqSocketDN, reqDomainNameAddress, reqDomainNamePort;
var reqSocket, reqSocketAddress, reqSocketPort;

//Verifying arguments
var arg = process.argv;
if (arg.length<4){
    console.log("Incorrect number of arguments.Expected format:\n \
     node administrator.js <id> <service> <reqDomainNameAddress> <reqDomainNamePort>");
    process.exit(0);
}

//Get arguments
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
    if(message.result == "positive"){
	    reqSocketAddress = message.item.address;
	    reqSocketPort = message.item.port;
	    reqSocket.connect('tcp://'+reqSocketAddress+':'+reqSocketPort);
	    //Now we got primary's address. Let's get service's catalog
	    var initialRequest = {
	        clientId: id,
	        kind: "getAll"
	    }
	    reqSocket.send(JSON.stringify(initialRequest));    
	}else{
		//Get primary's address by asking the DNS
		var request = {
		    kind: "Consult",
		    service : service
		};
		reqSocketDN.send(JSON.stringify(request));
	}
});

reqSocket.on('message',function(reply){
	var answer = JSON.parse(reply);
	if(answer.kind=='getAll'){
		var shop = answer.item;
		var changeShop;
	    if(aux.randInteger(1,0)==1){
	    	changeShop = {
	    		kind: "delete",
	    		ref_number: shop[aux.randInteger(shop.length-1,0)].ref_number
	    	}
	    }else{
	    	changeShop = {
	    		kind: "create",
	    		item: {
	    			ref_number:getFreeRefNumber(shop),
	    			name:aux.randString(),
	    			quantity: aux.randInteger(answer.primaryId*7,5),
	    			price: aux.randReal(answer.primaryId*10,5).toFixed(2)
	    		}
	    	}
	    }
	    reqSocket.send(JSON.stringify(changeShop));
	}else{
		//We get the result of the create/delete operation
		console.log("Request "+answer.kind+" had a " +answer.result+" result.");
		if(answer.result=='negative'){
			console.log("The reason was: "+answer.cause);
		}
	}
});

//Aux functions
var getFreeRefNumber = function(arr){
    arr.sort(this.compare);
    return arr[arr.length-1].ref_number+1;
};

var compare = function(a,b){
    if(a.ref_number<b.ref_number){
        return -1;
    }else if(a.ref_number>b.ref_number){
        return 1;
    }else{
        return 0;
    }
};