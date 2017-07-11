# Pure Rabbit Version from Spark-Server

This project is based on the famous 

[https://github.com/Brewskey/spark-protocol]()

To use the SparkServer in an own installation (or multiserver) installation it's hard to interface with the existing API (which is designed for MultiUser, Multi Company, MultiEnd support).

This implementation Provides a Server which interfaces **only using a messagequeue**.

## Implementation

Interface is provided

* Events using incoming EventQueues based on the EventNames
* An instance (of Spark-Rabbit) initialize with an incomming Queue to send Actions to a particle

This repository provides a Client Libary to access the Server using an existing Rabbit instance

Additional Ìnformations

* Usermanagment is reduced to one user (named '```admin```'). The user is created (if needed)
* On startup all devices with a .pub.pem file  in ```./data/deviceKeys``` directory will be claimed or prepared to this user

Note: The System is able to start with plain Database (empty DB directory) and will create users and devices automatically. (Please note: DeviceKeys and ServerKey are needed on the specific locations)

Note: Starting with an empty database directory is sometimes needed, if the server crashes by accessing the Database (cause of changed database layer) 

## Installation

At first use the Server using Docker. A Rabbitinstance needs to running on docker

