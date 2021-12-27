import movieService from './services/movie';
import LTAOpenDataService from './services/LTAOpenData';
import googleMapsService from './services/googleMaps';
import firebaseService from './services/firebase';

import messageParser from './middlewares/messageParser';

require('dotenv').config();

/** DOCUMENTATION:
 * https://github.com/yagop/node-telegram-bot-api
 * https://telegraf.js.org/
 */

const { Telegraf, Markup, Extra } = require('telegraf');
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
  bot.command('echo', (ctx) => {
    if (ctx.state.command.input) {
      ctx.reply(ctx.state.command.input);
    } else {
      ctx.reply('Input is empty');
    }
  });
}

// movie
movieService(bot, Markup);

// next bus
LTAOpenDataService(bot, Extra);

// google food
googleMapsService(bot, Markup, Extra);

// firebase (favourite bus list)
firebaseService(bot);

// server
app.use(async (ctx, next) => {
  ctx.redirect('https://t.me/jyik001_test_bot');
  await bot.handleUpdate(ctx.request.body, ctx.response);
  ctx.status = 200;
  return next();
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});
