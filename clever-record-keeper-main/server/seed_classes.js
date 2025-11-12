import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.MONGO_DB || 'clever_record_keeper';

const classes = [
  {
    className: 'Class 1',
    parentContact: 'Alice Carter, +1-202-555-0101',
    teacher: 'Ms. Olivia Smith',
    address: 'Block A, Sunrise Academy, Elm Street',
    totalStudents: 47,
    attendanceRate: '94%',
    gradeBuckets: { A: 12, B: 15, C: 14, D: 6 }
  },
  {
    className: 'Class 2',
    parentContact: 'Brian Evans, +1-202-555-0102',
    teacher: 'Mr. William Johnson',
    address: 'Wing B, Greenwood School, Maple Avenue',
    totalStudents: 45,
    attendanceRate: '97%',
    gradeBuckets: { A: 10, B: 18, C: 12, D: 5 }
  },
  {
    className: 'Class 3',
    parentContact: 'Chloe Patel, +1-202-555-0103',
    teacher: 'Ms. Sophia Davis',
    address: 'Building C, Lakeside Campus, Oak Street',
    totalStudents: 50,
    attendanceRate: '91%',
    gradeBuckets: { A: 15, B: 15, C: 15, D: 5 }
  },
  {
    className: 'Class 4',
    parentContact: 'Daniel Kim, +1-202-555-0104',
    teacher: 'Mr. Liam Martinez',
    address: 'Section D, Pinecrest School, Birch Road',
    totalStudents: 49,
    attendanceRate: '99%',
    gradeBuckets: { A: 8, B: 20, C: 15, D: 6 }
  },
  {
    className: 'Class 5',
    parentContact: 'Eva Gomez, +1-202-555-0105',
    teacher: 'Ms. Emma Brown',
    address: 'Annex E, Hilltop Academy, Cedar Drive',
    totalStudents: 46,
    attendanceRate: '95%',
    gradeBuckets: { A: 7, B: 18, C: 15, D: 6 }
  },
  {
    className: 'Class 6',
    parentContact: 'Frank Schmidt, +1-202-555-0106',
    teacher: 'Mr. Noah Garcia',
    address: 'Campus F, Silveroak School, Willow Lane',
    totalStudents: 48,
    attendanceRate: '92%',
    gradeBuckets: { A: 14, B: 12, C: 18, D: 4 }
  },
  {
    className: 'Class 7',
    parentContact: 'Grace Liu, +1-202-555-0107',
    teacher: 'Ms. Mia Miller',
    address: 'North Wing, Riverdale Institute, Spruce Street',
    totalStudents: 45,
    attendanceRate: '98%',
    gradeBuckets: { A: 9, B: 15, C: 18, D: 3 }
  },
  {
    className: 'Class 8',
    parentContact: 'Hector Chavez, +1-202-555-0108',
    teacher: 'Mr. Benjamin Wilson',
    address: 'East Wing, Oakwood Academy, Poplar Avenue',
    totalStudents: 50,
    attendanceRate: '96%',
    gradeBuckets: { A: 18, B: 20, C: 8, D: 4 }
  },
  {
    className: 'Class 9',
    parentContact: 'Irene Johnson, +1-202-555-0109',
    teacher: 'Ms. Ava Moore',
    address: 'South Block, Meadowview School, Cherry Lane',
    totalStudents: 46,
    attendanceRate: '90%',
    gradeBuckets: { A: 6, B: 18, C: 17, D: 5 }
  },
  {
    className: 'Class 10',
    parentContact: "James O'Connor, +1-202-555-0110",
    teacher: 'Mr. Elijah Taylor',
    address: 'Main Building, Harmony Campus, Pine Street',
    totalStudents: 49,
    attendanceRate: '93%',
    gradeBuckets: { A: 12, B: 15, C: 14, D: 8 }
  }
];

(async () => {
  const client = new MongoClient(MONGO_URI);
  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const col = db.collection('classes');

    for (const cls of classes) {
      const res = await col.updateOne({ className: cls.className }, { $set: cls }, { upsert: true });
      if (res.upsertedCount) console.log('Inserted', cls.className);
      else console.log('Updated', cls.className);
    }

    const all = await col.find({}).toArray();
    console.log('Classes collection now has', all.length, 'documents');
    console.log(JSON.stringify(all, null, 2));
  } catch (err) {
    console.error('Seed failed:', err);
    process.exitCode = 2;
  } finally {
    await client.close();
  }
})();
