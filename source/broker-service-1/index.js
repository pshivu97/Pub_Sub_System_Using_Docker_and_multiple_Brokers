const express = require('express');
const mongoose = require('mongoose')
const pubData = require('./model/publisherdata')
const subData = require('./model/subscriber')
const subInfoData = require('./model/subscriberInfo')
const axios = require('axios');
const app = express();
var cors = require('cors');
const sublist = require('./model/subscriber');

app.use(cors())
//get env variables
require('dotenv').config();

// var self_name = 'broker-service-1'

// broker_manager_list = {
//     'broker-service': {'topics':['chicken', 'fish'],'port':8000,'host_name':'broker-service'},
//     'broker-service-1': {'topics':['beef'],'port':8081,'host_name':'broker-service-1'},
//     'broker-service-2': {'topics':['pork'],'port':8082,'host_name':'broker-service-2'}       
// }

var self_details = { 'topics': ['beef'], 'port': 8081, 'host_name': 'broker-service-1' }
var neighbour_node_details = [{ 'port': 8080, 'host_name': 'broker-service' }, {'port':8082,'host_name':'broker-service-2'}]


function isTopicInCurrentBroker(topic) {
    if (self_details['topics'].includes(topic)) {
        return true
    }
    return false
}

function getneighbouringnodes(exclude_list) {
    final_list = []
    for (let i = 0; i < neighbour_node_details.length; i++) {
        let flag = true
        for (let j = 0; j < exclude_list.length; j++){
            if (neighbour_node_details[i]['host_name'] == exclude_list[j]['host_name']) {
                flag = false
            }
        }
        if (flag) {
            final_list.push(neighbour_node_details[i])
        }
    }
    return final_list
}

// function isTopicInCurrentBroker(topic) {
//     if (broker_manager_list[self_name]['topics'].includes(topic))
//         return true
//     return false
// }

// function getBrokerForTopic(topic) {
//     keys = Object.keys(broker_manager_list)
//     for (let i = 0; i < keys.length; i++){
//         let broker = keys[i]
//         if (broker_manager_list[broker]['topics'].includes(topic))
//             return broker_manager_list[broker]
//     }
// }



// parse request with COntent-type application/json
app.use(express.json());
// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));


//database conection
const uri = 'mongodb://mongo:27017/pubData';


mongoose.connect(uri,{useNewUrlParser:true});

const connection = mongoose.connection;

connection.once('open', () => {
    console.log("Connected Database Successfully");
});

app.post("/publishData",(req,res) => {
    insertData(req.body[0]);
    broadcastTosub();
    broadCastAdvertise();
    res.sendStatus(201);
});

function broadcastTosub() {
    obj = {}
    subData.find((err,docs) => {
        if(docs.length > 0){
            docs.map(doc => {
                obj[doc.topic] = doc.subscribers
            })
            pubData.find({ name: { $in: Object.keys(obj)}},(err,docs) => {
                docs.map(doc => {      
                    if (!(typeof(obj[doc.name]) === 'undefined') && obj[doc.name].length > 0) {
                        sendReqToSub(doc,obj[doc.name]);
                    }
                })
            })
        }    
    })
}

function sendReqToSub(doc,sublist){

    var req = {
        name: doc.name,
        calories: doc.calories,
        protein: doc.protein
    }
    sublist.map(eachsub => {
        subInfoData.find( {subscriberName: eachsub},(err, docs) => {
            if (docs.length) {
                axios.post(`http://${docs[0].subscriberName}:${docs[0].port}/subscription_data`,req,{'Content-type':'application/json'})
                .then(res => res.status)
                .catch(err => err);
            }        
        })
    })
}
    

app.post("/advertise", (req, res) => {
    console.log("----Inside Advertise !!------");
    subInfoData.find({ subscriberName: req.body.subscriberName }, (err, docs) => {
        if (docs.length) {
            docs[0].isAdvertise = true
            docs[0].save((err) => {
                if (err) {
                    console.log(err);
                }
            });
        }
    })
    broadCastAdvertise()
});


function broadCastAdvertise() {
    console.log("-------broadCastAdvertise---------");
    advertisement_data_body = []
    pubData.find((err, docs) => {
        if(docs.length){
            docs.map(doc => {
                var food_data = {
                    name: doc.name,
                    calories: doc.calories,
                    protein: doc.protein
                }
                advertisement_data_body.push(food_data)
            })
        }   
    })
    subInfoData.find((err, docs) => {
        if(docs.length){
            docs.map(doc => {
                if (doc.isAdvertise) {
                    sendAdvertiseData(doc,advertisement_data_body)
                }
            })
        }        
    })
}


app.post("/de_advertise", (req, res) => {
    subInfoData.find({ subscriberName: req.body.subscriberName }, (err, docs) => {
        if (docs.length) {
            docs[0].isAdvertise = false
            docs[0].save((err) => {
                console.log("Data has been updated");
                res.sendStatus(200)
                if (err) {
                    console.log(err);
                }
            });
        }
    })
})

