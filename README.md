# airbyte-connection-ctl

This project contains the application and systemctl scripts for running [Web3 Analytics](http://web3analytics.network/) indexers. 

Documentation for Web3 Analytics is available [here](https://web3-analytics.gitbook.io/product-docs/).

## Installation

First, set up an Airbyte server according to [these instructions](https://docs.airbyte.com/deploying-airbyte/local-deployment/).

Download the scripts in your home directory

```shell
git clone https://github.com/andyjagoe/airbyte-connection-ctl
```

Install these [two systemctl scripts](https://github.com/andyjagoe/airbyte-connection-ctl/tree/main/scripts) so that docker will start automatically and your script will run as soon as docker has started.

Install NVM

## Configuration

Once you've logged in to your Airbyte console, add a custom connection source for Web3 Analytics. You can find the lastest version in Docker here: https://hub.docker.com/r/web3analytics/airbyte-web3analytics-source/tags.

Enter the account address for the Web3 Analytics smart contract and the json RPC URL for your node provider. 

Then, add an Airbyte S3 datalake destination that uses Parquette files. In Airbyte, add a new connection that uses Web3 Analytics as your source and your S3 datalake as the destination. 

Edit [the script](https://github.com/andyjagoe/airbyte-connection-ctl/blob/main/src/index.js#L16) and set the CONNECTION_ID to the UUID for your new connection. You can find this in the URL when you browse to your connection.


## Operation

When the server is started, the script initiates indexing as soon as Airbyte is ready to run. Once finished, it reports the results of the run and then shuts the server down.

We recommend using an automation tool to start your instance on a regular schedule as often as is needed to kep up with data indexing needs. 
