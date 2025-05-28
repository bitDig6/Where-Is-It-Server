require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const cors = require('cors');
const app = express();

//middlewares
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://where-is-it-1aca6.web.app',
    'https://where-is-it-1aca6.firebaseapp.com'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

//verify
const verifyUser = (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized Access' });
  }

  jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized Access' });
    }
    req.user = decoded;
  })

  next();
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.jpi5bfv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

//auth related apis

app.post('/jwt', (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.SECRET_KEY, { expiresIn: '2h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
  }).send({ success: true });
})

app.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict"
  }).send({ success: true });
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
    const recoveredCollection = database.collection("recoveredItems");

    //lost and found related apis

    //get the total count of posts
    app.get('/totalPostsCount', async (req, res) => {
      const count = await postsCollection.estimatedDocumentCount();
      res.send({ count });
    })

    //get some posts from the total posts
    app.get('/allItems', async (req, res) => {
      const page = parseInt(req.query.page);
      const size = parseInt(req.query.size);
      const result = await postsCollection.find().skip(page * size).limit(size).toArray();
      res.send(result);
    })

    //get posts by filters
    app.get('/filteredItems', async (req, res) => {
      const  search = req.query.search;
    const filter = {
      $or:
        [
          { title: { $regex: search} },
          { location: { $regex: search} }
        ]
      };
      
      const result = await postsCollection.find(filter).toArray();
      res.send(result);
    })

    //get latest posts
    app.get('/latestPosts', async (req, res) => {
      const result = await postsCollection.find().sort({ date: -1 }).limit(6).toArray();
      res.send(result);
    })

    //get a post details
    app.get('/items/:id', verifyUser, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.findOne(query);
      res.send(result);
    })

    //get user posts
    app.get('/myItems', verifyUser, async (req, res) => {
      const email = req.query.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'Forbidden Access' });
      }

      const query = { userEmail: email };
      const result = await postsCollection.find(query).toArray();
      res.send(result);
    })

    //get all recovered items added by users
    app.get('/allRecovered', verifyUser, async (req, res) => {
      const email = req.query.email;
      if (email !== req.user.email) {
        return res.status(403).send({ message: 'Forbidden Access' });
      };
      const query = { userEmail: email };
      const result = await recoveredCollection.find(query).toArray();
      res.send(result);
    })

    //post a lost or found item
    app.post('/allItems', verifyUser, async (req, res) => {
      const newPost = req.body;
      const result = await postsCollection.insertOne(newPost);
      res.send(result);
    })

    //post a recovered item
    app.post('/allRecovered', verifyUser, async (req, res) => {
      const recoveredItem = req.body;
      const result = await recoveredCollection.insertOne(recoveredItem);
      res.send(result);
    })

    //update a post
    app.patch('/items/:id', verifyUser, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          title: data.title,
          postType: data.postType,
          imageUrl: data.imageUrl,
          category: data.category,
          location: data.location,
          date: data.date,
          description: data.description,
          isRecovered: data.isRecovered
        }
      };

      const result = await postsCollection.updateOne(filter, updatedDoc);
      res.send(result);
    })

    //delete a post
    app.delete('/items/:id', verifyUser, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await postsCollection.deleteOne(query);
      res.send(result);
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