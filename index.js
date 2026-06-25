const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
} = require("mongodb");

const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = 8080;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("NextOwner API Running...");
});

const uri = process.env.MONGO_DB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("nextowner");
    const usersCollection = database.collection("user");
    const productsCollection = database.collection("products");

app.get("/api/products/seller/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const { search = "", category = "all", sort = "latest" } = req.query;

    const query = {
      "sellerInfo.email": email,
    };

    if (category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { condition: { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };

    if (sort === "price-low") {
      sortOption = { price: 1 };
    }

    if (sort === "price-high") {
      sortOption = { price: -1 };
    }

    const products = await productsCollection
      .find(query)
      .sort(sortOption)
      .toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

    
app.get("/api/products", async (req, res) => {
  try {
    const { search = "", category = "all", sort = "latest" } = req.query;

    const query = {};

    if (category !== "all") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
      ];
    }

    let sortOption = { createdAt: -1 };

    if (sort === "price-low") {
      sortOption = { price: 1 };
    }

    if (sort === "price-high") {
      sortOption = { price: -1 };
    }

    const products = await productsCollection
      .find(query)
      .sort(sortOption)
      .toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

    app.post("/api/products", async (req, res) => {
      const product = req.body;
      const result = await productsCollection.insertOne(product);

      res.json({
        success: true,
        insertedId: result.insertedId.toString(),
      });
    });

    app.get("/api/products/:id", async (req, res) => {
      const product = await productsCollection.findOne({
        _id: new ObjectId(req.params.id),
      });

      res.json(product);
    });

    app.patch("/api/products/:id", async (req, res) => {
      const updatedData = req.body;
      delete updatedData._id;

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(req.params.id) },
        {
          $set: {
            ...updatedData,
            updatedAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        modifiedCount: result.modifiedCount,
      });
    });

    app.delete("/api/products/:id", async (req, res) => {
      const result = await productsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
      });

      res.json({
        success: true,
        deletedCount: result.deletedCount,
      });
    });

    console.log("✅ Connected to MongoDB Successfully");
  } catch (error) {
    console.error(error);
  }
}

run();

app.listen(port, () => {
  console.log(`🚀 NextOwner Server running on port ${port}`);
});