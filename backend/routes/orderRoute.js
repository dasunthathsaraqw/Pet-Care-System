import express from 'express';
import { 
  placeOrderStripe, 
  getUserOrders, 
  getOrderDetails, 
  updateOrderStatus,
  placeOrder,
  verifyStripe,
  getAllOrders
} from '../controllers/orderController.js';
import authUser from '../middleware/auth.js';
import { requireRole } from '../middleware/roleMiddleware.js';

const orderRouter = express.Router();

// Get all orders route (store managers only — fix for audit finding #1)
orderRouter.get('/all', requireRole(['store_manager']), getAllOrders);

// User routes
orderRouter.post('/user', authUser, getUserOrders);
orderRouter.post('/stripe', authUser, placeOrderStripe);
orderRouter.post('/cod', authUser, placeOrder);
orderRouter.post('/verify', authUser, verifyStripe);

// Order details and status routes
orderRouter.get('/details/:orderId', authUser, getOrderDetails);
orderRouter.put('/status/:orderId', requireRole(['store_manager']), updateOrderStatus);

export default orderRouter; 