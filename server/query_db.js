const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI;
console.log("Connecting to:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected!");
    
    // Define a loose schema for querying
    const ClothingSchema = new mongoose.Schema({}, { strict: false });
    const Clothing = mongoose.model('Clothing', ClothingSchema, 'clothings');
    
    const items = await Clothing.find({});
    console.log(`Found ${items.length} items:`);
    items.forEach(item => {
      console.log(`\nID: ${item._id}`);
      console.log(`Name: ${item.name}`);
      console.log(`Category: ${item.category}`);
      console.log(`ImageUrl: ${item.imageUrl}`);
      console.log(`ImageHash: ${item.imageHash}`);
      console.log(`UserId: ${item.userId}`);
    });
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Connection failed:", err);
  });
