/**
 * =============================================================================
 * ASHMC NOISE COMPLAINT FORM HANDLER
 * =============================================================================
 *
 * This script handles submissions from the Noise Complaint Form.
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
 * 1. When a complaint is submitted, emails the relevant dorm(s) with a
 *    pre-filled validity form link
 * 2. Sends the complainant a feedback form link
 * 3. Schedules a 15-minute check - if no dorm responds to the validity form
 *    within 15 minutes, ASHMC is notified
 *
 * SPREADSHEET STRUCTURE (Results_ID):
 * - "Complaints" sheet: Stores all complaint submissions
 * - "Emails" sheet: Maps dorm names to their email lists
 *   Column A: Dorm name (e.g., "East", "West", "North", "South")
 *   Column B: Email list for that dorm
 *
 * FORM STRUCTURE (by index):
 * - Index 0: Is this an official complaint? (Yes/No)
 * - Index 2: Which dorm(s) is the noise coming from? (Checkbox)
 * - Index 3: Location of complainant
 * - Index 4: Complaint details
 * - Index 5: Time until quiet hours needed
 *
 * =============================================================================
 */

// =============================================================================
// CONFIGURATION - Update these IDs if the forms/spreadsheets change
// =============================================================================

/** Google Spreadsheet ID containing "Complaints" and "Emails" sheets */
var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";

/** Google Form ID for the Feedback form (sent to complainant) */
var Feedback_ID = "1HKLm-pbNTEcfvg6l4-fF4tALwPJT-bwGqn0IqeiTAq0";

/** Google Form ID for the Validity form (sent to dorms to respond) */
var Validity_ID = "12nCRvEKNf6qt6aEw3Ygk2y8-aONqrkb21o_j6sC1Pwc";

/** ASHMC email - receives notifications when complaints aren't addressed */
var ashmc_email = "ashmc@g.hmc.edu";

/** Minutes to wait before checking if validity form was submitted */
var VALIDITY_CHECK_DELAY_MINUTES = 15;

// =============================================================================
// TEST MODE CONFIGURATION
// =============================================================================
// Add tester email addresses to TESTER_EMAILS array. When a complaint is
// submitted by someone in this list, ALL emails for that complaint will be
// redirected to TEST_REDIRECT_TO instead of the real recipients.
// This allows testing without disrupting normal system operation.
//
// To disable test mode entirely, set TESTER_EMAILS to an empty array: []
// =============================================================================

/** List of email addresses that trigger test mode when they submit a complaint */
var TESTER_EMAILS = [
  "simyang@g.hmc.edu",
  "sojayaweera@g.hmc.edu"
];

/** Where to redirect emails when a tester submits a complaint */
var TEST_REDIRECT_TO = "simyang@g.hmc.edu, sojayaweera@g.hmc.edu";

/** Flag set during processing - do not modify directly */
var isTestMode = false;

// =============================================================================
// FORM FIELD INDICES - Update these if form questions are reordered
// =============================================================================

var officialIndex = 0;   // "Is this an official complaint?"
var noiseIndex = 2;      // "Which dorm(s) is the noise coming from?"
var locationIndex = 3;   // "Where are you located?"
var complaintIndex = 4;  // "Complaint details"
var timeIndex = 5;       // "Time until quiet hours needed"

// =============================================================================
// MAIN FORM SUBMISSION HANDLER
// =============================================================================

/**
 * Triggered when the complaint form is submitted.
 *
 * Flow:
 * 1. Extract complaint details from the form response
 * 2. Create a pre-filled validity form URL with the complaint timestamp
 * 3. Email each relevant dorm with the complaint and validity form link
 * 4. Send the complainant a feedback form link
 * 5. Schedule a 15-minute check to verify the validity form was submitted
 *
 * @param {Object} e - The form submit event object (provided by Google Apps Script)
 */
