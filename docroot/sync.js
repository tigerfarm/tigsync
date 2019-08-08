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
    logger('Set Sync object events.');
    //
    thisSyncClientObject.on('connectionStateChanged', function (state) {
        if (state === 'connected') {
            logger('Sync object event: Sync connection open.');
            setButtons('getTokenSetSyncObject');
        } else {
            // logger('Sync is not connected (websocket connection <span style="color: red">' + state + '</span>)…');
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
        resetButtons();
        $("#mUserIdentity").html("Token expired");
    });
}

function getTokenUpdateSyncObject() {
    var tokenPassword = $("#tokenPassword").val();
    $.getJSON('/token?identity=' + thisIdentity + "&password=" + tokenPassword, function (tokenResponse) {
        if (tokenResponse.message !== '') {
            $("#mTokenPassword").html(tokenResponse.message);
            logger(tokenResponse.message);
            return;
        }
        $("#mUserIdentity").html("Update: token refreshed");
        // logger('Update: tokenResponse.token: ' + tokenResponse.token);
        //
        thisSyncClientObject.updateToken(tokenResponse.token);
        logger('Sync client object token: updated.');
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
        logger('Sync document object created for document: ' + syncDocumentName);
        thisSyncDocumentObject = syncDoc;
        var data = thisSyncDocumentObject.value;
        if (data.board) {
            logger('Sync document data: ' + JSON.stringify(data));
            updateGameBoard(data);
            $("#mSyncDocumentName").html("Game document loaded.");
        } else {
            $("#mSyncDocumentName").html("New game document.");
        }
        if (subscribe === 'subscribe') {
            documentSubscribeEvents(syncDocumentName);
        }
    });
}

function documentSubscribeEvents(syncDocumentName) {
    //
    // ---------------------------------------------------------------------
    // Need to not re-subscribe to a document.
    //  Else, for each re-subscription, when an update is made,
    //      it will be processed that same number of times subscribed.
    //      This is similar to the issue with Chat.
    //
    // An object binding following was suggested:
    //      syncDoc.on('updated', function (syncEvent) { ... }.bind(syncDoc);
    //
    thisSyncDocumentObject.on('updated', function (syncEvent) {
        var thisDocumentUser = syncEvent.value.useridentity;
        var thisDocumentName = syncEvent.value.name;
        // var currentSyncDocumentName = $("#syncDocumentName").val();
        // logger('currentSyncDocumentName: ' + currentSyncDocumentName + ", thisDocumentName: " + thisDocumentName);
        // if (currentSyncDocumentName !== thisDocumentName) {
        // $("#syncDocumentName").val(thisDocumentName);
        // $("#mSyncDocumentName").html("Newly updated");
        // }
        if (syncEvent.isLocal) {
            // Updated by self.
            $("#mSyncDocumentName").html("");
        } else {
            // Updated by another player.
            $("#mSyncDocumentName").html("Updated: " + thisDocumentName + " by: " + thisDocumentUser);
        }
        // logger('Updated Sync document data: ' + JSON.stringify(syncEvent.value));
        logger('Sync document event: document updated by: ' + thisDocumentUser);
        updateGameBoard(syncEvent.value);
    });
    logger('Subscribed to updates for Sync document : ' + syncDocumentName);
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
    var currentBoard = readGameBoard();
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
    thisSyncClientObject.document(syncDocumentName).then(function (syncDoc) {
        syncDoc.removeDocument().then(function () {
            clearBoard();
            logger('Game document deleted.');
        });
    });
}

// -----------------------------------------------------------------------------
// HTML Tic-Tac board functions

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

function clearGameBoard() {
    clearBoard();
    updateSyncDocument();
}
function clearBoard() {
    updateGameBoard({board: [["", "", ""], ["", "", ""], ["", "", ""]]});
}

function readGameBoard() {
    // logger('readGameBoard()');
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

function updateGameBoard(data) {
    // logger('updateGameBoard()');
    for (var row = 0; row < 3; row++) {
        for (var col = 0; col < 3; col++) {
            var this_square = '[data-row="' + row + '"]' + '[data-col="' + col + '"]';
            var squareValue = data.board[row][col];
            $(this_square).html(squareValue === '' ? '&nbsp;' : squareValue);
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
function resetButtons() {
    clearFormMessages();
    clearBoard();
    setButtons('init');
}
function setButtons(activity) {
    // logger("setButtons, activity: " + activity);
    // $("div.callMessages").html("Activity: " + activity);
    switch (activity) {
        case "init":
            $('#getTokenSetSyncObject').prop('disabled', false);
            $('#resetButtons').prop('disabled', true);
            $('#clearGameBoard').prop('disabled', true);
            $('#getGameSubscribe').prop('disabled', true);
            $('#getGame').prop('disabled', true);
            $('#deleteGame').prop('disabled', true);
            //
            $('#userIdentity').prop('disabled', false);
            $('#tokenPassword').prop('disabled', false);
            $('#userIdentity').css("background","white");
            $('#tokenPassword').css("background","white");
            //
            break;
        case "getTokenSetSyncObject":
            $('#getTokenSetSyncObject').prop('disabled', true);
            $('#resetButtons').prop('disabled', false);
            $('#clearGameBoard').prop('disabled', false);
            $('#getGameSubscribe').prop('disabled', false);
            $('#getGame').prop('disabled', false);
            $('#deleteGame').prop('disabled', false);
            //
            $('#userIdentity').prop('disabled', true);
            $('#tokenPassword').prop('disabled', true);
            $('#userIdentity').css("background","LightGrey ");
            $('#tokenPassword').css("background","LightGrey ");
            //
            break;
    }
}

window.onload = function () {
    log.value = "+++ Start.";
    setButtons('init');
};

// -----------------------------------------------------------------------------
