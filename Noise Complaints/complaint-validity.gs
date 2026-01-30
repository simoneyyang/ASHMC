/**
 * =============================================================================
 * ASHMC COMPLAINT VALIDITY FORM HANDLER
 * =============================================================================
 *
 * This script handles submissions from the Complaint Validity Form.
 * The validity form is filled out by dorm representatives to respond to
 * noise complaints they received.
 *
 * SETUP INSTRUCTIONS:
 * 1. Click the clock icon (Triggers) in the Apps Script toolbar
 * 2. Click "Add Trigger"
 * 3. Configure:
 *    - Choose which function to run: onSubmit
 *    - Select event source: From form
 *    - Select event type: On form submit
 * 4. Save and authorize the script
 *
 * WHAT THIS SCRIPT DOES:
 * 1. When a dorm responds to a complaint, looks up the original complaint
 *    by matching timestamps
 * 2. Notifies all other dorms that were part of the complaint that it
 *    has been responded to
 * 3. Sends the original complainant the response (valid or invalid with reason)
 *
 * SPREADSHEET STRUCTURE (Results_ID):
 * - "Complaints" sheet: Stores all complaint submissions
 *   Column A (index 0): Timestamp
 *   Column B (index 1): Dorms list (comma-separated)
 *   Column C (index 2): Source/Location
 *   Column F (index 5): Complainant email
 * - "Emails" sheet: Maps dorm names to their email lists
 *   Column A: Dorm name
 *   Column B: Email list
 *
 * VALIDITY FORM STRUCTURE (by index):
 * - Index 0: Which dorm are you responding for?
 * - Index 1: Is this a valid complaint? (Yes/No)
 * - Index 2: Timestamp of original complaint (pre-filled, hidden)
 * - Index 5: Comment if valid
 * - Index 7: Reason if invalid
 *
 * =============================================================================
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Google Spreadsheet ID containing "Complaints" and "Emails" sheets */
var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";

// =============================================================================
// MAIN FORM SUBMISSION HANDLER
// =============================================================================

/**
 * Triggered when the validity form is submitted by a dorm representative.
 *
 * Flow:
 * 1. Extract the original complaint timestamp from the form response
 * 2. Look up the original complaint in the Complaints sheet
 * 3. Get the complainant's email and list of all dorms involved
 * 4. Notify all other dorms that this complaint has been addressed
 * 5. Send the complainant the response (valid with comment, or invalid with reason)
 *
 * @param {Object} e - The form submit event object (provided by Google Apps Script)
 */
function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];

  // Get the original complaint timestamp (pre-filled in the form)
  var timestamp = Utilities.formatDate(
    new Date(getResponse(2)),
    'GMT',
    "yyyy-MM-dd'T'HH:mm:ss'Z'"
  );
  Logger.log("Looking up complaint with timestamp: " + timestamp);

  // Look up the original complaint in the spreadsheet
  var sheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Complaints");
  var values = sheet.getDataRange().getValues();

  var dorms_list = "";  // List of dorms the complaint was sent to
  var source = "";      // Location of the complainant
  var email = "";       // Email of the original complainant

  // Find the matching complaint by timestamp
  for (var i = 0; i < sheet.getLastRow(); i++) {
    var val_timestamp = Utilities.formatDate(
      new Date(values[i][0]),
      'GMT',
      "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );
    if (val_timestamp == timestamp) {
      email = values[i][5];
      dorms_list = values[i][1];
      source = values[i][2];
      Logger.log("Found complaint. Email: " + email + ", Dorms: " + dorms_list);
      break;
    }
  }

  // Get the response details
  var dorm = getResponse(0);   // Which dorm is responding
  var valid = getResponse(1);  // "Yes" or "No"

  Logger.log("Response from " + dorm + ", valid: " + valid);

  // Notify all other dorms that this complaint has been addressed
  notifyOtherDorms(dorms_list, dorm, source);

  // Send response to the original complainant
  if (valid == "Yes") {
    var comment = getResponse(5);
    sendValidResponse(email, dorm, comment);
  } else {
    var reason = getResponse(7);
    sendInvalidResponse(email, dorm, reason);
  }
}

// =============================================================================
// NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Notifies all dorms in the complaint list that the complaint has been responded to.
 *
 * @param {string} dorms_list - Comma-separated list of dorm names
 * @param {string} respondingDorm - The dorm that responded
 * @param {string} source - The source/location of the original complaint
 */
function notifyOtherDorms(dorms_list, respondingDorm, source) {
  // Parse the comma-separated dorm list and notify each one
  while (true) {
    var index = dorms_list.indexOf(",");
    var current = "";

    if (index < 0) {
      current = dorms_list;
    } else {
      current = dorms_list.substring(0, index);
    }

    Logger.log("Processing dorm: " + current);

    // Look up the email for this dorm
    var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
    var values = emailsSheet.getDataRange().getValues();

    for (var i = 0; i < emailsSheet.getLastRow(); i++) {
      if (values[i][0] != "" && values[i][0] == current) {
        // Send notification to this dorm's email list
        MailApp.sendEmail({
          to: values[i][1],
          subject: "Noise Complaint has been responded to",
          body: respondingDorm + " has responded to the noise complaint from " + source,
          noReply: true
        });
        Logger.log("Notified " + current + " at " + values[i][1]);
      }
    }

    // Move to next dorm in the list
    if (index < 0) {
      break;
    }
    dorms_list = dorms_list.substring(index + 2, dorms_list.length);
  }
}

/**
 * Sends a response to the complainant when the complaint was marked as valid.
 *
 * @param {string} email - The complainant's email address
 * @param {string} dorm - The dorm that responded
 * @param {string} comment - The dorm's response comment
 */
function sendValidResponse(email, dorm, comment) {
  MailApp.sendEmail({
    to: email,
    subject: "Response to your submitted noise complaint",
    body: "Response from " + dorm + ":\n\n" + comment,
    noReply: true
  });
  Logger.log("Sent valid response to complainant: " + email);
}

/**
 * Sends a response to the complainant when the complaint was marked as invalid.
 *
 * @param {string} email - The complainant's email address
 * @param {string} dorm - The dorm that responded
 * @param {string} reason - The reason the complaint was marked invalid
 */
function sendInvalidResponse(email, dorm, reason) {
  MailApp.sendEmail({
    to: email,
    subject: "Response to your submitted noise complaint",
    body: "The respondents to your noise complaint (" + dorm +
          ") have responded that it's invalid for the following reason:\n\n" + reason,
    noReply: true
  });
  Logger.log("Sent invalid response to complainant: " + email);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the response value for a specific form item by index.
 * Returns 0 if the item was not answered.
 *
 * @param {number} index - The index of the form item
 * @returns {*} The response value for that item, or 0 if not answered
 */
function getResponse(index) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];
  var items = form.getItems();

  var resp = response.getResponseForItem(items[index]);
  if (resp == null) {
    return 0;
  }
  return resp.getResponse();
}

// =============================================================================
// TEST/DEBUG FUNCTIONS
// =============================================================================

/**
 * Prints all form item titles to the log.
 * Useful for debugging form index issues.
 */
function testPrintItems() {
  var form = FormApp.getActiveForm();
  for (var i = 0; i < form.getItems().length; i++) {
    Logger.log("Index " + i + ": " + form.getItems()[i].getTitle());
  }
}
