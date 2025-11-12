import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'clever_record_keeper';
const TARGET = 96;

(async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('students');

    const classes = await col.distinct('class');
    console.log('Found classes:', classes);

    for (const cls of classes) {
      const students = await col.find({ class: cls }).toArray();
      console.log(`Processing ${students.length} students in ${cls}...`);
      for (const s of students) {
        const updatedGrades = {};
        const subNames = Object.keys(s.grades || {});
        if (subNames.length === 0) continue;
        subNames.forEach((sub) => {
          updatedGrades[sub] = TARGET;
        });
        await col.updateOne({ _id: s._id }, { $set: { grades: updatedGrades, updated_at: new Date() } });
      }
    }

    // compute and print per-class averages to verify
    const agg = await col.aggregate([
      { $project: { class: 1, gradesArr: { $objectToArray: '$grades' } } },
      { $unwind: '$gradesArr' },
      { $group: { _id: '$class', avg: { $avg: '$gradesArr.v' }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]).toArray();

    console.log('Per-class averages after update:');
    agg.forEach((r) => {
      console.log(r._id, '-> avg:', r.avg.toFixed(2), ' (samples:', r.count, ')');
    });

    console.log('Done.');
  } catch (err) {
    console.error('Error:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
})();
