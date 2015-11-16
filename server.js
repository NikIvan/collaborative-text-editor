var http = require('http'),
    Static = require('node-static'),
    WebSocketServer = new require('ws'),
    webSocketServer = new WebSocketServer.Server({ port: 8081 });

var clients = {},
    clientsCounter = 0,
    freeId = {
        length: 0
    },
    currText;

webSocketServer.on('connection', function(ws) {
    var id;

    // Try to get id from freeId list
    if(freeId[freeId.length - 1]) {
        console.log('"freeId" is not empty');
        id = freeId[freeId.length - 1];
        delete freeId[freeId.length - 1];
        freeId.length--;
    } else {
        console.log('"freeId" is empty. Increasing counter...');
        id = clientsCounter;
        clientsCounter++;
    }

    clients[id] = ws;

    console.log('New connection id:' + id);

    // If at least one user already connected - send all data to new user.
    if(currText) {
        console.log('"currText" is not empty. At least one user is connected. Sending fullTextPatch to new user...');
        var fullTextPatch = {
            textToAdd: currText,
            addStartPos: 0
        };

        clients[id].send(JSON.stringify(fullTextPatch));
    }

    // Server received message from client
    ws.on('message', function(message) {
        console.log('Received message: ' + message);

        var newPatch = JSON.parse(message);

        currText = getNewText(newPatch);
        console.log('currText == "' + currText + '"');

        // Remove "patch-sender" client from "send-list"
        connection = clients[id];
        delete clients[id];

        for(var key in clients) {
            clients[key].send(message);
        }

        clients[id] = connection;
    });

    // client disconnected
    ws.on('close', function() {
        console.log('Connection ' + id + ' closed');
        freeId[freeId.length] = id;
        freeId.length++;
        delete clients[id];
    });
});

// Start server
var fileServer = new Static.Server('./client', { cache: false });
http.createServer(function(req, res) {
    fileServer.serve(req, res);
}).listen(8080);

console.log('Server is running on 8080, 8081');

/**
 * Returns udpated text
 * @param {object} patch Patch object
 * @return {string} newText Updated text
 */
function getNewText(patch) {
    var newText,
        prefix,
        suffix;

    if(!currText) {
        newText = patch.textToAdd;
    } else {
        if(patch.deleteStartPos !== undefined) {
            prefix = currText.substring(0, patch.deleteStartPos);
            suffix = currText.substring(patch.deleteEndPos, currText.length);
        } else {
            prefix = currText.substring(0, patch.addStartPos);
            suffix = currText.substring(patch.addStartPos, currText.length);
        }

        // If patch only deletes symbols
        if(!patch.textToAdd) {
            patch.textToAdd = '';
        }

        newText = prefix + patch.textToAdd + suffix;
    }

    return newText;
}
