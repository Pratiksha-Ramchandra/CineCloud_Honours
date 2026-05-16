#!/usr/bin/env node
require('dotenv').config();
const { client, seedDatabase, insertRandomMovies } = require('./mongo');

async function resetAndSeed() {
  try {
    if (client.closed) await client.connect();
    const db = client.db(process.env.MONGO_DB || 'cinecloud');

    const toDrop = ['bookings', 'showtimes', 'movies', 'theaters', 'users'];
    for (const name of toDrop) {
      const exists = await db.listCollections({ name }).hasNext();
      if (exists) {
        console.log(`Dropping collection: ${name}`);
        await db.collection(name).drop();
      }
    }

    console.log('Running seeded inserts...');
    await seedDatabase();
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

async function seedOnly() {
  try {
    await seedDatabase();
    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

async function insertRandom(count) {
  try {
    await insertRandomMovies(count);
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
}

(async () => {
  const cmd = process.argv[2] || 'seed';
  if (cmd === 'reset') {
    await resetAndSeed();
  } else if (cmd === 'seed') {
    await seedOnly();
  } else if (cmd === 'insert') {
    const count = parseInt(process.argv[3], 10) || 5;
    await insertRandom(count);
  } else {
    console.log('Usage: node seed.js [reset|seed|insert <count>]');
    process.exit(0);
  }
})();
