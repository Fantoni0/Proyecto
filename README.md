#Bacherlor's Degree Final Work

##What is this?
A repository where I will upload the code of my BDFW ((Bacherlor's Degree Final Work). 
My BDFW is about updating distributed services based on passive model replication, also known as the primary-backup approach.

As part of my work I am developing a demo to show my updating algorithm in action. It's a simple one with basic client/server interaction. Some premises are supossed to facilitate the development of the distributed system. The reason is that the goal of my BDFW is not to develop a completely real primary-backup service. My goal is to develop an effective way to update those systems without interrupting the service.

The service emulates a simple distributed shop which accepts client's requests.

##Files

- auxfunctions.js: Auxiliar functions library.

- domainName.js: Acts like a a DNS for the service. Any client should request domainName.js for the primary's address. It is assumed the DNs is replicated in case of failure.

- updateManager.js: It has the control of how many copies are launched and it handles failures if the occur. (It does what a distributed system shoul do in a centralized way, as mentioned above developing a complete distributed system is not the aim of this project).

- client.js: Simple client to interact with servers. It makes a random request (buy, return, get getAll).

- administrator.js: Special client to to add/remove items from the shop.

- server.js:  The real thing. The back-ups. The primary answer client's requests and propagates the changes to all the back-ups. This version has a little error created on purpose. It is just a functionality error.

- server2.js:  A new version server.js but solves the error. It solves the previous error.

- server3.js:  A newer version of server.js, it solves the previously mentioned error and updates its own state proving backwards compatibility.

- failover.js: Simple piece of code to start the simulation of primary's failover.

- initiateUpdate.js: Special client to start the update process.

- launcher.sh: Script to launch the demo.

- primaryFails.sh: Script to test the updating algorithm under certain conditons. 
