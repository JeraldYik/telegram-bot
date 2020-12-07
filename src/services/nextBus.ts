import axios from 'axios';
import moment from 'moment';

const MAX_NEXTBUS = 2;

interface IParsedData {
  bus: string,
  nextArrival: Array<string>;
}

const nextBusService = (bot) => {
  bot.onText(/\/bus (.+)/, async (msg, match): Promise<void> => {
    const apiKey = 'ZXPAGGVFQNyAIq5X28vwZw==';
    const busStop = match[1];
    const chatId = msg.chat.id;
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=${busStop}`;
    const _headers = {'AccountKey' : apiKey};
  
    try {
      const response = await axios.get(uri, {headers: _headers});
      bot.sendMessage(chatId, `Querying for Bus Stop #${response.data.BusStopCode}`);
      if (response.status === 200) {    
        if (response.data.Services.length > 0) {
          const parsedData = parseData(response.data.Services);
          let s = `Bus Stop #${response.data.BusStopCode}\n---------------------------\n`;
          parsedData.forEach(d => {
            s += `Bus ${d.bus}:\n\t`;
            d.nextArrival.forEach(n => {
              s += `${n}. `;
            });
            s += '\n';
          });
          bot.sendMessage(chatId, s);
        } else {
          bot.sendMessage(chatId, `Bus Stop not found!`);
        }
      } else {
        bot.sendMessage(chatId, 'There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      bot.sendMessage(chatId, 'There is an error! Please try again.\n' + err.toString());
    }
  })

  const parseData = (data): Array<IParsedData> => {
    const returnArr: Array<IParsedData> = [];
    data.forEach(d => {
      const aux: IParsedData = {} as IParsedData;
      const keys = Object.keys(d);
      aux.bus = d.ServiceNo; 
      aux.nextArrival = [];
      for(var i=2; i<2+MAX_NEXTBUS; i++) {
        if(i <= keys.length) {
          aux.nextArrival.push(moment(d[keys[i]].EstimatedArrival).fromNow());
        }
      }
      returnArr.push(aux);
    });
    return returnArr;
  }
}

export default nextBusService;


