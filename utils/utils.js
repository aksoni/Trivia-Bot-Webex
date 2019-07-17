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
      let category;
      let categoryString;
      if (result.length === 0) {
        console.log("Add question to db: Challenge room not found.")
        // const challenge = {
        //       roomId: roomId,
        //       currentPlayer: personId,
        //       currentQuestion: "",
        //       currentAnswerLetter: "",
        //       currentAnswerString: "",
        //       players:[personId],
        //       scores:[{
        //         id: personId,
        //         numCorrect: 0,
        //         numQuestions: 0
        //       }] 
        //     };
        // challenges.insertOne(challenge, function(err, result) {
        //   if(err) throw err;
        // });
      }
      else {
        let numQuestions = result[0].totalQuestions;
        numQuestions++;
        challenges.updateOne({roomId: roomId}, {$set: {totalQuestions: numQuestions, currentPlayer: personId, currentQuestion:question, 
                   currentAnswerLetter:correctAnswerLetter,currentAnswerString:correctAnswerString,}},
          function (err, result) {
            if(err) throw err;
          }); 
        category = result[0].category;
      }
      let replyString = "----------CHALLENGE MODE----------\n"
      replyString += await module.exports.getCategory(category)
      
      return replyString
      db.close();
    }
    
  },
  
  getCategory: async function(category) {
    const response = await fetch(constants.CATEGORIES_URL);
    const categories_object = await response.json();
    let categoryName = "All";
    if(category !== "") {
      categoryName = categories_object.trivia_categories[Number(category) - 9].name;
    }
    let categoryString = "Category - " + categoryName + "\n\n";
    return categoryString;
    
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
        db.close();
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
          
          if(!personFound) {
            console.log("Person not found.");
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
        db.close();
        return replyString;
      }
    }
    finally {
        db.close();
    }   
   // return userInfo;
  },
  
  getQuestionInfo: async function(roomId, challengeModeOn) {
    let db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true});
    let questionInfo = "";
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
  
  createChallenge: function(roomId, personId, firstName, selectedCategory, email) {
    mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true}, function(err, db) {
      if(err) throw err;
      const triviaDatabase = db.db('trivia');
      const challenges = triviaDatabase.collection('challenges');
      challenges.find({roomId:roomId}).toArray(function(err, result) {
        if (result.length === 0 || err) {
          const challenge = {
                roomId: roomId,
                category: selectedCategory,
                currentPlayer: personId,
                currentQuestion: "",
                currentAnswerLetter: "",
                currentAnswerString: "",
                players:[personId],
                totalQuestions: 0,
                scores:[{
                  id: personId,
                  email: email,
                  numCorrect: 0,
                  numQuestions: 0
                }] 
              };
          challenges.insertOne(challenge, function(err, result) {
            if(err) throw err;
          });
          
          module.exports.setRoomStatus(roomId, true, false, false);
        }
        else {
          challenges.updateOne({roomId: roomId}, {$set: {category: selectedCategory, 
                     currentPlayer: personId, currentQuestion:"",
                     currentAnswerLetter:"",currentAnswerString:"",players:[personId], totalQuestions: 0,
                      scores:[{id: personId, email: email, numCorrect: 0, numQuestions: 0}]}},
            function (err, result) {
              if(err) throw err;
            });
          module.exports.setRoomStatus(roomId, true, false, false);
        }
        db.close(); 
      });
    });
  },
  
  addUserToChallenge: async function(roomId, personId, firstName, email) {
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
            let scores = result[0].scores;
            
            let newScores = scores.concat([{id: personId, email: email, numCorrect: 0, numQuestions: 0}]);
            for(let i = 0; i < newScores.length; i++) {
              console.log(newScores[i]);
            }
            await challenges.updateOne({roomId: roomId}, {$set: {players:players,scores:newScores}},
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
              challengeModeOn: false,
              questionAnswered: false,
              challengeStarted: false
            };
        await rooms.insertOne(room, function(err, result) {
          if(err) throw err;
        });
        db.close();
        return {challengeModeOn: room.challengeModeOn, questionAnswered: room.questionAnswered, challengeStarted: room.challengeStarted};
      }
      else {
        console.log("get room status: Room status found.");
        db.close();
        return {challengeModeOn: result[0].challengeModeOn, questionAnswered: result[0].questionAnswered, challengeStarted: result[0].challengeStarted};
      }
  },
  
   getChallenge: async function(roomId) {
    let db;
    db = await mongodb.MongoClient.connect(constants.MONGO_URI, {useNewUrlParser: true})
    const triviaDatabase = db.db('trivia');
      const rooms = triviaDatabase.collection('challenges');
      const result = await rooms.find({roomId:roomId}).toArray();
      if (result.length === 0) {
        console.log("Get challenge: Room not found.")
        db.close();
        return "";
      }
      else {
        console.log("get challenge status: challenge found.");
        db.close();
        return result;
      }
  },
  
  setRoomStatus: async function(roomId, challengeModeOn, questionAnswered, challengeStarted) {
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
        await rooms.updateOne({roomId: roomId}, {$set: {challengeModeOn: challengeModeOn, questionAnswered: questionAnswered, challengeStarted: challengeStarted}});
        console.log("Challenge mode on changed to " + challengeModeOn);
        console.log("Question answered changed to " + questionAnswered);
        console.log("Challenge started changed to " + challengeStarted);
    }
    
    db.close();
  },
  
  quitChallenge: async function(roomId) {
    await module.exports.setRoomStatus(roomId, false, false, false);
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
      db.close();
      return {numCorrect: -1, numQuestion: -1};
    }
    else {
      console.log("Challenge result")
      console.log(result)
      for(let i = 0; i < result[0].scores.length; i++) {
        console.log("Scores: " + result[0].scores[i].id);
        if(result[0].scores[i].id === personId) {
          console.log("found person " + personId);
          let numCorrect = result[0].scores[i].numCorrect;
          let numQuestions = result[0].scores[i].numQuestions;
          db.close();
          return {numCorrect: numCorrect, numQuestions: numQuestions};
        }
      }
      console.log("person not found in scores")
      db.close();
      return {numCorrect: -1, numQuestions: -1};
    }
  },
  
}