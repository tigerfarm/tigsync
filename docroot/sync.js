// -----------------------------------------------------------------------------
// Based on the Twilio quickstart GitHub repository:
//  https://github.com/TwilioDevEd/sdk-starter-node/tree/master/public/sync
//
// Twilio Sync source program:
//  https://media.twiliocdn.com/sdk/js/sync/releases/0.11.1/twilio-sync.js
// Documentation, Sync document:
//  https://www.twilio.com/docs/sync/documents
// -----------------------------------------------------------------------------

var thisIdentity = '';
var thisDocumentName = 'test';  // This needs to be integrated because the document name is not available in a Sync update event.
var syncClientObject;
var thisSyncDoc;
var $buttons = $('#board .board-row button');

function logger(message) {
    var aTextarea = document.getElementById('log');
    aTextarea.value += "\n> " + message;
    aTextarea.scrollTop = aTextarea.scrollHeight;
}
function clearLog() {
    log.value = "+ Ready";
}
function clearFormMessages() {
    $("#mUserIdentity").html("");
    $("#mTokenPassword").html("");
    $("#mSyncDocumentName").html("");
}
function setButtons(activity) {
    logger("setButtons, activity: " + activity);
    // $("div.callMessages").html("Activity: " + activity);
    switch (activity) {
        case "init":
            $('#getTokenSetSyncObject').prop('disabled', false);
            $('#clearBoard').prop('disabled', true);
            $('#getGame').prop('disabled', true);
            $('#deleteGame').prop('disabled', true);
            break;
        case "getTokenSetSyncObject":
            $('#getTokenSetSyncObject').prop('disabled', true);
            $('#clearBoard').prop('disabled', false);
            $('#getGame').prop('disabled', false);
            $('#deleteGame').prop('disabled', false);
            break;
    }
}

window.onload = function () {
    log.value = "+++ Start.";
    setButtons('init');
};

// -----------------------------------------------------------------------------
// Sync functions

function getTokenSetSyncObject() {
    clearFormMessages();
    //
    thisIdentity = $("#userIdentity").val();
    if (thisIdentity === "") {
        $("#mUserIdentity").html("Required");
        logger("Required: user identity.");
        return;
    }
    var tokenPassword = $("#tokenPassword").val();
    if (tokenPassword === "") {
        $("#mTokenPassword").html("Required");
        logger("Required: user password.");
        return;
    }
    $.getJSON('/token?identity=' + thisIdentity + "&password=" + tokenPassword, function (tokenResponse) {
        if (tokenResponse.message !== '') {
            $("#mTokenPassword").html(tokenResponse.message);
            logger(tokenResponse.message);
            return;
        }
        $("#mUserIdentity").html("Token refreshed");
        logger('tokenResponse.token: ' + tokenResponse.token);
        //
        logger('Create Sync object.');
        syncClientObject = new Twilio.Sync.Client(tokenResponse.token, {logLevel: 'info'});
        //
        // ---------------------------------------------------------------------
        // Events: connectionStateChanged, tokenAboutToExpire, tokenExpired
        syncClientObject.on('connectionStateChanged', function (state) {
            if (state === 'connected') {
                logger('Sync is connected.');
                setButtons('getTokenSetSyncObject');
            } else {
                logger('Sync is not connected (websocket connection <span style="color: red">' + state + '</span>)…');
                return;
            }
        });
        syncClientObject.on('tokenAboutToExpire', function () {
            logger('Event happened: tokenAboutToExpire.');
            setButtons('init'); // for now
            // key: "updateToken",
            // value: function updateToken(token)
        });
        // ---------------------------------------------------------------------
    });
}

function documentSubscribe() {
    clearFormMessages();
    var syncDocumentName = $("#syncDocumentName").val();
    if (syncDocumentName === "") {
        $("#mSyncDocumentName").html("Required");
        logger("Required: Game name (Sync document name).");
        return;
    }
    // -------------------------------------------------------------------------
    // The game board data is stored in a Sync document.
    // Subscribe to the document; or if it doesn't exist, create it.
    // 
    syncClientObject.document(syncDocumentName).then(function (syncDoc) {
        logger('Subscribed to updates for Sync document : ' + syncDocumentName);
        thisSyncDoc = syncDoc;
        var data = syncDoc.value;
        if (data.board) {
            updateBoardSquares(data);
            $("#mSyncDocumentName").html("Game document loaded.");
        } else {
            $("#mSyncDocumentName").html("New game document.");
        }
        // ---------------------------------------------------------------------
        // Events
        syncDoc.on('updated', function (syncEvent) {
            var currentSyncDocumentName = $("#syncDocumentName").val();
            thisDocumentName = syncEvent.value.name;
            logger('currentSyncDocumentName: ' + currentSyncDocumentName + ", thisDocumentName: " + thisDocumentName);
            // if (currentSyncDocumentName !== thisDocumentName) {
                // $("#syncDocumentName").val(thisDocumentName);
                // $("#mSyncDocumentName").html("Newly updated");
            // }
            if (syncEvent.isLocal) {
                $("#mSyncDocumentName").html("");   // updated by self.
            } else {
                theMessage = "Updated by another player: ";
                $("#mSyncDocumentName").html("Updated: " + thisDocumentName +  " by: " + syncEvent.value.useridentity);
            }
            logger('Sync document JSON data: ' + JSON.stringify(syncEvent.value));
            updateBoardSquares(syncEvent.value);
        });
    });
}

