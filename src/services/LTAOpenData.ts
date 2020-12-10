import axios from 'axios';
import moment from 'moment';

/** DOCUMENTATION:
 * https://www.mytransport.sg/content/dam/datamall/datasets/LTA_DataMall_API_User_Guide.pdf
 */

const MAX_NEXTBUS = 2;

interface IHeaders {
  'AccountKey': string
}
interface IParsedData {
  bus: string,
  nextArrival: Array<string>;
}

const LTAOpenDataService = (bot) => {
  const apiKey: string = process.env.LTADATAMALL_APIKEY ? process.env.LTADATAMALL_APIKEY : '';
  const _headers: IHeaders = {'AccountKey' : apiKey};

  const GREEN_CIRCLE = '\uD83D\uDFE2'; 
  const ORANGE_CIRCLE = '\uD83D\uDFE0';
  const RED_CIRCLE = '\uD83D\uDD34';

  bot.onText(/\/bus (.+)/, async (msg, match): Promise<void> => {  
    const busStop = match[1];
    const chatId = msg.chat.id;
    let foundBusStop;
    if (!/^\d{5}$/.test(busStop)) {
      foundBusStop = await fromLandmarkNameToBusStopCode(busStop, _headers);
      if (foundBusStop === '00000') {
        bot.sendMessage(chatId, 'Bus Services ceased to service the input bus stop/road for today');
        return;
      } else if (!/^\d{5}$/.test(foundBusStop)) {
        // error
        bot.sendMessage(chatId, 'There is an error! Please try again.\n' + foundBusStop);
        return;
      }
    }
    
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/BusArrivalv2?BusStopCode=${foundBusStop ? foundBusStop : busStop}`;
    
    try {
      const response = await axios.get(uri, {headers: _headers});
      if (response.status === 200) {    
        if (response.data.Services.length > 0) {
          const parsedData = parseData(response.data.Services);
          let s = `Bus Stop #${foundBusStop ? `${foundBusStop} (${busStop})` : busStop}\n`;
          s += GREEN_CIRCLE + ' Seats Available\n';
          s += ORANGE_CIRCLE + ' Standing Available\n';
          s += RED_CIRCLE + ' Limited Standing\n';
          s += '---------------------------\n'
          parsedData.forEach(d => {
            s += `Bus ${d.bus}:\n`;
            d.nextArrival.forEach(n => {
              s += n;
            });
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

  const fromLandmarkNameToBusStopCode = async (landmark: string, _headers: IHeaders): Promise<string> => {
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/BusStops`;
    landmark = landmark.replace(/[ ,.']/g, "").toLowerCase();

    try {
      const response = await axios.get(uri, {headers: _headers});
      if (response.status === 200) {  
        if (response.data.value.length > 0) {
          for (var o of response.data.value) {
            if (o.Description.replace(/[ ,.']/g, "").toLowerCase() === landmark) {
              return o.BusStopCode;
            }
          };
          // resort to finding by street name
          for (var o of response.data.value) {
            if (o.RoadName.replace(/[ ,.']/g, "").toLowerCase() === landmark) {
              return o.BusStopCode;
            }
          };
        } 
      } 
    } catch (err) {
      return err.toString();
    }
    // let main function handle errors
    return '00000';
  };

  const parseData = (data: Array<any>): Array<IParsedData> => {
    const returnArr: Array<IParsedData> = [];
    data.forEach(d => {
      const aux: IParsedData = {} as IParsedData;
      const keys = Object.keys(d);
      let count = 1;
      aux.bus = d.ServiceNo; 
      aux.nextArrival = [];
      // API returns 3 next buses
      for(var i=2; i<2+3; i++) {
        if(count <= MAX_NEXTBUS && i <= keys.length) {
          const nextTime = moment(d[keys[i]].EstimatedArrival);
          // to ignore buses that already left
          if (nextTime.diff(moment()) > 0) {
            const s = '\t' + seatsAvailability(d[keys[i]].Load) + ' ' + nextTime.fromNow() + '\n';
            aux.nextArrival.push(s);
            count++;
          }
        }
      }
      returnArr.push(aux);
    });
    return returnArr;
  }

  const seatsAvailability = (code: string): string => {
    switch (code) {
      case 'SEA':
        return GREEN_CIRCLE;
      case 'SDA':
        return ORANGE_CIRCLE;
      case 'LSD':
        return RED_CIRCLE;
      default: 
        return '-';
    }
  }

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
}

export default LTAOpenDataService;


