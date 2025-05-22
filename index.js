require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jpi5bfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '2h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: false
    // secure: process.env.NODE_ENV === "production",
    // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
  }).send({ success: true});
})

app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: false
    // secure: process.env.NODE_ENV === "production",
    // sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
  }).send({ success: true});
})

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

     const database = client.db("LostAndFound");
    const postsCollection = database.collection("posts");

    //lost and found related apis
    app.get('/allItems', async(req, res) => {
      const result = await postsCollection.find().toArray();
      res.send(result);
    })

    //get latest posts
    app.get('/latestPosts', async(req, res) => {
      const result = await postsCollection.find().sort( { date: -1}).limit(6).toArray();
      res.send(result);
    })

    //get the total count of posts
    app.get('/totalPostsCount', async(req, res) => {
      const count = await postsCollection.estimatedDocumentCount();
      res.send({ count });
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send("Started Where Is It Server");
});

app.listen(port, (req, res) => {
    console.log('server started at Port: ', port);
})