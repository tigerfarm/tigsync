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
// -----------------------------------------------------------------------------
var theRow = 0;
var theColumn = 0;
var userIdentity = '';
var syncDocumentUniqueName = '';
var syncDataValuePosition = '';
var syncDataValue = '';

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
function updateDocument(response, currentData) {
    var theBoard = updateGameBoard(currentData.board);
    let theData = {"useridentity": userIdentity, "name": syncDocumentUniqueName, "board": theBoard};
    console.log("++ Update Sync Service:Document:data: " + syncServiceSid + ":" + syncDocumentUniqueName + ":" + JSON.stringify(theData));
    client.sync.services(syncServiceSid).documents(syncDocumentUniqueName)
            .update({data: theData})
            .then((sync_item) => {
                console.log("+ Updated document: " + syncDocumentUniqueName + " value = " + syncDataValue);
                response.send("+ Updated document: " + syncDocumentUniqueName
                        + " position = " + syncDataValuePosition
                        + " value = " + syncDataValue
                        + "\r\n");
            }).catch(function (error) {
        console.log("- " + error);
        response.send("- Error updating document: " + syncDocumentUniqueName + " value = " + syncDataValue + " - " + error);
        // callback("- " + error);
    });
}
function retrieveUpdateDocument(response) {
    console.log("+ Retrieve Sync document, SID:" + syncServiceSid + ",   name: " + syncDocumentUniqueName);
    client.sync.services(syncServiceSid).documents(syncDocumentUniqueName)
            .fetch()
            .then((syncDocItems) => {
                console.log("++ uniqueName: " + syncDocItems.uniqueName
                        + ', Created by: ' + syncDocItems.createdBy
                        + ', data: ' + JSON.stringify(syncDocItems.data)
                        );
                updateDocument(response, syncDocItems.data);
            }).catch(function (error) {
        console.log("- Error retrieving document: " + syncDocumentUniqueName + " - " + error);
        response.send("- Error retrieving document: " + syncDocumentUniqueName + " - " + error);
        // callback("- " + error);
    });
}

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
    if (request.query.name) {
        syncDocumentUniqueName = request.query.name;
    } else {
        response.send({message: '- Error: Sync document name is required.'});
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
    retrieveUpdateDocument(response);
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
app.get('/hello', function (req, res) {
    console.log("+ Request: /hello");
    if (req.query.username) {
        res.send('Hello ' + req.query.username + '.');
    } else {
        res.send('Hello there.\r\n');
    }
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
