const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let productsCollection;
let usersCollection;
let wishlistCollection;
let ordersCollection;

async function connectDB() {
  if (!productsCollection) {
    await client.connect();

    const database = client.db("nextowner");

    usersCollection = database.collection("user");
    productsCollection = database.collection("products");
    wishlistCollection = database.collection("wishlist");
    ordersCollection = database.collection("orders");

    console.log("MongoDB connected");
  }
}

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("DB CONNECTION ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

app.get("/", (req, res) => {
  res.send("NextOwner API Running...");
});

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

    const result = await usersCollection.updateOne(
      { email: { $regex: `^${email}$`, $options: "i" } },
      {
        $set: {
          ...req.body,
          sellerProfileCompleted: true,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
      message: result.matchedCount > 0 ? "Seller profile updated" : "User not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/users/by-email/:email/buyer-profile", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const result = await usersCollection.updateOne(
      { email: { $regex: `^${email}$`, $options: "i" } },
      {
        $set: {
          ...req.body,
          buyerProfileCompleted: true,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
      message: result.matchedCount > 0 ? "Buyer profile updated" : "User not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
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
      status: req.body.status || "available",
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

app.get("/api/products", async (req, res) => {
  try {
    const {
      page = 1,
      limit = 6,
      search = "",
      category = "all",
      sort = "latest",
    } = req.query;

    const currentPage = Math.max(Number(page), 1);
    const perPage = Math.max(Number(limit), 1);
    const skip = (currentPage - 1) * perPage;

    const query = {
      status: { $in: ["approved", "available"] },
    };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
      ];
    }

    if (category !== "all") {
      query.category = category;
    }

    let sortQuery = { createdAt: -1 };

    if (sort === "oldest") sortQuery = { createdAt: 1 };
    if (sort === "price-low") sortQuery = { price: 1 };
    if (sort === "price-high") sortQuery = { price: -1 };

    const totalProducts = await productsCollection.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalProducts / perPage), 1);

    const products = await productsCollection
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(perPage)
      .toArray();

    res.json({
      success: true,
      products,
      pagination: {
        currentPage,
        totalPages,
        totalProducts,
        limit: perPage,
        hasPrevPage: currentPage > 1,
        hasNextPage: currentPage < totalPages,
      },
    });
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
    });
  }
});

app.get("/api/products/seller/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const { search = "", category = "all", sort = "latest" } = req.query;

    const query = {
      "sellerInfo.email": { $regex: `^${email}$`, $options: "i" },
    };

    if (category !== "all") query.category = category;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { condition: { $regex: search, $options: "i" } },
      ];
    }

    let sortQuery = { createdAt: -1 };

    if (sort === "oldest") sortQuery = { createdAt: 1 };
    if (sort === "price-low") sortQuery = { price: 1 };
    if (sort === "price-high") sortQuery = { price: -1 };

    const products = await productsCollection.find(query).sort(sortQuery).toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const product = await productsCollection.findOne({ _id: new ObjectId(id) });
    res.json(product || null);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/products/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const updatedData = { ...req.body };
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
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

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

    const exists = await wishlistCollection.findOne({
      userEmail: wishlistData.userEmail,
      "product._id": wishlistData?.product?._id,
    });

    if (exists) {
      return res.json({
        success: false,
        message: "Already added to wishlist",
      });
    }

    const result = await wishlistCollection.insertOne({
      ...wishlistData,
      createdAt: new Date(),
    });

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

    const wishlist = await wishlistCollection
      .find({ userEmail: { $regex: `^${email}$`, $options: "i" } })
      .toArray();

    res.json({
      success: true,
      wishlist,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/wishlist/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid wishlist id" });
    }

    const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ORDERS
app.post("/api/orders", async (req, res) => {
  try {
    const result = await ordersCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
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

app.get("/api/orders/buyer/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const orders = await ordersCollection
      .find({
        "buyerInfo.email": { $regex: `^${email}$`, $options: "i" },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.get("/api/orders/seller/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const orders = await ordersCollection
      .find({
        "sellerInfo.email": { $regex: `^${email}$`, $options: "i" },
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

    res.json({
      success: !!order,
      order,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const id = req.params.id;
    const { orderStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          orderStatus,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.modifiedCount > 0,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// LOCAL ONLY
if (require.main === module) {
  app.listen(port, () => {
    console.log(`NextOwner Server running on port ${port}`);
  });
}

// VERCEL EXPORT
module.exports = app;