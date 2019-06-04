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
  
  addQuestionToDB: function(roomId, personId, question, correctAnswerLetter, correctAnswerString) {
    mongodb.MongoClient.connect(uri, {useNewUrlParser: true}, function(err, db) {
    if(err) throw err;
    const triviaDatabase = db.db('trivia')
    var rooms = triviaDatabase.collection('rooms');
    rooms.find({roomId:roomId}).toArray(function(err, result) {
      if (result.length === 0 || err) {
        console.log("Room not found.")
        var room = [{
              roomId: roomId,
              currentPlayer: personId,
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
        rooms.updateOne({ roomId: roomId}, 
          { $set: { currentPlayer: personId, currentQuestion:question, 
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
  },
  
  updateUser: async function(roomId, personId, answeredCorrectly) {

    let db;
    let userInfo;
    let numCorrect;
    let numQuestions;
    try {
      db = await mongodb.MongoClient.connect(uri, {useNewUrlParser: true})
      let triviaDatabase = db.db('trivia')
      var users = triviaDatabase.collection('users');
      let result = await users.find({roomId:roomId, personId:personId}).toArray()

      if(result.length === 0) {
        console.log("User not found.")
        if(answeredCorrectly) numCorrect = 1
        else numCorrect = 0
        numQuestions = 1
        var user = [{
          roomId: roomId,
          personId: personId,
          totalCorrect: numCorrect,
          totalQuestions: numQuestions,
        }]
        users.insert(user, function(err, result) {
          if(err) throw err;
          console.log("insertion success")
        });
      }
      else {
        console.log("User found.")
        numCorrect = result[0].totalCorrect
        numQuestions = result[0].totalQuestions
        
        if(answeredCorrectly) {
          numCorrect++;
        }
        numQuestions++
        
        try {
          await users.updateOne(
            {roomId: roomId, personId: personId}, 
            {$set: {totalCorrect: numCorrect, totalQuestions: numQuestions}},
            function (err, result) {
              if(err) console.log("update error in function");
              else {
                console.log("update success")
              }
            }); 
        }
        catch(e) {
          console.log("update user error")
        }
      }
      
      userInfo = {numCorrect: numCorrect, numQuestions}
    }
    finally {
        db.close();
    }   
    return userInfo
  },
  
  getQuestionInfo: async function(roomId) {
    let db = await mongodb.MongoClient.connect(uri)
    let questionInfo;
    try {
      let triviaDatabase = db.db('trivia')
      var rooms = triviaDatabase.collection('rooms');
     // var answers;
      let result = await rooms.find({roomId:roomId}).toArray()
      if (result.length === 0) {
        console.log("Room not found.")
      }
      else {
        console.log("Answer room found.")
        console.log(result);
        questionInfo = {personId: result[0].currentPlayer, correctAnswerLetter: result[0].currentAnswerLetter, 
                        correctAnswerString: result[0].currentAnswerString}
      }
    }
    finally {
      db.close();
    }
  return questionInfo;
  }
}