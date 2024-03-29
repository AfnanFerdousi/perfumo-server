const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const cors = require('cors');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;


// MIDDLEWARE
app.use(cors());
app.use(express.json())

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();
    })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.zsycn.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const itemCollection = client.db("perfumo").collection("item");

        // Home page Items that is limited to 6
        app.get('/item/home', async (req,res) => {
            const query = {};
            const limit = 6;
            const cursor = itemCollection.find(query).limit(limit);
            const item = await cursor.toArray();
            res.send(item);
        })

        app.post('/login', async (req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '1d'
            });
            res.send({ accessToken });
        })
        // All items in Inventory page
        app.get('/item', async (req,res) => {
            const query = {};
            const cursor = itemCollection.find(query);
            const item = await cursor.toArray();
            res.send(item);
        })

        app.get('/myitem', verifyJWT, async (req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const cursor = itemCollection.find(query);
                const item = await cursor.toArray();
                res.send(item);
            }
            else {
                res.status(403).send({ message: 'forbidden access' })
            }
        })

        // Adding new perfume item in Inventory page
        app.post('/item', async(req,res) => {
            const newItem = req.body;     
            console.log("adding new user", newItem);   
            const result = await itemCollection.insertOne(newItem)
            res.send(result)
        })
        // Only loading the item selected in different route
        app.get('/item/:id', async(req,res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemCollection.findOne(query);
            res.send(result)
        })

        // Updating the selected item only in a different route
        app.put("/item/:id",async(req,res) => {
            const id = req.params.id;
            const updateQuantity = req.body; 
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                  quantity: updateQuantity.quantity
                }
              };
            const result = await itemCollection.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        // Deleting selected item when delete button is clicked in Inventory page
        app.delete('/item/:id',async(req,res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const result = await itemCollection.deleteOne(query);
            res.send(result)
        })

    } 
    finally {
        
    }    
}

run().catch(console.dir);

app.get('/', (req,res) =>  {
    res.send("running mongodb crud")
})


app.listen(port, () => {
    console.log(`Listening to port ${port}`);
})
module.exports = app;