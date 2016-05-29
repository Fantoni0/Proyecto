//Belonging Layer

//Import packages
var zmq = require('zmq');
var aux = require('./auxFunctions.js');

//Variables
var count = 1;
var servers;
var services = {} //HashTable to register 
var repSocket, pubSocket;
var repSocketAddress,repSocketPort,pubSocketAddress,pubSocketPort;

//Get arguments
var arg = process.argv;
if(arg.lenght<5){
	console.log("Incorrect number of arguments.Expected format:\n \
		nodejs belongingLayer.js <repSocketAddress> <repSocketPort> <pubSocketAddress> <pubSocketPort>");
}

//Create and bind sockets
repSocket = zmq.socket('rep');
pubSocket = zmq.socket('pub');
repSocket.bindSync('tcp://'+repSocketAddress+":"+repSocketPort,aux.errorBinding(err,'REP'));
pubSocket.bindSync('tcp://'+pubSocketAddress+":"+pubSocketPort,aux.errorBinding(err,'PUB'));

//Registering new servers
repSocket.on('message',function(data){
	var msg = JSON.parse(data);
	if(msg.text=='I am a new Server'){
		if(services[msg.service]==undefined){
			services[msg.service]=[];
			servers = services[msg.service];
		}
		//Registering server configuration.
		servers.push({id:count,pubAd:msg.pubAd,pubPo:msg.pubPo});
		//Crafting response
		var res = {
			idServer: count,
			isPrimary: (servers.lenght==1),
			subPriAd: servers[0].pubAd,
			subPriPo: servers[0].pubPo,
			subLayAd: pubSocketAddress,
			subLayPo: pubSocketPort
		};
		count++;
		repSocket.send(JSON.stringify(res));
	}else if(msg.text=='Force failover'){
		//Primary is dead. Long live to the primary.
		servers.splice(1,1); //Delete primary
		var msg = {
			idPrimary: servers[0].id,
			subPriAd: servers[0].pubAd,
			subPriPo: servers[0].pubPo
		};
		pubSocket.send(JSON.stringify(msg));
	}
});





