//ID of the results spreadsheet
var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";

var ashmc_email = "ashmc@g.hmc.edu"; //email of the person to email if a complaint isn't adressed

function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];  
  
  var noise = response.getGradableItemResponses()[1].getResponse();
  
  //send a message to the dorms that were making noise
  var message = response.getGradableItemResponses()[4].getResponse();
 
  Logger.log("Message: " + message);
  Logger.log(noise);
  if (message != "") {
    for(var d = 0; d < noise.length; d ++) {
      var dorm = noise[d];
      Logger.log("dorm: " + dorm);
      
      if (dorm == "")
        continue;
      
      //find the email of each dorm that was checked on the form and send them the feedback
      var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
      values = emailsSheet.getDataRange().getValues();
      for(var i = 0; i < emailsSheet.getLastRow(); i ++) {
        if(values[i][0] != "" && values[i][0] == dorm) {
          Logger.log("sending email to dorm: " + values[i][1]);
          MailApp.sendEmail(values[i][1], "Feedback on the noise complaint that you received from complainant",message,{noReply:true});
        }
      }
    }
  }
  
  //if the complaint wasn't responded to, email ASHMC person (senate chair?)  
  var addressed = response.getItemResponses()[2].getResponse();
  if(addressed == "No") {
      MailApp.sendEmail(ashmc_email, "Unaddressed Noise Complaint", "Dorm: " + response.getItemResponses()[1].getResponse() +
    "\nTimestamp: " + response.getItemResponses()[0].getResponse() + 
    "\nComments: " + response.getItemResponses()[3].getResponse());
  } return; // the complaint was addressed and we're done
}
