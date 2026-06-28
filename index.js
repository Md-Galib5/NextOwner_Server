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

// app.get("/api/products", async (req, res) => {
//   try {
//     const page = Math.max(parseInt(req.query.page) || 1, 1);
//     const limit = Math.max(parseInt(req.query.limit) || 1, 1);
//     const skip = (page - 1) * limit;

//     const { search = "", category = "all", sort = "latest" } = req.query;

//     const query = {};

//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { category: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//       ];
//     }

//     if (category !== "all") {
//       query.category = category;
//     }

//     let sortOption = { createdAt: -1 };

//     if (sort === "oldest") sortOption = { createdAt: 1 };
//     if (sort === "price-low") sortOption = { price: 1 };
//     if (sort === "price-high") sortOption = { price: -1 };

//     const totalProducts = await productsCollection.countDocuments(query);

//     const products = await productsCollection
//       .find(query)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .toArray();

//     res.json({
//       success: true,
//       products,
//       pagination: {
//         totalProducts,
//         currentPage: page,
//         totalPages: Math.ceil(totalProducts / limit),
//         limit,
//         hasPrevPage: page > 1,
//         hasNextPage: page < Math.ceil(totalProducts / limit),
//       },
//     });
//   } catch (error) {
//     console.error("Get products error:", error);

//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// app.get("/api/products", async (req, res) => {
//   try {
//     const page = Math.max(Number(req.query.page) || 1, 1);
//     const limit = Math.max(Number(req.query.limit) || 6, 1);
//     const skip = (page - 1) * limit;

//     const { search = "", category = "all", sort = "latest" } = req.query;

//     const query = {};

//     if (search) {
//       query.$or = [
//         { title: { $regex: search, $options: "i" } },
//         { category: { $regex: search, $options: "i" } },
//         { description: { $regex: search, $options: "i" } },
//         { "sellerInfo.name": { $regex: search, $options: "i" } },
//       ];
//     }

//     if (category !== "all") {
//       query.category = category;
//     }

//     let sortOption = { createdAt: -1 };

//     if (sort === "price-low") sortOption = { price: 1 };
//     if (sort === "price-high") sortOption = { price: -1 };

//     const totalProducts = await productsCollection.countDocuments(query);
//     const totalPages = Math.ceil(totalProducts / limit);

//     const products = await productsCollection
//       .find(query)
//       .sort(sortOption)
//       .skip(skip)
//       .limit(limit)
//       .toArray();

