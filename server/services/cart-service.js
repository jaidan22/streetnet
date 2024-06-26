// const {Cart, CartProduct, Product} = require('../db/models/models')
// const { Op } = require("sequelize");

// class CartService {

//   async getCartWithProducts(user_id) {
//     const cart = await Cart.findOne({
//       where: {userId: user_id},
//       include: [{
//         model: CartProduct,
//         as: 'products',
//         include: [{
//           model: Product
//         }]
//       }],
//       order: [[ {model: CartProduct, as: 'products'}, 'id', 'DESC' ]]
//     })
//     return cart
//   }

//   async addCartProduct(userId, productId, selectedSize, count) {
//     const product = await Product.findOne({where: {id: productId}})
//     const cart = await Cart.findOne({where: {userId}})
//     let subTotal;

//     const productInCart = await CartProduct.findOne({
//       where: {
//         [Op.and]: [
//           {productId: productId},
//           {cartId: cart.id},
//           {selectedSize: selectedSize}
//         ]
//       }
//     })

//     if (productInCart) {
//       const newCount = productInCart.count + count;
//       const newTotalPrice = product.price * newCount; //parseint??????????
//       await CartProduct.update(
//         {
//           count: newCount,
//           totalPrice: newTotalPrice
//         },
//         {where: {id: productInCart.id}}
//       )
//       subTotal = await CartProduct.sum('totalPrice', { where: {cartId: cart.id} });
//       await Cart.update({subTotal: subTotal}, {where: {id: cart.id}})
//     }
//     else {
//       await CartProduct.create({
//         productId,
//         count,
//         selectedSize,
//         price: parseInt(product.price),
//         totalPrice: parseInt(product.price) * parseInt(count),
//         cartId: cart.id
//       })
//       subTotal = await CartProduct.sum('totalPrice', { where: {cartId: cart.id} });
//       await Cart.update({subTotal: subTotal}, {where: {id: cart.id}})
//     }

//     const updatedCart = await Cart.findOne({
//       where: {userId},
//       include: [{
//         model: CartProduct,
//         as: 'products',
//         include: [{
//           model: Product
//         }]
//       }]
//     })
//     return updatedCart
//   }

//   async updateCartProductCount(userId, cartProductId, newCount) {
//     const cartProduct = await CartProduct.findOne({
//       where: {id: cartProductId},
//       include: [{
//         model: Product
//       }]

//     })

//     const newTotalPrice = cartProduct.product.price * newCount

//     await CartProduct.update(
//       {
//         count: newCount,
//         totalPrice: newTotalPrice
//       },
//       {where: {id: cartProductId}}
//     )

//     const cart = await Cart.findOne({where: {userId}})
//     const newSubTotal = await CartProduct.sum('totalPrice', { where: {cartId: cart.id} });
//     await Cart.update(
//       {subTotal: newSubTotal},
//       {where: {id: cart.id}}
//     )

//     const updatedCart = await Cart.findOne({
//       where: {userId},
//       include: [{
//         model: CartProduct,
//         as: 'products',
//         include: [{
//           model: Product
//         }]
//       }]
//     })
//     return updatedCart
//   }

//   async deleteCartProduct(cartProductId, userId) {
//     await CartProduct.destroy({where: {id: cartProductId}})
//     const cart = await Cart.findOne({where: {userId}})
//     const subTotal = await CartProduct.sum('totalPrice', { where: {cartId: cart.id} });
//     if (subTotal === null) {
//       await Cart.update({subTotal: 0}, {where: {id: cart.id}})
//     }
//     else {
//       await Cart.update({subTotal: subTotal}, {where: {id: cart.id}})
//     }
//     const updatedCart = await Cart.findOne({
//       where: {userId},
//       include: [{
//         model: CartProduct,
//         as: 'products',
//         include: [{
//           model: Product
//         }]
//       }]
//     })
//     return updatedCart
//   }

//   async deleteCart(userId) {
//     const cart = await CartProduct.destroy({where: {userId}})
//     return cart
//   }
// }

// module.exports = new CartService()

