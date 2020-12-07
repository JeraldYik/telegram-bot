import axios from 'axios';
import moment from 'moment';

const MAX_NEXTBUS = 2;

interface IParsedData {
  bus: string,
  nextArrival: Array<string>;
}

const LTAOpenDataService = (bot) => {
  const apiKey = process.env.LTADATAMALL_APIKEY;
  const _headers = {'AccountKey' : apiKey};

  bot.onText(/\/bus (.+)/, async (msg, match): Promise<void> => {  
    const busStop = match[1];
    const chatId = msg.chat.id;
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=${busStop}`;
    
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
  });

  bot.onText(/\/traindown/, async (msg): Promise<void> => {  
    const chatId = msg.chat.id;
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts`;
    try {
      const response = await axios.get(uri, {headers: _headers});
      if (response.status === 200) {  
        if (response.data.value.Status === 1) {
          bot.sendMessage(chatId, 'No Train Disruption');
        } else {
          bot.sendMessage(chatId, 'Please take note...\n' + JSON.stringify(response.data.value));
        }
      } else {
        bot.sendMessage(chatId, 'There is an Error!\nReponse Code: ' + response.status.toString());
      }
  
    } catch (err) {
      bot.sendMessage(chatId, 'There is an error! Please try again.\n' + err.toString());
    }

  });



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

export default LTAOpenDataService;


