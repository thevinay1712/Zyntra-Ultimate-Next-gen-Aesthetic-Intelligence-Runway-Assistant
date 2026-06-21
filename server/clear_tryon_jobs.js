const mongoose = require('mongoose');
const TryOnJob = require('./models/TryOnJob');
require('dotenv').config();

const mongoUri = process.env.MONGO_URI;
console.log("Connecting to:", mongoUri);

mongoose.connect(mongoUri)
  .then(async () => {
    console.log("Connected!");
    
    // List collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("Existing collections:", collections.map(c => c.name));
    
    // Clear the TryOnJob collection using the model
    const result = await TryOnJob.deleteMany({});
    console.log(`Successfully cleared try-on jobs using model: deleted ${result.deletedCount} items.`);
    
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("Connection failed:", err);
  });