const { Cart, CartProduct, Product } = require("../db/models/models");
const mongoose = require("mongoose");

class CartService {
  async getCartWithProducts(user_id) {
    const cart = await Cart.findOne({ userId: user_id })
      .populate({
        path: "products",
        model: "CartProduct",
        populate: {
          path: "product",
          model: "Product",
        },
      })
      .sort({ "products._id": "desc" });

    return cart;
  }

  async addCartProduct(userId, productId, selectedSize, count) {
    const product = await Product.findById(productId);
    const cart = await Cart.findOne({ userId });
    let subTotal;

    const productInCart = await CartProduct.findOne({
      productId,
      cartId: cart._id,
      selectedSize,
    });

    if (productInCart) {
      const newCount = productInCart.count + count;
      const newTotalPrice = product.price * newCount;

      await CartProduct.updateOne(
        { _id: productInCart._id },
        { count: newCount, totalPrice: newTotalPrice }
      );

      subTotal = await CartProduct.aggregate([
        { $match: { cartId: cart._id } },
        { $group: { _id: null, subTotal: { $sum: "$totalPrice" } } },
      ]).exec();

      subTotal = subTotal.length ? subTotal[0].subTotal : 0;
      await Cart.updateOne({ _id: cart._id }, { subTotal });
    } else {
      await CartProduct.create({
        productId,
        count,
        selectedSize,
        price: parseInt(product.price),
        totalPrice: parseInt(product.price) * parseInt(count),
        cartId: cart._id,
      });

      subTotal = await CartProduct.aggregate([
        { $match: { cartId: cart._id } },
        { $group: { _id: null, subTotal: { $sum: "$totalPrice" } } },
      ]).exec();

      subTotal = subTotal.length ? subTotal[0].subTotal : 0;
      await Cart.updateOne({ _id: cart._id }, { subTotal });
    }

    const updatedCart = await Cart.findOne({ userId }).populate({
      path: "products",
      model: "CartProduct",
      populate: {
        path: "product",
        model: "Product",
      },
    });

    return updatedCart;
  }

  async updateCartProductCount(userId, cartProductId, newCount) {
    const cartProduct = await CartProduct.findById(cartProductId).populate(
      "product"
    );

    const newTotalPrice = cartProduct.product.price * newCount;

    await CartProduct.updateOne(
      { _id: cartProductId },
      { count: newCount, totalPrice: newTotalPrice }
    );

    const cart = await Cart.findOne({ userId });

    const newSubTotal = await CartProduct.aggregate([
      { $match: { cartId: cart._id } },
      { $group: { _id: null, subTotal: { $sum: "$totalPrice" } } },
    ]).exec();

    const subTotal = newSubTotal.length ? newSubTotal[0].subTotal : 0;

    await Cart.updateOne({ _id: cart._id }, { subTotal });

    const updatedCart = await Cart.findOne({ userId }).populate({
      path: "products",
      model: "CartProduct",
      populate: {
        path: "product",
        model: "Product",
      },
    });

    return updatedCart;
  }

  async deleteCartProduct(cartProductId, userId) {
    await CartProduct.deleteOne({ _id: cartProductId });

    const cart = await Cart.findOne({ userId });

    const subTotal = await CartProduct.aggregate([
      { $match: { cartId: cart._id } },
      { $group: { _id: null, subTotal: { $sum: "$totalPrice" } } },
    ]).exec();

    if (!subTotal.length || subTotal[0].subTotal === null) {
      await Cart.updateOne({ _id: cart._id }, { subTotal: 0 });
    } else {
      await Cart.updateOne(
        { _id: cart._id },
        { subTotal: subTotal[0].subTotal }
      );
    }

    const updatedCart = await Cart.findOne({ userId }).populate({
      path: "products",
      model: "CartProduct",
      populate: {
        path: "product",
        model: "Product",
      },
    });

    return updatedCart;
  }

  async deleteCart(userId) {
    const cart = await CartProduct.deleteMany({ userId });
    return cart;
  }
}

module.exports = new CartService();
