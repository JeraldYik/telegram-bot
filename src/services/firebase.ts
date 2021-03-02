import firebase from "firebase/app";
import 'firebase/database';

const firebaseService = (bot) => {

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

  const FAVOURITES_LIST = 'favourites_list';

  bot.command('showbusstop', async (ctx) => {
    const STAR_EMOJI: string = '\u2B50'; 
    firebase.database().ref(FAVOURITES_LIST).get()
      .then(res => {
        ctx.reply('Printing favourite bus list...')
        if (res.val() === null) {
          ctx.reply('Favourite Bus Stops List is empty.');
          return;
        }
        let l = Object.entries(res.val());
        let s = `${STAR_EMOJI} Favourite Bus Stops ${STAR_EMOJI}\n\n`;
        l.forEach((b,i) => {
          s += `# ${b[0]} - ${b[1]}${i<l.length-1 ? '\n' : ''}` 
        });
        ctx.reply(s);
      })
      .catch(error => {
        ctx.reply('There is an Error! ' + error.toString())
      });
  });

  bot.command('addbusstop', async (ctx) => {
    const input = ctx.contextState.command.input;
    try {
      // check if bus stop code is a 5-digit number
      const regex = /^[0-9]{5}\s/
      if (!regex.test(input)) throw new Error('malformed-input');
      const code = input.slice(0,5);
      const description = input.slice(6,input.length);
      firebase.database().ref(FAVOURITES_LIST).update({
        [code]: description
      });
      ctx.reply(`'#${code} - ${description}' successfully added/updated.`)
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
}

export default firebaseService;


