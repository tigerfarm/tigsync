// -----------------------------------------------------------------------------
console.log("+ Start.");

// $ npm install --save express
const express = require('express');
var app = express();

// $ npm install --save twilio
var AccessToken = require('twilio').jwt.AccessToken;
var SyncGrant = AccessToken.SyncGrant;

const clientSync = require('twilio-sync');

// -----------------------------------------------------------------------------
// Client functions 

function logger(message) {
    console.log("+ " + message);
}

var thisIdentity = '';
var thisSyncClientObject;
var thisSyncDocumentObject;

var thisTokenPassword;
var thisSyncDocumentName;

var userIdentity = process.argv[2] || "";
if (userIdentity !== "") {
    console.log("+ User identity: " + userIdentity);
}
var thisTokenPassword = process.argv[3] || "";
if (thisTokenPassword !== "") {
    console.log("+ User password: " + thisTokenPassword);
    if (thisTokenPassword !== process.env.TOKEN_PASSWORD) {
        console.log('Error: Password not valid.');
        thisTokenPassword = '';
    }
}
var thisSyncDocumentName = process.argv[4] || "";
if (thisSyncDocumentName !== "") {
    console.log("+ Sync document name: " + thisSyncDocumentName);
}

if (userIdentity !== '' && thisTokenPassword !== '' && thisSyncDocumentName !== '') {
    console.log("++ Have the parameters to sync the document.");
    var theUpdateToken = generateSyncToken();
    if (theUpdateToken === '') {
        logger("- Error: generate token failed.");
        process.exit();
    }
    createSyncObject(theUpdateToken);
}

console.log("+ Exit.");
process.exit();

function generateSyncToken() {
    if (process.env.SYNC_SERVICE_SID === "") {
        logger("Required: Twilio Sync service SID environment variable.");
        return '';
    }
    if (process.env.ACCOUNT_SID === "") {
        logger("Required: Twilio account SID environment variable.");
        return '';
    }
    if (process.env.API_KEY === "") {
        logger("Required: Twilio API key environment variable.");
        return '';
    }
    if (process.env.API_KEY_SECRET === "") {
        logger("Required: Twilio API key secret environment variable.");
        return '';
    }
    console.log('+ userIdentity: ' + userIdentity);
    var syncGrant = new SyncGrant({
        serviceSid: process.env.SYNC_SERVICE_SID
    });
    logger("Generate token.");
    // Need to test: ttl.
    var token = new AccessToken(
            process.env.ACCOUNT_SID,
            process.env.API_KEY,
            process.env.API_KEY_SECRET
            );
    token.addGrant(syncGrant);
    token.identity = userIdentity;
    var theToken = token.toJwt();
    logger("Generate token: " + theToken);
    return theToken;
}

function createSyncObject(token) {
    logger('Create Sync object.');
    // thisSyncClientObject = new Twilio.Sync.Client(tokenResponse.token, { logLevel: 'info' });
    // thisSyncClientObject = clientSync.Client.create(token);
    clientSync.Client.create(token).then(theClient => {
        logger('The Client is created.');
    });
    //
    // ---------------------------------------------------------------------
    logger('Set Sync object events.');
    thisSyncClientObject.on('connectionStateChanged', function (state) {
        if (state === 'connected') {
            logger('Sync object event: Sync connection open.');
        } else {
            logger('Sync object event: Sync connection closed.');
            return;
        }
    });
    thisSyncClientObject.on('tokenAboutToExpire', function () {
        logger('Sync object event: tokenAboutToExpire.');
        getTokenUpdateSyncObject();
    });
    thisSyncClientObject.on('tokenExpired', function () {
        logger('Sync object event: tokenExpired.');
    });
}

function getTokenUpdateSyncObject() {
    if (thisIdentity === "") {
        logger("Required: user identity.");
        return;
    }
    if (thisTokenPassword === "") {
        logger("Required: user password.");
        return;
    }
    var theUpdateToken = generateSyncToken();
    if (theUpdateToken !== '') {
        logger("- Error: token update failed.");
        return;
    }
    // logger('Update: theUpdateToken: ' + theUpdateToken);
    thisSyncClientObject.updateToken(theUpdateToken);
    logger('Sync client object token: updated.');
}

function documentSubscribeEvents(syncDocumentName) {
    logger('Subscribe to updates for Sync document : ' + syncDocumentName);
    thisSyncDocumentObject.on('updated', function (syncEvent) {
        var thisDocumentUser = syncEvent.value.useridentity;
        var thisDocumentName = syncEvent.value.name;
        if (syncEvent.isLocal) {
            logger("Updated by self.");
        } else {
            logger("Updated by another player." + thisDocumentName + " by: " + thisDocumentUser);
        }
        // logger('Updated Sync document data: ' + JSON.stringify(syncEvent.value));
        logger('Sync document event: document updated by: ' + thisDocumentUser);
        updateGameBoard(syncEvent.value);
    });
}

function updateSyncDocument() {
    if (thisIdentity === "") {
        logger("Required: user identity.");
        return;
    }
    if (thisSyncDocumentName === "") {
        logger("Required: Game name (Sync document name).");
        return;
    }
    var currentBoard = readGameBoard();
    // logger('currentBoard JSON data: ' + JSON.stringify(currentBoard));
    thisSyncDocumentObject.set({board: currentBoard, useridentity: thisIdentity, name: thisSyncDocumentName});
}

// -----------------------------------------------------------------------------
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
