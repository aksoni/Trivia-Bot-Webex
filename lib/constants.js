const uri_string = "mongodb+srv://" + process.env.dbuser + ":" + process.env.dbpassword + 
      "@cluster0-vblnv.mongodb.net/trivia?retryWrites=true&w=majority";

module.exports = Object.freeze({
  CATEGORIES_URL: 'https://opentdb.com/api_category.php',
  TRIVIA_QUESTIONS_URL: 'https://opentdb.com/api.php?amount=1&type=multiple&encode=base64',
  MONGO_URI: uri_string
});