function updateSyncDocument() {
    if (thisIdentity === "") {
        $("#mUserIdentity").html("Required");
        logger("Required: user identity.");
        return;
    }
    var syncDocumentName = $("#syncDocumentName").val();
    if (syncDocumentName === "") {
        $("#mSyncDocumentName").html("Required");
        logger("Required: Game name (Sync document name).");
        return;
    }
    var currentBoard = readGameBoardFromUserInterface();
    // logger('currentBoard JSON data: ' + JSON.stringify(currentBoard));
    thisSyncDoc.set({board: currentBoard, useridentity: thisIdentity, name: syncDocumentName});
}

function deleteGame() {
    // logger('To do: deleteGame.');
    // return;
    clearFormMessages();
    var syncDocumentName = $("#syncDocumentName").val();
    if (syncDocumentName === "") {
        $("#mSyncDocumentName").html("Required");
        logger("Required: Game name (Sync document name).");
        return;
    }
    if (thisIdentity === "") {
        $("#mUserIdentity").html("Required");
        logger("Required: user identity.");
        return;
    }
    clearBoard();
    syncClientObject.document(syncDocumentName).then(function (syncDoc) {
        syncDoc.removeDocument().then(function () {
            logger('Game document deleted.');
        });
    });
}

// -------------------------------------------------------------------------
// HTML Tic-Tac Board Functions

function clearBoard() {
    if (thisIdentity === "") {
        $("#mUserIdentity").html("Required");
        logger("Required: user identity.");
        return;
    }
    aClearBoard = {"board": [["", "", ""], ["", "", ""], ["", "", ""]], "useridentity": thisIdentity};
    logger('aClearBoard JSON data: ' + JSON.stringify(aClearBoard));
    updateBoardSquares(aClearBoard);
    updateSyncDocument();
}

function getGame() {
    if (thisIdentity === "") {
        $("#mUserIdentity").html("Required");
        logger("Required: user identity.");
        return;
    }
    var syncDocumentName = $("#syncDocumentName").val();
    if (syncDocumentName === "") {
        $("#mSyncDocumentName").html("Required");
        logger("Required: Game name.");
        return;
    }
    aClearBoard = {"board": [["", "", ""], ["", "", ""], ["", "", ""]], "useridentity": thisIdentity};
    // logger('aClearBoard JSON data: ' + JSON.stringify(aClearBoard));
    updateBoardSquares(aClearBoard);
    documentSubscribe();
}

function buttonClick() {
    $square = $(event.target);
    var squareValue = $square.html();
    if (squareValue === 'X') {
        $square.html('O');
    } else if (squareValue === 'O') {
        $square.html('&nbsp;');
    } else {
        $square.html('X');
    }
    updateSyncDocument();
}

//Read the state of the UI and create a new document
function readGameBoardFromUserInterface() {
    // logger('readGameBoardFromUserInterface()');
    var board = [
        ['', '', ''],
        ['', '', ''],
        ['', '', '']
    ];
    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            var selector = '[data-row="' + row + '"]' +
                    '[data-col="' + col + '"]';
            board[row][col] = $(selector).html().replace('&nbsp;', '');
        }
    }
    // Example: {"board":[["X","O","X"],["","O",""],["","",""]],"useridentity":"david"}
    // return {board: board, useridentity: thisIdentity, name: thisDocumentName};
    return board;
}

// Update the squares on the board to match the data.
function updateBoardSquares(data) {
    // logger('updateBoardSquares()');
    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            var this_cell = '[data-row="' + row + '"]' + '[data-col="' + col + '"]';
            var cellValue = data.board[row][col];
            $(this_cell).html(cellValue === '' ? '&nbsp;' : cellValue);
        }
    }
}