function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];

  // Check if this is a test submission (complainant is in TESTER_EMAILS list)
  var complainantEmail = response.getRespondentEmail();
  isTestMode = TESTER_EMAILS.indexOf(complainantEmail) > -1;

  if (isTestMode) {
    Logger.log("[TEST MODE] Complaint from tester: " + complainantEmail);
    Logger.log("[TEST MODE] All emails will be redirected to: " + TEST_REDIRECT_TO);
  }

  // Get complaint details from form
  var noise = getResponse(noiseIndex);        // Array of dorm names
  var official = getResponse(officialIndex);  // "Yes" or "No"
  var complaint = getResponse(complaintIndex);
  var time = getResponse(timeIndex);

  if (time == "") {
    time = "two hours from now";
  }

  Logger.log("Noise complaint received for dorms: " + noise);

  // Get the timestamp of this complaint submission
  var lastTimestamp = response.getTimestamp();

  // Create pre-filled validity form URL with the complaint timestamp
  var validityForm = FormApp.openById(Validity_ID);
  var resp = validityForm.createResponse();
  var timestamp = validityForm.getItems()[2].asTextItem().createResponse(lastTimestamp);
  resp.withItemResponse(timestamp);
  var validityURL = resp.toPrefilledUrl();

  Logger.log("Validity form URL created with timestamp: " + lastTimestamp);

  // Send complaint emails to each dorm
  for (var d = 0; d < noise.length; d++) {
    var dorm = noise[d];
    //dorm = "North";
    //return;

    //just kidding
    //ilovefroshchem :)

    if (dorm == "East" && complaint.indexOf("I love frosh chem") > -1) {
      //hi person reading my messy and uncommented scripts
      //first of all, I'm sorry
      //secondly, you should definitely delete this part
      //...how could I make a script without adding some easter eggs...
      //the other two are much harder to find ;)
      MailApp.sendEmail(ashmc_email, "NOISE COMPLAINT TO EAST: ilovefroshchem-- just a harmless easter egg", "Someone found out..." + complaint, { noReply: true });
    }

    // Look up the email list for this dorm
    var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
    var values = emailsSheet.getDataRange().getValues();

    for (var i = 0; i < emailsSheet.getLastRow(); i++) {
      if (values[i][0] != "" && values[i][0] == dorm) {
        if (official == "Yes") {
          sendEmail(complaint, dorm, time, values[i][1], validityURL);
        } else {
          sendUnofficialEmail(complaint, dorm, time, values[i][1], validityURL);
        }
      }
    }
  }

  // Send feedback form to the complainant
  var feedbackForm = FormApp.openById(Feedback_ID);
  var prefil = feedbackForm.createResponse();
  var res = feedbackForm.getItems()[0].asParagraphTextItem().createResponse(lastTimestamp);
  prefil.withItemResponse(res);
  var res = feedbackForm.getItems()[1].asCheckboxItem().createResponse(noise);
  prefil.withItemResponse(res);

  sendFeedbackEmail(response.getRespondentEmail(), prefil.toPrefilledUrl());

  // Schedule validity check after 15 minutes
  scheduleValidityCheck(lastTimestamp, noise, complaint, official);
}

// =============================================================================
// 15-MINUTE VALIDITY CHECK SYSTEM
// =============================================================================

/**
 * Schedules a check to verify that the validity form was submitted within 15 minutes.
 *
 * How it works:
 * 1. Stores complaint details in PropertiesService (persistent key-value storage)
 * 2. Creates a time-based trigger that fires after VALIDITY_CHECK_DELAY_MINUTES
 * 3. When the trigger fires, checkValidityResponse() runs to verify submission
 *
 * @param {Date} timestamp - The timestamp of the original complaint
 * @param {string[]} dorms - Array of dorm names the complaint was sent to
 * @param {string} complaint - The complaint text
 * @param {string} official - "Yes" or "No" indicating if official complaint
 */
function scheduleValidityCheck(timestamp, dorms, complaint, official) {
  // Store complaint details for the delayed check function to access
  var properties = PropertiesService.getScriptProperties();
  var complaintData = {
    timestamp: timestamp.toString(),
    dorms: dorms,
    complaint: complaint,
    official: official,
    isTest: isTestMode  // Store test mode flag so delayed check uses it too
  };

  // Use timestamp as unique key for this complaint
  var storageKey = "complaint_" + timestamp.getTime();
  properties.setProperty(storageKey, JSON.stringify(complaintData));

  // Create a time-based trigger to run after 15 minutes
  var trigger = ScriptApp.newTrigger('checkValidityResponse')
    .timeBased()
    .after(VALIDITY_CHECK_DELAY_MINUTES * 60 * 1000) // Convert minutes to milliseconds
    .create();

  // Store the trigger ID so we can delete it later
  properties.setProperty(storageKey + "_triggerId", trigger.getUniqueId());

  Logger.log("Scheduled validity check for " + VALIDITY_CHECK_DELAY_MINUTES + " minutes from now. Storage key: " + storageKey);
}

/**
 * Checks if ANY validity form response was submitted for a pending complaint.
 * Called automatically by the time-based trigger after 15 minutes.
 *
 * If no validity response exists:
 * - Sends notification to ASHMC email with complaint details and dorms that didn't respond
 *
 * If at least one validity response exists:
 * - Does nothing (complaint was addressed)
 *
 * After checking, cleans up:
 * - Deletes the stored complaint data from PropertiesService
 * - Removes the trigger that called this function
 */
