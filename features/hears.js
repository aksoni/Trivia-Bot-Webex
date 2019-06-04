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
  
  hitMe: async function(bot, roomId, personId, query, firstName){
    const letters = "ABCD";
    const questionWords = ["Who", "What", "Where", "When", "Why", "How", "Of", "Which", "In", "The", "A", "This", "What's", "When's", "Where's", "Why's", "How's", "At", "Is", "Are", "To", "Whose", "Whom"];
    const selectedCategory = query.slice(query.indexOf('hit me') + 'hit me'.length).trim();

    let categoryString = "";
    if(selectedCategory !== ""){
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
    const correctAnswerLetter = letters.charAt(shuffledChoices.indexOf(correctAnswerString));
    let questionString = firstName + ", " + question + "\n";

    for(let i = 0; i < choices.length; i++){
        questionString = questionString + "\n" + letters.charAt(i) + ") " + choices[i];
     }
    
    utils.addQuestionToDB(roomId, personId, question, correctAnswerLetter, correctAnswerString);
    
    await bot.say(questionString);
  },
  
  answer: async function(bot, roomId, personId, query, firstName) {
    const questionInfo = await utils.getQuestionInfo(roomId);
    
    const originalPerson = questionInfo.personId;
    
    if(originalPerson !== personId) {
      bot.say("Sorry, " + firstName + ", it's not your turn!");
    }
    else {
      let userInfo;
      const correctAnswerLetter = questionInfo.correctAnswerLetter;
      const correctAnswerString = questionInfo.correctAnswerString;
      let replyString = "";
      const selectedChoice = query.slice(query.indexOf('answer') + 'answer'.length).trim();
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
    }
  }  
}