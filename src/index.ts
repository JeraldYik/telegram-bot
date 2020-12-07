import movieService from './services/movie';
import nextBusService from './services/nextBus';


const TelegramBot = require('node-telegram-bot-api');
const token = '1450722469:AAEMALU_aa5RxOT9dFpw6WmFDnOp3urPYQo';
const bot = new TelegramBot(token, {polling: true});

// test
bot.onText(/\/echo (.+)/, (msg, match): void => {
  const chatId = msg.chat.id;
  const resp = match[1]; 

  bot.sendMessage(chatId, resp);
});

// movie
movieService(bot);

// next bus
nextBusService(bot);