function sendAdvertiseData(doc, advertisement_data_body) {
    var req = {
        advertisement_data : advertisement_data_body
    }
    axios.post(`http://${doc.subscriberName}:${doc.port}/advertisement_data`,req,{'Content-type':'application/json'})
        .then(res => console.log("sendAdvertiseData status" + res.status))
        .catch(err => console.log(err));
}

/*

{
    topic: abcd,
    subscribername: s1
}
 */

app.post('/unsubscribe',(req,res) => {
    console.log("------------Unsubscribe------------");
    data = req.body
    if (!isTopicInCurrentBroker(data.name)) {
        var neigbouring_nodes
        if (!data.hasOwnProperty('checked_node')) {
            neigbouring_nodes = getneighbouringnodes([])
        } else {
            neigbouring_nodes = getneighbouringnodes(data['checked_node'])
        }
        var checked_node = [self_details]
        //data['checked_node'] = checked_node
        for (let i = 0; i < neigbouring_nodes.length; i++){
            checked_node.push(neigbouring_nodes[i])
        }
        data['checked_node'] = checked_node
        for (let i = 0; i < neigbouring_nodes.length; i++){
            axios.post(`http://${neigbouring_nodes[i].host_name}:${neigbouring_nodes[i].port}/unsubscribe`,data,{'Content-type':'application/json'})
            .then(res => res.status)
            .catch(err => err);
        }
        return
    }
    console.log("Unsubscribe from : " + self_details.host_name + " for topic : " + data.name);
    subData.find({topic: req.body.name}, (err,docs) => {
        if (docs.length){
            const index = docs[0].subscribers.indexOf(req.body.subscriberName)
            if (index > -1) {
                docs[0].subscribers.splice(index, 1);
            }
            docs[0].save((err) => {
                console.log("Subscirber removed successfully");
                res.sendStatus(200);
                if (err) {
                    console.log(err);
                }
            });
        }
    })
});


app.post("/subscribe",(req,res) => {
    subsrcibeData(req.body);
    res.sendStatus(200);
});


function subsrcibeData(data) {
    // if (!isTopicInCurrentBroker(data.name)) {  
    //     broker_detail = getBrokerForTopic(data.name)
    //     axios.post(`http://${broker_detail.host_name}:${broker_detail.port}/subscribe`,data,{'Content-type':'application/json'})
    //     .then(res => console.log(res.status))
    //     .catch(err => console.log(err));
    //     return
    // }
    if (!isTopicInCurrentBroker(data.name)) {
        var neigbouring_nodes
        if (!data.hasOwnProperty('checked_node')) {
            neigbouring_nodes = getneighbouringnodes([])
        } else {
            neigbouring_nodes = getneighbouringnodes(data['checked_node'])
        }
        var checked_node = [self_details]
        for (let i = 0; i < neigbouring_nodes.length; i++){
            checked_node.push(neigbouring_nodes[i])
        }
        data['checked_node'] = checked_node
        for (let i = 0; i < neigbouring_nodes.length; i++){
            axios.post(`http://${neigbouring_nodes[i].host_name}:${neigbouring_nodes[i].port}/subscribe`,data,{'Content-type':'application/json'})
            .then(res => console.log(res.status))
            .catch(err => console.log(err));
        }
        return
    }
    console.log("subscribe from : " + self_details.host_name + " to topic : " + data.name);
    subData.find({topic: data.name}, (err,docs) => {
        if (docs.length){
            if(!docs[0].subscribers.includes(data.subscriberName)){
                docs[0].subscribers.push(data.subscriberName);
                docs[0].save((err) => {
                    console.log("Data has been updated");
                    if (err) {
                        console.log(err);
                    }
                });
            }
        } else {
            var sub = new subData();
            sub.topic = data.name;
            sub.subscribers.push(data.subscriberName)
            sub.save((err) => {
                console.log("Data has been saved");
                if (err) {
                    console.log(err);
                }
            });
        }
    })
    subInfoData.find({ subscriberName: data.subscriberName }, (err, docs) => {
        if (!docs.length) {
            var subInfo = new subInfoData();
            subInfo.subscriberName = data.subscriberName
            subInfo.port = data.port
            subInfo.isAdvertise = false
            subInfo.save((err) => {
                 console.log("SubscriberInfo has been saved");
                if (err) {
                    console.log(err);
                }
            });
        }
    })
}

function insertData(data) {
    pubData.find({name: data.name}, (err,docs) => {
        // if(docs.length){
        //     console.log("Data Already present in successfully");
        // } else {
        //     var pubdata = new pubData();
        //     pubdata.name = data.name;
        //     pubdata.calories = data.calories;
        //     pubdata.protein = data.protein_g;
        //     pubdata.save((err) => {
        //         console.log("Data has been saved");
        //         if (err) {
        //             console.log(err);
        //         }
        //     });
            
        // }
        if (!docs.length) {
            var pubdata = new pubData();
            pubdata.name = data.name;
            pubdata.calories = data.calories;
            pubdata.protein = data.protein_g;
            pubdata.save((err) => {
                console.log("Data has been saved");
                if (err) {
                    console.log(err);
                }
            });
        }
    })
    
}

const PORT = process.env.PORT || 8081;


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
