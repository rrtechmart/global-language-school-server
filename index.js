const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middle wire

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next)=>{
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message:'unauthorized access'});
  }
  // bearer token

  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
    if(err){
      return res.status(401).send({error: true, message:'unauthorized access'})
    }
    req.decoded = decoded;
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = "mongodb+srv://<username>:<password>@cluster0.uyzlba8.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uyzlba8.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const classCollection = client.db("languageDb").collection("classes");
    const instructorCollection = client.db("languageDb").collection("instructors");
    const userCollection = client.db("languageDb").collection("users");
    const selectedClassCollection = client.db("languageDb").collection("selectedClasses");
    const paymentClassCollection = client.db("languageDb").collection("paymentClasses");

    app.post('/jwt', (req, res)=>{
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({token});
    })

    app.get('/users', verifyJWT, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.get('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await userCollection.findOne(query);
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const users = req.body;
      const query = { email: users.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "User already exist" })
      }
      const result = await userCollection.insertOne(users);
      res.send(result);
    })

    app.patch('/users/instructors/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const docUpdate = {
        $set: {
          role: "instructor"
        },
      }
      const result = await userCollection.updateOne(filter, docUpdate)
      res.send(result)
    })

    app.patch('/users/admin/:id', async(req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const docUpdate = {
        $set: {
          role: "admin"
        },
      }
      const result = await userCollection.updateOne(filter, docUpdate);
      res.send(result);

      })

      app.get('/users/admin',  async(req, res)=>{
        const email = req.query?.email;
        if(!email){
          return res.send([]);
        }

        const query = {email:email}
        const user = await userCollection.findOne(query);
        const result = { admin: user?.role === 'admin' }
        res.send(result);
      })

    // api for class
    app.post('/classes', async (req, res) => {
      const addedClass = req.body;
      const result = await classCollection.insertOne(addedClass);
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.get('/classes', async (req, res) => {
      const email = req.body.email;
      const query = { email: email };
      const result = await classCollection.find(query).toArray()
      res.send(result);
    })

    app.patch('/classes/approve/:id', async(req, res)=>{
      const id = req.params.id;
      const filter ={ _id: new ObjectId(id)};
      const docUpdate ={
        $set: {
          status: "approved"
        },
      }
      const result = await classCollection.updateOne(filter, docUpdate);
      res.send(result);
    })
    app.patch('/classes/deny/:id', async(req, res)=>{
      const id = req.params.id;
      const filter ={ _id: new ObjectId(id)};
      const docUpdate ={
        $set: {
          status: "denied"
        },
      }
      const result = await classCollection.updateOne(filter, docUpdate);
      res.send(result);
    })

    app.patch('/classes/feedback/:id', async(req, res)=>{
      const id = req.params.id;
      const filter ={_id: new ObjectId(id)};
      const docUpdate = {
        $set: {
          feedback: req.body.feedback,
        }
      }
      const result = await classCollection.updateOne(filter, docUpdate);
      res.send(result);
    })

    // instructor related api

    app.get('/instructorClass', async (req, res) => {

      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }

      const result = await instructorCollection.find(query).toArray();
      res.send(result);

    })

    app.get('/instructors', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })

    // cart collection api.......

    app.get('/selectedClasses', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      const query = { email: email };
      const result = await selectedClassCollection.find(query).toArray();
      res.send(result);

    })
// for pay
    app.get('/selectedClasses/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result= await selectedClassCollection.findOne(query);
      res.send(result);
    })

    app.post('/paymentClasses', async(req, res)=>{
      const paymentClass= req.body;
      const result = await paymentClassCollection.insertOne(paymentClass);
      res.send(result);
    })
    
    // app.get('/selectedClasses/:email', async(req, res)=>{
    //   const email = req.params.email;
    //   const query = {email:email};
    //   const result= await selectedClassCollection.findOne(query);
    //   res.send(result);
    // })

    app.post('/selectedClasses', async (req, res) => {
      const classItem = req.body;
      console.log(classItem);
      const result = await selectedClassCollection.insertOne(classItem);
      res.send(result);
    })

    app.delete('/selectedClasses/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectedClassCollection.deleteOne(query);
      res.send(result);

    })

    // create payment intent
    app.post('/create-payment-intent', async(req, res)=>{
      const {price} = req.body;
      const amount = price*100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Language school is running')
})



app.listen(port, () => {
  console.log(`global school is running on port: ${port}`)
})