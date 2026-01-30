var Results_ID = "1UhJ2_ohPjlrNULgJyl6ljTK9foeRBuXaw2-fgkvAGKs";

function onSubmit(e) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];
  
  var timestamp = Utilities.formatDate(new Date(getResponse(2)),'GMT',"yyyy-MM-dd'T'HH:mm:ss'Z'");
  Logger.log(timestamp);
  
  var sheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Complaints");
  var values = sheet.getDataRange().getValues(); //array of entries in the spreadsheet (indexed as [y][x])
  
  var dorms_list = ""; //list of dorms the complaint was sent to
  var source = "";
  
  var email = ""; //get the email of the original complainant
  for(var i = 0; i < sheet.getLastRow(); i ++) {
    var val_timestamp = Utilities.formatDate(new Date(values[i][0]),'GMT',"yyyy-MM-dd'T'HH:mm:ss'Z'");
    if(val_timestamp == timestamp) {
      email = values[i][5];
      dorms_list = values[i][1];
      source = values[i][2];
    }
  }
  
  Logger.log(email);
  
  var dorm = getResponse(0);
  var valid = getResponse(1);
  
  //find every other dorm that the complaint was submitted to
  while(true) {
    var index = dorms_list.indexOf(",");
    var current = "";
    if (index < 0)
      current = dorms_list;
    else    
      var current = dorms_list.substring(0, index);
    
    Logger.log("current substring: " + current);
    
    var emailsSheet = SpreadsheetApp.openById(Results_ID).getSheetByName("Emails");
    values = emailsSheet.getDataRange().getValues();
    for(var i = 0; i < emailsSheet.getLastRow(); i ++) {
      if(values[i][0] != "" && values[i][0] == current) {
        var comment = ""; //find the comment to include it in response email
        if(valid == "Yes") {
          comment = getResponse(5);
        } else {
          comment = getResponse(7);
        }
        //send an email to each relevant dorm list (values column 1) saying the complaint was responded to
        MailApp.sendEmail(values[i][1], "Noise Complaint has been responded to.", " " + dorm + 
                          " has responded to the noise complaint from " + source, {noReply: true});
                          // add no-reply variable
      }
    } 
    
    if (index < 0)
      break;
    
    dorms_list = dorms_list.substring(index + 2, dorms_list.length);    
  }  
 
  //if the complaint was valid, send the response
  if(valid == "Yes") {
    var comment = getResponse(5);
    MailApp.sendEmail(email, "Response to your submitted noise complaint", "Response from " + dorm + ":\n\n" + comment,{noReply: true});
    //MailApp.sendEmail(email, "subject", "body");
    
  } else {
  //if the complaint was invalid, send the reason why
    var comment = getResponse(7);
    MailApp.sendEmail(email, "Response to your submitted noise complaint", "The respondents to your noise complaint ("
                      + dorm + ") have responded that it's invalid for the following reason:\n\n" + comment,{noReply: true});
 }
}

function testPrintItems() {
  var form = FormApp.getActiveForm();
  for(var i = 0; i < form.getItems().length; i ++)
    Logger.log(form.getItems()[i].getTitle());
}

function getResponse(index) {
  var form = FormApp.getActiveForm();
  var responses = form.getResponses();
  var response = responses[responses.length - 1];  
  
  var items = form.getItems();
  
  var resp = response.getResponseForItem(items[index]);
  if(resp == null)
    return 0;
  return response.getResponseForItem(items[index]).getResponse();
}