function checkValidityResponse() {
  var properties = PropertiesService.getScriptProperties();
  var allProperties = properties.getProperties();

  // Find all pending complaint checks (keys starting with "complaint_" but not ending with "_triggerId")
  for (var key in allProperties) {
    if (key.indexOf("complaint_") === 0 && key.indexOf("_triggerId") === -1) {
      var complaintData = JSON.parse(allProperties[key]);
      var complaintTimestamp = complaintData.timestamp;
      var dorms = complaintData.dorms;
      var complaint = complaintData.complaint;
      var official = complaintData.official;

      // Restore test mode flag from stored data
      isTestMode = complaintData.isTest || false;

      if (isTestMode) {
        Logger.log("[TEST MODE] Processing delayed check for test complaint");
      }

      Logger.log("Checking validity response for complaint from: " + complaintTimestamp);

      // Check if any validity form response exists for this complaint timestamp
      var hasResponse = checkForValidityResponse(complaintTimestamp);

      if (!hasResponse) {
        // No response received - notify ASHMC
        sendNoResponseNotification(complaintTimestamp, dorms, complaint, official);
        Logger.log("No validity response found. ASHMC notified.");
      } else {
        Logger.log("Validity response found. No notification needed.");
      }

      // Clean up: delete stored data and trigger
      cleanupValidityCheck(key);
    }
  }
}

/**
 * Checks the Validity form responses to see if any match the given complaint timestamp.
 *
 * @param {string} complaintTimestamp - The timestamp string to search for
 * @returns {boolean} True if a validity response exists, false otherwise
 */
function checkForValidityResponse(complaintTimestamp) {
  var validityForm = FormApp.openById(Validity_ID);
  var responses = validityForm.getResponses();

  // Convert the complaint timestamp to the same format used in validity form
  var targetTimestamp = Utilities.formatDate(
    new Date(complaintTimestamp),
    'GMT',
    "yyyy-MM-dd'T'HH:mm:ss'Z'"
  );

  // Check each validity form response
  for (var i = 0; i < responses.length; i++) {
    var itemResponses = responses[i].getItemResponses();

    // The timestamp is stored in item index 2 of the validity form
    if (itemResponses.length > 2) {
      var responseTimestamp = itemResponses[2].getResponse();

      // Also format this timestamp for comparison
      var formattedResponseTimestamp = Utilities.formatDate(
        new Date(responseTimestamp),
        'GMT',
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      if (formattedResponseTimestamp === targetTimestamp) {
        return true; // Found a matching response
      }
    }
  }

  return false; // No matching response found
}

/**
 * Sends a notification email to ASHMC when no validity response is received within 15 minutes.
 *
 * @param {string} timestamp - The complaint timestamp
 * @param {string[]} dorms - Array of dorm names that didn't respond
 * @param {string} complaint - The original complaint text
 * @param {string} official - "Yes" or "No" indicating if official complaint
 */
function sendNoResponseNotification(timestamp, dorms, complaint, official) {
  var dormsList = Array.isArray(dorms) ? dorms.join(", ") : dorms;
  var complaintType = (official === "Yes") ? "Official" : "Unofficial";

  var recipient = getEmailRecipient(ashmc_email);
  var subject = (isTestMode ? "[TEST] " : "") + "ALERT: No Response to Noise Complaint (" + complaintType + ")";

  var body = "A noise complaint was submitted " + VALIDITY_CHECK_DELAY_MINUTES + " minutes ago, " +
             "but no validity form response has been received.\n\n" +
             "=== COMPLAINT DETAILS ===\n\n" +
             "Timestamp: " + timestamp + "\n\n" +
             "Type: " + complaintType + " Complaint\n\n" +
             "Dorms notified (none have responded): " + dormsList + "\n\n" +
             "Complaint:\n" + complaint + "\n\n" +
             "=== ACTION NEEDED ===\n\n" +
             "Please follow up with the dorm(s) to ensure the complaint is being addressed.";

  MailApp.sendEmail({
    to: recipient,
    subject: subject,
    body: body,
    noReply: true
  });

  Logger.log("No-response notification sent to: " + recipient);
}

/**
 * Cleans up after a validity check by removing stored data and the trigger.
 *
 * @param {string} storageKey - The PropertiesService key for this complaint
 */
function cleanupValidityCheck(storageKey) {
  var properties = PropertiesService.getScriptProperties();

  // Get and delete the trigger
  var triggerId = properties.getProperty(storageKey + "_triggerId");
  if (triggerId) {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getUniqueId() === triggerId) {
        ScriptApp.deleteTrigger(triggers[i]);
        Logger.log("Deleted trigger: " + triggerId);
        break;
      }
    }
  }

  // Delete stored properties
  properties.deleteProperty(storageKey);
  properties.deleteProperty(storageKey + "_triggerId");

  Logger.log("Cleaned up validity check for: " + storageKey);
}

/**
 * Utility function to manually clean up all pending validity checks and triggers.
 * Run this if you need to reset the system or if triggers are accumulating.
 */
