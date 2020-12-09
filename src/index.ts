import movieService from './services/movie';
import LTAOpenDataService from './services/LTAOpenData';

require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(bodyParser.json());

const port = process.env.PORT || 8080;

/** DOCUMENTATION:
 * https://github.com/yagop/node-telegram-bot-api
 */

const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TELEGRAM_APIKEY;
let bot;
// for deployment
if (process.env.NODE_ENV === 'production') {
  bot = new TelegramBot(token);
  bot.setWebHook(process.env.HEROKU_URL + bot.token);
} else {
  bot = new TelegramBot(token, { polling: true });
}

// test
bot.onText(/\/echo (.+)/, (msg, match): void => {
  const chatId = msg.chat.id;
  const resp = match[1]; 

  bot.sendMessage(chatId, resp);
});

// movie
movieService(bot);

// next bus
LTAOpenDataService(bot);

// server
app.listen(port, function() {
  console.log(`Listening on http://localhost:${port}`);
});

app.post('/' + bot.token, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});