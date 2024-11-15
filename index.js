const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 4000;

// middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());

// token verification
const verifyJWT=(req,res,next)=>{
  const authorization=req.header.authorization;
  if(!authorization){
    return res.send({message:'no token found'})
  }
  const token=authorization.split( )[1];
  jwt.verify(token,process.env.ACCESS_KEY_TOKEN,(err,decoded)=>{
    if(err){
      return res.send({message: 'invalid token'})
    }
    res.decoded=decoded;
    next();
  })
}

// mongodb
const url = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.9ttivus.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// collections
const userCollection = client.db("gadgetdb").collection("users");
const productCollection = client.db("gadgetdb").collection("products");

const dbConnect = async () => {
  try {
    client.connect();
    console.log("Database connected succesfully");
  } catch (error) {
    console.log(error.name, error.message);
  }
};

dbConnect();

// insert user in db
app.post("/users", async (req, res) => {
  const user = req.body;
  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);

  if (existingUser) {
    return res.send({ message: "user already exist in db" });
  }

  const result = await userCollection.insertOne(user);
  res.send(result);
});

// get user
app.get("/user/:email", async (req, res) => {
  const query = { email: req.params.email };
  const result = await userCollection.findOne(query);
  res.send(result);
});

// add products
app.post("/add-products",async(req,res)=>{
  const product=req.body
  const result=await productCollection.insertOne(product)
  res.send(result)
})
// api
app.get("/", (req, res) => {
  res.send("gadget server is running ");
});

// jwt
app.post("/authentication", async (req, res) => {
  const userEmail = req.body;
  const token = jwt.sign(userEmail, process.env.ACCESS_KEY_TOKEN, {
    expiresIn: "10d",
  });
  res.send({ token });
});

app.listen(port, () => {
  console.log(`server is running on port, ${port}`);
});
