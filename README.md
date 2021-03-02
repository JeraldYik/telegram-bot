# Telegram Bot

## Overview

This mini-project is for me to explore different Telegram APIs, as well as other external APIs, and to test out how to call utilise these various APIs.
Not only that, some of the use cases could be useful to convenient everyday life.

Access bot on telegram via id [@jyik001_test_bot](https://t.me/jyik001_test_bot) or on the [heroku website](https://jyik001-telegram-bot.herokuapp.com/)

## Features

1. Movies

- Command: `/movie <movie-name>`
- Returns: Thumbnail, Title, Year, Released
- API used: OMDB API

2. Next Bus

- Command: `/bus <bus-stop-code>` OR `/bus <bus-stop-name>` OR `/bus <street-name>`
- Returns: All buses servicing input bus stop, with up to 2 next buses arrival timings, with seat availability
- API used: LTA OpenData API
- Limitations: API only returns <bus-stop-code>: [01012,14039]
- Further considerations: Last Bus Notice

3. Show favourite bus stops

- Command: `/showbusstop`

4. Add favourite bus stop

- Command: `/addbusstop <bus-stop-code> <description>`

5. Remove favourite bus stop from list

- Command: `/removebusstop <bus-stop-code>`

6. Train Disruption Alert

- Command: `/traindown`
- Returns: Boolean with message
- API used: LTA OpenData API
- Further considerations: Can ping every 15 minutes, only send message if there is a train disruption

7. Nearest Eateries

- Command: `/food <postal-code>` OR `/food <street-name>` (`/food <address>`)
- Default: Star Rating: ≥ 3.5, Radius: within 2km, Dollar Sign: ≤ 2
- Returns: All Eateries with input params
- API used: Google Maps Geocoding & Nearby Search APIs
- Further considerations: Customisable params, filter (by type of eateries, further by kind of dishes offered by specific type of eateries: e.g. japanese→sushi/ramen)

## Future Improvements

- Find a way to implement conversational style queries (text input, inline keyboards etc), s.t. the flow is synchronous (like a chatbot)
