import axios from 'axios';
import { sleep, onCallback } from '../helper';

interface ILatLng {
  lat: string,
  lng: string
}

interface IResult {
  name: string,
  rating: number,
  priceLevel: number,
  vicinity: string,
  url: string
}

const googleMapsService = (bot, Markup, Extra) => {
  bot.command('food', async (ctx) => {
    const apiKey = process.env.GOOGLE_APIKEY;
    const address = ctx.state.command.input;
    let latlng = {} as ILatLng;

    if (address === '') {
      ctx.reply('Address input is empty. Please try again.');
      return;
    }

    /** DOCUMENTATION
     *  https://developers.google.com/maps/documentation/geocoding/overview
     */
    const geocodeURI = `https://maps.googleapis.com/maps/api/geocode/json?address=${address} Singapore&key=${apiKey}`;

    try {
      ctx.reply(`Querying with input '${address}'`);
      const response = await axios.get(geocodeURI);
      if (response.status === 200) {    
        if (response.data.status === 'OK') {
          latlng = {
            lat: response.data.results[0].geometry.location.lat,
            lng: response.data.results[0].geometry.location.lng,
          }
        } else {
          ctx.reply(`Error! ${response.data.status}`);
        }
      } else {
        ctx.reply('There is an Error!\nReponse Code: ' + response.status.toString());
      }
    } catch (err) {
      ctx.reply('There is an error! Please try again.\n' + err.toString());
    }

    if (Object.keys(latlng).length > 0) {
      /** DOCUMENTATION
       *  https://developers.google.com/places/web-service/search#FindPlaceRequests
       */
      // default settings
      let radius: number = 2000;
      let rating: number = 3.5;
      let minPrice: number = 1;
      let maxPrice: number = 2;
      let results = [] as any;
      let nextPageToken: string = '';
      let counter: number = 1; 

      // ask for 'restaurant' or 'cafe'
      const inlineEateryTypeKeyboard = Markup.inlineKeyboard([
        Markup.callbackButton('Restaurant', 'restaurant'),
        Markup.callbackButton('Café', 'cafe')
      ]).extra();

      ctx.reply('What kind of Eatery?', inlineEateryTypeKeyboard);

      const printResults = async (type: string) => {
        // max results returned = 20 * 3
        while (counter <= 3) {
          const nearbySearchURI = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${nextPageToken === '' ? `location=${latlng.lat},${latlng.lng}&radius=${radius}&minprice=${minPrice}&maxprice=${maxPrice}&opennow=&type=${type}` : `pagetoken=${nextPageToken}`}&key=${apiKey}`;
          try {
            const response = await axios.get(nearbySearchURI);
            if (response.status === 200) {    
              if (response.data.status === 'OK') {
                nextPageToken = response.data['next_page_token'] ? response.data['next_page_token'] : '';
                results = [...results, ...response.data.results];
                // small delay of 2s between each page of results
                await sleep(2000);
              } else {
                ctx.reply(`Error! ${response.data.status}`);
              }
            } else {
              ctx.reply('There is an Error!\nReponse Code: ' + response.status.toString());
            }
          } catch (err) {
            ctx.reply('There is an error! Please try again.\n' + err.toString());
          }
          
          if (nextPageToken === '') break;
          counter++;
        }

        if (results.length > 0) {
          let parsedResult = [] as Array<IResult>;
          results.forEach(r => {
            if (r.rating >= rating) {
              const _url = `https://www.google.com/maps/search/?api=1&query=${latlng.lat},${latlng.lng}&query_place_id=${r['place_id']}`;
              const result: IResult = {
                name: r.name,
                rating: r.rating,
                priceLevel: r.price_level,
                vicinity: r.vicinity,
                url: _url
              };
              parsedResult.push(result);
            }
          });

          // sort by rating
          parsedResult.sort((a,b) => b.rating - a.rating);
          const MESSAGE_LIMIT: number = 20;
          const STAR_EMOJI: string = '\u2B50'; 
          let counter: number = 1;
          let first: boolean = true;

          let header: string = 'Sorted by Top Ratings ...\n';
          header += 'Parameters:\n';
          header += `\t\t\tSearch Radius: ${radius/1000}km\n`;
          header += `\t\t\tRating above: ${rating} ${STAR_EMOJI}\n`;
          header += `\t\t\tDollar Sign between ${minPrice} and ${maxPrice}\n`;
          header += `\t\t\tType of Eatery: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
          ctx.reply(header);
          // force header to send first
          await sleep(1000);

          let s = `${first ? 'First' : 'Next'}`;
          for (var r of parsedResult) {
            const dollars = '$'.repeat(r.priceLevel);
            s += r.name + ` (${r.rating} ${STAR_EMOJI}) (${dollars}) <a href='${r.url}'>Link To Maps</a>\n`;
            counter++;
            if (counter === MESSAGE_LIMIT) {
              s = `${first ? 'First' : (MESSAGE_LIMIT === parsedResult.length ? 'The' : 'Next')} <b>${counter}</b> results:\n` + s;
              first = false;
              ctx.reply(s, Extra.HTML().webPreview(false));
              counter = 1;
              s = '';
              // sending of message is async and a shorter message causes this message to be sent first 
              await sleep(1000);
            } 
            s += '\n';
          };
          s = `${first ? 'The' : 'Next'} <b>${counter}</b> results:\n` + s;
          // remove trailing \n
          s !== '' ? ctx.reply(s.substring(0, s.length-1), Extra.HTML().webPreview(false)) : undefined;

          // clear variables
          results = [];
          parsedResult = [];

        } else {
          ctx.reply('Searched address did not return any results. Please try again with another input or reformat your input.', {parse_mode: 'HTML'});
        }
      }

      onCallback(bot, ['restaurant', 'cafe'], printResults);
    }
  });
}

export default googleMapsService;