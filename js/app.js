if(!window.WebSocket) {
    document.body.innerHTML = 'WebSocket isn\'t supported in this browser';
}

var editor = document.getElementById('editor'),
    timer,
    socket = new WebSocket('ws://localhost:8081'),
    currText = '';


/**
 * Invoked when client receives message from server
 * Applies received patch
 * @param {object} event Event object
 */
socket.onmessage = function(event) {
    console.log('Patch received: ' + event.data);
    var newPatch = JSON.parse(event.data);
    var cursorPosition = editor.selectionStart;

    editor.value = currText = getNewText(newPatch);

    if(cursorPosition > newPatch.addStartPos) {
        cursorPosition += newPatch.textToAdd.length;
    }

    editor.selectionStart = editor.selectionEnd = cursorPosition;
};

/**
 * Sets timer to send patch when textarea value changed
 */
editor.oninput = function() {
    if(timer) {
        clearTimeout(timer);
        timer = null;
    }

    timer = setTimeout(sendPatch, 1000);
};

/**
 * Prepares and sends patch
 */
function sendPatch() {
    if(currText !== editor.value) {
        var patch = preparePatch();

        if(patch) {
            var message = JSON.stringify(patch);
            socket.send(message);
            console.log('Patch sent: ' + message);
        }

        currText = editor.value;
    }
}

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

        // If patch only delete symbols
        if(!patch.textToAdd) {
            patch.textToAdd = "";
        }

        newText = prefix + patch.textToAdd + suffix;
    }

    return newText;
}

/**
 * Prepare patch
 * @return {object} patch Ready-to-send patch
 */
function preparePatch() {
    var patch = {},
        editedText = editor.value,
        textToDelete,
        textToAdd;

    var commonPrefixIndex = getCommonPrefixIndex(currText, editedText);
    var commonSuffixIndex = getCommonSuffixIndex(currText, editedText);

    textToDelete = currText.substring(commonPrefixIndex, currText.length - commonSuffixIndex);
    textToAdd = editedText.substring(commonPrefixIndex, editedText.length - commonSuffixIndex);

    if(!textToDelete && !textToAdd) {
        return null;
    }

    if(textToDelete) {
        patch.deleteStartPos = commonPrefixIndex;
        patch.deleteEndPos = commonPrefixIndex + textToDelete.length;
    }

    if(textToAdd) {
        patch.textToAdd = textToAdd;
        patch.addStartPos = commonPrefixIndex;
    }

    return patch;
}

/**
 * Get index of common prefix of 2 strings. Binary search
 * @param {string} text1
 * @param {string} text2
 * @return {number} index
 */
function getCommonPrefixIndex(text1, text2) {
    if(!text1 || !text2 || text1.charAt(0) != text2.charAt(0)) {
        return 0;
    }

    var minPos = 0;
    var maxPos = Math.min(text1.length, text2.length);
    var index = maxPos;
    var startPos = 0;

    while(minPos < index) {
        if(text1.substring(startPos, index) == text2.substring(startPos, index)) {
            minPos = index;
            startPos = minPos;
        } else {
            maxPos = index;
        }

        index = Math.floor((maxPos - minPos) / 2 + minPos);
    }

    return index;
}

/**
 * Get index of common suffix of 2 strings. Binary search
 * @param {string} text1
 * @param {string} text2
 * @return {number} index
 */
function getCommonSuffixIndex(text1, text2) {
    if (!text1 || !text2 || text1.charAt(text1.length - 1) != text2.charAt(text2.length - 1)) {
      return 0;
    }

    var text1Len = text1.length;
    var text2Len = text2.length;
    var minPos = 0;
    var maxPos = Math.min(text1Len, text2Len);
    var index = maxPos;
    var endPos = 0;

    while(minPos < index) {
        if(text1.substring(text1Len - index, text1Len - endPos) ==
        text2.substring(text2Len - index, text2Len - endPos)) {
            minPos = index;
            endPos = minPos;
        } else {
            maxPos = index;
        }

        index = Math.floor((maxPos - minPos) / 2 + minPos);
    }

    return index;
}
