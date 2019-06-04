const mongodb = require('mongodb');
var constants = require('../lib/constants.js');

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
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('rooms');
      rooms.find({roomId:roomId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          const room = {
                roomId: roomId,
                currentPlayer: personId,
                currentQuestion: question,
                currentAnswerLetter: correctAnswerLetter,
                currentAnswerString: correctAnswerString,
              };
          rooms.insertOne(room, function(err, result) {
            if(err) throw err;
          });
        }
        else {
          rooms.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:question, 
                     currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString}},
            function (err, result) {
              if(err) throw err;
            }); 
        }
        db.close(); 
      });
    });
  },
  
  updateUser: async function(roomId, personId, answeredCorrectly) {
    let db;
    let userInfo;
    let numCorrect;
    let numQuestions;
    try {
      db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
      let triviaDatabase = db.db('trivia');
      const users = triviaDatabase.collection('users');
      const result = await users.find({roomId:roomId, personId:personId}).toArray();

      if(result.length === 0) {
        if(answeredCorrectly) numCorrect = 1;
        else numCorrect = 0;
        numQuestions = 1;
        const user = {
          roomId: roomId,
          personId: personId,
          totalCorrect: numCorrect,
          totalQuestions: numQuestions,
        };
        users.insertOne(user, function(err, result) {
          if(err) throw err;
        });
      }
      else {
        numCorrect = result[0].totalCorrect;
        numQuestions = result[0].totalQuestions;
        
        if(answeredCorrectly) {
          numCorrect++;
        }
        numQuestions++;
        
        try {
          await users.updateOne({roomId: roomId, personId: personId}, 
            {$set: {totalCorrect: numCorrect, totalQuestions: numQuestions}},
            function (err, result) {
              if(err) console.log("update error in function");
            }
          ); 
        }
        catch(e) {
          console.log("update user error");
        }
      }
      userInfo = {numCorrect: numCorrect, numQuestions};
    }
    finally {
        db.close();
    }   
    return userInfo;
  },
  
  getQuestionInfo: async function(roomId) {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
    let questionInfo;
    try {
      let triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('rooms');
      let result = await rooms.find({roomId:roomId}).toArray();
      if (result.length === 0) {
        console.log("Room not found.");
      }
      else {
        questionInfo = {personId: result[0].currentPlayer, correctAnswerLetter: result[0].currentAnswerLetter, 
                        correctAnswerString: result[0].currentAnswerString};
      }
    }
    finally {
      db.close();
    }
  return questionInfo;
  },
  
  newChallenge: function(roomId, personId, firstName) {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const challenges = triviaDatabase.collection('challenges');
      challenges.find({roomId:roomId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          const challenge = {
                roomId: roomId,
                currentPlayer: personId,
                currentQuestion: "",
                currentAnswerLetter: "",
                currentAnswerString: "",
                allPlayers:[personId]
              };
          challenges.insertOne(challenge, function(err, result) {
            if(err) throw err;
          });
        }
        else {
          challenges.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:"", 
                     currentAnswerLetter:"",currentAnswerString:"",allPlayers:[personId]}},
            function (err, result) {
              if(err) throw err;
            }); 
        }
        db.close(); 
      });
    });
  },
  
  addUserToChallenge: async function(roomId, personId, firstName) {
    var joinString = "Join failure.";
    let db;
    try {
      db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
      const triviaDatabase = db.db('trivia');
      const challenges = triviaDatabase.collection('challenges');
      const result =  await challenges.find({roomId:roomId}).toArray(); 
      if (result.length === 0) {
        joinString = "Challenge in this room not found";
      }
      else if(result[0].allPlayers.indexOf(personId) >= 0) {
        joinString = "You've joined the challenge already, " + firstName + "!";
        return joinString;
      }
      else {
        console.log("current players");
        console.log(result[0].allPlayers.indexOf(personId))
        console.log(result)
        console.log(result[0].allPlayers);
        const currentPlayers = result[0].allPlayers
        console.log(personId)
        console.log(personId)
        const allPlayers = currentPlayers.concat([personId])
        console.log("all players")
        console.log(allPlayers)
         try {
            await challenges.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:"", 
                   currentAnswerLetter:"",currentAnswerString:"",allPlayers:allPlayers}},
              function (err, result) {
                if(err) console.log("update error in function");
              }
            );
            joinString = "You've been added to the challenge, " + firstName + "!";
          }
          catch(e) {
            console.log("update challenge error");
          }
      }
    }
    catch(e) {
      console.log("Join challenge error");
    }
    finally {
      db.close();
    }

    console.log("final join string")
    console.log(joinString)
    return joinString;
  }
}