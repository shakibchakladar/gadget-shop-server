const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, Code, ObjectId } = require("mongodb");
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
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.send({ message: "No token found" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_KEY_TOKEN, (err, decoded) => {
    if (err) {
      return res.send({ message: "invalid token" });
    }
    req.decoded = decoded;
    next();
  });
};

// verrify seller
const verifySeller = async (req, res, next) => {
  const email = req.decoded.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  if (user?.role !== "seller") {
    return res.send({ message: "Forbidden access", code: 403 });
  }
  next();
};

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
app.post("/add-products", verifyJWT, verifySeller, async (req, res) => {
  const product = req.body;
  const result = await productCollection.insertOne(product);
  res.send(result);
});


// get products
app.get("/all-products", async (req, res) => {
  const { title, sort, category, brand, page = 1, limit = 9 } = req.query;
  const query = {};

  if (title) {
    query.title = { $regex: title, $options: "i" };
  }
  if (category) {
    query.category = { $regex: category, $options: "i" };
  }
  if (brand) {
    query.brand = { $regex: brand, $options: "i" };
  }

  const pageNumber = Number(page);
  const limitNumber = Number(limit);

  const sortOption = sort === "asc" ? 1 : -1;

  const products = await productCollection
    .find(query)
    .skip((pageNumber - 1) * limitNumber)
    .limit(limitNumber)
    .sort({ price: sortOption })
    .toArray();

  const totalProducts = await productCollection.countDocuments(query);

  // const productInfo = await productCollection
  //   .find({}, { projection: { category: 1, brand: 1 } })
  //   .toArray();

  const brands = [...new Set(products.map((p) => p.brand))];
  const categories = [...new Set(products.map((p) => p.category))];
  res.json({
    products,
    totalProducts,
    brands,
    categories,
  });
});

//add to wishlist
app.patch("/wishlist/add", async (req, res) => {
  const { userEmail, productId } = req.body;
  const result = await userCollection.updateOne(
    { email: userEmail },
    { $addToSet: { wishlist: new ObjectId(String(productId)) } }
  );
  res.send(result);
});

// remove from wishlist
app.patch("/wishlist/remove", async (req, res) => {
  const { userEmail, productId } = req.body;
  const result = await userCollection.updateOne(
    { email: userEmail },
    { $pull: { wishlist: new ObjectId(String(productId)) } }
  );
  res.send(result);
});

// get data from wishlist
app.get("/wishlist/:userId", verifyJWT, async (req, res) => {
  const { userId } = req.params;
  // console.log(userId);
  const user = await userCollection.findOne({
    _id: new ObjectId(String(userId)),
  });

  if (!user) {
    return res.send({ message: "user not found" });
  }

  const wishlist = await productCollection
    .find({ _id: { $in: user.wishlist || [] } })
    .toArray();
  res.send(wishlist);
});

// api
app.get("/", (req, res) => {
  res.send("gadget shop server is running ");
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
