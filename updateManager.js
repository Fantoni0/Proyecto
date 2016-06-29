//Update Manager

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
var fork = require('child_process').fork;
var count = 1;
var servers;
var services = {}; //HashTable to register servers
var versions = {}; //Hashtable to register versions
var version; //Initial version
var repSocket, pubSocket;
var repSocketAddress,repSocketPort,pubSocketAddress,pubSocketPort;
var reqSocketDN, reqDomainNameAddress, reqDomainNamePort;

//Algortihm's variables
var numReplicas;
var numReplicasUpdated,numRepLaunched;
var updatingAlgorithmRunning = false;
var newRepFailed;
var failover = false;
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

reqSocketDN = zmq.socket('req');
repSocket.bindSync('tcp://'+repSocketAddress+':'+repSocketPort);
pubSocket.bindSync('tcp://'+pubSocketAddress+':'+pubSocketPort);
reqSocketDN.connect('tcp://'+reqDomainNameAddress+':'+reqDomainNamePort);

//Listening requests
repSocket.on('message',function(data){
	var msg = JSON.parse(data);
	switch(msg.text){
		case "I am a new server":
			updateServices(msg.service,msg.fileName);
			//Registering server configuration.
			servers.push({id:count,
						  pubAd:msg.pubAd,
						  pubPo:msg.pubPo,
						  repAd:msg.repAd,
						  repPo:msg.repPo,
						  version:version
			});
			//Crafting response
			var res = {
				idServer: count,
				isPrimary: servers.length==1,
				subPriAd: servers[0].pubAd,
				subPriPo: servers[0].pubPo,
				repPriAd: servers[0].repAd,
				repPriPo: servers[0].repPo,
				subLayAd: pubSocketAddress,
				subLayPo: pubSocketPort                                 
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
			}
			count++;
			repSocket.send(JSON.stringify(res));
			break;
		case "Force failover":
			repSocket.send("Failover started");
			forcePrimaryfailover(msg.service, msg.serverId);
			break;
		case "Start update":
			repSocket.send("Started algortihm");
			updatingAlgorithmRunning = true;
			numReplicas = servers.length;
			numReplicasUpdated = 0;
			numRepLaunched = 0;
			newRepFailed = 0;
			failover = false;
			var child; 
			child = fork(msg.fileName,[msg.service, '127.0.0.1', 6040+numRepLaunched, '127.0.0.1', 5000, '127.0.0.1', 6060+numRepLaunched]);
			numReplicasUpdated++;
			numRepLaunched++;
			launchNewReplica(msg.fileName, msg.service);
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


//Functions
var searchServerIndex = function(id){
	for(i = 0;i<servers.length;i++){
		if(servers[i].id==id)return i;
	}
	return -1;
};

var forcePrimaryfailover = function(service,id){
	if(servers.length<=1){
		console.log("Just one server remaining, can't force failure");
		return;
	}

	if(id==0){
		console.log("**Primary is dead. New election is comming**\n");
		servers.splice(0,1); //Delete primary
		var ind = searchOldReplica(service);
		if(ind==-1)failover=true; // If there is no old replicas the failover already occurred
		//Notify servers
		var notify = {
			kind: "newPrimary",
			idPrimary: servers[0].id,
			subPriAd: servers[0].pubAd,
			subPriPo: servers[0].pubPo
		};
		pubSocket.send(JSON.stringify(notify));
		//Notify DNS
		commMsg = {
			kind : "Register",
			service: service,
			id: servers[0].id,
			address:servers[0].repAd,
			port:servers[0].repPo
		};
		reqSocketDN.send(JSON.stringify(commMsg));
	}else{
		var position = searchServerIndex(id);
		if(position==-1){
			console.log("Impossible to find the replica. Check the ID");
		}else{
			if(updatingAlgorithmRunning){
				if(servers[position].version==version){
					newRepFailed++;
					numReplicasUpdated--;
					console.log("NEW REP FAILED");
				}
			}
			servers.splice(position,1); //Delete server
			var killRep = {
				kind: "Sepukku",
				idServer: id
			}
			pubSocket.send(JSON.stringify(killRep));	
		}
	}
};

//Search for repicas with a previous version
var searchOldReplica = function(service){
	var lastVersion = version;
	for(i=1;i<servers.length;i++){
		if(servers[i].version<lastVersion){
			return i;
		}
	}
	if(servers[0].version<lastVersion){return 0;}
	return -1;
}

//Update services
var updateServices = function(service, vers){
	//console.log("Service: "+service+". Vers: "+vers);
	if(services[service]==undefined){
		services[service] = [];
		versions[[service,vers]] = 1;
		versions[service] = 1;
		version = versions[service];
	}
	if(versions[[service,vers]]==undefined){
		versions[[service,vers]] = 1;
		version = versions[service];  
		versions[service] = ++version;
	}
	servers = services[service];
}

//Launch new replica
var launchNewReplica = function(fileName, service){
	//console.log("FN: "+fileName+". Service: "+service);
	if(numReplicasUpdated<numReplicas){
		child = fork(fileName,[service,'127.0.0.1', 6040+numRepLaunched, '127.0.0.1', 5000, '127.0.0.1', 6060+numRepLaunched]);
		numReplicasUpdated++;
		numRepLaunched++;
	}
	var auxKill = function(){
		killOldReplica(fileName,service);
	}
	setTimeout(auxKill,500);
}

//Ki ll old replica
var killOldReplica = function(fileName,service){
	var ind = searchOldReplica(service);
	var auxLaunch = function(){
		launchNewReplica(fileName,service);
	}
	if(ind > 0){
		var killRep = {
			kind: "Sepukku",
			idServer: servers[ind].id
		}
		pubSocket.send(JSON.stringify(killRep));
		servers.splice(ind,1); //Delete server
	}
	while(newRepFailed>0){
		child = fork(fileName,[service,'127.0.0.1', 6040+numRepLaunched, '127.0.0.1', 5000, '127.0.0.1', 6060+numRepLaunched]);
		numRepLaunched++;
		numReplicasUpdated++;
		newRepFailed--;
	}
	if(numReplicasUpdated<numReplicas){
		setTimeout(auxLaunch,500);
	}else{
		if(!failover){
			forcePrimaryfailover(service,0);
		}
		updatingAlgorithmRunning = false;
	}
}