//     res.json({
//       success: true,
//       products,
//       pagination: {
//         currentPage: page,
//         totalPages,
//         totalProducts,
//         limit,
//         hasPrevPage: page > 1,
//         hasNextPage: page < totalPages,
//       },
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });


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

    if (sort === "price-low") {
      sortQuery = { price: 1 };
    }

    if (sort === "price-high") {
      sortQuery = { price: -1 };
    }

    const totalProducts = await productsCollection.countDocuments(query);
    const totalPages = Math.max(Math.ceil(totalProducts / perPage), 1);

    const products = await productsCollection
      .find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(perPage)
      .toArray();

    res.send({
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
    res.status(500).send({
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


    // GET all buyer orders
app.get("/api/orders/buyer/:email", async (req, res) => {
  try {
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
    const email = decodeURIComponent(req.params.email).trim();

    console.log("SELLER ORDER EMAIL:", email);

    const orders = await ordersCollection
      .find({
        "sellerInfo.email": {
          $regex: `^${email}$`,
          $options: "i",
        },
      })
      .sort({ createdAt: -1 })
      .toArray();

    console.log("SELLER ORDERS FOUND:", orders.length);

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      orders: [],
    });
  }
});

// GET single order details
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order id" });
    }

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel order before shipment
app.patch("/api/orders/:id/cancel", async (req, res) => {
  try {
    const id = req.params.id;

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

    await ordersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          orderStatus: "cancelled",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    res.json({ success: true, message: "Order cancelled successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


app.get("/api/orders/seller/:email", async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);

    const orders = await ordersCollection
      .find({
        "sellerInfo.email": {
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



app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;

    const result = await ordersCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      {
        $set: {
          orderStatus: status,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

app.get("/api/admin/stats", async (req, res) => {
  try {
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
    res.status(500).json({
      success: false,
      message: "Failed to load admin stats",
    });
  }
});

// ADMIN - GET ALL USERS
app.get("/api/admin/users", async (req, res) => {
  try {
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

    const users = await usersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, users: [] });
  }
});

// ADMIN - UPDATE USER STATUS
app.patch("/api/admin/users/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      success: result.modifiedCount > 0,
      message: "User status updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN - DELETE USER
app.delete("/api/admin/users/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid user id" });
    }

    const result = await usersCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.json({
      success: result.deletedCount > 0,
      message: "User deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN - GET ALL PRODUCTS
app.get("/api/admin/products", async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const query = {};

    if (status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { "sellerInfo.email": { $regex: search, $options: "i" } },
      ];
    }

    const products = await productsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, products: [] });
  }
});

// ADMIN - UPDATE PRODUCT STATUS
app.patch("/api/admin/products/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // approved / rejected

    const result = await productsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    res.json({
      success: result.modifiedCount > 0,
      message: "Product status updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ADMIN - DELETE PRODUCT
app.delete("/api/admin/products/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await productsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    res.json({
      success: result.deletedCount > 0,
      message: "Product deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ADMIN - GET ALL ORDERS
app.get("/api/admin/orders", async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    const query = {};

    if (status !== "all") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { "buyerInfo.name": { $regex: search, $options: "i" } },
        { "buyerInfo.email": { $regex: search, $options: "i" } },
        { "sellerInfo.name": { $regex: search, $options: "i" } },
        { "sellerInfo.email": { $regex: search, $options: "i" } },
        { "productInfo.title": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message, orders: [] });
  }
});

// ADMIN - UPDATE ORDER STATUS
// app.patch("/api/admin/orders/:id/status", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { status } = req.body;

//     const result = await ordersCollection.updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $set: {
//           status,
//           updatedAt: new Date(),
//           updatedBy: "admin",
//         },
//       }
//     );

//     res.json({
//       success: result.modifiedCount > 0,
//       message: "Order status updated",
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// app.patch("/api/admin/orders/:id/status", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { orderStatus } = req.body;

//     const result = await ordersCollection.updateOne(
//       { _id: new ObjectId(id) },
//       {
//         $set: {
//           orderStatus,
//           updatedAt: new Date(),
//           updatedBy: "admin",
//         },
//       }
//     );

//     res.json({
//       success: result.modifiedCount > 0,
//       message: "Order status updated",
//     });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

app.patch("/api/admin/orders/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order id",
      });
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
      success: result.modifiedCount > 0,
      message: "Order status updated",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


app.get("/api/admin/transactions", async (req, res) => {
  try {
    const { search = "", status = "all" } = req.query;

    let query = {};

    if (status !== "all") {
      query.paymentStatus = status;
    }

    const transactions = await ordersCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const filtered = transactions.filter((item) => {
      const keyword = search.toLowerCase();

      return (
        item?.buyerInfo?.name?.toLowerCase().includes(keyword) ||
        item?.buyerInfo?.email?.toLowerCase().includes(keyword) ||
        item?.sellerInfo?.name?.toLowerCase().includes(keyword) ||
        item?.sellerInfo?.email?.toLowerCase().includes(keyword) ||
        item?.stripePaymentIntentId?.toLowerCase().includes(keyword)
      );
    });

    const totalRevenue = filtered.reduce(
      (sum, item) => sum + Number(item.totalPrice || item.productInfo?.price || 0),
      0
    );

    res.send({
      success: true,
      transactions: filtered,
      totalRevenue,
      totalTransactions: filtered.length,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
    });
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
      transactionId,
      stripeSessionId,
      stripePaymentIntentId,
    } = req.body;

    const existingOrder = await ordersCollection.findOne({
      stripeSessionId,
    });

    if (existingOrder) {
      return res.send({
        success: true,
        message: "Order already saved",
        orderId: existingOrder._id,
      });
    }

    const quantity = Number(productInfo?.quantity || 1);
    const unitPrice = Number(productInfo?.price || 0);
    const totalPrice = unitPrice * quantity;

    const order = {
      buyerInfo,
      sellerInfo,
      productInfo,

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
    };

    const result = await ordersCollection.insertOne(order);

    res.send({
      success: true,
      message: "Order saved successfully",
      insertedId: result.insertedId,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message,
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