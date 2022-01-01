const mongoose = require("mongoose");

const subscriberInfoScehma = new mongoose.Schema({
    subscriberName: String,
    port: Number,
    isAdvertise: Boolean
});

const subInfolist =  mongoose.model('Subscriber_Info',subscriberInfoScehma);
module.exports = subInfolist;