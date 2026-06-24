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



    app.get("/api/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        const user = await usersCollection.findOne({
          _id: new ObjectId(id),
        });

        if (!user) {
          return res.status(404).json({
            success: false,
            message: "User not found",
          });
        }

        res.json(user);
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


app.get("/api/users/by-email/:email", async (req, res) => {
  const user = await usersCollection.findOne({
    email: req.params.email,
  });

  res.json(user);
});

    app.patch("/api/users/:id/seller-profile", async (req, res) => {
      try {
        const id = req.params.id;

        const {
          phone,
          location,
          photo,
          status = "active",
        } = req.body;

        if (!phone || !location || !photo) {
          return res.status(400).json({
            success: false,
            message:
              "Phone, location and profile photo are required",
          });
        }

        const result = await usersCollection.updateOne(
          {
            _id: new ObjectId(id),
          },
          {
            $set: {
              phone,
              location,
              photo,
              status,
              role: "seller",
              sellerProfileCompleted: true,
            },
          }
        );

        res.json({
          success: true,
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    app.get("/api/products", async (req, res) => {
      try {
        const query = {};

        if (req.query.userId) {
          query["sellerInfo.userId"] =
            req.query.userId.trim();
        }

        if (req.query.status) {
          query.status = req.query.status.trim();
        }

        const result = await productsCollection
          .find(query)
          .sort({
            createdAt: -1,
          })
          .toArray();

        res.json(result);
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    app.post("/api/products", async (req, res) => {
      try {
        const product = req.body;

        const result =
          await productsCollection.insertOne(product);

        res.json({
          success: true,
          insertedId: result.insertedId.toString(),
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });


    app.delete("/api/products/:id", async (req, res) => {
      try {
        const result =
          await productsCollection.deleteOne({
            _id: new ObjectId(req.params.id),
          });

        res.json({
          success: true,
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const product = await productsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

    app.patch("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        const result =
          await productsCollection.updateOne(
            {
              _id: new ObjectId(id),
            },
            {
              $set: updatedData,
            }
          );

        res.json({
          success: true,
          modifiedCount: result.modifiedCount,
        });
      } catch (error) {
        console.error(error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    await client.db("admin").command({
      ping: 1,
    });

    console.log(
      "✅ Connected to MongoDB Successfully"
    );
  } catch (error) {
    console.error(error);
  }
}

run();

app.listen(port, () => {
  console.log(
    `🚀 NextOwner Server running on port ${port}`
  );
});