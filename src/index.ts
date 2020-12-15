import movieService from './services/movie';
import LTAOpenDataService from './services/LTAOpenData';
import googleMapsService from './services/googleMaps';

import messageParser from './middlewares/messageParser';

require('dotenv').config();

/** DOCUMENTATION:
 * https://github.com/yagop/node-telegram-bot-api
 * https://telegraf.js.org/
 */



const { Telegraf } = require('telegraf');
const Koa = require('koa');
// body-parser
const koaBody = require('koa-body');
const app = new Koa();
app.use(koaBody());

const port = process.env.PORT || 3000;
const token = process.env.TELEGRAM_APIKEY;
let bot = new Telegraf(token);
// TODO: use inlineKeyboardMarkup to replace this middleware
bot.use(messageParser());
// for deployment
if (process.env.NODE_ENV === 'production') {
  bot.telegram.setWebhook(process.env.HEROKU_URL + bot.token);
} else {
  bot.launch();
  // test
  bot.command('echo', (ctx) => {
    ctx.telegram.sendMessage(ctx.message.chat.id, ctx.state.command.input);
  });
}

// movie
movieService(bot);

// next bus
LTAOpenDataService(bot);

// google food
googleMapsService(bot);

// server
app.use(async (ctx, next) => {
  // TODO: write re-direction to telegram app
  ctx.body = 'Use Telegram App instead of Web Page'; 
  await bot.handleUpdate(ctx.request.body, ctx.response);
  ctx.status = 200;
  return next();
})

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});