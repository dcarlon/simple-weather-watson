const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const TextToSpeechV1 = require('watson-developer-cloud/text-to-speech/v1');
const fs = require('fs');

//Local dependencies
var settings = require('./settings.js');

//Declare variables
const apiKey = process.env.weather_key || settings.weather_key;
if(process.env.VCAP_SERVICES) {
  const vcap_services = JSON.parse(process.env.VCAP_SERVICES);
  var watsonts_username = vcap_services.text_to_speech[0].credentials.username ;
  var watsonts_password = vcap_services.text_to_speech[0].credentials.password ;
  var watsonts_url = vcap_services.text_to_speech[0].credentials.url ;
}
else{
  var watsonts_username = settings.watson_text_speach_username;
  var watsonts_password = settings.watson_text_speach_password;
  var watsonts_url = settings.watson_text_speach_url;
}
const textToSpeech = new TextToSpeechV1({
   username: watsonts_username,
   password: watsonts_password,
   url: watsonts_url
});
var port = process.env.PORT || 3000;


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs')

app.get('/', function (req, res) {
  res.render('index', {weather: null, error: null,file:null});
})


//POST method to get the current temerature and humidity
app.post('/', function (req, res) {
  let city = req.body.city;
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`

  request(url, function (err, response, body) {
    if(err){
      res.render('index', {weather: null, error: 'Error, please try again'});
    } else {
      let weather = JSON.parse(body)
      if(weather.main == undefined){
        res.render('index', {weather: null, error: 'Error, please try again'});
      } else {
        let weatherText = `It's ${weather.main.temp}º celsius in ${weather.name} with a humidity of  ${weather.main.humidity}% !`;
        
        //Set Watson text to speech parameters
        var params = {
          text: weatherText,
          voice: 'en-US_AllisonVoice', // Optional voice
          accept: 'audio/wav'
        };

        //Call TextToSpeech API
        textToSpeech
          .synthesize(params, function(err, audio) {
            if (err) {
              console.log(err);
              return;
            }
            textToSpeech.repairWavHeader(audio);
          
            //Set filename and store it
            var filename = '/audio/'+Date.now()+'.wav' 
            fs.writeFileSync('./public/' + filename, audio);
            res.render('index', {weather: weatherText, error: null, file : filename}); 
        });
      }
    }
  });


})

app.listen(port, function () {
  console.log('Your app listening on port 3000!')
})
