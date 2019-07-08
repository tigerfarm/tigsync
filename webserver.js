// -----------------------------------------------------------------------------
console.log("+ Start.");

// $ npm install --save express
const express = require('express');
var app = express();

// $ npm install --save twilio
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

// To manage Sync data.
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const syncServiceSid = process.env.SYNC_SERVICE_SID;
//
const useridentity = 'webserver';

// -----------------------------------------------------------------------------
app.get('/syncdocumentupdate', function (request, response) {
    //
    // http://localhost:8000/syncdocumentupdate?identity=aclient&name=abc&value=X
    //
    var userIdentity = '';
    if (request.query.identity) {
        userIdentity = request.query.identity;
    } else {
        response.send({message: '- Identity required.'});
        return;
    }
    var syncDocumentUniqueName = '';
    if (request.query.name) {
        syncDocumentUniqueName = request.query.name;
    } else {
        response.send({message: '- Error: Sync document name is required.'});
        return;
    }
    if (request.query.value) {
        syncDataValue = request.query.value;
    } else {
        response.send({message: '- Error: Sync Data Value is required.'});
        return;
    }
    var theBoard = [["X","",""],["",syncDataValue,""],["","","X"]];
    let theData = {"useridentity":userIdentity,"name":syncDocumentUniqueName,"board":theBoard};
    console.log("++ Update Sync Service:Document:data: " + syncServiceSid + ":" + syncDocumentUniqueName + ":" + JSON.stringify(theData));
    client.sync.services(syncServiceSid).documents(syncDocumentUniqueName)
            .update({data: theData})
            .then((sync_item) => {
                console.log("+ Updated counter: " + sync_item.uniqueName + " counter = " + syncDataValue);
                response.send('+ ' + userIdentity + ', updated tic tac sync document, ' + syncDocumentUniqueName + ', value to: ' + syncDataValue);
            }).catch(function (error) {
        console.log("- " + error);
                response.send('- Error updating tic tac sync document.');
        // callback("- " + error);
    });
});

app.get('/token', function (request, response) {
    // Docs: https://www.twilio.com/docs/sync/identity-and-access-tokens
    var userIdentity = '';
    if (request.query.identity) {
        userIdentity = request.query.identity;
    } else {
        response.send({message: '- Identity required.'});
        return;
    }
    var tokenPassword = '';
    if (request.query.password) {
        tokenPassword = request.query.password;
        if (tokenPassword !== process.env.TOKEN_PASSWORD) {
            response.send({message: 'Identity or Password not valid.'});
            return;
        }
    } else {
        response.send({message: '- Password required.'});
        return;
    }
    console.log('+ userIdentity: ' + userIdentity);
    var syncGrant = new SyncGrant({
        serviceSid: process.env.SYNC_SERVICE_SID
    });
    // Need to test: ttl.
    var token = new AccessToken(
            process.env.ACCOUNT_SID,
            process.env.API_KEY,
            process.env.API_KEY_SECRET
            );
    token.addGrant(syncGrant);
    token.identity = userIdentity;
    response.send({
        message: '',
        identity: userIdentity,
        token: token.toJwt()
    });
    // Reset, which requires the next person to set their identity before getting a token.
    userIdentity = '';
});

// -----------------------------------------------------------------------------
// Serve static web pages
//
app.use(express.static('docroot'));
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500).send('HTTP Error 500.');
});

// const path = require('path');
const PORT = process.env.PORT || 8000;
app.listen(PORT, function () {
    console.log('+ Listening on port: ' + PORT);
});
