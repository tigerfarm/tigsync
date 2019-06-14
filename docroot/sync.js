// -----------------------------------------------------------------------------
// Based on the Twilio quickstart GitHub repository:
//  https://github.com/TwilioDevEd/sdk-starter-node/tree/master/public/sync
//
// Twilio Sync source program:
//  https://media.twiliocdn.com/sdk/js/sync/releases/0.11.1/twilio-sync.js
// Documentation, Sync document:
//  https://www.twilio.com/docs/sync/documents
//  
// -----------------------------------------------------------------------------

var thisIdentity = '';
var thisSyncClientObject;
var thisSyncDocumentObject;
var theSyncDocumentName;        // The document name is needs work.

// var $buttons = $('#board .board-row button');

// -----------------------------------------------------------------------------
// Token functions

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
        createSyncObject(tokenResponse.token);
    });
}

function createSyncObject(token) {
    logger('Create Sync object.');
    thisSyncClientObject = new Twilio.Sync.Client(token, {logLevel: 'info'});
    //
    // ---------------------------------------------------------------------
    // Sync object events
    //
    thisSyncClientObject.on('connectionStateChanged', function (state) {
        if (state === 'connected') {
            logger('Sync is connected.');
            setButtons('getTokenSetSyncObject');
        } else {
            logger('Sync is not connected (websocket connection <span style="color: red">' + state + '</span>)…');
            return;
        }
    });
    thisSyncClientObject.on('tokenAboutToExpire', function () {
        logger('Event happened: tokenAboutToExpire.');
        getTokenUpdateSyncObject();
    });
    thisSyncClientObject.on('tokenExpired', function () {
        logger('Event happened: tokenExpired.');
        setButtons('init');
    });
}

function getTokenUpdateSyncObject() {
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
        logger('Update: tokenResponse.token: ' + tokenResponse.token);
        //
        // value: function updateToken(token)
        thisSyncClientObject.updateToken(tokenResponse.token);
        logger('Sync Client Object token: updated.');
    });
}

// -----------------------------------------------------------------------------
// Sync document functions

function getSyncDocumentSetBoard(subscribe) {
    clearFormMessages();
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
    // -------------------------------------------------------------------------
    thisSyncClientObject.document(syncDocumentName).then(function (syncDoc) {
        theSyncDocumentName = syncDocumentName;
        logger('Sync document object created for document: ' + theSyncDocumentName);
        thisSyncDocumentObject = syncDoc;
        var data = thisSyncDocumentObject.value;
        if (data.board) {
            updateBoardSquares(data);
            $("#mSyncDocumentName").html("Game document loaded.");
        } else {
            $("#mSyncDocumentName").html("New game document.");
        }
        if (subscribe === 'subscribe') {
            documentSubscribeEvents();
        }
    });
}

function documentSubscribeEvents() {
    //
    // ---------------------------------------------------------------------
    // Need to not re-subscribe to a document.
    //  Else, for each re-subscription, when an update is made,
    //      it will be processed that same number of times subscribed.
    //
    // @flozanovski, suggested the following, for an object binding:
    //      syncDoc.on('updated', function (syncEvent) { ... }.bind(syncDoc);
    //
    logger('Subscribed to updates for Sync document : ' + theSyncDocumentName);
    thisSyncDocumentObject.on('updated', function (syncEvent) {
        var currentSyncDocumentName = $("#syncDocumentName").val();
        var thisDocumentName = syncEvent.value.name;
        logger('currentSyncDocumentName: ' + currentSyncDocumentName + ", thisDocumentName: " + thisDocumentName);
        // if (currentSyncDocumentName !== thisDocumentName) {
        // $("#syncDocumentName").val(thisDocumentName);
        // $("#mSyncDocumentName").html("Newly updated");
        // }
        if (syncEvent.isLocal) {
            $("#mSyncDocumentName").html("");   // updated by self.
        } else {
            theMessage = "Updated by another player: ";
            $("#mSyncDocumentName").html("Updated: " + thisDocumentName + " by: " + syncEvent.value.useridentity);
        }
        logger('Sync document JSON data: ' + JSON.stringify(syncEvent.value));
        updateBoardSquares(syncEvent.value);
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
    thisSyncDocumentObject.set({board: currentBoard, useridentity: thisIdentity, name: syncDocumentName});
}

function deleteGame() {
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
    clearGameBoard();
    thisSyncClientObject.document(syncDocumentName).then(function (syncDoc) {
        syncDoc.removeDocument().then(function () {
            logger('Game document deleted.');
        });
    });
}

// -----------------------------------------------------------------------------
// HTML Tic-Tac Board Functions

function clearGameBoard() {
    aClearBoard = {board: [["", "", ""], ["", "", ""], ["", "", ""]]};
    // logger('aClearBoard JSON data: ' + JSON.stringify(aClearBoard));
    updateBoardSquares(aClearBoard);
    updateSyncDocument();
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
    // Example: board = [["X","O","X"],["","O",""],["","",""]]
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

// -----------------------------------------------------------------------------
//  UI functions

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
function resetTokenSyncObject() {
    updateBoardSquares({"board": [["", "", ""], ["", "", ""], ["", "", ""]]});
    setButtons('init');
}
function setButtons(activity) {
    logger("setButtons, activity: " + activity);
    // $("div.callMessages").html("Activity: " + activity);
    switch (activity) {
        case "init":
            $('#getTokenSetSyncObject').prop('disabled', false);
            $('#resetTokenSyncObject').prop('disabled', true);
            $('#clearGameBoard').prop('disabled', true);
            $('#getGameSubscribe').prop('disabled', true);
            $('#getGame').prop('disabled', true);
            $('#deleteGame').prop('disabled', true);
            //
            $('#userIdentity').prop('disabled', false);
            $('#tokenPassword').prop('disabled', false);
            //
            break;
        case "getTokenSetSyncObject":
            $('#getTokenSetSyncObject').prop('disabled', true);
            $('#resetTokenSyncObject').prop('disabled', false);
            $('#clearGameBoard').prop('disabled', false);
            $('#getGameSubscribe').prop('disabled', false);
            $('#getGame').prop('disabled', false);
            $('#deleteGame').prop('disabled', false);
            //
            $('#userIdentity').prop('disabled', true);
            $('#tokenPassword').prop('disabled', true);
            //
            break;
    }
}

window.onload = function () {
    log.value = "+++ Start.";
    setButtons('init');
};

// -----------------------------------------------------------------------------
