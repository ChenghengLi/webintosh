// Local weather datasets for the three switchable cities.
// Temperatures in °F, wind in mph, precipitation in mm.
// `icon` values are keys into WeatherIcon.vue (sun, partly, moon, cloud,
// rain, storm, sunshower).

const HOURS = ['Now', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM', '8PM', '9PM', '10PM', '11PM']
const WEEKDAYS = ['Today', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue', 'Wed']

function hourly(temps, icons) {
  return HOURS.map((hour, i) => ({ hour, temp: temps[i], icon: icons[i] }))
}

function days(rows) {
  return rows.map((r, i) => ({ day: WEEKDAYS[i], icon: r[0], low: r[1], high: r[2] }))
}

export const CITIES = [
  {
    id: 'cupertino',
    name: 'Cupertino',
    condition: 'Sunny',
    icon: 'sun',
    temp: 72,
    high: 75,
    low: 61,
    sky: 'linear-gradient(180deg, #1c6dd0 0%, #3f93dd 38%, #6cb6e9 70%, #9fd3f2 100%)',
    hourly: hourly(
      [72, 73, 74, 75, 75, 74, 72, 70, 68, 66, 65, 64],
      ['sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'sun', 'partly', 'moon', 'moon', 'moon', 'moon'],
    ),
    days: days([
      ['sun', 61, 75], ['sun', 60, 76], ['sun', 62, 78], ['sun', 63, 79], ['sun', 64, 80],
      ['sun', 63, 81], ['partly', 62, 79], ['partly', 61, 77], ['sun', 60, 76], ['sun', 59, 75],
    ]),
    details: {
      uv: { value: 5, label: 'Moderate', note: 'Wear sunscreen on bright days.' },
      wind: { speed: 8, gust: 14, deg: 315, compass: 'NW' },
      humidity: { value: 54, dewPoint: 54 },
      sun: { sunrise: '5:58 AM', sunset: '8:31 PM', pos: 0.58 },
      feelsLike: { temp: 72, note: 'Similar to the actual temperature.' },
      precip: { amount: '0 mm', note: 'in the last 24 hours. None expected in the next 10 days.' },
    },
  },
  {
    id: 'tokyo',
    name: 'Tokyo',
    condition: 'Rain',
    icon: 'rain',
    temp: 64,
    high: 67,
    low: 58,
    sky: 'linear-gradient(180deg, #35485c 0%, #4d6379 42%, #6b8198 72%, #8ba0b3 100%)',
    hourly: hourly(
      [64, 65, 66, 66, 67, 66, 65, 64, 63, 62, 62, 61],
      ['rain', 'rain', 'rain', 'storm', 'rain', 'rain', 'sunshower', 'rain', 'rain', 'rain', 'rain', 'rain'],
    ),
    days: days([
      ['rain', 58, 67], ['rain', 57, 66], ['storm', 56, 65], ['rain', 57, 66], ['sunshower', 58, 68],
      ['partly', 59, 70], ['cloud', 58, 69], ['rain', 57, 67], ['rain', 56, 66], ['rain', 55, 65],
    ]),
    details: {
      uv: { value: 2, label: 'Low', note: 'No protection needed for most skin types.' },
      wind: { speed: 11, gust: 20, deg: 45, compass: 'NE' },
      humidity: { value: 88, dewPoint: 61 },
      sun: { sunrise: '4:31 AM', sunset: '6:58 PM', pos: 0.62 },
      feelsLike: { temp: 65, note: 'Humidity is making it feel warmer.' },
      precip: { amount: '12 mm', note: 'in the last 24 hours. 24 mm expected in the next 24 hours.' },
    },
  },
  {
    id: 'london',
    name: 'London',
    condition: 'Cloudy',
    icon: 'cloud',
    temp: 59,
    high: 64,
    low: 52,
    sky: 'linear-gradient(180deg, #4e627a 0%, #677d97 42%, #889cb2 72%, #a8bacb 100%)',
    hourly: hourly(
      [59, 60, 61, 62, 63, 63, 64, 63, 62, 61, 60, 59],
      ['cloud', 'cloud', 'partly', 'cloud', 'cloud', 'partly', 'cloud', 'cloud', 'cloud', 'moon', 'moon', 'cloud'],
    ),
    days: days([
      ['cloud', 52, 64], ['cloud', 51, 63], ['rain', 50, 62], ['cloud', 51, 62], ['partly', 52, 64],
      ['partly', 53, 65], ['cloud', 52, 63], ['rain', 51, 62], ['cloud', 50, 61], ['cloud', 49, 60],
    ]),
    details: {
      uv: { value: 3, label: 'Moderate', note: 'Some protection advised around midday.' },
      wind: { speed: 14, gust: 22, deg: 225, compass: 'SW' },
      humidity: { value: 76, dewPoint: 52 },
      sun: { sunrise: '4:52 AM', sunset: '9:12 PM', pos: 0.5 },
      feelsLike: { temp: 57, note: 'Wind is making it feel cooler.' },
      precip: { amount: '2 mm', note: 'in the last 24 hours. 4 mm expected in the next 24 hours.' },
    },
  },
]
