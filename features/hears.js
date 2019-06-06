const utils = require('../utils/utils.js');
const atob = require('atob');
const constants = require('../lib/constants.js');

module.exports = {
  
  help: async function(bot, firstName) {
    let helpMessage = "";
    
    helpMessage += "Hi, " + firstName + "! I'm Trivia Timmy! I will ask trivia questions"
    + " and you will have to choose from the 4 choices given.\n\n";
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
  
  hitMe: async function(bot, roomId, personId, query, firstName, questionAnswered, challengeModeOn){
    const letters = ["A", "B", "C", "D"];
    const questionWords = ["Who", "What", "Where", "When", "Why", "How", "Of", "Which", "In", "The", "A", "This", 
                           "What's", "When's", "Where's", "Why's", "How's", "At", "Is", "Are", "To", "Whose", "Whom", "Painter"];
    const selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();

    let categoryString = "";
    if(selectedCategory !== "" && (isNaN(Number(selectedCategory)) || Number(selectedCategory) < 9 || Number(selectedCategory) > 32)){
      await bot.say("Please select a valid category. Enter '@Trivia categories' to see the available categories.");
      return questionAnswered;
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
    
    return false;
  },
  
  answer: async function(bot, roomId, personId, query, firstName, questionAnswered) {
    const letters = ["A", "B", "C", "D"];
    if(letters.indexOf(query.substr('answer'.length).trim().toUpperCase()) < 0){
      await bot.say("Invalid answer choice. Please select A, B, C, or D.");
      return false;
    }
    if(questionAnswered){
      await bot.say("This question has already been answered, " + firstName + "! Enter \'@Trivia hit me\' to get another question.")
      return true;
    }
    
    const questionInfo = await utils.getQuestionInfo(roomId);
    
    const originalPerson = questionInfo.personId;
    
    if(originalPerson !== personId) {
      await bot.say("Sorry, " + firstName + ", it's not your turn!");
      return false;
    }
    else {
      let userInfo;
      const correctAnswerLetter = questionInfo.correctAnswerLetter;
      const correctAnswerString = questionInfo.correctAnswerString;
      let replyString = "";
      const selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim().toUpperCase();
      if(selectedChoice === correctAnswerLetter) {
        replyString += "Good job, " + firstName + ", " + correctAnswerLetter + ") " + correctAnswerString + " is correct!\n";
        userInfo = await utils.updateUser(roomId, personId, true);
      }
      else {
        replyString += "Sorry, " + firstName + ", that is incorrect. The correct answer is " + 
                       correctAnswerLetter + ") " + correctAnswerString + ".\n";
        userInfo = await utils.updateUser(roomId, personId, false);
      }
           
      replyString += "You have now answered " + userInfo.numCorrect + " out of " + userInfo.numQuestions + " questions correctly.";
      await bot.say(replyString);
      return true;
    }
  },
  
  challenge: async function(bot, roomId, personId, firstName) {
    utils.newChallenge(roomId, personId, firstName);
    await bot.say("A new challenge has been started! You've been added, " + firstName + ". Other players can join by entering \'@Trivia join\'.");
    return true;
  },
  
  joinChallenge: async function(bot, roomId, personId, firstName) {
    const joinString = await utils.addUserToChallenge(roomId, personId, firstName)
    await bot.say(joinString)
  }
}