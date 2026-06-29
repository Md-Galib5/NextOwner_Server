// api/index.js
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const uri = process.env.MONGO_DB_URI;

if (!uri) {
  throw new Error("MONGO_DB_URI is missing");
}

let client;
let database;

async function connectDB() {
  if (database) return database;

  client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: false,
      deprecationErrors: false,
    },
  });

  await client.connect();
  database = client.db("nextowner");
  return database;
}

async function collections() {
  const db = await connectDB();

  return {
    usersCollection: db.collection("user"),
    productsCollection: db.collection("products"),
    wishlistCollection: db.collection("wishlist"),
    ordersCollection: db.collection("orders"),
  };
}

app.get("/", (req, res) => {
  res.send("NextOwner API Running...");
});

// USERS CRUD
app.post("/api/users", async (req, res) => {
  try {
    const { usersCollection } = await collections();

    const result = await usersCollection.insertOne({
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({ success: true, insertedId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const users = await usersCollection.find({}).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, users: [] });
  }
});

app.get("/api/users/by-email/:email", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const email = decodeURIComponent(req.params.email);

    const user = await usersCollection.findOne({
      email: { $regex: `^${email}$`, $options: "i" },
    });

    res.json(user || null);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    res.json(user || null);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const data = { ...req.body };
    delete data._id;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/users/by-email/:email/seller-profile", async (req, res) => {
  try {
    const { usersCollection } = await collections();
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
    const { usersCollection } = await collections();
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

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PRODUCTS CRUD
app.post("/api/products", async (req, res) => {
  try {
    const { productsCollection } = await collections();

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

app.get("/api/products", async (req, res) => {
  try {
    const { productsCollection } = await collections();

    const {
      page = 1,
      limit = 6,
      search = "",
      category = "all",
      sort = "latest",
    } = req.query;

    const currentPage = Math.max(parseInt(page), 1);
    const perPage = Math.max(parseInt(limit), 1);
    const skip = (currentPage - 1) * perPage;

    const query = {};

    // category filter
    if (category && category !== "all") {
      query.category = { $regex: `^${category}$`, $options: "i" };
    }

    // search filter
    if (search.trim()) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { condition: { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
        { "sellerInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    // sort
    let sortOption = { createdAt: -1 };

    if (sort === "oldest") {
      sortOption = { createdAt: 1 };
    }

    if (sort === "price-low") {
      sortOption = { price: 1 };
    }

    if (sort === "price-high") {
      sortOption = { price: -1 };
    }

    const totalProducts = await productsCollection.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / perPage);

    const products = await productsCollection
      .find(query)
      .sort(sortOption)
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
        prevPage: currentPage > 1 ? currentPage - 1 : null,
        nextPage: currentPage < totalPages ? currentPage + 1 : null,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get products",
      error: error.message,
      products: [],
    });
  }
});

app.get("/api/products/seller/:email", async (req, res) => {
  try {
    const { productsCollection } = await collections();
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

    let sortOption = { createdAt: -1 };
    if (sort === "oldest") sortOption = { createdAt: 1 };
    if (sort === "price-low") sortOption = { price: 1 };
    if (sort === "price-high") sortOption = { price: -1 };

    const products = await productsCollection.find(query).sort(sortOption).toArray();

    res.json(products);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const { productsCollection } = await collections();
    const { id } = req.params;

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
    const { productsCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const data = { ...req.body };
    delete data._id;

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
      message: result.matchedCount > 0 ? "Product updated successfully" : "Product not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  try {
    const { productsCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      deletedCount: result.deletedCount,
      message: result.deletedCount > 0 ? "Product deleted successfully" : "Product not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// WISHLIST CRUD
app.post("/api/wishlist", async (req, res) => {
  try {
    const { wishlistCollection } = await collections();
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

    const result = await wishlistCollection.insertOne({
      ...wishlistData,
      createdAt: new Date(),
    });

    res.json({
      success: true,
      message: "Added to wishlist",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/wishlist", async (req, res) => {
  try {
    const { wishlistCollection } = await collections();
    const wishlist = await wishlistCollection.find({}).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, wishlist: [] });
  }
});

app.get("/api/wishlist/user/:email", async (req, res) => {
  try {
    const { wishlistCollection } = await collections();
    const email = decodeURIComponent(req.params.email);

    const wishlist = await wishlistCollection
      .find({ userEmail: { $regex: `^${email}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, wishlist });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, wishlist: [] });
  }
});

app.delete("/api/wishlist/:id", async (req, res) => {
  try {
    const { wishlistCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid wishlist id" });
    }

    const result = await wishlistCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      deletedCount: result.deletedCount,
      message: result.deletedCount > 0 ? "Removed from wishlist" : "Wishlist item not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ORDERS CRUD
app.post("/api/orders", async (req, res) => {
  try {
    const { ordersCollection } = await collections();

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

app.get("/api/orders", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.get("/api/orders/buyer/:email", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const email = decodeURIComponent(req.params.email);

    const orders = await ordersCollection
      .find({ "buyerInfo.email": { $regex: `^${email}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.get("/api/orders/seller/:email", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const email = decodeURIComponent(req.params.email);

    const orders = await ordersCollection
      .find({ "sellerInfo.email": { $regex: `^${email}$`, $options: "i" } })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.get("/api/orders/:id", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/orders/:id", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const data = { ...req.body };
    delete data._id;

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { ...data, updatedAt: new Date() } }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
      message: result.matchedCount > 0 ? "Order updated" : "Order not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/orders/:id/cancel", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    if (["shipped", "delivered"].includes(order.orderStatus)) {
      return res.json({
        success: false,
        message: "You cannot cancel after shipment",
      });
    }

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          orderStatus: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.modifiedCount > 0,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          orderStatus: status,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.matchedCount > 0,
      modifiedCount: result.modifiedCount,
      message: result.matchedCount > 0 ? "Order status updated" : "Order not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/orders/:id", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const result = await ordersCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      deletedCount: result.deletedCount,
      message: result.deletedCount > 0 ? "Order deleted" : "Order not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// STRIPE SUCCESS ORDER SAVE
app.post("/api/orders/stripe-success", async (req, res) => {
  try {
    const { ordersCollection } = await collections();

    const {
      buyerInfo,
      sellerInfo,
      productInfo,
      paymentStatus,
      orderStatus,
      transactionId,
      stripeSessionId,
      stripePaymentIntentId,
    } = req.body;

    if (!stripeSessionId) {
      return res.status(400).json({
        success: false,
        message: "Stripe session id missing",
      });
    }

    const existingOrder = await ordersCollection.findOne({ stripeSessionId });

    if (existingOrder) {
      return res.json({
        success: true,
        message: "Order already exists",
        orderId: existingOrder._id,
      });
    }

    const quantity = Number(productInfo?.quantity || 1);
    const unitPrice = Number(productInfo?.price || 0);
    const totalPrice = unitPrice * quantity;

    const result = await ordersCollection.insertOne({
      buyerInfo,
      sellerInfo,
      productInfo: {
        ...productInfo,
        condition: Array.isArray(productInfo?.condition)
          ? productInfo.condition.join("")
          : productInfo?.condition,
      },
      quantity,
      unitPrice,
      totalPrice,
      paymentStatus: paymentStatus || "paid",
      orderStatus: orderStatus || "processing",
      transactionId,
      stripeSessionId,
      stripePaymentIntentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.json({
      success: true,
      message: "Order saved successfully",
      orderId: result.insertedId,
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN
app.get("/api/admin/stats", async (req, res) => {
  try {
    const { usersCollection, productsCollection, ordersCollection } = await collections();

    const totalUsers = await usersCollection.countDocuments();
    const totalProducts = await productsCollection.countDocuments();
    const totalOrders = await ordersCollection.countDocuments();

    res.json({
      success: true,
      totalUsers,
      totalProducts,
      totalOrders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to load admin stats" });
  }
});

app.get("/api/admin/users", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { search = "" } = req.query;

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
            { status: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await usersCollection.find(query).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, users: [] });
  }
});

app.patch("/api/admin/users/:id/status", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({
      success: result.matchedCount > 0,
      message: result.matchedCount > 0 ? "User status updated" : "User not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { usersCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      message: result.deletedCount > 0 ? "User deleted successfully" : "User not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/products", async (req, res) => {
  try {
    const { productsCollection } = await collections();
    const { search = "", status = "all" } = req.query;

    const query = {};

    if (status !== "all") query.status = status;

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { "sellerInfo.email": { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
      ];
    }

    const products = await productsCollection.find(query).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, products: [] });
  }
});

app.patch("/api/admin/products/:id/status", async (req, res) => {
  try {
    const { productsCollection } = await collections();
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({
      success: result.matchedCount > 0,
      message: result.matchedCount > 0 ? "Product status updated" : "Product not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const { productsCollection } = await collections();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid product id" });
    }

    const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });

    res.json({
      success: result.deletedCount > 0,
      message: result.deletedCount > 0 ? "Product deleted successfully" : "Product not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/orders", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { search = "", status = "all" } = req.query;

    const query = {};

    if (status !== "all") query.orderStatus = status;

    if (search) {
      query.$or = [
        { "buyerInfo.name": { $regex: search, $options: "i" } },
        { "buyerInfo.email": { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
        { "sellerInfo.email": { $regex: search, $options: "i" } },
        { "productInfo.title": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { id } = req.params;
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
          updatedBy: "admin",
        },
      }
    );

    res.json({
      success: result.matchedCount > 0,
      message: result.matchedCount > 0 ? "Order status updated" : "Order not found",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/admin/transactions", async (req, res) => {
  try {
    const { ordersCollection } = await collections();
    const { search = "", status = "all" } = req.query;

    const query = {};
    if (status !== "all") query.paymentStatus = status;

    const transactions = await ordersCollection.find(query).sort({ createdAt: -1 }).toArray();

    const keyword = search.toLowerCase();

    const filtered = transactions.filter((item) => {
      if (!keyword) return true;

      return (
        item?.buyerInfo?.name?.toLowerCase().includes(keyword) ||
        item?.buyerInfo?.email?.toLowerCase().includes(keyword) ||
        item?.sellerInfo?.name?.toLowerCase().includes(keyword) ||
        item?.sellerInfo?.email?.toLowerCase().includes(keyword) ||
        item?.stripePaymentIntentId?.toLowerCase().includes(keyword) ||
        item?.transactionId?.toLowerCase().includes(keyword)
      );
    });

    const totalRevenue = filtered.reduce(
      (sum, item) => sum + Number(item.totalPrice || item.productInfo?.price || 0),
      0
    );

    res.json({
      success: true,
      transactions: filtered,
      totalRevenue,
      totalTransactions: filtered.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = app;