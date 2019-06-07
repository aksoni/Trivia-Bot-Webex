const utils = require('../utils/utils.js');
const atob = require('atob');
const constants = require('../lib/constants.js');
const emailConverter = require('../utils/emailConverter.js');

module.exports = {
  
  help: async function(bot, firstName) {
    let helpMessage = "";
    
    helpMessage += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions"
    + " and you will have to choose from the 4 choices given.\n\n";
    helpMessage += "There are two modes of play. First is open mode, where anyone can freely ask questions from any category.\n"
    helpMessage += "Second is challenge mode, where each player gets 5 turns to answer trivia questions.\n\n"
    helpMessage += "To start challenge mode: \'@Trivia challenge <category number> (optional)\'\n";
    helpMessage += "To join a challenge that has been created: \'@Trivia join\'\n";
    helpMessage += "To get a question: \'@Trivia hit me <category number> (optional)\'\n";
    helpMessage += "To answer a question: \'@Trivia answer <letter choice>\'\n"
    helpMessage += "To see the categories: \'@Trivia categories\'\n";
    
    await bot.say(helpMessage);
  },
  
  categories: async function(bot) {
    const response = await fetch(constants.CATEGORIES_URL);
    const categories_object = await response.json();
    
    let categories = "Categories\n";
    
    for(let i = 0; i < categories_object.trivia_categories.length; i++) {
      categories += categories_object.trivia_categories[i].name + ": " + categories_object.trivia_categories[i].id + "\n";
    }
        
    await bot.say(categories);
  },
  
  hitMe: async function(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn, challengeStarted){
    
    if(challengeModeOn) {
      let status = await utils.getChallenge(roomId)
      let totalQuestions = status[0].totalQuestions;
      console.log(totalQuestions);
      console.log(questionAnswered)
      if(challengeStarted && !questionAnswered)
      {
        await bot.say("No skipping questions, " + firstName + "!");
        return;
      }
    }
    if(challengeModeOn) {
      let personInfo = await utils.getPersonScore(roomId, personId);
      console.log("PERSON INFO: " + personInfo);
      if(personInfo.numQuestions === -1) {
        await bot.say("You haven't joined the challenge yet, " + firstName + "! Type \'@Trivia join\' to enter the challenge.");
        return;
      }
      if(personInfo.numQuestions === constants.NUM_CHALLENGE_QUESTIONS){
        await bot.say("Your turn is finished, " + firstName + "! Next player type @Trivia hit me");
        return;
      }
      
    }
    const letters = ["A", "B", "C", "D"];
    const questionWords = ["Who", "What", "Where", "When", "Why", "How", "Of", "Which", "In", "The", "A", "This", 
                           "What's", "When's", "Where's", "Why's", "How's", "At", "Is", "Are", "To", "Whose", "Whom", "Painter"];
    let selectedCategory;
    if(challengeModeOn){
      let challengeInfo = await utils.getChallenge(roomId);
      selectedCategory = challengeInfo[0].category;
      console.log("selected category: " + selectedCategory);
    }
    else{
      selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();
    }

    let categoryString = "";
    if(selectedCategory !== "" && (isNaN(Number(selectedCategory)) || Number(selectedCategory) < 9 || Number(selectedCategory) > 32)){
      await bot.say("Please select a valid category. Enter '@Trivia categories' to see the available categories.");
      return;
    }
    else if(Number(selectedCategory) >=9 && Number(selectedCategory) <= 32){
      categoryString = "&category=" + selectedCategory;
    }

    const response = await fetch(constants.TRIVIA_QUESTIONS_URL + categoryString);
    const trivia_object = await response.json();

    const results = trivia_object.results[0];
    let question =  atob(results.question).trim();
    const firstWord = question.substr(0, question.indexOf(' '))
    if(questionWords.indexOf(firstWord) >= 0) {
      question = question.charAt(0).toLowerCase() + question.slice(1)
    }
    const correctAnswerString = atob(results.correct_answer).trim();
    const incorrectStrings = [atob(results.incorrect_answers[0].trim()), 
                            atob(results.incorrect_answers[1].trim()), atob(results.incorrect_answers[2].trim())];
    const choices = [correctAnswerString].concat(incorrectStrings);
    const shuffledChoices = utils.shuffle(choices);
    const correctAnswerLetter = letters[shuffledChoices.indexOf(correctAnswerString)];
    
    
    let questionString = await utils.addQuestionToDB(roomId, personId, question, correctAnswerLetter, correctAnswerString, challengeModeOn);
    
    questionString += firstName + ", " + question + "\n";

    for(let i = 0; i < choices.length; i++){
        questionString = questionString + "\n" + letters[i] + ") " + choices[i];
     }
    
    await bot.say(questionString);
    
    if(challengeModeOn)
      challengeStarted = true
    questionAnswered = false
    await utils.setRoomStatus(roomId, challengeModeOn, questionAnswered, challengeStarted);
  },
  
  answer: async function(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn, challengeStarted) {
    const letters = ["A", "B", "C", "D"];
    if(letters.indexOf(query.substr('answer'.length).trim().toUpperCase()) < 0){
      await bot.say("Invalid answer choice. Please select A, B, C, or D.");
      return;
    }
    if(questionAnswered){
      await bot.say("This question has already been answered, " + firstName + "! Enter \'@Trivia hit me\' to get another question.")
      return;
    }
    
    const questionInfo = await utils.getQuestionInfo(roomId, challengeModeOn);
    
    const originalPerson = questionInfo.personId;
    
    if(originalPerson !== personId) {
      await bot.say("Sorry, " + firstName + ", it's not your turn!");
      return;
    }
    else {
      let userInfo;
      const correctAnswerLetter = questionInfo.correctAnswerLetter;
      const correctAnswerString = questionInfo.correctAnswerString;
      let replyString = "";
      const selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim().toUpperCase();
      if(selectedChoice === correctAnswerLetter) {
        replyString += "Good job, " + firstName + ", " + correctAnswerLetter + ") " + correctAnswerString + " is correct!\n";
       // userInfo = await utils.updateUser(roomId, personId, true, challengeModeOn);
        replyString += await utils.updateUser(roomId, personId, firstName, true, challengeModeOn)
      }
      else {
        replyString += "Sorry, " + firstName + ", that is incorrect. The correct answer is " + 
                       correctAnswerLetter + ") " + correctAnswerString + ".\n";
       // userInfo = await utils.updateUser(roomId, personId, false, challengeModeOn);
        replyString += await utils.updateUser(roomId, personId, firstName, false, challengeModeOn)
      }
           
      //replyString += "You have now answered " + userInfo.numCorrect + " out of " + userInfo.numQuestions + " questions correctly.";
      
      await bot.say(replyString);
      questionAnswered = true;
      await utils.setRoomStatus(roomId, challengeModeOn, questionAnswered, challengeStarted);
    }
  },
  
  challenge: async function(bot, roomId, personId, query, firstName, challengeModeOn, questionAnswered, email) {
    const selectedCategory = query.slice(query.indexOf('challenge') + 'challenge'.length).trim();
    let categoryString = "";
    if(challengeModeOn) {
      await bot.say("Challenge has already been created. Enter \'@Trivia hit me\' to begin.");
      return {challengeModeOn: challengeModeOn, questionAnswered: questionAnswered};
    }
    else if(selectedCategory !== "" && (isNaN(Number(selectedCategory)) || Number(selectedCategory) < 9 || Number(selectedCategory) > 32)){
      await bot.say("Please select a valid category. Enter '@Trivia categories' to see the available categories.");
      return {challengeModeOn: false, questionAnswered: questionAnswered};
    }
    else if(Number(selectedCategory) >=9 && Number(selectedCategory) <= 32){
      categoryString = "&category=" + selectedCategory;
    }
    
    utils.createChallenge(roomId, personId, firstName, selectedCategory, email);
    await bot.say("A new challenge has been started! You've been added, " + firstName + ". Other players can join by entering \'@Trivia join\'.");
    return {challengeModeOn: true, questionAnswered: false};
  },
  
  joinChallenge: async function(bot, roomId, personId, firstName, email) {
    const joinString = await utils.addUserToChallenge(roomId, personId, firstName, email);
    await bot.say(joinString);
  },
  
  check: async function(bot, roomId) {
    const challenge = await utils.getChallenge(roomId);
    let checkString = "-----Scores-----\n";
    for(let i = 0; i < challenge[0].scores.length; i++) {
      let name = await emailConverter.emailToNickname(challenge[0].scores[i].email);
      checkString += name + ": "
      checkString += challenge[0].scores[i].numCorrect + "/";
      checkString += challenge[0].scores[i].numQuestions + "\n";
    }
    await bot.say(checkString);
  },
  
  quit: async function(bot, roomId) {
    const replyString = await utils.quitChallenge(roomId);
    await bot.say(replyString);
    return false;
  }
}