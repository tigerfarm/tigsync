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
// -----------------------------------------------------------------------------
// Client functions 

function logger(message) {
    console.log("+ " + message);
}

var theRow = 0;
var theColumn = 0;
var userIdentity = '';
var syncDocumentUniqueName = '';
var syncDataValuePosition = '';
var syncDataValue = '';

var thisSyncClientObject;
var thisSyncDocumentObject;
var thisTokenPassword;

var thisCurrentBoard = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];

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
var syncDocumentUniqueName = process.argv[4] || "";
if (syncDocumentUniqueName !== "") {
    console.log("+ Sync document name: " + syncDocumentUniqueName);
}

if (userIdentity !== '' && thisTokenPassword !== '' && syncDocumentUniqueName !== '') {
    console.log("++ Have the parameters to sync the document.");
    var theUpdateToken = generateSyncToken();
    if (theUpdateToken === '') {
        logger("- Error: generate token failed.");
        process.exit();
    }
    createSyncObject(theUpdateToken);
}

// -----------------------------------------------------------------------------
// Token generation

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
    logger("Generated token: " + theToken);
    return theToken;
}

function getTokenUpdateSyncObject() {
    if (userIdentity === "") {
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

// -----------------------------------------------------------------------------
function createSyncObject(token) {
    logger('Create Sync object.');
    thisSyncClientObject = new clientSync(token);
    // -------------------------------
    logger('Set Sync object events.');
    thisSyncClientObject.on('connectionStateChanged', function (state) {
        if (state === 'connected') {
            logger('Sync object event: Sync connection open.');
            // -------------------------------
            // Get the document and subscribe to it.
            getSyncDocumentSetBoard('subscribe');
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

function getSyncDocumentSetBoard(subscribe) {
    if (userIdentity === "") {
        logger("Required: user identity.");
        return;
    }
    if (syncDocumentUniqueName === "") {
        logger("Required: Game name.");
        return;
    }
    // -------------------------------------------------------------------------
    logger('Create Sync document object, for document: ' + syncDocumentUniqueName);
    thisSyncClientObject.document(syncDocumentUniqueName).then(function (syncDoc) {
        logger('Sync document object created for document: ' + syncDocumentUniqueName);
        thisSyncDocumentObject = syncDoc;
        var data = thisSyncDocumentObject.value;
        if (data.board) {
            logger('Sync document data loaded: ' + JSON.stringify(data));
            thisCurrentBoard = data.board;
        } else {
            logger('New game document.');
        }
        if (subscribe === 'subscribe') {
            documentSubscribeEvents(syncDocumentUniqueName);
        }
    });
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
        // updateGameBoard(syncEvent.value);
    });
}

function updateSyncDocument(theBoard) {
    if (userIdentity === "") {
        logger("Required: user identity.");
        return;
    }
    if (syncDocumentUniqueName === "") {
        logger("Required: Game name (Sync document name).");
        return;
    }
    // var currentBoard = readGameBoard();
    // theBoard = [["X", "O", "X"], ["", "O", ""], ["", "", ""]];
    logger('+ theBoard JSON data: ' + JSON.stringify(theBoard));
    thisSyncDocumentObject.set({board: theBoard, useridentity: userIdentity, name: syncDocumentUniqueName});
}

function updateGameBoard(currentBoard) {
    console.log("++ updateGameBoard, currentBoard: " + JSON.stringify(currentBoard));
    var boardSquares = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            if (theRow === row && theColumn === col) {
                boardSquares[row][col] = syncDataValue;
            } else {
                boardSquares[row][col] = currentBoard[row][col];
            }
        }
    }
    console.log("++ updateGameBoard, updatedBoard: " + JSON.stringify(boardSquares));
    return boardSquares;
}

// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// HTTP Request Handlers

// -----------------------------------------------------------------------------
app.get('/syncdocumentupdate', function (request, response) {
    //
    // http://localhost:8000/syncdocumentupdate?identity=aclient&name=abc&position=5&value=X
    //
    if (request.query.identity) {
        userIdentity = request.query.identity;
    } else {
        response.send({message: '- Identity required.'});
        return;
    }
    
    // At this time, this program only works for one document.
    // Needs more coding to handle multiple documents.
    if (!request.query.name) {
        response.send({message: '- Error: Sync document name is required.'});
        return;
    } else if (request.query.name !== syncDocumentUniqueName) {
        response.send({message: '- Error: Sync document name must be the same as the document name this server is monitoring.'});
        return;
    }
    // -----------------------------
    if (request.query.position) {
        syncDataValuePosition = request.query.position;
    } else {
        response.send({message: '- Error: Sync Data Value position is required.'});
        return;
    }
    if (syncDataValuePosition < 1 || syncDataValuePosition > 9) {
        response.send({message: '- Error: The tic tac sync position must be between 1 and 9.'});
        return;
    }
    theRow = parseInt(syncDataValuePosition / 3);
    theColumn = syncDataValuePosition % 3 - 1;
    if (theColumn === -1) {
        theRow = parseInt(syncDataValuePosition / 3 - 1);
        theColumn = 3 - 1;
    }
    console.log("+ theRow:" + theRow + ", theColumn: " + theColumn);
    // -----------------------------
    if (request.query.value) {
        syncDataValue = request.query.value;
    } else {
        response.send({message: '- Error: Sync Data Value is required.'});
        return;
    }
    // -----------------------------
    var theBoard = updateGameBoard(thisCurrentBoard);
    updateSyncDocument(theBoard);
    response.send('+ Updated.');
});

// -----------------------------------------------------------------------------
app.get('/token', function (request, response) {
    if (userIdentity === "") {
        logger("Required: user identity.");
        response.send({
            message: '- Error, required: user identity.',
            identity: '',
            token: ''
        });
        return;
    }
    response.send({
        message: '',
        identity: userIdentity,
        token: generateSyncToken()
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

// -----------------------------------------------------------------------------
