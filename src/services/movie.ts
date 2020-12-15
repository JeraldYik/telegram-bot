import axios from 'axios';

const movieService = (bot) => {
  bot.command('movie', async (ctx) => {
    const apiKey = process.env.OMDB_APIKEY;
    const chatId = ctx.message.chat.id;
    const movie = ctx.state.command.input;
    const uri = `http://www.omdbapi.com/?apikey=${apiKey}&t=${movie}`;
    try {
      ctx.telegram.sendMessage(chatId, `Querying for '${ctx.state.command.input}'`);
      const response = await axios.get(uri);
      if (response.status === 200) {    
        if (response.data.Response === 'True') {
          ctx.replyWithPhoto({url: response.data.Poster}, {caption: `Result:\nTitle: ${response.data.Title}\nYear: ${response.data.Year}\nReleased: ${response.data.Released}`});
        } else {
          ctx.telegram.sendMessage(chatId, `Error! ${response.data.Error}`);
        }
      } else {
        ctx.telegram.sendMessage(chatId, 'There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      ctx.telegram.sendMessage(chatId, 'There is an error! Please try again.\n' + err.toString());
    }
  });
}

export default movieService;