function cleanupAllPendingChecks() {
  var properties = PropertiesService.getScriptProperties();
  var allProperties = properties.getProperties();

  // Delete all complaint-related properties
  for (var key in allProperties) {
    if (key.indexOf("complaint_") === 0) {
      properties.deleteProperty(key);
      Logger.log("Deleted property: " + key);
    }
  }

  // Delete all checkValidityResponse triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkValidityResponse') {
      ScriptApp.deleteTrigger(triggers[i]);
      Logger.log("Deleted trigger for checkValidityResponse");
    }
  }

  Logger.log("All pending validity checks cleaned up.");
}

// =============================================================================
// EMAIL SENDING FUNCTIONS
// =============================================================================

/**
 * Returns the appropriate email recipient based on whether this is a test submission.
 * In test mode (complaint from a tester), emails go to TEST_REDIRECT_TO.
 *
 * @param {string} productionEmail - The email to use in production mode
 * @returns {string} TEST_REDIRECT_TO if isTestMode is true, otherwise productionEmail
 */
function getEmailRecipient(productionEmail) {
  if (isTestMode) {
    Logger.log("[TEST MODE] Redirecting email from " + productionEmail + " to " + TEST_REDIRECT_TO);
    return TEST_REDIRECT_TO;
  }
  return productionEmail;
}

/**
 * Sends an official complaint email to a dorm's email list.
 * Uses the "Complaint Email" HTML template.
 *
 * @param {string} complaint - The complaint text
 * @param {string} dorm - The dorm name
 * @param {string} time - Time until quiet hours needed
 * @param {string} list - The email list to send to
 * @param {string} url - The pre-filled validity form URL
 */
function sendEmail(complaint, dorm, time, list, url) {
  if (list == "") {
    Logger.log("Invalid email list for " + dorm);
    return;
  }

  var template = HtmlService.createTemplateFromFile("Complaint Email");
  template.complaint = complaint;
  template.untilTime = time;
  template.url = url;

  var message = template.evaluate();

  var recipient = getEmailRecipient(list);
  var subject = (isTestMode ? "[TEST] " : "") + "Official Noise Complaint for " + dorm;

  MailApp.sendEmail({
    to: recipient,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });

  Logger.log("Official complaint email sent to: " + recipient);
}

/**
 * Sends an unofficial complaint email to a dorm's email list.
 * Uses the "Unofficial Complaint Email" HTML template.
 *
 * @param {string} complaint - The complaint text
 * @param {string} dorm - The dorm name
 * @param {string} time - Time until quiet hours needed
 * @param {string} list - The email list to send to
 * @param {string} url - The pre-filled validity form URL
 */
function sendUnofficialEmail(complaint, dorm, time, list, url) {
  if (list == "") {
    Logger.log("Invalid email list for " + dorm);
    return;
  }

  var template = HtmlService.createTemplateFromFile("Unofficial Complaint Email");
  template.complaint = complaint;
  template.untilTime = time;
  template.url = url;

  var message = template.evaluate();

  var recipient = getEmailRecipient(list);
  var subject = (isTestMode ? "[TEST] " : "") + "Unofficial Noise Complaint for " + dorm;

  MailApp.sendEmail({
    to: recipient,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });

  Logger.log("Unofficial complaint email sent to: " + recipient);
}

/**
 * Sends a feedback form email to the original complainant.
 * Uses the "Feedback Email" HTML template.
 *
 * @param {string} email - The complainant's email address
 * @param {string} url - The pre-filled feedback form URL
 */
function sendFeedbackEmail(email, url) {
  var template = HtmlService.createTemplateFromFile("Feedback Email");
  template.url = url;

  var message = template.evaluate();

  var recipient = getEmailRecipient(email);
  var subject = (isTestMode ? "[TEST] " : "") + "Noise Complaint: Evaluate response to your complaint";

  MailApp.sendEmail({
    to: recipient,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });

  Logger.log("Feedback email sent to: " + recipient);
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Gets the response value for a specific form item by index.
 *
 * @param {number} index - The index of the form item
 * @returns {*} The response value for that item
 */
function getResponse(index) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];
  var items = form.getItems();

  return response.getResponseForItem(items[index]).getResponse();
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

/**
 * Tests reading from the spreadsheet.
 */
function testCheckSheet() {
  var sheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Complaint Email");
  var values = sheet.getDataRange().getValues();

  Logger.log("Last row: " + sheet.getLastRow());
  Logger.log(values[sheet.getLastRow() - 1][0]);
}

/**
 * Tests the validity check function manually.
 * Creates a fake complaint entry and checks for responses.
 */
function testValidityCheck() {
  Logger.log("Testing validity check...");

  // This will check all pending complaints
  checkValidityResponse();

  Logger.log("Test complete.");
}
