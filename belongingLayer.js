//Update Manager

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
var count = 1;
var servers;
var services = {}; //HashTable to register 
var repSocket, pubSocket;
var repSocketAddress,repSocketPort,pubSocketAddress,pubSocketPort;
var reqSocketDN, reqDomainNameAddress, reqDomainNamePort;
var lastTransferedState, transformedState;

var shop = aux.getShop();

//Get arguments
var arg = process.argv;
if(arg.length<8){
	console.log("Incorrect number of arguments.Expected format:\n \
		node updateManager.js <repSocketAddress> <repSocketPort> \
		<pubSocketAddress> <pubSocketPort> <reqDomainNameAddress> <reqDomainNamePort>");
}
repSocketAddress = arg[2].toString();
repSocketPort =  arg[3].toString();
pubSocketAddress =  arg[4].toString();
pubSocketPort =  arg[5].toString();
reqDomainNameAddress = arg[6].toString();
reqDomainNamePort = arg[7].toString();

//Create and bind sockets
repSocket = zmq.socket('rep');
pubSocket = zmq.socket('pub');
subSocket = zmq.socket('sub');

reqSocketDN = zmq.socket('req');
repSocket.bindSync('tcp://'+repSocketAddress+':'+repSocketPort);
pubSocket.bindSync('tcp://'+pubSocketAddress+':'+pubSocketPort);
reqSocketDN.connect('tcp://'+reqDomainNameAddress+':'+reqDomainNamePort);

//Listening requests
repSocket.on('message',function(data){
	var msg = JSON.parse(data);
	switch(msg.text){
		case "I am a new server":
			if(services[msg.service]==undefined){
				services[msg.service]=[];
			}
			servers = services[msg.service];
			//Registering server configuration.
			servers.push({id:count,pubAd:msg.pubAd,pubPo:msg.pubPo,repAd:msg.repAd,repPo:msg.repPo});
			//Crafting response
			var res = {
				idServer: count,
				isPrimary: servers.length==1,
				subPriAd: servers[0].pubAd,
				subPriPo: servers[0].pubPo,
				subLayAd: pubSocketAddress,
				subLayPo: pubSocketPort,
				state: shop                                  
			};
			if(res.isPrimary==true){
				//Communicate DNS new primary's address
				var commMsg = {
					kind : "Register",
					service: msg.service,
					id: servers[0].id,
					address:servers[0].repAd,
					port:servers[0].repPo
				};
				reqSocketDN.send(JSON.stringify(commMsg));
				subSocket.connect('tcp://'+servers[0].pubAd+':'+servers[0].pubPo);
				subSocket.subscribe('');
			}
			count++;
			repSocket.send(JSON.stringify(res));
			break;
		case "Force failover":
			forcePrimaryfailover(msg.service, msg.serverId);
			break;
		case "Start update":
			var numReplicas = servers.length;
			var numReplicasUpdated = 0;
			var failover = false;
			var fork = require('child_process').fork;
			var child;
			repSocket.send("Started algortihm");
			child = fork(msg.fileName,[msg.service, 2.0, '127.0.0.1', 6040+numReplicasUpdated, '127.0.0.1', 5000, '127.0.0.1', 6060+numReplicasUpdated]);
			numReplicasUpdated++;
			while(numReplicasUpdated<numReplicas){
				//Kill old replica
				var killRep = {
					kind: "Sepukku",
					idServer: servers[1].id
				}
				pubSocket.send(JSON.stringify(killRep));
				servers.splice(1,1); //Delete server
				//Compute state transformation (if needed)
				if(transformedState==undefined){
					//Transform state
					//in this case no transfomation is needed
					transformedState = lastTransferedState;
				}
				//Launch new replica
				child = fork(msg.fileName,[msg.service, 2.0, '127.0.0.1', 6040+numReplicasUpdated, '127.0.0.1', 5000, '127.0.0.1', 6060+numReplicasUpdated]);
				numReplicasUpdated++;
				//Fallo de réplica nueva
				//Fallo del primario
			}
			//Wait for new servers to register
			setTimeout(function(){
				if(!failover){
				//Force primary to fail to select new replica
				failover=true;
				forcePrimaryfailover(msg.service,0);
			}
			},1000);
			//transformedState = undefined;
			//Gestionar la actualizacion haciendo que la capa de pertenencia sea consciente del estado y actualice su estado cada 
			//vez que el primario se lo dice. Como si fuera una replica más.
			break;
	}
	
});

//Getting domain reply
reqSocketDN.on('message',function(reply){
	var answer = JSON.parse(reply);
	if(answer.result=='positive'){console.log("Primary was registered");}
	else{
		//If we got a negative response we must ask again
		var retry = {
				kind : "Register",
				service: answer.service,
				id: servers[0].id,
				address:servers[0].repAd,
				port:servers[0].repPo
			};
			reqSocketDN.send(JSON.stringify(retry));
	}
});

//Processins state updates
subSocket.on('message',function(msg){
	processUpdate(msg);
});

//Functions
var searchServerIndex = function(id){
	for(i = 0;i<servers.length;i++){
		if(servers[i].id==id)return i;
	}
	return -1;
};

var processUpdate = function(update){
    var msg = JSON.parse(update);
    switch(msg.kind){
        case 'buy':
            shop[msg.position].quantity-=msg.quantity;
            break;
        case 'return':
            shop[msg.position].quantity+=msg.quantity;
            break;
        case 'create':
            shop.push(msg.item);
            break;
        case 'delete':
            shop.splice(msg.position,1);
            break;
    }
}

var forcePrimaryfailover = function(service,id){
	if(servers.length<=1){
		console.log("Just one server remaining, can't force failure");
		return;
	}
	if(id==0){
		console.log("**Primary is dead. New election is comming**\n");			
		servers.splice(0,1); //Delete primary			
		//Notify servers
		var notify = {
			kind: "newPrimary",
			idPrimary: servers[0].id,
			subPriAd: servers[0].pubAd,
			subPriPo: servers[0].pubPo
		};
		pubSocket.send(JSON.stringify(notify));
		//Reconfigure own subSocket
		subSocket.close();
		subSocket = zmq.socket('sub');
		subSocket.connect('tcp://'+servers[0].pubAd+':'+servers[0].pubPo);
		subSocket.subscribe('');
		//Notify DNS
		commMsg = {
			kind : "Register",
			service: service,
			id: servers[0].id,
			address:servers[0].repAd,
			port:servers[0].repPo
		};
		reqSocketDN.send(JSON.stringify(commMsg));
		repSocket.send("Failover started");
	}else{
		var position = searchServerIndex(id);
		if(position==-1){
			repSocket.send("Failover failed");
		}else{
			servers.splice(position,1); //Delete server
			var killRep = {
				kind: "Sepukku",
				idServer: id
			}
			pubSocket.send(JSON.stringify(killRep));
			repSocket.send("Failover started");
		}
	}
};