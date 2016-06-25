//Update Manager

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
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
var numReplicasUpdated;
var updatingAlgorithmRunning = false;
var oldRepFailed, newRepFailed;
var failover = false;
var newRepRegistered;
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
			newRepRegistered++;
			if(newRepRegistered==numReplicas){updatingAlgorithmRunning=false;}
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
			forcePrimaryfailover(msg.service, msg.serverId);
			break;
		case "Start update":
			updatingAlgorithmRunning = true;
			updateServices(msg.service,msg.fileName);
			numReplicas = servers.length;
			numReplicasUpdated = 0;
			oldRepFailed = 0;
			newRepFailed = 0;
			var fork = require('child_process').fork;
			var child; 
			repSocket.send("Started algortihm");
			child = fork(msg.fileName,[msg.service, '127.0.0.1', 6040+numReplicasUpdated, '127.0.0.1', 5000, '127.0.0.1', 6060+numReplicasUpdated]);
			numReplicasUpdated++;
			while(numReplicasUpdated<numReplicas){
				//If an old replica died, no need to shut it down
				if(oldRepFailed<=0){
					//Kill old replica
					var killRep = {
						kind: "Sepukku",
						idServer: servers[1].id
					}
					pubSocket.send(JSON.stringify(killRep));
					servers.splice(1,1); //Delete server
				}else{oldRepFailed--;}
				//Check if a new replica died

				//Launch new replica
				child = fork(msg.fileName,[msg.service,'127.0.0.1', 6040+numReplicasUpdated, '127.0.0.1', 5000, '127.0.0.1', 6060+numReplicasUpdated]);
				numReplicasUpdated++;
				//Fallo de réplica nueva
			}
			//Wait for new servers to register
			while(newRepFailed>0){
					child = fork(msg.fileName,[msg.service,'127.0.0.1', 6040+numReplicasUpdated, '127.0.0.1', 5000, '127.0.0.1', 6060+numReplicasUpdated]);
					newRepFailed--;
					console.log("EXTRA REP WAS LAUNCHED");
			}
			setTimeout(function(){
				//Force primary to fail to select new replica
				if(!failover){
					forcePrimaryfailover(msg.service,0);
				}
			},1000);
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
	console.log("-------------------------------Algorithm is RUNNING: "+updatingAlgorithmRunning);
	if(servers.length<=1){
		console.log("Just one server remaining, can't force failure");
		return;
	}

	if(id==0){
		console.log("**Primary is dead. New election is comming**\n");
		//If a the primary fails during the execution of the Algorithm

		if(updatingAlgorithmRunning){
			var index = searchOldReplica(service);
			console.log("INDEX: "+index);
			if(index!=-1){
				//Put the old server in the first position of the array
				var aux = servers[index];
				servers.splice(index,1);
				servers.unshift(aux);
				oldRepFailed++;
			}else{
				failover = true
			}
		}
		servers.splice(0,1); //Delete primary			
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
		repSocket.send("Failover started");
	}else{
		var position = searchServerIndex(id);
		if(position==-1){
			repSocket.send("Failover failed");
		}else{
			if(updatingAlgorithmRunning){
				if(servers[position].version<version){
					oldRepFailed++;
				}else{
					newRepFailed++;
				}
			}
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

//Search for repicas with a previous version
var searchOldReplica = function(service){
	var lastVersion = version;
	for(i=0;i<servers.length;i++){
		if(servers[i].version<lastVersion){
			return i;
		}
	}
	return -1;
}

//Update services
var updateServices = function(service, version){
	if(services[service]==undefined){
		services[service] = [];
		versions[[service,version]] = 1;
		versions[service] = 1;
		version = versions[service];
	}
	if(versions[[service,version]]==undefined){
		versions[[service,version]] = 1;
		version = versions[service];  
		versions[service] = ++version;
	}
	servers = services[service];
}