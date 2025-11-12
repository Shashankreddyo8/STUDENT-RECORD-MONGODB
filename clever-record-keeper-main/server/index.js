import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017";
const DB_NAME = process.env.MONGO_DB || "clever_record_keeper";

let db;

async function connect() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  // seed if empty
  const col = db.collection("students");
  const count = await col.countDocuments();
  if (count === 0) {
    console.log("Seeding students collection...");
    const seeds = generateSeedStudents();
    await col.insertMany(seeds);
    console.log(`Inserted ${seeds.length} seed students`);
  }
}

function cryptoRandomId() {
  return (Math.random().toString(36).slice(2, 9) + Date.now().toString(36)).slice(0, 20);
}

function generateSeedStudents() {
  const firstNames = [
    "Aarav","Arjun","Vivaan","Sai","Rohan","Ishaan","Aditya","Krishna","Karan","Ravi",
    "Ananya","Aisha","Sanya","Isha","Priya","Diya","Kavya","Neha","Rhea","Simran"
  ];
  const lastNames = ["Sharma","Patel","Verma","Khan","Reddy","Gupta","Das","Singh","Mehta","Kumar"];

  const subjectPool = {
    lower: ["Math","English","EVS","Drawing"],
    middle: ["Math","English","Science","Social Studies","Hindi","Computer"],
    high: ["Math","English","Physics","Chemistry","Biology","History","Geography","Computer"]
  };

  const students = [];
  const now = new Date();

  for (let cls = 1; cls <= 10; cls++) {
    const count = 45;
    for (let i = 0; i < count; i++) {
      const fname = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lname = lastNames[Math.floor(Math.random() * lastNames.length)];
      const name = `${fname} ${lname}`;
      const baseAge = 5 + cls;
      const age = baseAge + (Math.random() < 0.5 ? 0 : 1);

      let subjects;
      if (cls <= 3) subjects = subjectPool.lower;
      else if (cls <= 7) subjects = subjectPool.middle;
      else subjects = subjectPool.high;

      const shuffled = subjects.slice().sort(() => Math.random() - 0.5);
      const take = Math.min(Math.max(4, Math.floor(Math.random() * (shuffled.length - 3)) + 4), shuffled.length);
      const studentSubjects = shuffled.slice(0, take);

      const grades = {};
      studentSubjects.forEach((sub) => {
        const min = 40;
        const max = 100;
        const variance = Math.floor(Math.random() * (max - min + 1));
        grades[sub] = Math.max(min, Math.min(max, Math.round(variance + (cls * 0.5))));
      });

      students.push({
        _id: cryptoRandomId(),
        user_id: null,
        name,
        age,
        class: `Class ${cls}`,
        subjects: studentSubjects,
        grades,
        // new fields: address, parent, class_teacher, subject_heads
        address: {
          line1: `${Math.floor(1 + Math.random() * 200)} ${['MG Road','Station Road','Church Street','Park Avenue'][Math.floor(Math.random()*4)]}`,
          city: ['Mumbai','Delhi','Bengaluru','Chennai','Hyderabad'][Math.floor(Math.random()*5)],
          state: ['MH','DL','KA','TN','TG'][Math.floor(Math.random()*5)],
          zip: String(100000 + Math.floor(Math.random() * 900000)),
        },
        parent: {
          name: `${['Mr.','Mrs.','Ms.'][Math.floor(Math.random()*3)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
          phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
          relation: Math.random() < 0.5 ? 'Father' : 'Mother'
        },
        class_teacher: {
          name: `${['Rajesh','Sunita','Kavita','Amit','Sneha'][Math.floor(Math.random()*5)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
          phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
          email: '' + name.split(' ').join('.').toLowerCase() + `@school.edu`
        },
        subject_heads: studentSubjects.reduce((acc, sub) => {
          acc[sub] = {
            name: `${['Dr.','Mr.','Ms.'][Math.floor(Math.random()*3)]} ${lastNames[Math.floor(Math.random()*lastNames.length)]}`,
            phone: `+91${Math.floor(600000000 + Math.random() * 399999999)}`,
            email: `${sub.toLowerCase().replace(/[^a-z]/g,'')}.${cls}@school.edu`
          };
          return acc;
        }, {}),
        created_at: now,
        updated_at: now,
      });
    }
  }
  return students;
}

app.get("/api/students", async (req, res) => {
  const col = db.collection("students");
  const students = await col.find({}).toArray();
  res.json(students.map((s) => ({ ...s, id: s._id })) );
});

app.get("/api/classes", async (req, res) => {
  const col = db.collection("students");
  const pipeline = [
    { $group: { _id: "$class", count: { $sum: 1 }, students: { $push: "$grades" } } },
  ];
  const agg = await col.aggregate(pipeline).toArray();
  const rows = agg.map((g) => {
    const averages = g.students.map((gradesArray) => {
      // gradesArray is grades object
      const vals = Object.values(gradesArray || {});
      if (!vals.length) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });
    const avg = averages.length ? Math.round((averages.reduce((a, b) => a + b, 0) / averages.length) * 10) / 10 : 0;
    return { className: g._id, count: g.count, avg };
  });
  res.json(rows);
});

// Return seeded classes metadata if available (from `classes` collection)
app.get("/api/classes/meta", async (req, res) => {
  try {
    const col = db.collection("classes");
    const docs = await col.find({}).toArray();
    res.json(docs.map((d) => ({ ...d, id: d._id })));
  } catch (err) {
    console.error('Failed to fetch classes meta:', err);
    res.status(500).json({ error: 'Failed to fetch classes meta' });
  }
});

app.get("/api/classes/:className/students", async (req, res) => {
  const className = req.params.className;
  const col = db.collection("students");
  const students = await col.find({ class: className }).toArray();
  res.json(students.map((s) => ({ ...s, id: s._id })) );
});

app.post("/api/students", async (req, res) => {
  const payload = req.body;
  const col = db.collection("students");
  const now = new Date();
  const doc = { ...payload, _id: cryptoRandomId(), created_at: now, updated_at: now };
  await col.insertOne(doc);
  res.json({ data: { ...doc, id: doc._id } });
});

app.put("/api/students/:id", async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  const col = db.collection("students");
  const now = new Date();
  await col.updateOne({ _id: id }, { $set: { ...updates, updated_at: now } });
  const updated = await col.findOne({ _id: id });
  res.json({ data: { ...updated, id: updated._id } });
});

app.delete("/api/students/:id", async (req, res) => {
  const id = req.params.id;
  const col = db.collection("students");
  await col.deleteOne({ _id: id });
  res.json({});
});

const PORT = process.env.PORT || 4000;
connect().then(() => {
  app.listen(PORT, () => console.log(`API server listening on http://localhost:${PORT}`));
}).catch((err) => {
  console.error("Failed to connect to MongoDB:", err);
  process.exit(1);
});
