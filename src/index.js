import axios from 'axios'
import { exec } from 'child_process'
import AWS from 'aws-sdk'
import dotenv  from "dotenv"
import { v4 as uuidv4 } from 'uuid'

dotenv.config()


// AWS setup
AWS.config.update({region: 'us-west-2'});
let cwlogs = new AWS.CloudWatchLogs({apiVersion: '2014-03-28'});


const SERVER = 'http://localhost:8000'
const CONNECTION_ID = '47393f4b-2d3e-452f-9d2a-f3e01e1240b2'


async function sendEvent(payload) {
    const logGroupName = '/aws/events/airbyteSyncService'
    const logStreamName = uuidv4()

    const streamParams = {
        logGroupName: logGroupName,
        logStreamName: logStreamName
    }
    await cwlogs.createLogStream(streamParams).promise()

    for (const attempt of payload?.attempts) {
        attempt["logs"] = ''
    }

    const logParams = {
        logEvents: [ 
          {
            message: JSON.stringify(payload),
            timestamp: `${Date.now()}`
          },
        ],
        logGroupName: logGroupName,
        logStreamName: logStreamName
    };
    try {
        const res = await cwlogs.putLogEvents(logParams).promise()
        console.log(res)
    } catch (err) {
        console.log(err)
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function shutdown(callback){
    exec('shutdown now', function(error, stdout, stderr){ callback(stdout) })
}

async function main() {
    let serverReady = false

    while (!serverReady) {
        console.log(`Checking if Airbyte server is ready: ${Date.now()}`)
        const result = await axios.get(`${SERVER}/api/v1/health`).catch(err => console.log(err.message))
        if (result?.data?.available) serverReady = true
        await sleep(1000)
    }

    console.log("Airbyte server is ready. Starting sync.")
    
    // Start manual sync
    const sync = await axios
    .post(`${SERVER}/api/v1/connections/sync`, { connectionId: CONNECTION_ID })
    .catch(err => console.log(err.message))

    console.log(JSON.stringify(sync.data, null, 2))
    const jobId = sync.data.job.id
    let jobRunning = true

    // Wait for sync to complete
    while (jobRunning) {
        console.log(`Waiting for job to complete: ${Date.now()}`)
        const status = await axios
        .post(`${SERVER}/api/v1/jobs/get`, { id: jobId })
        .catch(err => console.log(err.message))
    
        if (status?.data?.job?.status !== 'running') {
            jobRunning = false
            sendEvent(status?.data)
            console.log(status?.data)
        }
        await sleep(1000)    
    }

    // Set flag for root cron to stop server
    console.log("Sync finished. Shutting down.")

    shutdown(function(output){
        console.log(output);
    });

}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})