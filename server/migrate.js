require('dotenv').config();
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Clothing = require('./models/Clothing');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const clothes = await Clothing.find({ imageHash: '' });
    console.log(`Found ${clothes.length} clothes without hash`);

    for (const item of clothes) {
      const filePath = path.join(__dirname, item.imageUrl);
      if (fs.existsSync(filePath)) {
        const fileBuffer = fs.readFileSync(filePath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        item.imageHash = hash;
        await item.save();
        console.log(`Updated hash for ${item.name}`);
      } else {
        console.log(`File not found for ${item.name}: ${item.imageUrl}`);
      }
    }

    console.log('Migration complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

migrate();
