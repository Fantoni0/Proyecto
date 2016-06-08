#Bacherlor's Degree Final Work

##What is this?
A repository where I will upload the code of my BDFW (Bacherlor's Degree Final Work). 
My BDFW is about updating distributed services based on passive model replication, also known as the primary-backup approach.
As part of my work I am developing a demo to show my updating algorithm in action. A simple one with basic client/server interaction. Some premises are supossed to facilitate the development of the distributed system becasuse the goal of my BDFW is not to develop a completely real primary-backup service. My goal is to develop an effective way to update those systems without interrupting the service.

##Files
- auxfunctions.js: Auxiliar functions library.

- belongingLayer.js: Centralized belongingLayer. It has the control of how many copies are launched and it handles primary's failover. (It does what a distributed system shoul do in a centralized way, as mentioned above developing a complete Distributed system is not the aim of this project).

- client.js: Simple client to interact with servers. 

- server.js:  The real thing. The back-ups. One acts as a primary and the rest as back-up. 

- failover.js: Simple piece of code to start the simulation of primary's failover.

- launcher.sh: Script to launch the demo