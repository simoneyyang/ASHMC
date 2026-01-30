//To set up triggers:
//click the clock icon in the toolbar of this page
//click add new trigger
//Run should be onSubmit and events should be From Form>>On Form Submit
//go to each of the other script files and do the same thing


var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";
var Feedback_ID = "1HKLm-pbNTEcfvg6l4-fF4tALwPJT-bwGqn0IqeiTAq0";
var Validity_ID = "12nCRvEKNf6qt6aEw3Ygk2y8-aONqrkb21o_j6sC1Pwc";
var ashmc_email = "ashmc@g.hmc.edu";

var officialIndex = 0;
var noiseIndex = 2;
var locationIndex = 3;
var complaintIndex = 4;
var timeIndex = 5;

function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];

  var noise = getResponse(noiseIndex);
  Logger.log(noise);

  var sheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Complaints");
  var values = sheet.getDataRange().getValues();

  var official = getResponse(officialIndex);

  var complaint = getResponse(complaintIndex);
  var time = getResponse(timeIndex);
  if (time == "")
    time = "two hours from now";

  var validityURL = "";
  var validityForm = FormApp.openById(Validity_ID);
  var resp = validityForm.createResponse();
  var lastTimestamp = "";
  var row = 0;
  lastTimestamp = response.getTimestamp();
  /*
  for(var i = sheet.getLastRow()-1; i > 0; i --) {
    if(values[i][0] != "") {
      lastTimestamp = values[i][0];
      row = i;
      break;
    }
  }
  */

  //change the timestamp to HMT (Harvey Mudd Time)
  //var date = new Date(lastTimestamp);
  //sheet.getRange(row + 1, 1).setValue(Utilities.formatDate(date, 'America/Los_Angeles', 'HH:mm:ss'));
  //actually this isn't necessary

  //fill in the validity form sent to the respondents with the timestamp of this response
  var timestamp = validityForm.getItems()[2].asTextItem().createResponse(lastTimestamp);
  resp.withItemResponse(timestamp);
  Logger.log(timestamp.getResponse());
  validityURL = resp.toPrefilledUrl();

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

    var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
    values = emailsSheet.getDataRange().getValues();
    for (var i = 0; i < emailsSheet.getLastRow(); i++) {
      if (values[i][0] != "" && values[i][0] == dorm) {
        if (official == "Yes")
          sendEmail(complaint, dorm, time, values[i][1], validityURL);
        else
          sendUnofficialEmail(complaint, dorm, time, values[i][1], validityURL);
      }
    }
  }

  var feedbackForm = FormApp.openById(Feedback_ID)
  var prefil = feedbackForm.createResponse();
  Logger.log(feedbackForm.getItems()[0]);
  var res = feedbackForm.getItems()[0].asParagraphTextItem().createResponse(lastTimestamp);
  prefil.withItemResponse(res)
  var res = feedbackForm.getItems()[1].asCheckboxItem().createResponse(noise);
  prefil.withItemResponse(res);
  Logger.log(response.getRespondentEmail());
  sendFeedbackEmail(response.getRespondentEmail(), prefil.toPrefilledUrl());
}

function sendEmail(complaint, dorm, time, list, url) {
  if (list == "") {
    Logger.log("invalid email list for " + dorm);
    return;
  }
  var template = HtmlService.createTemplateFromFile("Complaint Email");
  template.complaint = complaint;
  template.untilTime = time;
  template.url = url;

  var message = template.evaluate();

  var subject = "Official Noise Complaint for " + dorm;
  // MailApp.sendEmail(list, subject, message.getContent(), { noReply: true });

    MailApp.sendEmail({
    to: list,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });
}

function sendUnofficialEmail(complaint, dorm, time, list, url) {
  if (list == "") {
    Logger.log("invalid email list for " + dorm);
    return;
  }
  var template = HtmlService.createTemplateFromFile("Unofficial Complaint Email");
  template.complaint = complaint;
  template.untilTime = time;
  template.url = url;

  var message = template.evaluate();

  var subject = "Unofficial Noise Complaint for " + dorm;
  // MailApp.sendEmail(list, subject, message.getContent(), { noReply: true });
  
  MailApp.sendEmail({
    to: list,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });
}

function sendFeedbackEmail(email, url) {
  var template = HtmlService.createTemplateFromFile("Feedback Email");
  template.url = url;

  var message = template.evaluate();

  var subject = "Noise Complaint: Evaluate response to your complaint";
  // MailApp.sendEmail(email, subject, message.getContent(), { noReply: true });

  MailApp.sendEmail({
    to: email,
    name: "Noise Complaint",
    subject: subject,
    htmlBody: message.getContent(),
    noReply: true
  });
  // subject line is also email sender's name
}

function testPrintItems() {
  var form = FormApp.getActiveForm();
  for (var i = 0; i < form.getItems().length; i++)
    Logger.log(form.getItems()[i].getTitle());
}

function testCheckSheet() {
  var sheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Complaint Email");
  var values = sheet.getDataRange().getValues();

  Logger.log(sheet.getLastRow());
  Logger.log(values[sheet.getLastRow() - 1][0]);
  Logger.log(values[sheet.getLastRow()][0]);
}

function getResponse(index) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];

  var items = form.getItems();

  return response.getResponseForItem(items[index]).getResponse();
}
