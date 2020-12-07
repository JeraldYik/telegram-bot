import axios from 'axios';

const movieService = (bot) => {
  bot.onText(/\/movie (.+)/, async (msg, match): Promise<void> => {
    const apiKey = process.env.OMDB_APIKEY;
    const movie = match[1];
    const chatId = msg.chat.id;
    const uri = `http://www.omdbapi.com/?apikey=${apiKey}&t=${movie}`;
    try {
      bot.sendMessage(chatId, `Querying for '${msg.text.substring(7)}'`);
      const response = await axios.get(uri);
      if (response.status === 200) {    
        if (response.data.Response === 'True') {
          bot.sendPhoto(chatId, response.data.Poster, {caption: `Result:\nTitle: ${response.data.Title}\nYear: ${response.data.Year}\nReleased: ${response.data.Released}`});
        } else {
          bot.sendMessage(chatId, `Error! ${response.data.Error}`);
        }
      } else {
        bot.sendMessage(chatId, 'There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      bot.sendMessage(chatId, 'There is an error! Please try again.\n' + err.toString())
    }
  });
}

export default movieService;