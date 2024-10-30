const express = require("express");
const Order = require("../models/Order");
const auth = require("../middleware/auth");

const router = express.Router();

// Get user's cart or create a new one
router.get("/cart", auth, async (req, res) => {
  try {
    let cart = await Order.findOne({
      user: req.user.userId,
      status: "Cart",
    }).populate("items.product");
    if (!cart) {
      cart = new Order({
        user: req.user.userId,
        items: [],
        totalAmount: 0,
        status: "Cart",
      });
      await cart.save();
    }
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch cart" });
  }
});

// Add item to cart
router.post("/cart/add", auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    let cart = await Order.findOne({ user: req.user.userId, status: "Cart" });
    if (!cart) {
      cart = new Order({
        user: req.user.userId,
        items: [],
        totalAmount: 0,
        status: "Cart",
      });
    }

    const cartItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (cartItemIndex > -1) {
      cart.items[cartItemIndex].quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        name: product.name,
        quantity,
        price: product.price,
      });
    }

    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Failed to add item to cart" });
  }
});

// Update item quantity in cart
router.put("/cart/update/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await Order.findOne({ user: req.user.userId, status: "Cart" });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    const cartItemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (cartItemIndex === -1) {
      return res.status(404).json({ error: "Item not found in cart" });
    }

    cart.items[cartItemIndex].quantity = quantity;
    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Failed to update item quantity" });
  }
});

// Remove item from cart
router.delete("/cart/remove/:productId", auth, async (req, res) => {
  try {
    const { productId } = req.params;

    const cart = await Order.findOne({ user: req.user.userId, status: "Cart" });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    cart.totalAmount = cart.items.reduce(
      (total, item) => total + item.quantity * item.price,
      0
    );

    await cart.save();
    res.json(cart);
  } catch (error) {
    res.status(500).json({ error: "Failed to remove item from cart" });
  }
});

// Clear cart
router.delete("/cart/clear", auth, async (req, res) => {
  try {
    const cart = await Order.findOne({ user: req.user.userId, status: "Cart" });
    if (!cart) {
      return res.status(404).json({ error: "Cart not found" });
    }

    cart.items = [];
    cart.totalAmount = 0;
    await cart.save();
    res.json({ message: "Cart cleared successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear cart" });
  }
});
router.post("/place-order", auth, async (req, res) => {
  try {
    const { items, shippingInfo, totalAmount } = req.body;

    const newOrder = new Order({
      user: req.user.userId,
      items: items.map((item) => ({
        product: item._id,
        image: item.imageUrl,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      })),
      shippingInfo,
      totalAmount,
      status: "Pending",
    });

    await newOrder.save();

    res
      .status(201)
      .json({ message: "Order placed successfully", order: newOrder });
  } catch (error) {
    console.error("Order placement error:", error);
    res.status(500).json({ error: "Failed to place order" });
  }
});

module.exports = router;
