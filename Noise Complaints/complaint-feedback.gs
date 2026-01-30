/**
 * =============================================================================
 * ASHMC COMPLAINT FEEDBACK FORM HANDLER
 * =============================================================================
 *
 * This script handles submissions from the Complaint Feedback Form.
 * The feedback form is sent to the original complainant after their complaint
 * has been processed, allowing them to provide feedback on how it was handled.
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
 * 1. When a complainant submits feedback, sends their message to the
 *    relevant dorm(s)
 * 2. If the complaint was NOT addressed, notifies ASHMC for follow-up
 *
 * SPREADSHEET STRUCTURE (Results_ID):
 * - "Emails" sheet: Maps dorm names to their email lists
 *   Column A: Dorm name (e.g., "East", "West", "North", "South")
 *   Column B: Email list for that dorm
 *
 * FEEDBACK FORM STRUCTURE (by gradable item index):
 * - Index 0: Timestamp of original complaint (pre-filled)
 * - Index 1: Which dorm(s) was the noise from? (Checkbox, pre-filled)
 * - Index 2: Was your complaint addressed? (Yes/No)
 * - Index 3: Comments about the response
 * - Index 4: Message for the dorm(s)
 *
 * =============================================================================
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Google Spreadsheet ID containing the "Emails" sheet */
var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";

/** ASHMC email - receives notifications when complaints aren't addressed */
var ashmc_email = "ashmc@g.hmc.edu";

// =============================================================================
// MAIN FORM SUBMISSION HANDLER
// =============================================================================

/**
 * Triggered when the feedback form is submitted by the original complainant.
 *
 * Flow:
 * 1. Check if the complainant has a message for the dorm(s)
 * 2. If so, send the message to each relevant dorm's email list
 * 3. Check if the complaint was addressed
 * 4. If not, notify ASHMC for follow-up
 *
 * @param {Object} e - The form submit event object (provided by Google Apps Script)
 */
function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];

  // Get which dorms the complaint was about (checkbox array)
  var noise = response.getGradableItemResponses()[1].getResponse();

  // Get the message the complainant wants to send to the dorms
  var message = response.getGradableItemResponses()[4].getResponse();

  Logger.log("Feedback received. Message: " + message);
  Logger.log("Dorms involved: " + noise);

  // If there's a message, send it to the relevant dorms
  if (message != "") {
    sendMessageToDorms(noise, message);
  }

  // Check if the complaint was addressed
  var addressed = response.getItemResponses()[2].getResponse();

  if (addressed == "No") {
    // Complaint was not addressed - notify ASHMC
    notifyASHMC(response);
  }

  return; // Done processing feedback
}

// =============================================================================
// NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Sends a feedback message from the complainant to the relevant dorm email lists.
 *
 * @param {string[]} dorms - Array of dorm names to send the message to
 * @param {string} message - The feedback message from the complainant
 */
function sendMessageToDorms(dorms, message) {
  for (var d = 0; d < dorms.length; d++) {
    var dorm = dorms[d];

    Logger.log("Processing dorm: " + dorm);

    if (dorm == "") {
      continue;
    }

    // Look up the email list for this dorm
    var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
    var values = emailsSheet.getDataRange().getValues();

    for (var i = 0; i < emailsSheet.getLastRow(); i++) {
      if (values[i][0] != "" && values[i][0] == dorm) {
        Logger.log("Sending feedback to: " + values[i][1]);

        MailApp.sendEmail({
          to: values[i][1],
          subject: "Feedback on the noise complaint that you received from complainant",
          body: message,
          noReply: true
        });
      }
    }
  }
}

/**
 * Notifies ASHMC when a complaint was not addressed.
 * Includes the dorm(s) involved, timestamp, and any comments from the complainant.
 *
 * @param {FormResponse} response - The form response object
 */
function notifyASHMC(response) {
  var dorms = response.getItemResponses()[1].getResponse();
  var timestamp = response.getItemResponses()[0].getResponse();
  var comments = response.getItemResponses()[3].getResponse();

  var body = "A noise complaint was reported as NOT addressed.\n\n" +
             "Dorm(s): " + dorms + "\n" +
             "Original Complaint Timestamp: " + timestamp + "\n" +
             "Complainant's Comments: " + (comments || "None provided");

  MailApp.sendEmail({
    to: ashmc_email,
    subject: "Unaddressed Noise Complaint",
    body: body,
    noReply: true
  });

  Logger.log("Notified ASHMC about unaddressed complaint");
}
