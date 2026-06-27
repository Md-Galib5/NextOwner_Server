const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
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
    const wishlistCollection = database.collection("wishlist");
    const ordersCollection = database.collection("orders");

    // USERS
    app.get("/api/users/by-email/:email", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);

        const user = await usersCollection.findOne({
          email: { $regex: `^${email}$`, $options: "i" },
        });

        res.json(user || null);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.patch("/api/users/by-email/:email/seller-profile", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);
        const data = req.body;

        const result = await usersCollection.updateOne(
          { email: { $regex: `^${email}$`, $options: "i" } },
          {
            $set: {
              ...data,
              sellerProfileCompleted: true,
              updatedAt: new Date(),
            },
          }
        );

        res.json({
          success: result.matchedCount > 0,
          modifiedCount: result.modifiedCount,
          message:
            result.matchedCount > 0
              ? "Seller profile updated"
              : "User not found",
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.patch("/api/users/by-email/:email/buyer-profile", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);
        const data = req.body;

        const result = await usersCollection.updateOne(
          { email: { $regex: `^${email}$`, $options: "i" } },
          {
            $set: {
              ...data,
              buyerProfileCompleted: true,
              updatedAt: new Date(),
            },
          }
        );

        res.json({
          success: result.matchedCount > 0,
          modifiedCount: result.modifiedCount,
          message:
            result.matchedCount > 0
              ? "Buyer profile updated"
              : "User not found",
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/users/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid user id",
          });
        }

        const user = await usersCollection.findOne({
          _id: new ObjectId(id),
        });

        res.json(user || null);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // PRODUCTS
    app.post("/api/products", async (req, res) => {
      try {
        const result = await productsCollection.insertOne({
          ...req.body,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        res.json({
          success: true,
          insertedId: result.insertedId,
          message: "Product added successfully",
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/products/seller/:email", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);
        const { search = "", category = "all", sort = "latest" } = req.query;

        const query = { "sellerInfo.email": email };

        if (category !== "all") query.category = category;

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { condition: { $regex: search, $options: "i" } },
          ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === "price-low") sortOption = { price: 1 };
        if (sort === "price-high") sortOption = { price: -1 };

        const products = await productsCollection
          .find(query)
          .sort(sortOption)
          .toArray();

        res.json(products);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/products", async (req, res) => {
      try {
        const { search = "", category = "all", sort = "latest" } = req.query;

        const query = {};

        if (category !== "all") query.category = category;

        if (search) {
          query.$or = [
            { title: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
            { category: { $regex: search, $options: "i" } },
            { "sellerInfo.name": { $regex: search, $options: "i" } },
          ];
        }

        let sortOption = { createdAt: -1 };
        if (sort === "price-low") sortOption = { price: 1 };
        if (sort === "price-high") sortOption = { price: -1 };

        const products = await productsCollection
          .find(query)
          .sort(sortOption)
          .toArray();

        res.json(products);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid product id",
          });
        }

        const product = await productsCollection.findOne({
          _id: new ObjectId(id),
        });

        res.json(product || null);
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.patch("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const updatedData = req.body;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid product id",
          });
        }

        delete updatedData._id;

        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
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
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete("/api/products/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid product id",
          });
        }

        const result = await productsCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.json({
          success: true,
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // WISHLIST
    app.post("/api/wishlist", async (req, res) => {
      try {
        const wishlistData = req.body;

        if (!wishlistData?.userEmail || !wishlistData?.product?._id) {
          return res.status(400).json({
            success: false,
            message: "User email and product are required",
          });
        }

        const exists = await wishlistCollection.findOne({
          userEmail: wishlistData.userEmail,
          "product._id": wishlistData.product._id,
        });

        if (exists) {
          return res.json({
            success: false,
            message: "Already added to wishlist",
          });
        }

        const result = await wishlistCollection.insertOne(wishlistData);

        res.json({
          success: true,
          message: "Added to wishlist",
          result,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.get("/api/wishlist/user/:email", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);

        const result = await wishlistCollection
          .find({ userEmail: email })
          .toArray();

        res.json({
          success: true,
          wishlist: result,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.delete("/api/wishlist/:id", async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({
            success: false,
            message: "Invalid wishlist id",
          });
        }

        const result = await wishlistCollection.deleteOne({
          _id: new ObjectId(id),
        });

        res.json({
          success: true,
          message: "Removed from wishlist",
          deletedCount: result.deletedCount,
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

//   

    // ORDERS
    app.post("/api/orders", async (req, res) => {
      try {
        const result = await ordersCollection.insertOne({
          ...req.body,
          createdAt: new Date(),
        });

        res.json({
          success: true,
          insertedId: result.insertedId,
          message: "Order placed successfully",
        });
      } catch (error) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    app.post("/api/orders/stripe-success", async (req, res) => {
      try {
        const {
          buyerInfo,
          sellerInfo,
          productInfo,
          paymentStatus,
          orderStatus,
          stripeSessionId,
          stripePaymentIntentId,
        } = req.body;

        if (!stripeSessionId) {
          return res.status(400).json({
            success: false,
            message: "Stripe session id missing",
          });
        }

        const existingOrder = await ordersCollection.findOne({
          stripeSessionId,
        });

        if (existingOrder) {
          return res.json({
            success: true,
            message: "Order already exists",
            orderId: existingOrder._id,
          });
        }

        const result = await ordersCollection.insertOne({
          buyerInfo,
          sellerInfo,
          productInfo,
          paymentStatus: paymentStatus || "paid",
          orderStatus: orderStatus || "processing",
          stripeSessionId,
          stripePaymentIntentId,
          createdAt: new Date(),
        });

        res.json({
          success: true,
          message: "Order saved successfully",
          orderId: result.insertedId,
        });
      } catch (error) {
        console.error("Stripe success order save error:", error);

        res.status(500).json({
          success: false,
          message: error.message,
        });
      }
    });

    app.get("/api/orders/buyer/:email", async (req, res) => {
      try {
        const email = decodeURIComponent(req.params.email);

        const orders = await ordersCollection
          .find({
            "buyerInfo.email": {
              $regex: `^${email}$`,
              $options: "i",
            },
          })
          .sort({ createdAt: -1 })
          .toArray();

        res.json({
          success: true,
          orders,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error.message,
          orders: [],
        });
      }
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