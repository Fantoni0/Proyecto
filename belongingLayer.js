//Update Manager

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions');

//Variables
var count = 1;
var servers;
var services = {} //HashTable to register 
var repSocket, pubSocket;
var repSocketAddress,repSocketPort,pubSocketAddress,pubSocketPort;
var reqSocketDN, reqDomainNameAddress, reqDomainNamePort;

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

//Registering new servers
repSocket.on('message',function(data){
	var msg = JSON.parse(data);
	if(msg.text=='I am a new Server'){
		if(services[msg.service]==undefined){
			services[msg.service]=[];
			servers = services[msg.service];
		}
		//Registering server configuration.
		servers.push({id:count,pubAd:msg.pubAd,pubPo:msg.pubPo,repAd:msg.repAd,repPo:msg.repPo});
		//Crafting response
		var res = {
			idServer: count,
			isPrimary: servers.length==1,
			subPriAd: servers[0].pubAd,
			subPriPo: servers[0].pubPo,
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
	}else if(msg.text=='Force failover'){
		if(msg.serverId==0){
			//Primary is dead. Long live to the primary.
			console.log("**Primary is dead. New election is comming**\n");
			servers.splice(1,1); //Delete primary
			//Notify servers
			var msg = {
				kind: "newPrimary",
				idPrimary: servers[0].id,
				subPriAd: servers[0].pubAd,
				subPriPo: servers[0].pubPo
			};
			pubSocket.send(JSON.stringify(msg));
			//Notify DNS
			commMsg = {
				kind : "Register",
				service: msg.service,
				id: servers[0].id,
				address:servers[0].repAd,
				port:servers[0].repPo
			};
			reqSocketDN.send(JSON.stringify(commMsg));
		}else{
			var killRep = {
				kind: "Sepukku",
				idServer: msg.serverId
			}
			pubSocket.send(JSON.stringify(killRep));
		}
	}else if(mag.text=='Start update'){
		var numReplicas = servers.length;
		var numReplicasUpdated = 0;
		var failover = false;
		var exec = require('child_process').exec;
		var child;
		while(numReplicasUpdated<numReplicas){
			//Kill old replica
			var killRep = {
				kind: "Sepukku",
				idServer: servers[numReplicas].id
			}
			pubSocket.send(JSON.stringify(killRep));
			child = exec('node server.js Prueba 2.0 127.0.0.2 6001 127.0.0.1 5000 127.0.0.2 $((6020+number))');
			numReplicasUpdated++;
		}
		if(!failover){

			failover=true;
		}

	}

});