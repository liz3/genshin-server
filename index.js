const http = require("http")
const https = require("https");
const fs = require('fs');
const { Resolver } = require('dns');
const resolver = new Resolver();
resolver.setServers(['1.1.1.1']);
/*
hk4e-api-os.mihoyo.com
*/

const express = require('express');
const app = express();

const EXCEPT_HEADERS = ["host"]

// app.use(function (req, res, next) {
//     if (req.is('application/json') || req.is("text/*") || req.headers["content-type"].includes("application/json") || req.headers["content-type"].includes("text/")) {
//         req.rawBody = '';
//         req.canPrint = true;
//         req.setEncoding('utf8');

//         req.on('data', function (chunk) {
//             req.rawBody += chunk;
//         });

//         req.on('end', function () {
//             next();
//         });
//     } else {
//         next();
//     }
// });

const mutator = (req, data) => {
    if (req.originalUrl === "/hk4e_global/mdk/shield/api/verify?") {
        const asString = data.toString('utf-8');
        const f = Buffer.from(asString.replace("A****@liz3.net", "IM THE ONLY GOD HERE"))
        return f;
    } 
       
    return data
}
const options = {
    pfx: fs.readFileSync('cert/openssl.pfx'),
    passphrase: '123123123'
};
let count = 0;

const getBody = (req, id) => {
    return new Promise(resolve => {
        const data = [];
        req.on('data', chunk => {
            data.push(chunk)
        })
        req.on('end', () => resolve(Buffer.concat(data)))
    })
}
app.all("/*", async (req, res) => {
    if (req.hostname === "log-upload-os.mihoyo.com") {
        res.json({ code: 0 })
        return;
    }


    const id = count;
    count++;
    const data = await getBody(req, id);


    // if(req.originalUrl.includes("/query_cur_region?version=OSRELWin2.0.0"))
    //     req.originalUrl = req.originalUrl.replace("binary=1", "binary=2")

    if (data.length > 0)
        console.log(`REQ[${id}] ${req.method} => ${req.hostname}${req.originalUrl}[${req.headers['content-type'] || 'unknown'}]:\n${data.toString('utf-8').split('\n').map(e => `\t${e}`).join('\n')}\n`);
    else
        console.log(`REQ[${id}] ${req.method} => ${req.hostname}${req.originalUrl}[${req.headers['content-type'] || 'unkown'}]:\n--BODY REDACTET--\n`);

    const requestModul = req.protocol === "https" ? https : http;

    const proxiedHeaders = {};


    for (const headerKey in req.headers) {
        if (EXCEPT_HEADERS.includes(headerKey.toLowerCase())) continue;
        proxiedHeaders[headerKey] = req.headers[headerKey]
    }

    const request = requestModul.request({
        port: req.protocol === "https" ? 443 : 80,
        host: req.hostname,
        path: req.originalUrl,
        method: req.method,
        agent: new requestModul.Agent({
            lookup: (hostname, opts, cb) => {
                resolver.resolve4(hostname, (err, addresses) => {
                    if (err) {
                        console.error("dns err", err, opts)
                        cb(err, null, null);
                        return;
                    }
                    cb(null, addresses[0], 4);
                });
            }
        }),
        headers: proxiedHeaders
    }, requestResponse => {
        res.status(requestResponse.statusCode);
        let isPrintable = false;
        for (const respHeaderKey in requestResponse.headers) {
            if (EXCEPT_HEADERS.includes(respHeaderKey.toLowerCase())) continue;

            if (respHeaderKey.toLowerCase() === "content-type") {
                const value = requestResponse.headers["content-type"];
                isPrintable = value && (value.includes("text/plain") || value.includes("application/json") || value.includes("text/html"));
            }
            res.set(respHeaderKey, requestResponse.headers[respHeaderKey]);
        }
        const respData = [];
        if (!isPrintable)
            console.log(`RES[${id}] status ${requestResponse.statusCode}[${requestResponse.headers['content-type']}]`)
        requestResponse.on('data', data => { 
           respData.push(data)
        });
        requestResponse.on("end", () => {
            const transformed = mutator(req, Buffer.concat(respData))
            res.set("content-length", transformed.byteLength)
            res.write(transformed)
            
            if (isPrintable)
                console.log(`RES[${id}] status ${requestResponse.statusCode}[${requestResponse.headers['content-type']}\n\t${transformed.toString('utf-8')}]`)

            res.end();
        })
    });
    request.on("error", err => {
        console.error(`REQ[${id}]`, err);
        res.end()
    })
    if (req.canPrint) {
        request.write(req.rawBody);
    } else {
        request.write(data)

    }
})
http.createServer(app).listen(80);
https.createServer(options, app).listen(443);