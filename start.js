const express = require('express')
const fs = require('fs')
const path = require('path');
const FileSystem = require("fs");
const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
    const logFilePath = path.join(__dirname, 'log.log');
    //read file initially
    fs.readFile(logFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).send('Error reading log file');
        }
        const result = parser(data)
        console.log(result)
        writeToFile(result);
    });
    //listen to changes in file
    fs.watch('log.log', function (event, filename) {
        console.log('event is: ' + event);
        if (filename) {
            console.log('filename provided: ' + filename);
            //changes detected, read file again
            fs.readFile(logFilePath, 'utf8', (err, data) => {
                if (err) {
                    return res.status(500).send('Error reading log file');
                }
                parser(data)
                const newResult = parser(data)
                console.log(newResult)
                writeToFile(newResult);
            })
        } else {
            console.log('filename not provided');
        }
    });
})

function writeToFile(data){
    FileSystem.writeFile('save.json', JSON.stringify(data), (error) => {
        if (error) throw error;
      });
}
//Parser function
function parser(data){
    //seperate objects
    const queries = [];
    var lines = data.split('\n');
    //current object
    let currentQuery = {};
    //removes first 3 lines
    if(lines[0].startsWith('/sbin')){
        lines=lines.slice(3)
    }
    lines.forEach(line => {
        switch(true) {
            case line.startsWith('# Time:'):
                if (Object.keys(currentQuery).length > 0) {
                    queries.push(currentQuery);
                }
                currentQuery = {};
                currentQuery.time = line.replace('# Time:', '').trim();
                break;
            case line.startsWith('# User@Host:'):
                currentQuery.userHost = line.replace('# User@Host:', '').trim();
                break;
            case line.startsWith('# Schema:'):
                //S non-spaces, s spaces, d digits, * 0or more, + 1or more
                const schemaData = line.match(/Schema: (\S*)\s+Last_errno: (\d+)\s+Killed: (\d+)/);
                currentQuery.schema = schemaData ? schemaData[1] : '';
                currentQuery.lastErrno = schemaData ? schemaData[2] : '';
                currentQuery.killed = schemaData ? schemaData[3] : '';
                break;
            case line.startsWith('# Query_time:'):
                const metrics = line.match(/Query_time: (\S+)\s+Lock_time: (\S+)\s+Rows_sent: (\d+)\s+Rows_examined: (\d+)\s+Rows_affected: (\d+)/);
                if (metrics) {
                    currentQuery.queryTime = metrics[1];
                    currentQuery.lockTime = metrics[2];
                    currentQuery.rowsSent = metrics[3];
                    currentQuery.rowsExamined = metrics[4];
                    currentQuery.rowsAffected = metrics[5];
                }
                break;
            case line.startsWith('# Bytes_sent:'):
                currentQuery.bytesSent = line.match(/Bytes_sent: (\d+)/)[1];
                currentQuery.tmpTables = line.match(/Tmp_tables: (\d+)/)[1];
                currentQuery.tmpDiskTables = line.match(/Tmp_disk_tables: (\d+)/)[1];
                currentQuery.tmpTableSizes = line.match(/Tmp_table_sizes: (\d+)/)[1];
                break;
            case line.startsWith('# QC_Hit:'):
                currentQuery.qcHit = line.match(/QC_Hit: (\S+)/)[1];
                currentQuery.fullScan = line.match(/Full_scan: (\S+)/)[1];
                currentQuery.fullJoin = line.match(/Full_join: (\S+)/)[1];
                currentQuery.tmpTable = line.match(/Tmp_table: (\S+)/)[1];
                currentQuery.tmpTableOnDisk = line.match(/Tmp_table_on_disk: (\S+)/)[1];
                break;
            case line.startsWith('# Filesort:'):
                currentQuery.qcHit = line.match(/Filesort: (\S+)/)[1];
                currentQuery.filesortOnDisk = line.match(/Filesort_on_disk: (\S+)/)[1];
                currentQuery.mergePasses = line.match(/Merge_passes: (\S+)/)[1];
                break;
            case line.startsWith('# Log_slow_rate_type:'):
                currentQuery.logSlowRateType = line.match(/Log_slow_rate_type: (\S+)/)[1];
                currentQuery.logSlowRateLimit = line.match(/Log_slow_rate_limit: (\d+)/)[1];
                break;
            case line.startsWith('use'):
                currentQuery.db = line.trim();
                break;
            case line.startsWith('SET timestamp='):
                currentQuery.timestamp = line.match(/SET timestamp=(\d+);/)[1];
                break;
            case (line.trim().length > 0 && !line.startsWith('#') && !line.startsWith('at desc limit')):
                currentQuery.query = (currentQuery.query || '') + line.trim() + ' ';
                break;
          }          
    })
    if (Object.keys(currentQuery).length > 0) {
        queries.push(currentQuery);
    }
    return queries;
}