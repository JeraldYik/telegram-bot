import axios from 'axios';
import moment from 'moment';
import firebase from "firebase/app";
import 'firebase/database';

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

interface IBusStop {
  code: number,
  description: string
}

const LTAOpenDataService = (bot, Extra) => {
  const apiKey: string = process.env.LTADATAMALL_APIKEY ? process.env.LTADATAMALL_APIKEY : '';
  const _headers: IHeaders = {'AccountKey' : apiKey};

  // surrogate pair calculator: http://www.russellcottrell.com/greek/utilities/SurrogatePairCalculator.htm
  const GREEN_CIRCLE_EMOJI = '\uD83D\uDFE2'; 
  const ORANGE_CIRCLE_EMOJI = '\uD83D\uDFE0';
  const RED_CIRCLE_EMOJI = '\uD83D\uDD34';

  const FAVOURITES_LIST = 'favourites_list';

  /** DOCUMENTATION:
   * https://firebase.google.com/docs/database/web/start
   * https://console.firebase.google.com/u/0/project/telegram-bot-busstop/settings/general/web:NzI2M2U2OGItNjljMy00ODY2LWJhN2YtYjM1MTE3ZTg4ZDhj
   */
  var firebaseConfig = {
    apiKey: process.env.FIREBASE_APIKEY,
    authDomain: process.env.FIREBASE_AUTHDOMAIN,
    databaseURL: process.env.FIREBASE_RTDATABASE_URL,
    projectId: process.env.FIREBASE_PROJECTID,
    storageBucket: process.env.FIREBASE_STORAGEBUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDERID,
    appId: process.env.FIREBASE_APPID,
    measurementId: process.env.FIREBASE_MEASUREMENTID
  };
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);

  bot.command('bus', async (ctx) => {
    const busStop = ctx.state.command.input;
    let foundBusStop;
    if (!/^\d{5}$/.test(busStop)) {
      foundBusStop = await fromLandmarkNameToBusStopCode(busStop, _headers);
      if (foundBusStop === '00000') {
        ctx.reply('Bus Stop Name/Road cannot be found from API call or Bus Services ceased to service the input bus stop/road for today\nPlease try again tomorrow or use Bus Stop Code instead');
        return;
      } else if (!/^\d{5}$/.test(foundBusStop)) {
        // error
        ctx.reply('There is an error! Please try again.\n' + foundBusStop);
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
          s += GREEN_CIRCLE_EMOJI + ' Seats Available\n';
          s += ORANGE_CIRCLE_EMOJI + ' Standing Available\n';
          s += RED_CIRCLE_EMOJI + ' Limited Standing\n';
          s += '---------------------------\n'
          parsedData.forEach(d => {
            s += `Bus <b>${d.bus}</b>:\n`;
            d.nextArrival.forEach(n => {
              s += n;
            });
          });
          ctx.reply(s, Extra.HTML());
        } else {
          ctx.reply(`Bus Stop not found!`);
        }
      } else {
        ctx.reply('There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      ctx.reply('There is an error! Please try again.\n' + err.toString());
    }
  });

  bot.command('showbusstop', async (ctx) => {
    const STAR_EMOJI: string = '\u2B50'; 
    firebase.database().ref(FAVOURITES_LIST).get()
      .then(res => {
        if (res.val() === null) {
          ctx.reply('Favourite Bus Stops List is empty.');
          return;
        }
        let l = Object.entries(res.val());
        let s = `${STAR_EMOJI} Favourite Bus Stops ${STAR_EMOJI}\n\n`;
        l.forEach((b,i) => {
          s += `# ${b[0]} - ${b[1]}${i<l.length-1 ? '\n' : ''}` 
        });
        ctx.reply('Printing favourite bus list...')
        ctx.reply(s);
      })
      .catch(error => {
        ctx.reply('There is an Error! ' + error.toString())
      });
  });

  bot.command('addbusstop', async (ctx) => {
    const input = ctx.contextState.command.input.split(' ');
    try {
      // check if user input only has bus stop code and description
      if (input.length !== 2) throw new Error('malformed-input');
      // check if bus stop code is a 5-digit number
      const regex = /^[0-9]{5}$/
      if (!regex.test(input[0])) throw new Error('malformed-input');
      
      firebase.database().ref(FAVOURITES_LIST).update({
        [input[0]]: input[1]
      });
      ctx.reply(`'#${input[0]} - ${input[1]}' successfully added/updated.`)
    } catch (error) {
      if (error.toString() === 'Error: malformed-input') {
        ctx.reply('Malformed input! Please type your input in the form of\n/addbusstop <bus-stop-code> <description>');
      } else {
        ctx.reply('Error! ' + error.toString());
      }
    };
  });

  bot.command('removebusstop', async (ctx) => {
    const input = ctx.contextState.command.input.trim();
    try {
      const regex = /^[0-9]{5}$/
      if (!regex.test(input)) throw new Error('malformed-input');
      firebase.database().ref(FAVOURITES_LIST).child(input).remove();
      ctx.reply(`# ${input} removed (if it exists).`)
    } catch (error) {
      if (error.toString() === 'Error: malformed-input') {
        ctx.reply('Malformed input! Please type your input in the form of\n/removebusstop <bus-stop-code>');
      } else {
        ctx.reply('Error! ' + error.toString() + '\nIt could be caused by a malformed input. Please type your input in the form of\n/removebusstop <busstopcode>');
      }
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
        return GREEN_CIRCLE_EMOJI;
      case 'SDA':
        return ORANGE_CIRCLE_EMOJI;
      case 'LSD':
        return RED_CIRCLE_EMOJI;
      default: 
        return '-';
    }
  }

  bot.command('traindown', async (ctx) => {
    const uri = `http://datamall2.mytransport.sg/ltaodataservice/TrainServiceAlerts`;
    try {
      const response = await axios.get(uri, {headers: _headers});
      if (response.status === 200) {  
        if (response.data.value.Status === 1) {
          ctx.reply('No Train Disruption');
        } else {
          ctx.reply('Please take note...\n' + JSON.stringify(response.data.value));
        }
      } else {
        ctx.reply('There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      ctx.reply('There is an error! Please try again.\n' + err.toString());
    }
  });
}

export default LTAOpenDataService;


