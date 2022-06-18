import axios from 'axios'
import { exec } from 'child_process'
import dotenv  from "dotenv"
import { client, v1 } from '@datadog/datadog-api-client'

dotenv.config()
const configuration = client.createConfiguration()
const apiInstance = new v1.EventsApi(configuration)


const SERVER = 'http://localhost:8000'
const CONNECTION_ID = '47393f4b-2d3e-452f-9d2a-f3e01e1240b2'


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function shutdown(callback){
    exec('shutdown now', function(error, stdout, stderr){ callback(stdout) })
}

async function main() {
    let serverReady = false

    console.log(`Test: ${process.env.DATADOG_KEY}`)

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
            console.log(status?.data?.attempts[0]?.attempt)
            jobRunning = false

            const params = {
                body: {
                  title: "Airbyte Sync Ran Successfully",
                  text: JSON.stringify(status?.data?.attempts[0]?.attempt),
                },
              }
        
            apiInstance
            .createEvent(params)
            .then((data) => {
                console.log(
                "API called successfully. Returned data: " + JSON.stringify(data)
                );
            })
            .catch((error) => console.error(error))
        
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