// -----------------------------------------------------------------------------
// $ node updateBoard.js cclient abc 2 3

// -----------------------------------------------------------------------------
const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);
const syncServiceSid = process.env.SYNC_SERVICE_SID;

// -----------------------------------------------------------------------------
var theRow = 0;
var theColumn = 0;
var userIdentity = '';
var syncDocumentUniqueName = '';
var syncDataValuePosition = '';
var syncDataValue = '';

userIdentity = process.argv[2] || "";
if (userIdentity === "") {
    console.log("+ User identity is required.");
    process.exit();
}
syncDocumentUniqueName = process.argv[3] || "";
if (syncDocumentUniqueName === "") {
    console.log("+ A Sync document name is required.");
    process.exit();
}
//
syncDataValuePosition = process.argv[4] || "";
if (syncDataValuePosition === "") {
    console.log("+ A tic tac sync position is required.");
    process.exit();
}
syncDataValue = process.argv[5] || "";
if (syncDataValue === "") {
    console.log("+ A tic tac sync value is required.");
    process.exit();
}
if (syncDataValuePosition < 1 || syncDataValuePosition > 9) {
    console.log("+ The tic tac sync position must be between 1 and 9.");
    process.exit();
}
theRow = parseInt(syncDataValuePosition / 3);
theColumn = syncDataValuePosition % 3 - 1;
if (theColumn === -1) {
    theRow = parseInt(syncDataValuePosition / 3 - 1);
    theColumn = 3 - 1;
}
console.log("+ theRow:" + theRow + ", theColumn: " + theColumn);

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
function updateDocument(currentData) {
    var theBoard = updateGameBoard(currentData.board);
    let theData = {"useridentity": userIdentity, "name": syncDocumentUniqueName, "board": theBoard};
    console.log("++ Update Sync Service:Document:data: " + syncServiceSid + ":" + syncDocumentUniqueName + ":" + JSON.stringify(theData));
    client.sync.services(syncServiceSid).documents(syncDocumentUniqueName)
            .update({data: theData})
            .then((sync_item) => {
                console.log("+ Updated document: " + sync_item.uniqueName + " value = " + syncDataValue);
            }).catch(function (error) {
        console.log("- " + error);
        // callback("- " + error);
    });
}

function retrieveUpdateDocument() {
    console.log("+ Retrieve Sync document, SID:" + syncServiceSid + ",   name: " + syncDocumentUniqueName);
    client.sync.services(syncServiceSid).documents(syncDocumentUniqueName)
            .fetch()
            .then((syncDocItems) => {
                console.log("++ uniqueName: " + syncDocItems.uniqueName
                        + ', Created by: ' + syncDocItems.createdBy
                        + ', data: ' + JSON.stringify(syncDocItems.data)
                        );
                updateDocument(syncDocItems.data);
            }).catch(function (error) {
        console.log("- " + error);
        // callback("- " + error);
    });
}
// -----------------------------------------------------------------------------

retrieveUpdateDocument();

// -----------------------------------------------------------------------------
