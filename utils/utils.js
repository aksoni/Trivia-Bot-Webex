const mongodb = require('mongodb')
var uri = "mongodb+srv://" + process.env.dbuser + ":" + process.env.dbpassword + "@cluster0-vblnv.mongodb.net/trivia?retryWrites=true&w=majority";

module.exports = {
  
  shuffle: function(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
  },
  
  addQuestionToDB: function(message, question, correctAnswerLetter, correctAnswerString) {
    mongodb.MongoClient.connect(uri, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    rooms.find({roomId:message.roomId}).toArray(function(err, result) {
      if (result.length === 0 || err) {
        console.log("Room not found.")
        var room = [{
              roomId: message.roomId,
              currentPlayer: message.personId,
              currentQuestion: question,
              currentAnswerLetter: correctAnswerLetter,
              currentAnswerString: correctAnswerString,
              allPlayers:''
            }]
        rooms.insert(room, function(err, result) {
          if(err) throw err;
          console.log("insertion success")
        });
      }
      else {
        console.log("Room found.")
        rooms.update({ roomId: message.roomId}, 
          { $set: { currentPlayer: message.personId, currentQuestion:question, 
                   currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString } },
          function (err, result) {

            if(err) throw err;
            else{
              console.log("update success")
            }
          }); 
      }
      db.close() });
    });
  }
}