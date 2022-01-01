var express = require("express");
const axios = require('axios');
var router = express.Router();
const app = express();

router.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
router.use(express.urlencoded({ extended: true }));

const foods = ['chicken', 'fish', 'beef', 'pork'];
let food_data = {};
let advertisement_data = {};
let advertise = true;

router.get("/", function(req,res){
    res.render("index", food_data);
});

subscriber_name = "subscriber-3"
port = 4002

router.post("/subscribe", function(req, res){
    console.log("Subscribe "+ req.body.name +" calling!!!");
    let data = {
        name: req.body.name,
        subscriberName: subscriber_name,
        port : port
    }
    axios.post("http://broker-service-2:8082/subscribe",data,{'Content-type':'application/json'})
    .then(res => console.log(res.status))
    .catch(err => console.log(err));
    res.sendStatus(200);
});

router.post("/unsubscribe", function(req, res){
    console.log("Un-Subscribe "+ req.body.name +" calling!!!");
    let data = {
        name: req.body.name,
        subscriberName: subscriber_name
    }
    axios.post("http://broker-service-2:8082/unsubscribe",data,{'Content-type':'application/json'})
    .then(res => console.log(res.status))
    .catch(err => console.log(err));
    res.sendStatus(200);
});

router.post("/subscription_data", function(req, res){
    //console.log("Broker posted Subscription Data to the subscriber");
    food_data[req.body.name] = {
        name:req.body.name,
        protein:req.body.protein,
        calories:req.body.calories
    };
    //console.log(food_data[req.body.name]);
    res.sendStatus(200);
});

router.post("/advertisement_data", function(req, res){
    //console.log("Broker posted Advertisement Data to the subscriber");
	if (!advertise){
        return;
    }
    let data = req.body.advertisement_data;
    advertisement_data = {};
    for(let i=0;i<data.length;i++){
        let advertised_food = data[i];
        advertisement_data[advertised_food.name] = {
          name      : advertised_food.name,
          protein   : advertised_food.protein,
          calories  : advertised_food.calories
        };
    }
    res.sendStatus(200);
});

router.get("/get_food_data", function(req,res){
    //console.log("Getting Subscription Data from Subscriber server");
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
        food_data           : food_data,
        advertisement_data  : advertisement_data
    }));
    // console.log({
    //     food_data           : food_data,
    //     advertisement_data  : advertisement_data
    // });
    res.send();
});


router.post("/delete_subscription_data", function(req,res){
    //console.log("Subscription Data deleted from Subscriber");
    food_data[req.body.name] = {name:'-',protein:'-',calories:'-'};
    res.sendStatus(200);
});

router.post("/advertise", function(req,res){
	advertise = true
    console.log("Advertise "+ req.body.name +" calling!!!");
    let data = {
        subscriberName: subscriber_name,
        port: port
    }
    axios.post("http://broker-service-2:8082/advertise",data,{'Content-type':'application/json'})
    .then(res => console.log(res.status))
    .catch(err => console.log(err));
    res.sendStatus(200);
});

router.post("/de_advertise", function (req, res) {
    advertise = false
    console.log("De-Advertise "+ req.body.name +" calling!!!");
    advertisement_data = {};
    let data = {
        subscriberName: subscriber_name,
        port : port
    }
    axios.post("http://broker-service-2:8082/de_advertise",data,{'Content-type':'application/json'})
    .then(res => console.log(res.status))
    .catch(err => console.log(err));
    res.sendStatus(200);
});

module.exports = router;