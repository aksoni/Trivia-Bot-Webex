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
  
  addQuestionToDB: async function(roomId, personId, question, correctAnswerLetter, correctAnswerString, challengeModeOn) {
    let db;
    db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    if(!challengeModeOn) {
      console.log("Adding to open rooms.")
      const rooms = triviaDatabase.collection('openRooms');
      const result = await rooms.find({roomId:roomId}).toArray()
      console.log(result);
      if (result.length === 0) {
        const room = {
              roomId: roomId,
              currentPlayer: personId,
              currentQuestion: question,
              currentAnswerLetter: correctAnswerLetter,
              currentAnswerString: correctAnswerString,
            };
        await rooms.insertOne(room, function(err, result) {
          if(err) throw err;
          else console.log("Added to open room.")
        });
      }
      else {
        await rooms.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:question, 
                   currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString}},
          function (err, result) {
            if(err) throw err;
          }); 
      }
      db.close(); 
      return "";
    }
    else {
      console.log("Challenge mode is on.");
      const challenges = triviaDatabase.collection('challenges');
      const result = await challenges.find({roomId:roomId}).toArray()
      if (result.length === 0) {
        const challenge = {
              roomId: roomId,
              currentPlayer: personId,
              currentQuestion: "",
              currentAnswerLetter: "",
              currentAnswerString: "",
              players:[personId],
              scores:[{
                id: personId,
                numCorrect: 0,
                numQuestions: 0
              }] 
            };
        challenges.insertOne(challenge, function(err, result) {
          if(err) throw err;
        });
      }
      else {
        challenges.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:question, 
                   currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString,}},
          function (err, result) {
            if(err) throw err;
          }); 
      }
      return "----------CHALLENGE MODE----------\n\n"
      db.close();
    }
    
  },
  
  updateUser: async function(roomId, personId, firstName, answeredCorrectly, challengeModeOn) {
    let db;
    let userInfo;
    let numCorrect;
    let numQuestions;
    try {
      db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
      const triviaDatabase = db.db('trivia');
      if(!challengeModeOn) {
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
        let replyString = "You have now answered " + userInfo.numCorrect + " out of " + userInfo.numQuestions + " questions correctly.";
        return replyString;
      }
      else {
        console.log("Updating user challenge stats.");
        const challenge = triviaDatabase.collection('challenges');
        const result = await challenge.find({roomId:roomId}).toArray();

        if(result.length === 0) {
          console.log("Challenge not found when updating user.")
        }
        else {
          console.log("Challenge result")
          console.log(result)
          let personFound = false;
          for(let i = 0; i < result[0].scores.length && !personFound; i++) {
            if(result[0].scores[i].id === personId) {
              console.log("found person " + personId);
              numCorrect = result[0].scores[i].numCorrect;
              numQuestions = result[0].scores[i].numQuestions;
              personFound = true
            }
          }
          
          if(answeredCorrectly) {
            numCorrect++;
          }
          numQuestions++;

          try {
            await challenge.updateOne({roomId: roomId, 'scores.id': personId}, 
              {$set: {'scores.$.numCorrect':numCorrect, 'scores.$.numQuestions': numQuestions}},
              function (err, result) {
                if(err) console.log("update error in function");
              }
            ); 
          }
          catch(e) {
            console.log("update user error");
          }
        }
        userInfo = {numCorrect: numCorrect, numQuestions: numQuestions};
        console.log("Challenge reply.");
        let replyString = "You have now answered " + numCorrect + " out of " + numQuestions + " questions correctly.";
        if(numQuestions === constants.NUM_CHALLENGE_QUESTIONS) {
          replyString += "\nYou've finished your turn, " + firstName + "! You finished with a final score of " + numCorrect + "!";
        }
        return replyString;
      }
    }
    finally {
        db.close();
    }   
    return userInfo;
  },
  
  getQuestionInfo: async function(roomId, challengeModeOn) {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
    let questionInfo;
    try {
      const triviaDatabase = db.db('trivia');
      if(!challengeModeOn) {
        console.log("Searching for open rooms.")
        const rooms = triviaDatabase.collection('openRooms');
        const result = await rooms.find({roomId:roomId}).toArray();
        if (result.length === 0) {
          console.log("Room not found.");
        }
        else {
          questionInfo = {personId: result[0].currentPlayer, correctAnswerLetter: result[0].currentAnswerLetter, 
                          correctAnswerString: result[0].currentAnswerString};
        }
      }
      else {
        console.log("Answering challenge question.");
        const challenges = triviaDatabase.collection('challenges');
        const result = await challenges.find({roomId:roomId}).toArray();
        if (result.length === 0) {
          console.log("Room not found.");
        }
        else {
          questionInfo = {personId: result[0].currentPlayer, correctAnswerLetter: result[0].currentAnswerLetter, 
                          correctAnswerString: result[0].currentAnswerString};
        }
      }
    }
    finally {
      db.close();
    }
  return questionInfo;
  },
  
  createChallenge: function(roomId, personId, firstName) {
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
                players:[personId],
                scores:[{
                  id: personId,
                  numCorrect: 0,
                  numQuestions: 0
                }] 
              };
          challenges.insertOne(challenge, function(err, result) {
            if(err) throw err;
          });
          
          module.exports.setRoomStatus(roomId, true);
        }
        else {
          challenges.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:"", 
                     currentAnswerLetter:"",currentAnswerString:"",players:[personId], 
                      scores:[{id: personId, numCorrect: 0, numQuestions: 0}]}},
            function (err, result) {
              if(err) throw err;
            });
          module.exports.setRoomStatus(roomId, true);
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
      else if(result[0].players.indexOf(personId) >= 0) {
        joinString = "You've joined the challenge already, " + firstName + "!";
        return joinString;
      }
      else {
        console.log("current players");
        console.log(result[0].players.indexOf(personId))
        console.log(result)
        console.log(result[0].players);
        const currentPlayers = result[0].players
        console.log(personId)
        console.log(personId)
        const players = currentPlayers.concat([personId])
        console.log("all players")
        console.log(players)
         try {
            await challenges.updateOne({roomId: roomId}, {$set: {currentPlayer: personId, currentQuestion:"", 
                   currentAnswerLetter:"",currentAnswerString:"",players:players}},
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
  },
  
  getRoomStatus: async function(roomId) {
    let db;
    db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('roomStatus');
      const result = await rooms.find({roomId:roomId}).toArray();
      console.log("GRS result");
      console.log(result);
      if (result.length === 0) {
        console.log("Get room status: Room status not found.")
        const room = {
              roomId: roomId,
              challengeModeOn: false
            };
        await rooms.insertOne(room, function(err, result) {
          if(err) throw err;
        });
        return room.challengeModeOn;
      }
      else {
        console.log("get room status: Room status found.")
        return result[0].challengeModeOn;
      }
  },
  
  setRoomStatus: async function(roomId, challengeModeOn) {
    let db;
    db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
    const rooms = triviaDatabase.collection('roomStatus');
    const result = await rooms.find({roomId:roomId}).toArray();
    console.log("SRS result");
    console.log(result);
    if (result.length === 0) {
      console.log("Set room status: Room status not found.");
    }
    else {
        await rooms.updateOne({roomId: roomId}, {$set: {challengeModeOn: challengeModeOn}});
        console.log("Challenge status changed to " + challengeModeOn);
    }
  },
  
  quitChallenge: async function(roomId) {
    await module.exports.setRoomStatus(roomId, false);
    return "Challenge has been quit.";
  },
  
  getPersonScore: async function(roomId, personId) {
    const db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
    const triviaDatabase = db.db('trivia');
    console.log("Getting person score.");
    const challenge = triviaDatabase.collection('challenges');
    const result = await challenge.find({roomId:roomId}).toArray();
    if(result.length === 0) {
      console.log("Challenge not found when updating user.")
    }
    else {
      console.log("Challenge result")
      console.log(result)
      for(let i = 0; i < result[0].scores.length; i++) {
        if(result[0].scores[i].id === personId) {
          console.log("found person " + personId);
          let numCorrect = result[0].scores[i].numCorrect;
          let numQuestions = result[0].scores[i].numQuestions;
          return {numCorrect: numCorrect, numQuestions: numQuestions};
        }
      }
    }
  } 
  
}